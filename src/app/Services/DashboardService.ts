import { sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { PRICES } from './LlmService'
import { OverviewService } from './OverviewService'
import { UsageService } from './UsageService'

// ADM-20: the admin dashboard — what was sold, what the models cost, and what is left. Money in is a fact: the
// provider's orders (ADM-15), never rebuilt from credit grants. Money out is what llm_calls logged per call, at the
// price that applied (DeepSeek's peak included). Tokens are shown with their dollars: each model's input, cache and
// output tokens priced at its list rates, scaled so the parts add up to what was really spent. Times are unix seconds.

const all = async <T>(q: SQL) => (await db.execute(q)).rows as T[]
const one = async <T>(q: SQL) => (await all<T>(q))[0]!
const clock = () => Math.floor(Date.now() / 1000)
const DAY = 86400
const n = (r: Record<string, unknown>, k: string) => Number(r[k] ?? 0)
/** Polar's fee, an estimate: 4% + $0.40 per order. */
const FEE_RATE = 0.04
const FEE_FIXED_USD = 0.4

export type Tokens = { input: number; cached: number; cacheWrite: number; output: number }
export type ModelRow = { model: string; calls: number; failed: number; tokens: Tokens; usd: number; inputUsd: number; outputUsd: number }

async function window(from: number, to: number) {
  const at = (col: SQL) => sql`${col} >= ${from} AND ${col} < ${to}`
  const r = await one<Record<string, unknown>>(sql`
    SELECT
      (SELECT coalesce(sum(amount_cents), 0) FROM orders WHERE lower(currency) = 'usd' AND ${at(sql`created_at`)}) AS "soldCents",
      (SELECT count(*) FROM orders WHERE ${at(sql`created_at`)}) AS orders,
      (SELECT count(DISTINCT user_id) FROM orders WHERE ${at(sql`created_at`)}) AS "payingUsers",
      (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls WHERE ${at(sql`created_at`)}) AS spend,
      (SELECT count(*) FROM llm_calls WHERE ${at(sql`created_at`)}) AS calls,
      (SELECT count(*) FROM llm_calls WHERE NOT ok AND ${at(sql`created_at`)}) AS failed,
      (SELECT coalesce(sum(prompt_tokens - cached_tokens - cache_write_tokens), 0) FROM llm_calls WHERE ${at(sql`created_at`)}) AS "tokIn",
      (SELECT coalesce(sum(cached_tokens), 0) FROM llm_calls WHERE ${at(sql`created_at`)}) AS "tokCached",
      (SELECT coalesce(sum(cache_write_tokens), 0) FROM llm_calls WHERE ${at(sql`created_at`)}) AS "tokWrite",
      (SELECT coalesce(sum(completion_tokens), 0) FROM llm_calls WHERE ${at(sql`created_at`)}) AS "tokOut",
      (SELECT count(DISTINCT project_id) FROM screens WHERE html != '' AND ${at(sql`created_at`)}) AS apps,
      (SELECT count(*) FROM screens WHERE html != '' AND ${at(sql`created_at`)}) AS screens,
      (SELECT count(*) FROM "user" WHERE created_at >= to_timestamp(${from}) AND created_at < to_timestamp(${to})) AS signups,
      (SELECT count(DISTINCT user_id) FROM llm_calls WHERE user_id IS NOT NULL AND ${at(sql`created_at`)}) AS "activeUsers"
  `)
  const sold = n(r, 'soldCents') / 100
  const orders = n(r, 'orders')
  const fees = orders ? sold * FEE_RATE + orders * FEE_FIXED_USD : 0
  const spend = n(r, 'spend')
  const apps = n(r, 'apps'), screens = n(r, 'screens')
  return {
    sold, orders, payingUsers: n(r, 'payingUsers'), fees, spend,
    profit: sold - fees - spend,
    margin: sold > 0 ? (sold - fees - spend) / sold : null,
    calls: n(r, 'calls'), failed: n(r, 'failed'),
    tokens: { input: n(r, 'tokIn'), cached: n(r, 'tokCached'), cacheWrite: n(r, 'tokWrite'), output: n(r, 'tokOut') } as Tokens,
    apps, screens, costPerApp: apps ? spend / apps : 0, costPerScreen: screens ? spend / screens : 0,
    signups: n(r, 'signups'), activeUsers: n(r, 'activeUsers'),
  }
}

/** Per model: calls, tokens by kind, and the dollars split into input (with cache) and output. */
async function byModel(from: number, to: number): Promise<ModelRow[]> {
  const rows = await all<Record<string, unknown>>(sql`
    SELECT model, count(*)::int AS calls, count(*) FILTER (WHERE NOT ok)::int AS failed,
      coalesce(sum(prompt_tokens - cached_tokens - cache_write_tokens), 0)::float8 AS "in", coalesce(sum(cached_tokens), 0)::float8 AS cached,
      coalesce(sum(cache_write_tokens), 0)::float8 AS write, coalesce(sum(completion_tokens), 0)::float8 AS out, coalesce(sum(cost_usd), 0)::float8 AS usd
    FROM llm_calls WHERE created_at >= ${from} AND created_at < ${to} GROUP BY model ORDER BY usd DESC
  `)
  return rows.map((r) => {
    const tokens = { input: n(r, 'in'), cached: n(r, 'cached'), cacheWrite: n(r, 'write'), output: n(r, 'out') }
    const usd = n(r, 'usd')
    const p = PRICES[String(r.model)]
    // List-price parts, scaled to what was really charged (peak hours double DeepSeek; a failed call costs what it used).
    const listIn = p ? (tokens.input * p.input + tokens.cached * p.cached + tokens.cacheWrite * (p.cacheWrite ?? p.input)) / 1e6 : 0
    const listOut = p ? (tokens.output * p.output) / 1e6 : 0
    const k = listIn + listOut > 0 ? usd / (listIn + listOut) : 0
    return { model: String(r.model || 'unknown'), calls: n(r, 'calls'), failed: n(r, 'failed'), tokens, usd, inputUsd: listIn * k, outputUsd: listOut * k }
  })
}

/** 30 UTC days: sold and LLM spend in dollars, output tokens. */
function daily(now: number) {
  const d = (col: SQL) => sql`to_char(to_timestamp(${col}) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
  return all<{ day: string; sold: number; spend: number; tokens: number }>(sql`
    SELECT to_char(g.d, 'YYYY-MM-DD') AS day,
      (SELECT coalesce(sum(amount_cents), 0)::float8 / 100 FROM orders WHERE lower(currency) = 'usd' AND ${d(sql`created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS sold,
      (SELECT coalesce(sum(cost_usd), 0)::float8 FROM llm_calls WHERE ${d(sql`created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS spend,
      (SELECT coalesce(sum(prompt_tokens + completion_tokens), 0)::float8 FROM llm_calls WHERE ${d(sql`created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS tokens
    FROM generate_series((to_timestamp(${now - DAY * 29}) AT TIME ZONE 'UTC')::date, (to_timestamp(${now}) AT TIME ZONE 'UTC')::date, interval '1 day') AS g(d)
    ORDER BY g.d
  `)
}

/** WLT-01: shared-preview opens and waitlist sign-ups in the window, by the post they came from, and the latest
 *  sign-ups with what they wrote (the feedback the build-in-public posts ask for). */
async function waitlist(from: number, to: number) {
  const [byRef, latest, total] = await Promise.all([
    all<{ ref: string; views: number; joined: number }>(sql`
      SELECT coalesce(ref, 'direct') AS ref, sum(v)::int AS views, sum(j)::int AS joined FROM (
        SELECT ref, 1 AS v, 0 AS j FROM share_views WHERE created_at >= ${from} AND created_at < ${to}
        UNION ALL SELECT ref, 0, 1 FROM waitlist WHERE created_at >= ${from} AND created_at < ${to}
      ) x GROUP BY 1 ORDER BY 3 DESC, 2 DESC
    `),
    all<{ email: string; ref: string | null; note: string | null; app: string | null; at: number }>(sql`
      SELECT w.email, w.ref, w.note, p.name AS app, w.created_at AS at FROM waitlist w LEFT JOIN projects p ON p.id = w.project_id
      ORDER BY w.created_at DESC LIMIT 10
    `),
    one<{ n: number }>(sql`SELECT count(*)::int AS n FROM waitlist`),
  ])
  return { byRef, latest, total: total.n }
}

export const DashboardService = {
  window,
  byModel,
  daily,
  waitlist,

  /** The page: this window against the one before it, per-model spend, 30 days, live plans, alerts, today. */
  async dashboard(days: 1 | 7 | 30, now = clock()) {
    const span = DAY * days
    const midnight = now - (now % DAY)
    const [current, previous, models, series, subs, alerts, limits, today, list] = await Promise.all([
      window(now - span, now + 1),
      window(now - 2 * span, now - span),
      byModel(now - span, now + 1),
      daily(now),
      OverviewService.subscriptions(now),
      OverviewService.alerts(now),
      UsageService.limits(),
      window(midnight, now + 1),
      waitlist(now - span, now + 1),
    ])
    return { days, current, previous, models, series, subs, alerts, waitlist: list, now: { running: UsageService.running().length, paused: limits.paused, budget: limits.dailyBudgetUsd, spentToday: today.spend } }
  },
}
