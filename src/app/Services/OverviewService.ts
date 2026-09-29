import { sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { PRODUCTS } from '@/lib/credit-prices'
import { UsageService } from './UsageService'

// ADM-12: live plans (MRR) and the alerts — what is wrong right now. The dashboard's money is DashboardService
// (ADM-20: sold from orders, not rebuilt from credit grants). Every function takes `now` (unix seconds) so tests
// pin the clock.

const all = async <T>(q: SQL) => (await db.execute(q)).rows as T[]
const one = async <T>(q: SQL) => (await all<T>(q))[0]!
const clock = () => Math.floor(Date.now() / 1000)
const DAY = 86400
const n = (r: Record<string, unknown>, k: string) => Number(r[k] ?? 0)

/** PRODUCTS as a SQL table: key, name, monthly-equivalent dollars, payments per grant, plan. */
const products = sql`(VALUES ${sql.join(
  PRODUCTS.map((p) => sql`(${p.key}::text, ${p.name}::text, ${p.interval === 'year' ? p.cents / 12 / 100 : p.cents / 100}::float8, ${p.interval === 'year' ? 1 / 12 : 1}::float8, ${p.plan}::text)`),
  sql`, `,
)}) AS pr(key, name, usd, payments, plan)`

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
}
