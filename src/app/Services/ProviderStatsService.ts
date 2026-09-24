import { sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { setHealthSource } from './LlmService'

// ADM-14: how each model is doing, read from llm_calls (nothing collected just for this page), and the
// health the circuit breaker in LlmService acts on. `now` is injectable so a test can place its rows.

const all = async <T>(q: SQL) => (await db.execute(q)).rows as T[]
const HOUR = 3600
const DAY = 86400

export type Window = { calls: number; errorRate: number | null; p50: number | null; p95: number | null; cacheHit: number | null; spend: number }
export type Status = 'down' | 'degraded' | 'healthy' | 'idle'
export type ModelStats = {
  model: string
  provider: string
  hour: Window
  day: Window
  calls15m: number
  fails15m: number
  lastFailAt: number | null // unix s
  lastError: { message: string; at: number; requestId: string | null } | null
  hourly: { calls: number; errors: number }[] // 24 buckets, oldest first
  status: Status
}

/** Down: ≥5 calls in 15 min, half failed. Idle: nothing in an hour. Degraded: ≥15% errors, or p95 over twice the day's. */
export function statusOf(s: Pick<ModelStats, 'hour' | 'day' | 'calls15m' | 'fails15m'>): Status {
  if (s.calls15m >= 5 && s.fails15m / s.calls15m >= 0.5) return 'down'
  if (!s.hour.calls) return 'idle'
  if ((s.hour.errorRate ?? 0) >= 0.15 || (s.hour.p95 !== null && s.day.p95 !== null && s.hour.p95 > 2 * s.day.p95)) return 'degraded'
  return 'healthy'
}

const windowCols = (suffix: string, from: number) => {
  const f = sql`FILTER (WHERE created_at >= ${from})`
  return sql`
    count(*) ${f} AS ${sql.raw(`calls_${suffix}`)},
    count(*) FILTER (WHERE created_at >= ${from} AND NOT ok) AS ${sql.raw(`fails_${suffix}`)},
    percentile_cont(0.5) WITHIN GROUP (ORDER BY ms) ${f} AS ${sql.raw(`p50_${suffix}`)},
    percentile_cont(0.95) WITHIN GROUP (ORDER BY ms) ${f} AS ${sql.raw(`p95_${suffix}`)},
    coalesce(sum(prompt_tokens) ${f}, 0) AS ${sql.raw(`prompt_${suffix}`)},
    coalesce(sum(cached_tokens) ${f}, 0) AS ${sql.raw(`cached_${suffix}`)},
    coalesce(sum(cost_usd) ${f}, 0) AS ${sql.raw(`spend_${suffix}`)}`
}
const windowOf = (r: Record<string, number | null>, suffix: string): Window => {
  const calls = Number(r[`calls_${suffix}`] ?? 0)
  const prompt = Number(r[`prompt_${suffix}`] ?? 0)
  return {
    calls,
    errorRate: calls ? Number(r[`fails_${suffix}`]) / calls : null,
    p50: r[`p50_${suffix}`] ?? null,
    p95: r[`p95_${suffix}`] ?? null,
    cacheHit: prompt ? Number(r[`cached_${suffix}`]) / prompt : null,
    spend: Number(r[`spend_${suffix}`] ?? 0),
  }
}

export const ProviderStatsService = {
  /** Every model with a call in the 24 hours before `nowMs`. */
  async health(nowMs = Date.now()): Promise<ModelStats[]> {
    const now = Math.floor(nowMs / 1000)
    const day = now - DAY
    const inDay = sql`created_at >= ${day} AND created_at <= ${now}`
    const [rows, errors, hours] = await Promise.all([
      all<Record<string, any>>(sql`
        SELECT model, max(provider) AS provider, ${windowCols('1h', now - HOUR)}, ${windowCols('24h', day)},
          count(*) FILTER (WHERE created_at >= ${now - 15 * 60}) AS calls_15m,
          count(*) FILTER (WHERE created_at >= ${now - 15 * 60} AND NOT ok) AS fails_15m,
          max(created_at) FILTER (WHERE NOT ok) AS last_fail
        FROM llm_calls WHERE ${inDay} GROUP BY model`),
      all<{ model: string; error: string | null; created_at: number; request_id: string | null }>(sql`
        SELECT DISTINCT ON (model) model, error, created_at, request_id FROM llm_calls
        WHERE ${inDay} AND NOT ok ORDER BY model, created_at DESC`),
      all<{ model: string; ago: number; calls: number; errors: number }>(sql`
        SELECT model, least(23, (${now} - created_at) / ${HOUR})::int AS ago, count(*) AS calls, count(*) FILTER (WHERE NOT ok) AS errors
        FROM llm_calls WHERE ${inDay} GROUP BY 1, 2`),
    ])
    return rows.map((r) => {
      const e = errors.find((x) => x.model === r.model)
      const hourly = Array.from({ length: 24 }, () => ({ calls: 0, errors: 0 }))
      for (const h of hours) if (h.model === r.model) hourly[23 - h.ago] = { calls: h.calls, errors: h.errors }
      const s = {
        model: r.model as string,
        provider: r.provider as string,
        hour: windowOf(r, '1h'),
        day: windowOf(r, '24h'),
        calls15m: Number(r.calls_15m),
        fails15m: Number(r.fails_15m),
        lastFailAt: r.last_fail === null ? null : Number(r.last_fail),
        lastError: e ? { message: e.error ?? 'Failed', at: Number(e.created_at), requestId: e.request_id } : null,
        hourly,
      }
      return { ...s, status: statusOf(s) }
    })
  },
}

// The circuit breaker reads model health through here (LlmService stays free of the database).
setHealthSource(async (nowMs) =>
  Object.fromEntries((await ProviderStatsService.health(nowMs)).map((s) => [s.model, { down: s.status === 'down', lastFailAt: (s.lastFailAt ?? 0) * 1000 }])),
)
