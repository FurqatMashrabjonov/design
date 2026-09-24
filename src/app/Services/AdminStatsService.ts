import { sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { UsageService } from './UsageService'
import { Setting } from '@/app/Models/Setting'
import { Credit } from '@/app/Models/Credit'
import { Project } from '@/app/Models/Project'

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
    return all<{
      id: string; name: string; email: string; image: string | null; role: string; banned: boolean; createdAt: number
      lastSeen: number | null; providers: string | null; projects: number; screens: number; calls24h: number; calls: number; spend: number; credits: number
    }>(sql`
      SELECT u.id, u.name, u.email, u.image, u.role, u.banned, ${epoch(sql`u.created_at`)} AS "createdAt",
        (SELECT ${epoch(sql`max(updated_at)`)} FROM session s WHERE s.user_id = u.id) AS "lastSeen",
        (SELECT string_agg(DISTINCT provider_id, ',') FROM account a WHERE a.user_id = u.id) AS providers,
        (SELECT count(*) FROM projects p WHERE p.user_id = u.id) AS projects,
        (SELECT count(*) FROM screens s JOIN projects p ON p.id = s.project_id WHERE p.user_id = u.id AND s.html != '' AND s.deleted_at IS NULL) AS screens,
        (SELECT count(*) FROM llm_calls c WHERE c.user_id = u.id AND c.created_at >= ${now() - DAY}) AS "calls24h",
        (SELECT count(*) FROM llm_calls c WHERE c.user_id = u.id) AS calls,
        (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls c WHERE c.user_id = u.id) AS spend,
        (SELECT coalesce(sum(delta), 0) FROM credit_ledger l WHERE l.user_id = u.id) AS credits
      FROM "user" u ORDER BY u.created_at DESC
    `)
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
}
