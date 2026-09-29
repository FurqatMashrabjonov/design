import { sql, type SQL } from 'drizzle-orm'
import { all, one, unixNow as clock, DAY, num as n, dayOf } from '@/database/query'
import { PRICES } from './LlmService'
import { PRODUCTS } from '@/lib/credit-prices'
import { UsageService } from './UsageService'

// ADM-20: the admin dashboard — what was sold, what the models cost, and what is left, plus live plans (MRR, ADM-12)
// and the alerts (what is wrong right now). Money in is a fact: the
// provider's orders (ADM-15), never rebuilt from credit grants. Money out is what llm_calls logged per call, at the
// price that applied (DeepSeek's peak included). Tokens are shown with their dollars: each model's input, cache and
// output tokens priced at its list rates, scaled so the parts add up to what was really spent. Times are unix seconds.

/** Polar's fee, an estimate: 4% + $0.40 per order. */
const FEE_RATE = 0.04
const FEE_FIXED_USD = 0.4

/** PRODUCTS as a SQL table: key, name, monthly-equivalent dollars, payments per grant, plan. */
const products = sql`(VALUES ${sql.join(
  PRODUCTS.map((p) => sql`(${p.key}::text, ${p.name}::text, ${p.interval === 'year' ? p.cents / 12 / 100 : p.cents / 100}::float8, ${p.interval === 'year' ? 1 / 12 : 1}::float8, ${p.plan}::text)`),
  sql`, `,
)}) AS pr(key, name, usd, payments, plan)`

export type Alert = { key: 'budget' | 'model' | 'errors' | 'screens' | 'paused'; text: string; href: string }

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
  return all<{ day: string; sold: number; spend: number; tokens: number }>(sql`
    SELECT to_char(g.d, 'YYYY-MM-DD') AS day,
      (SELECT coalesce(sum(amount_cents), 0)::float8 / 100 FROM orders WHERE lower(currency) = 'usd' AND ${dayOf(sql`created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS sold,
      (SELECT coalesce(sum(cost_usd), 0)::float8 FROM llm_calls WHERE ${dayOf(sql`created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS spend,
      (SELECT coalesce(sum(prompt_tokens + completion_tokens), 0)::float8 FROM llm_calls WHERE ${dayOf(sql`created_at`)} = to_char(g.d, 'YYYY-MM-DD')) AS tokens
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
  /** Live plans now: MRR (monthly-equivalent) and the count per plan. Not windowed — a plan has no history. */
  async subscriptions(now = clock()) {
    const r = await one<Record<string, unknown>>(sql`
      SELECT coalesce(sum(pr.usd), 0) AS mrr, count(*) FILTER (WHERE pr.plan = 'starter') AS starter, count(*) FILTER (WHERE pr.plan = 'pro') AS pro
      FROM subscriptions s JOIN ${products} ON pr.key = s.product_key
      WHERE s.status IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end > ${now})
    `)
    return { mrr: n(r, 'mrr'), starter: n(r, 'starter'), pro: n(r, 'pro') }
  },

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
      DashboardService.subscriptions(now),
      DashboardService.alerts(now),
      UsageService.limits(),
      window(midnight, now + 1),
      waitlist(now - span, now + 1),
    ])
    return { days, current, previous, models, series, subs, alerts, waitlist: list, now: { running: UsageService.running().length, paused: limits.paused, budget: limits.dailyBudgetUsd, spentToday: today.spend } }
  },
}
