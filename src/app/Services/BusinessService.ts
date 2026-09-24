import { sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { orders } from '@/database/schema'
import { CSV_MAX_ROWS, paging, toCsv, type LedgerQuery, type SubsQuery } from '@/admin/table-query'
import { PRODUCTS } from '@/lib/credit-prices'

// ADM-15: the Business pages — the credit ledger, subscriptions and revenue. Revenue is read from
// `orders`, which the order.paid webhook writes; nothing here is estimated from list prices except
// the provider's fee. ponytail: every order is taken as USD (the Polar products are priced in USD);
// a second currency needs a conversion before the sums mean anything.

const all = async <T>(q: SQL) => (await db.execute(q)).rows as T[]
const one = async <T>(q: SQL) => (await all<T>(q))[0]
const DAY = 86400
const now = () => Math.floor(Date.now() / 1000)
// Same as AdminStatsService: ILIKE text matched literally, and a 'YYYY-MM-DD' day as unix seconds (UTC).
const likeOf = (text: string) => `%${text.replace(/[\\%_]/g, (c) => '\\' + c)}%`
const dayStart = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000)
const dayOf = (col: SQL) => sql`to_char(to_timestamp(${col}) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`

/** Polar's fee as an estimate: 4% + $0.40 an order. */
export const FEE_RATE = 0.04
export const FEE_PER_ORDER_CENTS = 40
export const feeCents = (grossCents: number, orders: number) => Math.round(grossCents * FEE_RATE) + FEE_PER_ORDER_CENTS * orders

export type Order = typeof orders.$inferInsert
export type LedgerRow = { id: string; createdAt: number; userId: string; email: string | null; delta: number; kind: string; actionId: string | null; ref: string | null; note: string | null }
export type SubRow = { id: string; userId: string; email: string | null; productKey: string; status: string; startedAt: number; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean }
export type MarginRow = { userId: string; email: string | null; orders: number; revenue: number; spend: number; margin: number }

const marginsSql = sql`
  WITH r AS (SELECT user_id, count(*) AS orders, sum(amount_cents) / 100.0 AS revenue FROM orders GROUP BY user_id),
       s AS (SELECT user_id, sum(cost_usd) AS spend FROM llm_calls WHERE user_id IS NOT NULL GROUP BY user_id)
  SELECT coalesce(r.user_id, s.user_id) AS "userId", u.email, coalesce(r.orders, 0) AS orders,
    coalesce(r.revenue, 0)::float AS revenue, coalesce(s.spend, 0)::float AS spend, (coalesce(r.revenue, 0) - coalesce(s.spend, 0))::float AS margin
  FROM r FULL JOIN s ON s.user_id = r.user_id LEFT JOIN "user" u ON u.id = coalesce(r.user_id, s.user_id)`

