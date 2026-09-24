import { statSync } from 'node:fs'
import { sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { UsageService } from './UsageService'
import { Setting } from '@/app/Models/Setting'
import { Project } from '@/app/Models/Project'

// ADM-02…08: what the admin panel reads. Plain aggregate SQL over the tables the product already
// writes (user, session, projects, screens, messages, llm_calls, feedback) — nothing is collected
// just for the panel. Units differ: Better Auth's user/session times are milliseconds, every other
// table stores unix seconds. ponytail: computed on each request; add summary tables if it gets slow.
//
// Postgres note: SQLite-specific pieces are dayOf(), the day series CTE (date(…, '+1 day')) and
// group_concat — all in this file.

const all = <T>(q: SQL) => db.all<T>(q)
const one = <T>(q: SQL) => db.get<T>(q)
const now = () => Math.floor(Date.now() / 1000)
const DAY = 86400

/** The calendar day (UTC) of a unix-seconds column, as 'YYYY-MM-DD'. */
const dayOf = (col: SQL) => sql`date(${col}, 'unixepoch')`

type Window = { from: number; to: number }
// The current window ends a second ahead, so a row written this very second is inside it.
const windowOf = (days: number, back = 0): Window => ({ from: now() - DAY * days * (back + 1), to: now() - DAY * days * back + (back ? 0 : 1) })

function kpisFor(w: Window) {
  const ms = { from: w.from * 1000, to: w.to * 1000 }
  const r = one<Record<string, number | null>>(sql`
    SELECT
      (SELECT count(*) FROM user WHERE created_at >= ${ms.from} AND created_at < ${ms.to}) AS newUsers,
      (SELECT count(*) FROM (
         SELECT user_id FROM session WHERE updated_at >= ${ms.from} AND updated_at < ${ms.to}
         UNION SELECT user_id FROM llm_calls WHERE user_id IS NOT NULL AND created_at >= ${w.from} AND created_at < ${w.to}
      )) AS activeUsers,
      (SELECT count(*) FROM screens WHERE html != '' AND created_at >= ${w.from} AND created_at < ${w.to}) AS screens,
      (SELECT count(*) FROM screens WHERE error IS NOT NULL AND created_at >= ${w.from} AND created_at < ${w.to}) AS failedScreens,
      (SELECT count(*) FROM llm_calls WHERE created_at >= ${w.from} AND created_at < ${w.to}) AS calls,
      (SELECT count(*) FROM llm_calls WHERE ok = 0 AND created_at >= ${w.from} AND created_at < ${w.to}) AS failedCalls,
      (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls WHERE created_at >= ${w.from} AND created_at < ${w.to}) AS spend,
      (SELECT avg(ms) FROM llm_calls WHERE ok = 1 AND created_at >= ${w.from} AND created_at < ${w.to}) AS avgMs
  `)!
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
  overview(days: 1 | 7 | 30) {
    const since = now() - DAY * 30
    const series = all<{ day: string; signups: number; spend: number; screens: number }>(sql`
      WITH RECURSIVE d(day) AS (SELECT date(${since}, 'unixepoch') UNION ALL SELECT date(day, '+1 day') FROM d WHERE day < date('now'))
      SELECT d.day AS day,
        (SELECT count(*) FROM user WHERE date(created_at / 1000, 'unixepoch') = d.day) AS signups,
        (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls WHERE ${dayOf(sql`created_at`)} = d.day) AS spend,
        (SELECT count(*) FROM screens WHERE html != '' AND ${dayOf(sql`created_at`)} = d.day) AS screens
      FROM d ORDER BY d.day
    `)
    const act = one<{ users: number; withProject: number; twoPlus: number; returned: number }>(sql`
      SELECT
        (SELECT count(*) FROM user) AS users,
        (SELECT count(DISTINCT user_id) FROM projects WHERE user_id IS NOT NULL) AS withProject,
        (SELECT count(*) FROM (SELECT user_id FROM projects WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) >= 2)) AS twoPlus,
        (SELECT count(*) FROM user u WHERE EXISTS (SELECT 1 FROM llm_calls c WHERE c.user_id = u.id AND c.created_at > u.created_at / 1000 + ${DAY}))
          AS returned
    `)!
    const running = UsageService.running()
    const who = running.length
      ? all<{ id: string; email: string }>(sql`SELECT id, email FROM user WHERE id IN (${sql.join(running.map((r) => sql`${r}`), sql`, `)})`)
      : []
    const errors = all<{ id: string; createdAt: number; provider: string; error: string | null; email: string | null; project: string | null }>(sql`
      SELECT c.id, c.created_at AS createdAt, c.provider, c.error, u.email, p.name AS project
      FROM llm_calls c LEFT JOIN user u ON u.id = c.user_id LEFT JOIN projects p ON p.id = c.project_id
      WHERE c.ok = 0 ORDER BY c.created_at DESC LIMIT 10
    `)
    return {
      days,
      current: kpisFor(windowOf(days)),
      previous: kpisFor(windowOf(days, 1)),
      series,
      activation: act,
      now: { running: who.map((w) => w.email), errors, limits: UsageService.limits(), spentToday: kpisFor({ from: Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000), to: now() + 1 }).spend },
    }
  },

  /** ADM-03: every user with what they did and what it cost. */
  users() {
    return all<{
      id: string; name: string; email: string; image: string | null; role: string; banned: number; createdAt: number
      lastSeen: number | null; providers: string | null; projects: number; screens: number; calls24h: number; calls: number; spend: number; up: number; down: number
    }>(sql`
      SELECT u.id, u.name, u.email, u.image, u.role, u.banned, u.created_at / 1000 AS createdAt,
        (SELECT max(updated_at) / 1000 FROM session s WHERE s.user_id = u.id) AS lastSeen,
        (SELECT group_concat(DISTINCT provider_id) FROM account a WHERE a.user_id = u.id) AS providers,
        (SELECT count(*) FROM projects p WHERE p.user_id = u.id) AS projects,
        (SELECT count(*) FROM screens s JOIN projects p ON p.id = s.project_id WHERE p.user_id = u.id AND s.html != '' AND s.deleted_at IS NULL) AS screens,
        (SELECT count(*) FROM llm_calls c WHERE c.user_id = u.id AND c.created_at >= ${now() - DAY}) AS calls24h,
        (SELECT count(*) FROM llm_calls c WHERE c.user_id = u.id) AS calls,
        (SELECT coalesce(sum(cost_usd), 0) FROM llm_calls c WHERE c.user_id = u.id) AS spend,
        (SELECT count(*) FROM feedback f JOIN projects p ON p.id = f.project_id WHERE p.user_id = u.id AND f.value = 'up') AS up,
        (SELECT count(*) FROM feedback f JOIN projects p ON p.id = f.project_id WHERE p.user_id = u.id AND f.value = 'down') AS down
      FROM user u ORDER BY u.created_at DESC
    `)
  },

  /** ADM-03: one user — projects, recent actions, calls, daily spend, limit override. */
  user(id: string) {
    const row = AdminStatsService.users().find((u) => u.id === id)
    if (!row) return null
    const ban = one<{ banReason: string | null }>(sql`SELECT ban_reason AS banReason FROM user WHERE id = ${id}`)
    return {
      user: { ...row, banReason: ban?.banReason ?? null },
      limit: { override: Setting.get(`limits.user.${id}`), effective: UsageService.limits(id).callsPerDay },
      projects: Project.cardsForUser(id),
      actions: all<{ id: string; createdAt: number; role: string; kind: string; text: string; project: string; projectId: string }>(sql`
        SELECT m.id, m.created_at AS createdAt, m.role, m.kind, m.text, p.name AS project, p.id AS projectId
        FROM messages m JOIN projects p ON p.id = m.project_id WHERE p.user_id = ${id} ORDER BY m.created_at DESC LIMIT 60
      `),
      calls: AdminStatsService.calls({ userId: id, limit: 100 }),
      spendByDay: all<{ day: string; spend: number; calls: number }>(sql`
        SELECT ${dayOf(sql`created_at`)} AS day, coalesce(sum(cost_usd), 0) AS spend, count(*) AS calls
        FROM llm_calls WHERE user_id = ${id} AND created_at >= ${now() - DAY * 30} GROUP BY day ORDER BY day
      `),
    }
  },

  /** ADM-06: the model-call log, newest first. */
  calls(f: { userId?: string; onlyErrors?: boolean; limit?: number } = {}) {
    const where = [sql`1 = 1`]
    if (f.userId) where.push(sql`c.user_id = ${f.userId}`)
    if (f.onlyErrors) where.push(sql`c.ok = 0`)
    return all<{ id: string; createdAt: number; provider: string; model: string; promptTokens: number; completionTokens: number; costUsd: number; ms: number; ok: number; error: string | null; email: string | null; userId: string | null; project: string | null; projectId: string | null }>(sql`
      SELECT c.id, c.created_at AS createdAt, c.provider, c.model, c.prompt_tokens AS promptTokens, c.completion_tokens AS completionTokens,
        c.cost_usd AS costUsd, c.ms, c.ok, c.error, u.email, u.id AS userId, p.name AS project, p.id AS projectId
      FROM llm_calls c LEFT JOIN user u ON u.id = c.user_id LEFT JOIN projects p ON p.id = c.project_id
      WHERE ${sql.join(where, sql` AND `)} ORDER BY c.created_at DESC LIMIT ${f.limit ?? 300}
    `)
  },

  /** ADM-06: where generation goes wrong — failed screens by cause. */
  quality() {
    return {
      failures: all<{ cause: string; count: number; last: number }>(sql`
        SELECT substr(error, 1, 60) AS cause, count(*) AS count, max(created_at) AS last
        FROM screens WHERE error IS NOT NULL AND deleted_at IS NULL GROUP BY cause ORDER BY count DESC LIMIT 20
      `),
      failedScreens: all<{ id: string; name: string; error: string; createdAt: number; project: string; projectId: string; owner: string | null }>(sql`
        SELECT s.id, s.name, s.error, s.created_at AS createdAt, p.name AS project, p.id AS projectId, u.email AS owner
        FROM screens s JOIN projects p ON p.id = s.project_id LEFT JOIN user u ON u.id = p.user_id
        WHERE s.error IS NOT NULL AND s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 50
      `),
    }
  },

  /** ADM-08: the switches in force, where each comes from, and the system at a glance. */
  controls() {
    const dbPath = process.env.DB_PATH || 'data.db'
    let dbBytes = 0
    try {
      dbBytes = statSync(dbPath).size
    } catch {}
    const counts = one<{ images: number; users: number; projects: number; screens: number; calls: number }>(sql`
      SELECT (SELECT count(*) FROM image_cache) AS images, (SELECT count(*) FROM user) AS users, (SELECT count(*) FROM projects) AS projects,
        (SELECT count(*) FROM screens) AS screens, (SELECT count(*) FROM llm_calls) AS calls
    `)!
    return {
      limits: UsageService.limits(),
      settings: Setting.all(),
      envPaused: process.env.GENERATION_PAUSED === '1',
      system: { dbBytes, ...counts, provider: process.env.LLM_PROVIDER || 'deepseek', node: process.version, env: process.env.NODE_ENV || 'development' },
      actions: all<{ id: string; createdAt: number; action: string; target: string | null; detail: string | null; admin: string | null }>(sql`
        SELECT a.id, a.created_at AS createdAt, a.action, a.target, a.detail, u.email AS admin
        FROM admin_actions a LEFT JOIN user u ON u.id = a.admin_id ORDER BY a.created_at DESC LIMIT 100
      `),
    }
  },
}

