import { sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { PRODUCTS } from '@/lib/credit-prices'
import { UsageService } from './UsageService'

// ADM-12: the admin overview — business, product and system for a window against the window before
// it, and alerts for what is wrong right now. Plain SQL over tables the product already writes; every
// function takes `now` (unix seconds) so tests pin the clock. Better Auth's "user"/session times are
// timestamptz, everything else unix seconds.
//
// Money is an ESTIMATE: nothing stores what a payment really was, so revenue is rebuilt from the credit
// grants — a pack's grant (ref 'order:<id>') at the pack's price, a plan's monthly grant (ref
// 'sub:<id>:<month>:<product>') at the product's monthly-equivalent price (a yearly plan: cents / 12 per
// grant, since it grants monthly). Fees are 4% + $0.40 per payment (a yearly grant counts 1/12 payment).

const all = async <T>(q: SQL) => (await db.execute(q)).rows as T[]
const one = async <T>(q: SQL) => (await all<T>(q))[0]!
const clock = () => Math.floor(Date.now() / 1000)
const DAY = 86400
const FEE_RATE = 0.04
const FEE_FIXED_USD = 0.4

/** PRODUCTS as a SQL table: key, name, monthly-equivalent dollars, payments per grant, plan. */
const products = sql`(VALUES ${sql.join(
  PRODUCTS.map((p) => sql`(${p.key}::text, ${p.name}::text, ${p.interval === 'year' ? p.cents / 12 / 100 : p.cents / 100}::float8, ${p.interval === 'year' ? 1 / 12 : 1}::float8, ${p.plan}::text)`),
  sql`, `,
)}) AS pr(key, name, usd, payments, plan)`

/** Each paid ledger grant with its product: a plan grant by the key in its ref, a pack by its size. */
const paidGrants = sql`
  SELECT l.user_id, l.created_at, l.delta, pr.usd, pr.payments FROM credit_ledger l
  JOIN ${products} ON pr.key = CASE WHEN l.kind = 'subscription' THEN split_part(l.ref, ':', 4) ELSE 'pack-' || l.delta END
  WHERE l.kind IN ('purchase', 'subscription')`

const n = (r: Record<string, unknown>, k: string) => Number(r[k] ?? 0)

async function windowStats(from: number, to: number) {
  const at = (col: SQL) => sql`${col} >= ${from} AND ${col} < ${to}`
  const ts = (col: SQL) => sql`${col} >= to_timestamp(${from}) AND ${col} < to_timestamp(${to})`
  const r = await one<Record<string, unknown>>(sql`
    SELECT
      (SELECT count(*) FROM (SELECT user_id FROM credit_ledger WHERE kind IN ('purchase', 'subscription') GROUP BY user_id HAVING ${at(sql`min(created_at)`)}) t) AS "newPaying",
      (SELECT count(*) FROM subscriptions WHERE status IN ('canceled', 'revoked') AND ${at(sql`updated_at`)}) AS churned,
      (SELECT coalesce(sum(delta), 0) FROM credit_ledger WHERE kind IN ('purchase', 'subscription') AND ${at(sql`created_at`)}) AS "creditsSold",
      (SELECT coalesce(-sum(delta), 0) FROM credit_ledger WHERE kind IN ('hold', 'refund') AND ${at(sql`created_at`)}) AS "creditsSpent",
      (SELECT coalesce(sum(usd), 0) FROM (${paidGrants}) g WHERE ${at(sql`created_at`)}) AS revenue,
      (SELECT coalesce(sum(payments), 0) FROM (${paidGrants}) g WHERE ${at(sql`created_at`)}) AS payments,
      (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls WHERE ${at(sql`created_at`)}) AS spend,
      (SELECT count(*) FROM "user" WHERE ${ts(sql`created_at`)}) AS signups,
      (SELECT count(*) FROM "user" u WHERE ${ts(sql`u.created_at`)} AND EXISTS (SELECT 1 FROM projects p WHERE p.user_id = u.id)) AS activated,
      (SELECT count(DISTINCT project_id) FROM screens WHERE html != '' AND ${at(sql`created_at`)}) AS apps,
      (SELECT count(*) FROM screens WHERE html != '' AND ${at(sql`created_at`)}) AS screens,
      (SELECT count(*) FROM screens WHERE error IS NOT NULL AND ${at(sql`created_at`)}) AS "failedScreens",
      -- An action's wall time: its first call's start to its last call's end (calls run in parallel, so no sum).
      (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY s) FROM (
         SELECT (max(created_at) - min(created_at - ms / 1000.0))::float8 AS s FROM llm_calls WHERE action_id IS NOT NULL AND ${at(sql`created_at`)} GROUP BY action_id
      ) a) AS "p95GenS",
      (SELECT count(*) FROM (
         SELECT user_id FROM session WHERE ${ts(sql`updated_at`)}
         UNION SELECT user_id FROM llm_calls WHERE user_id IS NOT NULL AND ${at(sql`created_at`)}
      ) a) AS "activeUsers",
      -- 'api' is left out of latency: its streaming routes record the time to the first byte, not the run.
      (SELECT count(*) FROM http_requests WHERE ${at(sql`created_at`)}) AS requests,
      (SELECT count(*) FROM http_requests WHERE status >= 500 AND ${at(sql`created_at`)}) AS "requests5xx",
      (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY ms) FROM http_requests WHERE kind != 'api' AND ${at(sql`created_at`)}) AS "p95ReqMs",
      (SELECT count(*) FROM server_logs WHERE level = 'error' AND ${at(sql`created_at`)}) AS errors,
      (SELECT count(DISTINCT fingerprint) FROM server_logs WHERE level = 'error' AND ${at(sql`created_at`)}) AS "errorKinds",
      (SELECT count(*) FROM llm_calls WHERE ${at(sql`created_at`)}) AS calls,
      (SELECT count(*) FROM llm_calls WHERE NOT ok AND ${at(sql`created_at`)}) AS "failedCalls"
  `)
  const revenue = n(r, 'revenue'), spend = n(r, 'spend'), fees = revenue ? revenue * FEE_RATE + n(r, 'payments') * FEE_FIXED_USD : 0
  const attempts = n(r, 'screens') + n(r, 'failedScreens')
  return {
    newPaying: n(r, 'newPaying'),
    churned: n(r, 'churned'),
    creditsSold: n(r, 'creditsSold'),
    creditsSpent: n(r, 'creditsSpent'),
    revenue,
    fees,
    spend,
    margin: revenue - spend - fees,
    signups: n(r, 'signups'),
    activated: n(r, 'activated'),
    apps: n(r, 'apps'),
    screens: n(r, 'screens'),
    failedRate: attempts ? n(r, 'failedScreens') / attempts : 0,
    costPerApp: n(r, 'apps') ? spend / n(r, 'apps') : 0,
    p95GenMs: n(r, 'p95GenS') * 1000,
    activeUsers: n(r, 'activeUsers'),
    requests: n(r, 'requests'),
    rate5xx: n(r, 'requests') ? n(r, 'requests5xx') / n(r, 'requests') : 0,
    p95ReqMs: n(r, 'p95ReqMs'),
    errors: n(r, 'errors'),
    errorKinds: n(r, 'errorKinds'),
    llmFailRate: n(r, 'calls') ? n(r, 'failedCalls') / n(r, 'calls') : 0,
  }
}

export type Alert = { key: 'budget' | 'model' | 'errors' | 'screens' | 'paused'; text: string; href: string }

export const OverviewService = {
  /** Live plans now: MRR (monthly-equivalent) and the count per plan. Not windowed — a plan has no history. */
  async subscriptions(now = clock()) {
    const r = await one<Record<string, unknown>>(sql`
      SELECT coalesce(sum(pr.usd), 0) AS mrr, count(*) FILTER (WHERE pr.plan = 'starter') AS starter, count(*) FILTER (WHERE pr.plan = 'pro') AS pro
      FROM subscriptions s JOIN ${products} ON pr.key = s.product_key
      WHERE s.status IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end > ${now})
    `)
    return { mrr: n(r, 'mrr'), starter: n(r, 'starter'), pro: n(r, 'pro') }
  },

  windowStats,

  /** What is wrong right now. Deterministic: every threshold is here, every count is SQL at `now`. */
  async alerts(now = clock()): Promise<Alert[]> {
    const midnight = now - (now % DAY)
    const [limits, r, models] = await Promise.all([
      UsageService.limits(),
      one<Record<string, unknown>>(sql`
        SELECT
          (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls WHERE created_at >= ${midnight} AND created_at <= ${now}) AS "spentToday",
          (SELECT count(*) FROM server_logs WHERE level = 'error' AND created_at > ${now - 3600} AND created_at <= ${now}) AS "errorsHour",
          (SELECT count(*) FROM server_logs WHERE level = 'error' AND created_at > ${now - 3600 - DAY} AND created_at <= ${now - 3600}) AS "errorsDay",
          (SELECT count(*) FROM screens WHERE (html != '' OR error IS NOT NULL) AND created_at > ${now - DAY} AND created_at <= ${now}) AS attempts,
          (SELECT count(*) FROM screens WHERE error IS NOT NULL AND created_at > ${now - DAY} AND created_at <= ${now}) AS failed
      `),
      all<{ model: string; calls: number; failed: number }>(sql`
        SELECT model, count(*)::int AS calls, count(*) FILTER (WHERE NOT ok)::int AS failed FROM llm_calls
        WHERE created_at > ${now - 900} AND created_at <= ${now} GROUP BY model HAVING count(*) >= 5 AND count(*) FILTER (WHERE NOT ok) * 2 >= count(*)
        ORDER BY model
      `),
    ])
    const out: Alert[] = []
    if (limits.paused) out.push({ key: 'paused', text: 'Generation is paused', href: '/admin/settings' })
    const spent = n(r, 'spentToday'), budget = limits.dailyBudgetUsd
    if (budget > 0 && spent >= budget * 0.8) out.push({ key: 'budget', text: `Daily budget ${Math.round((spent / budget) * 100)}% used ($${spent.toFixed(2)} of $${budget.toFixed(2)})`, href: '/admin/settings' })
    for (const m of models) out.push({ key: 'model', text: `${m.model || 'unknown model'}: ${m.failed} of ${m.calls} calls failed in 15 min`, href: '/admin/providers' })
    // The baseline is the 24 hours before the last hour, so the spike does not raise its own average.
    const hour = n(r, 'errorsHour'), avg = n(r, 'errorsDay') / 24
    if (hour >= 5 && hour > 3 * avg) out.push({ key: 'errors', text: `${hour} server errors in the last hour (avg ${avg.toFixed(1)}/h)`, href: '/admin/errors' })
    const attempts = n(r, 'attempts'), failed = n(r, 'failed')
    if (attempts >= 10 && failed / attempts >= 0.2) out.push({ key: 'screens', text: `${Math.round((failed / attempts) * 100)}% of screens failed in 24h (${failed} of ${attempts})`, href: '/admin/generations?result=error' })
    return out
  },

  /** 30 days, one row per UTC day: signups, drawn screens, LLM spend and the revenue estimate. */
  series(now = clock()) {
    const d = (col: SQL) => sql`to_char(to_timestamp(${col}) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
    return all<{ day: string; signups: number; screens: number; spend: number; revenue: number }>(sql`
      SELECT to_char(g.d, 'YYYY-MM-DD') AS day,
        (SELECT count(*)::int FROM "user" WHERE (created_at AT TIME ZONE 'UTC')::date = g.d) AS signups,
        (SELECT count(*)::int FROM screens WHERE html != '' AND ${d(sql`created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS screens,
        (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls WHERE ${d(sql`created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS spend,
        (SELECT coalesce(sum(usd), 0) FROM (${paidGrants}) p WHERE ${d(sql`p.created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS revenue
      FROM generate_series((to_timestamp(${now - DAY * 29}) AT TIME ZONE 'UTC')::date, (to_timestamp(${now}) AT TIME ZONE 'UTC')::date, interval '1 day') AS g(d)
      ORDER BY g.d
    `)
  },

  /** The latest server errors and failed model calls, merged, each with the request that raised it. */
  latestErrors(limit = 12) {
    return all<{ source: 'server' | 'llm'; id: string; createdAt: number; message: string; requestId: string | null; detail: string | null }>(sql`
      (SELECT 'server' AS source, id::text AS id, created_at AS "createdAt", message, request_id AS "requestId", NULL AS detail
        FROM server_logs WHERE level = 'error' ORDER BY created_at DESC LIMIT ${limit})
      UNION ALL
      (SELECT 'llm', c.id, c.created_at, coalesce(c.error, 'unknown error'), c.request_id, concat_ws(' · ', u.email, c.model)
        FROM llm_calls c LEFT JOIN "user" u ON u.id = c.user_id WHERE NOT c.ok ORDER BY c.created_at DESC LIMIT ${limit})
      ORDER BY "createdAt" DESC LIMIT ${limit}
    `)
  },

  /** Everything the page shows: this window and the one before, live plans, alerts, series, errors, now. */
  async overview(days: 1 | 7 | 30, now = clock()) {
    const span = DAY * days
    const [current, previous, subs, alerts, series, errors, limits] = await Promise.all([
      windowStats(now - span, now + 1),
      windowStats(now - 2 * span, now - span),
      OverviewService.subscriptions(now),
      OverviewService.alerts(now),
      OverviewService.series(now),
      OverviewService.latestErrors(),
      UsageService.limits(),
    ])
    const running = UsageService.running()
    const spentToday = series.at(-1)?.spend ?? 0
    return { days, current, previous, subs, alerts, series, errors, now: { running: running.length, paused: limits.paused, budget: limits.dailyBudgetUsd, spentToday: Number(spentToday) } }
  },
}