export const BusinessService = {
  /** One paid order; a second delivery of the same order id stores nothing. */
  async recordOrder(o: Order) {
    await db.insert(orders).values(o).onConflictDoNothing()
  },

  /** The ledger, one page, with what the whole filter granted, spent (holds net of refunds) and let lapse. */
  async ledgerPage(f: LedgerQuery, page = paging(f)) {
    const where = [sql`true`]
    if (f.kind) where.push(sql`l.kind = ${f.kind}`)
    if (f.user) where.push(sql`u.email ILIKE ${likeOf(f.user)}`)
    if (f.from) where.push(sql`l.created_at >= ${dayStart(f.from)}`)
    if (f.to) where.push(sql`l.created_at < ${dayStart(f.to) + DAY}`)
    if (f.sign) where.push(f.sign === 'plus' ? sql`l.delta > 0` : sql`l.delta < 0`)
    if (f.q) {
      const l = likeOf(f.q)
      where.push(sql`(u.email ILIKE ${l} OR l.note ILIKE ${l} OR l.ref ILIKE ${l} OR l.action_id ILIKE ${l})`)
    }
    const w = sql.join(where, sql` AND `)
    const from = sql`FROM credit_ledger l LEFT JOIN "user" u ON u.id = l.user_id`
    // Only whitelisted names reach sql.raw; the parser has already dropped any other sort.
    const by = sql.raw({ when: 'l.created_at', delta: 'l.delta' }[f.sort ?? 'when'])
    const dir = sql.raw(f.dir === 'asc' ? 'ASC' : 'DESC')
    const [rows, sums] = await Promise.all([
      all<LedgerRow>(sql`
        SELECT l.id, l.created_at AS "createdAt", l.user_id AS "userId", u.email, l.delta, l.kind, l.action_id AS "actionId", l.ref, l.note
        ${from} WHERE ${w} ORDER BY ${by} ${dir}, l.seq ${dir} LIMIT ${page.limit} OFFSET ${page.offset}
      `),
      one<{ n: number; granted: number; spent: number; expired: number }>(sql`
        SELECT count(*) AS n,
          coalesce(sum(l.delta) FILTER (WHERE l.kind IN ('signup', 'admin', 'purchase', 'subscription')), 0)::int AS granted,
          coalesce(-sum(l.delta) FILTER (WHERE l.kind IN ('hold', 'refund')), 0)::int AS spent,
          coalesce(-sum(l.delta) FILTER (WHERE l.kind = 'expire'), 0)::int AS expired
        ${from} WHERE ${w}
      `),
    ])
    return { rows, total: sums?.n ?? 0, totals: { granted: sums?.granted ?? 0, spent: sums?.spent ?? 0, expired: sums?.expired ?? 0 } }
  },

  /** The whole filter as CSV, capped like every admin export. */
  async ledgerCsv(f: LedgerQuery) {
    const { rows } = await BusinessService.ledgerPage(f, { limit: CSV_MAX_ROWS, offset: 0 })
    return toCsv(rows, [
      ['id', (r) => r.id], ['time', (r) => new Date(r.createdAt * 1000).toISOString()], ['user', (r) => r.email ?? r.userId], ['kind', (r) => r.kind],
      ['delta', (r) => r.delta], ['action_id', (r) => r.actionId], ['ref', (r) => r.ref], ['note', (r) => r.note],
    ])
  },

  /** The model calls one action made — what a hold paid for. */
  actionCalls(actionId: string) {
    return all<{ id: string; createdAt: number; model: string; ok: boolean; costUsd: number; ms: number; promptTokens: number; completionTokens: number }>(sql`
      SELECT id, created_at AS "createdAt", model, ok, cost_usd AS "costUsd", ms, prompt_tokens AS "promptTokens", completion_tokens AS "completionTokens"
      FROM llm_calls WHERE action_id = ${actionId} ORDER BY created_at LIMIT 200
    `)
  },

  async subscriptionsPage(f: SubsQuery, page = paging(f)) {
    const where = [sql`true`]
    if (f.status) where.push(sql`s.status = ${f.status}`)
    if (f.plan) where.push(sql`s.product_key IN (${sql.join(PRODUCTS.filter((p) => p.plan === f.plan).map((p) => sql`${p.key}`), sql`, `)})`)
    if (f.q) where.push(sql`u.email ILIKE ${likeOf(f.q)}`)
    const w = sql.join(where, sql` AND `)
    const from = sql`FROM subscriptions s LEFT JOIN "user" u ON u.id = s.user_id`
    const by = sql.raw({ started: 's.started_at', end: 's.current_period_end' }[f.sort ?? 'started'])
    const dir = sql.raw(f.dir === 'asc' ? 'ASC' : 'DESC')
    const [rows, count] = await Promise.all([
      all<SubRow>(sql`
        SELECT s.id, s.user_id AS "userId", u.email, s.product_key AS "productKey", s.status, s.started_at AS "startedAt",
          s.current_period_end AS "currentPeriodEnd", s.cancel_at_period_end AS "cancelAtPeriodEnd"
        ${from} WHERE ${w} ORDER BY ${by} ${dir} NULLS LAST, s.id LIMIT ${page.limit} OFFSET ${page.offset}
      `),
      one<{ n: number }>(sql`SELECT count(*) AS n ${from} WHERE ${w}`),
    ])
    return { rows, total: count?.n ?? 0 }
  },

  /** Revenue from orders: totals, the last 30 days by day, by product, and margin per user (revenue − LLM spend). */
  async revenue() {
    const since = now() - DAY * 29
    const [t, days, byProduct, top, worst] = await Promise.all([
      one<{ orders: number; gross: number }>(sql`SELECT count(*) AS orders, coalesce(sum(amount_cents), 0)::bigint AS gross FROM orders`),
      all<{ day: string; revenue: number; orders: number }>(sql`
        SELECT ${dayOf(sql`created_at`)} AS day, (sum(amount_cents) / 100.0)::float AS revenue, count(*) AS orders
        FROM orders WHERE created_at >= ${since - (since % DAY)} GROUP BY day ORDER BY day
      `),
      all<{ productKey: string; orders: number; revenue: number }>(sql`
        SELECT product_key AS "productKey", count(*) AS orders, (sum(amount_cents) / 100.0)::float AS revenue FROM orders GROUP BY product_key ORDER BY revenue DESC
      `),
      all<MarginRow>(sql`SELECT * FROM (${marginsSql}) m WHERE orders > 0 ORDER BY revenue DESC, "userId" LIMIT 20`),
      all<MarginRow>(sql`SELECT * FROM (${marginsSql}) m ORDER BY margin ASC, "userId" LIMIT 20`),
    ])
    // Every one of the 30 days, so a quiet day is a zero on the chart rather than a missing point.
    const got = new Map(days.map((d) => [d.day, d]))
    const byDay = Array.from({ length: 30 }, (_, i) => {
      const day = new Date((since + i * DAY) * 1000).toISOString().slice(0, 10)
      return got.get(day) ?? { day, revenue: 0, orders: 0 }
    })
    const gross = t?.gross ?? 0
    const orderCount = t?.orders ?? 0
    const fees = feeCents(gross, orderCount)
    return { totals: { orders: orderCount, gross: gross / 100, refunds: 0, fees: fees / 100, net: (gross - fees) / 100 }, byDay, byProduct, top, worst }
  },

  /** One user's revenue, for the user page (the margin is this minus the spend it already shows). */
  async userRevenue(userId: string) {
    const r = await one<{ orders: number; revenue: number }>(sql`SELECT count(*) AS orders, coalesce(sum(amount_cents), 0) / 100.0 AS revenue FROM orders WHERE user_id = ${userId}`)
    return { orders: r?.orders ?? 0, revenue: Number(r?.revenue ?? 0) }
  },
}
