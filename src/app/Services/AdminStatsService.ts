import { sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { UsageService } from './UsageService'
import { Setting } from '@/app/Models/Setting'
import { Credit } from '@/app/Models/Credit'
import { Project } from '@/app/Models/Project'
import { adminEmails } from './AuthService'
import { paging, type CallsQuery, type UsersQuery } from '@/admin/table-query'

// ADM-02…08: what the admin panel reads. Plain aggregate SQL over the tables the product already
// writes (user, session, projects, screens, messages, llm_calls, credit_ledger) — nothing is collected
// just for the panel. Units differ: Better Auth's user/session times are timestamptz, every other
// table stores unix seconds. ponytail: computed on each request; add summary tables if it gets slow.

const all = async <T>(q: SQL) => (await db.execute(q)).rows as T[]
const one = async <T>(q: SQL) => (await all<T>(q))[0]
const now = () => Math.floor(Date.now() / 1000)
const DAY = 86400

/** The calendar day (UTC) of a unix-seconds column, as 'YYYY-MM-DD'. */
const dayOf = (col: SQL) => sql`to_char(to_timestamp(${col}) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
const epoch = (col: SQL) => sql`extract(epoch from ${col})::bigint`

type Window = { from: number; to: number }
// The current window ends a second ahead, so a row written this very second is inside it.
const windowOf = (days: number, back = 0): Window => ({ from: now() - DAY * days * (back + 1), to: now() - DAY * days * back + (back ? 0 : 1) })

async function kpisFor(w: Window) {
  const at = (col: SQL) => sql`${col} >= ${w.from} AND ${col} < ${w.to}`
  const r = (await one<Record<string, number | null>>(sql`
    SELECT
      (SELECT count(*) FROM "user" WHERE ${at(epoch(sql`created_at`))}) AS "newUsers",
      (SELECT count(*) FROM (
         SELECT user_id FROM session WHERE ${at(epoch(sql`updated_at`))}
         UNION SELECT user_id FROM llm_calls WHERE user_id IS NOT NULL AND ${at(sql`created_at`)}
      ) a) AS "activeUsers",
      (SELECT count(*) FROM screens WHERE html != '' AND ${at(sql`created_at`)}) AS screens,
      (SELECT count(*) FROM screens WHERE error IS NOT NULL AND ${at(sql`created_at`)}) AS "failedScreens",
      (SELECT count(*) FROM llm_calls WHERE ${at(sql`created_at`)}) AS calls,
      (SELECT count(*) FROM llm_calls WHERE NOT ok AND ${at(sql`created_at`)}) AS "failedCalls",
      (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls WHERE ${at(sql`created_at`)}) AS spend,
      (SELECT avg(ms) FROM llm_calls WHERE ok AND ${at(sql`created_at`)}) AS "avgMs"
  `))!
  const n = (k: string) => Number(r[k] ?? 0)
  return {
    newUsers: n('newUsers'),
    activeUsers: n('activeUsers'),
    screens: n('screens'),
    failedScreens: n('failedScreens'),
    calls: n('calls'),
    failRate: n('calls') ? n('failedCalls') / n('calls') : 0,
    spend: n('spend'),
    avgMs: n('avgMs'),
  }
}

/** ADM-03: one row of the users table — what a user did and what it cost. */
type UserRow = {
  id: string; name: string; email: string; image: string | null; role: string; banned: boolean; createdAt: number
  lastSeen: number | null; providers: string | null; projects: number; screens: number; calls24h: number; calls: number; spend: number; credits: number
}
const usersSql = (where: SQL) => sql`
  SELECT u.id, u.name, u.email, u.image, u.role, u.banned, ${epoch(sql`u.created_at`)} AS "createdAt",
    (SELECT ${epoch(sql`max(updated_at)`)} FROM session s WHERE s.user_id = u.id) AS "lastSeen",
    (SELECT string_agg(DISTINCT provider_id, ',') FROM account a WHERE a.user_id = u.id) AS providers,
    (SELECT count(*) FROM projects p WHERE p.user_id = u.id) AS projects,
    (SELECT count(*) FROM screens s JOIN projects p ON p.id = s.project_id WHERE p.user_id = u.id AND s.html != '' AND s.deleted_at IS NULL) AS screens,
    (SELECT count(*) FROM llm_calls c WHERE c.user_id = u.id AND c.created_at >= ${now() - DAY}) AS "calls24h",
    (SELECT count(*) FROM llm_calls c WHERE c.user_id = u.id) AS calls,
    (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls c WHERE c.user_id = u.id) AS spend,
    (SELECT coalesce(sum(delta), 0) FROM credit_ledger l WHERE l.user_id = u.id) AS credits
  FROM "user" u WHERE ${where}`

/** ADM-06/11: one model call, everything the detail panel shows. */
type CallRow = {
  id: string; createdAt: number; provider: string; model: string; actionId: string | null; promptTokens: number; cachedTokens: number; cacheWriteTokens: number
  completionTokens: number; costUsd: number; ms: number; ok: boolean; error: string | null; email: string | null; userId: string | null; project: string | null; projectId: string | null
}

/** ILIKE pattern that matches `text` literally anywhere: %, _ and \ are escaped. */
const likeOf = (text: string) => `%${text.replace(/[\\%_]/g, (c) => '\\' + c)}%`
/** Unix seconds at 00:00 UTC of a 'YYYY-MM-DD' day (the table parser has checked the shape). */
const dayStart = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000)

export const AdminStatsService = {
  /** ADM-02: KPIs for a window against the window before it, 30-day series, activation, "now". */
  async overview(days: 1 | 7 | 30) {
    const since = now() - DAY * 30
    const series = await all<{ day: string; signups: number; spend: number; screens: number }>(sql`
      SELECT to_char(d, 'YYYY-MM-DD') AS day,
        (SELECT count(*) FROM "user" WHERE (created_at AT TIME ZONE 'UTC')::date = d) AS signups,
        (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls WHERE ${dayOf(sql`created_at`)} = to_char(d, 'YYYY-MM-DD')) AS spend,
        (SELECT count(*) FROM screens WHERE html != '' AND ${dayOf(sql`created_at`)} = to_char(d, 'YYYY-MM-DD')) AS screens
      FROM generate_series((to_timestamp(${since}) AT TIME ZONE 'UTC')::date, (now() AT TIME ZONE 'UTC')::date, interval '1 day') AS g(d)
      ORDER BY d
    `)
    const act = (await one<{ users: number; withProject: number; twoPlus: number; returned: number }>(sql`
      SELECT
        (SELECT count(*) FROM "user") AS users,
        (SELECT count(DISTINCT user_id) FROM projects WHERE user_id IS NOT NULL) AS "withProject",
        (SELECT count(*) FROM (SELECT user_id FROM projects WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) >= 2) t) AS "twoPlus",
        (SELECT count(*) FROM "user" u WHERE EXISTS (SELECT 1 FROM llm_calls c WHERE c.user_id = u.id AND c.created_at > ${epoch(sql`u.created_at`)} + ${DAY}))
          AS returned
    `))!
    const running = UsageService.running()
    const who = running.length ? await all<{ id: string; email: string }>(sql`SELECT id, email FROM "user" WHERE id IN (${sql.join(running.map((r) => sql`${r}`), sql`, `)})`) : []
    const errors = await all<{ id: string; createdAt: number; provider: string; error: string | null; email: string | null; project: string | null }>(sql`
      SELECT c.id, c.created_at AS "createdAt", c.provider, c.error, u.email, p.name AS project
      FROM llm_calls c LEFT JOIN "user" u ON u.id = c.user_id LEFT JOIN projects p ON p.id = c.project_id
      WHERE NOT c.ok ORDER BY c.created_at DESC LIMIT 10
    `)
    const [current, previous, today, limits] = await Promise.all([
      kpisFor(windowOf(days)),
      kpisFor(windowOf(days, 1)),
      kpisFor({ from: Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000), to: now() + 1 }),
      UsageService.limits(),
    ])
    return { days, current, previous, series, activation: act, now: { running: who.map((w) => w.email), errors, limits, spentToday: today.spend } }
  },

  /** ADM-03: every user with what they did and what it cost. */
  users() {
    return all<UserRow>(sql`${usersSql(sql`true`)} ORDER BY u.created_at DESC`)
  },

  /** ADM-03: one user — projects, recent actions, calls, daily spend, limit override. */
  async user(id: string) {
    const row = (await AdminStatsService.users()).find((u) => u.id === id)
    if (!row) return null
    const [ban, override, limits, projects, credits, actions, calls, spendByDay] = await Promise.all([
      one<{ banReason: string | null }>(sql`SELECT ban_reason AS "banReason" FROM "user" WHERE id = ${id}`),
      Setting.get(`limits.user.${id}`),
      UsageService.limits(id),
      Project.cardsForUser(id),
      Credit.history(id),
      all<{ id: string; createdAt: number; role: string; kind: string; text: string; project: string; projectId: string }>(sql`
        SELECT m.id, m.created_at AS "createdAt", m.role, m.kind, m.text, p.name AS project, p.id AS "projectId"
        FROM messages m JOIN projects p ON p.id = m.project_id WHERE p.user_id = ${id} ORDER BY m.created_at DESC LIMIT 60
      `),
      AdminStatsService.calls({ userId: id, limit: 100 }),
      all<{ day: string; spend: number; calls: number }>(sql`
        SELECT ${dayOf(sql`created_at`)} AS day, coalesce(sum(cost_usd), 0) AS spend, count(*) AS calls
        FROM llm_calls WHERE user_id = ${id} AND created_at >= ${now() - DAY * 30} GROUP BY day ORDER BY day
      `),
    ])
    return { user: { ...row, banReason: ban?.banReason ?? null }, limit: { override, effective: limits.callsPerDay }, projects, credits, actions, calls, spendByDay }
  },

  /** ADM-06: the model-call log, newest first. */
  calls(f: { userId?: string; onlyErrors?: boolean; limit?: number } = {}) {
    const where = [sql`true`]
    if (f.userId) where.push(sql`c.user_id = ${f.userId}`)
    if (f.onlyErrors) where.push(sql`NOT c.ok`)
    return all<{ id: string; createdAt: number; provider: string; model: string; promptTokens: number; completionTokens: number; costUsd: number; ms: number; ok: boolean; error: string | null; email: string | null; userId: string | null; project: string | null; projectId: string | null }>(sql`
      SELECT c.id, c.created_at AS "createdAt", c.provider, c.model, c.prompt_tokens AS "promptTokens", c.completion_tokens AS "completionTokens",
        c.cost_usd AS "costUsd", c.ms, c.ok, c.error, u.email, u.id AS "userId", p.name AS project, p.id AS "projectId"
      FROM llm_calls c LEFT JOIN "user" u ON u.id = c.user_id LEFT JOIN projects p ON p.id = c.project_id
      WHERE ${sql.join(where, sql` AND `)} ORDER BY c.created_at DESC LIMIT ${f.limit ?? 300}
    `)
  },

  /** ADM-06: where generation goes wrong — failed screens by cause. */
  async quality() {
    const [failures, failedScreens] = await Promise.all([
      all<{ cause: string; count: number; last: number }>(sql`
        SELECT substr(error, 1, 60) AS cause, count(*) AS count, max(created_at) AS last
        FROM screens WHERE error IS NOT NULL AND deleted_at IS NULL GROUP BY cause ORDER BY count DESC LIMIT 20
      `),
      all<{ id: string; name: string; error: string; createdAt: number; project: string; projectId: string; owner: string | null }>(sql`
        SELECT s.id, s.name, s.error, s.created_at AS "createdAt", p.name AS project, p.id AS "projectId", u.email AS owner
        FROM screens s JOIN projects p ON p.id = s.project_id LEFT JOIN "user" u ON u.id = p.user_id
        WHERE s.error IS NOT NULL AND s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 50
      `),
    ])
    return { failures, failedScreens }
  },

  /** ADM-10: the command palette — users by email/name, projects by name; the text matches literally. */
  async search(q: string) {
    const t = q.trim()
    if (!t) return { users: [], projects: [] }
    const like = `%${t.replace(/[\\%_]/g, (c) => '\\' + c)}%`
    const [users, projects] = await Promise.all([
      all<{ id: string; name: string; email: string }>(sql`
        SELECT id, name, email FROM "user" WHERE email ILIKE ${like} OR name ILIKE ${like} ORDER BY created_at DESC LIMIT 6
      `),
      all<{ id: string; name: string; owner: string | null }>(sql`
        SELECT p.id, p.name, u.email AS owner FROM projects p LEFT JOIN "user" u ON u.id = p.user_id
        WHERE p.name ILIKE ${like} ORDER BY p.created_at DESC LIMIT 6
      `),
    ])
    return { users, projects }
  },

  /** ADM-08: the switches in force, where each comes from, and the system at a glance. */
  async controls() {
    const [counts, limits, settings, actions] = await Promise.all([
      one<{ dbBytes: number; images: number; users: number; projects: number; screens: number; calls: number }>(sql`
        SELECT pg_database_size(current_database()) AS "dbBytes", (SELECT count(*) FROM image_cache) AS images, (SELECT count(*) FROM "user") AS users,
          (SELECT count(*) FROM projects) AS projects, (SELECT count(*) FROM screens) AS screens, (SELECT count(*) FROM llm_calls) AS calls
      `),
      UsageService.limits(),
      Setting.all(),
      all<{ id: string; createdAt: number; action: string; target: string | null; detail: string | null; admin: string | null }>(sql`
        SELECT a.id, a.created_at AS "createdAt", a.action, a.target, a.detail, u.email AS admin
        FROM admin_actions a LEFT JOIN "user" u ON u.id = a.admin_id ORDER BY a.created_at DESC LIMIT 100
      `),
    ])
    return {
      limits,
      settings,
      envPaused: process.env.GENERATION_PAUSED === '1',
      system: { ...counts!, provider: process.env.LLM_PROVIDER || 'deepseek', node: process.version, env: process.env.NODE_ENV || 'development' },
      actions,
    }
  },

  /** ADM-11: the users table, one page — filtered, sorted and counted in SQL. `page` overrides paging (CSV). */
  async usersPage(f: UsersQuery, page = paging(f)) {
    const where = [sql`true`]
    if (f.q) {
      const l = likeOf(f.q)
      where.push(sql`(u.email ILIKE ${l} OR u.name ILIKE ${l})`)
    }
    if (f.role) {
      // An admin by ADMIN_EMAILS is an admin here too, as the table shows them.
      const emails = adminEmails()
      const admin = emails.length ? sql`(u.role = 'admin' OR lower(u.email) IN (${sql.join(emails.map((e) => sql`${e}`), sql`, `)}))` : sql`(u.role = 'admin')`
      where.push(f.role === 'admin' ? admin : sql`NOT ${admin}`)
    }
    if (f.status) where.push(f.status === 'banned' ? sql`u.banned IS TRUE` : sql`u.banned IS NOT TRUE`)
    if (f.from) where.push(sql`u.created_at >= to_timestamp(${dayStart(f.from)})`)
    if (f.to) where.push(sql`u.created_at < to_timestamp(${dayStart(f.to) + DAY})`)
    const w = sql.join(where, sql` AND `)
    // Only whitelisted names reach sql.raw; the parser has already dropped any other sort.
    const by = sql.raw({ joined: '"createdAt"', seen: '"lastSeen"', projects: 'projects', screens: 'screens', spend: 'spend', credits: 'credits' }[f.sort ?? 'joined'])
    const dir = sql.raw(f.dir === 'asc' ? 'ASC' : 'DESC')
    // ponytail: the per-user subqueries run for every matching user before the sort; summary columns if it gets slow.
    const [rows, count] = await Promise.all([
      all<UserRow>(sql`SELECT * FROM (${usersSql(w)}) t ORDER BY ${by} ${dir} NULLS LAST, id ${dir} LIMIT ${page.limit} OFFSET ${page.offset}`),
      one<{ n: number }>(sql`SELECT count(*) AS n FROM "user" u WHERE ${w}`),
    ])
    return { rows, total: count?.n ?? 0 }
  },

  /** ADM-11: the model-call log, one page — filtered, sorted and counted in SQL — and the models to filter by. */
  async callsPage(f: CallsQuery, page = paging(f)) {
    const where = [sql`true`]
    if (f.result) where.push(f.result === 'ok' ? sql`c.ok` : sql`NOT c.ok`)
    if (f.model) where.push(sql`c.model = ${f.model}`)
    if (f.user) where.push(sql`u.email ILIKE ${likeOf(f.user)}`)
    if (f.from) where.push(sql`c.created_at >= ${dayStart(f.from)}`)
    if (f.to) where.push(sql`c.created_at < ${dayStart(f.to) + DAY}`)
    if (f.minCost !== undefined) where.push(sql`c.cost_usd >= ${f.minCost}`)
    if (f.q) {
      const l = likeOf(f.q)
      where.push(sql`(u.email ILIKE ${l} OR p.name ILIKE ${l} OR c.model ILIKE ${l} OR c.error ILIKE ${l})`)
    }
    const w = sql.join(where, sql` AND `)
    const by = sql.raw({ when: 'c.created_at', cost: 'c.cost_usd', ms: 'c.ms', tokens: '(c.prompt_tokens + c.completion_tokens)' }[f.sort ?? 'when'])
    const dir = sql.raw(f.dir === 'asc' ? 'ASC' : 'DESC')
    const from = sql`FROM llm_calls c LEFT JOIN "user" u ON u.id = c.user_id LEFT JOIN projects p ON p.id = c.project_id`
    const [rows, count, models] = await Promise.all([
      all<CallRow>(sql`
        SELECT c.id, c.created_at AS "createdAt", c.provider, c.model, c.action_id AS "actionId",
          c.prompt_tokens AS "promptTokens", c.cached_tokens AS "cachedTokens", c.cache_write_tokens AS "cacheWriteTokens",
          c.completion_tokens AS "completionTokens", c.cost_usd AS "costUsd", c.ms, c.ok, c.error,
          u.email, u.id AS "userId", p.name AS project, p.id AS "projectId"
        ${from} WHERE ${w} ORDER BY ${by} ${dir}, c.id ${dir} LIMIT ${page.limit} OFFSET ${page.offset}
      `),
      one<{ n: number }>(sql`SELECT count(*) AS n ${from} WHERE ${w}`),
      all<{ model: string }>(sql`SELECT DISTINCT model FROM llm_calls WHERE model != '' ORDER BY model`),
    ])
    return { rows, total: count?.n ?? 0, models: models.map((m) => m.model) }
  },
}
