import { createHash } from 'node:crypto'
import { format } from 'node:util'
import { and, desc, eq, gt, gte, ilike, lt, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { httpRequests, llmCalls, serverLogs, user } from '@/database/schema'
import { RequestContext } from './RequestContext'

// OBS-10/OBS-11: a Laravel-Telescope-like record of what the server did — every HTTP request
// (src/start.ts) and every console line and uncaught error. Recording never delays or breaks a
// response: inserts are fire-and-forget and a failure is printed with the ORIGINAL console, so it
// cannot recurse. Rows are kept 7 days and at most 200 000 per table.

const DAY = 86400
const KEEP_SECONDS = 7 * DAY
const MAX_ROWS = 200_000
const PAGE = 50

// The console as it was before installServerLogs(); on globalThis so a dev-server reload of this
// module does not wrap the wrapper.
type Con = Pick<Console, 'log' | 'info' | 'warn' | 'error'>
const G = globalThis as typeof globalThis & { __odConsole?: Con; __odLogsInstalled?: boolean; __odCleanupAt?: number }
const original = (): Con => G.__odConsole ?? console

/** Dev internals and static files are not requests anyone wants to read; thumbnails are too many. */
export function skipPath(path: string): boolean {
  return /^\/(@vite|@fs|@id|@react-refresh|node_modules\/|src\/|showcase\/|api\/thumb\/|__vite)/.test(path) || /\.(js|mjs|ts|tsx|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|txt|json)$/i.test(path)
}

const SECRET_PARAM = /token|key|secret|code|password|session|signature/i

/** The query string with the values of secret-looking params masked; null when there is none. */
export function maskQuery(search: string): string | null {
  const p = new URLSearchParams(search)
  if ([...p.keys()].length === 0) return null
  const out = new URLSearchParams()
  for (const [k, v] of p) out.append(k, SECRET_PARAM.test(k) ? '***' : v)
  return out.toString().slice(0, 1000)
}

/** Repeats of one error share this: its name, its message with ids and numbers blanked, and where it was thrown. */
export function fingerprint(name: string, message: string, stack?: string | null): string {
  const norm = message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '#')
    .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{8,}\b/gi, '#')
    .replace(/\d+/g, '#')
  // The first frame, without Vite's ?t=… cache busters.
  const frame = stack?.split('\n').find((l) => /^\s+at /.test(l))?.trim().replace(/\?[^:)\s]*/g, '') ?? ''
  return createHash('sha256').update(`${name}\n${norm}\n${frame}`).digest('hex').slice(0, 12)
}

const hashIp = (ip: string | null | undefined) => (ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : null)

/** Delete what is older than 7 days, and the oldest beyond the cap. Lazily, at most once an hour. */
function maybeCleanup() {
  const now = Date.now()
  if (G.__odCleanupAt && now - G.__odCleanupAt < 3_600_000) return
  G.__odCleanupAt = now
  TelescopeService.cleanup().catch((e) => original().error('[telescope] cleanup failed:', e))
}

export type RequestRecord = { id: string; method: string; path: string; query: string | null; kind: string; status: number; ms: number; userId?: string | null; ip?: string | null; userAgent?: string | null; size?: number | null }
export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export type RequestFilters = { method?: string; status?: '2xx' | '3xx' | '4xx' | '5xx'; path?: string; email?: string; slowMs?: number; from?: number; to?: number; page?: number }
export type LogFilters = { level?: 'info' | 'warn' | 'error'; q?: string; afterId?: number; page?: number }

const like = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

export const TelescopeService = {
  /** Fire-and-forget: never awaited by the response. */
  record(r: RequestRecord): void {
    db.insert(httpRequests)
      .values({ id: r.id, method: r.method, path: r.path.slice(0, 500), query: r.query, kind: r.kind, status: r.status, ms: Math.round(r.ms), userId: r.userId ?? null, ipHash: hashIp(r.ip), userAgent: r.userAgent?.slice(0, 200) ?? null, size: r.size ?? null })
      .catch((e) => original().error('[telescope] could not record a request:', e))
    maybeCleanup()
  },

  /** One console line (or uncaught error) → server_logs, with the current request's id. */
  log(level: LogLevel, args: unknown[]): Promise<void> {
    const err = args.find((a): a is Error => a instanceof Error)
    // An Error prints as its name and message here; its stack has its own column.
    // Secret-looking URL params (the dev magic link's token) and bearer tokens are masked before storing.
    const message = format(...args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : a)))
      .replace(/([?&][^=&\s]*(?:token|key|secret|code|password|session|signature)[^=&\s]*=)[^&\s"'<>]+/gi, '$1***')
      .replace(/(Bearer\s+)\S+/gi, '$1***')
      .slice(0, 4000)
    const stack = err?.stack?.slice(0, 8000) ?? null
    const row = { level, message, stack, fingerprint: level === 'error' ? fingerprint(err?.name ?? 'Error', message, stack) : null, requestId: RequestContext.get()?.requestId ?? null }
    maybeCleanup()
    return db
      .insert(serverLogs)
      .values(row)
      .then(() => undefined, (e) => original().error('[telescope] could not store a log line:', e))
  },

  async cleanup(): Promise<void> {
    const cutoff = Math.floor(Date.now() / 1000) - KEEP_SECONDS
    for (const t of [httpRequests, serverLogs]) {
      await db.delete(t).where(lt(t.createdAt, cutoff))
      // ponytail: ties on the boundary second may keep a few rows over the cap.
      await db.execute(sql`DELETE FROM ${t} WHERE created_at < (SELECT created_at FROM ${t} ORDER BY created_at DESC OFFSET ${MAX_ROWS} LIMIT 1)`)
    }
  },

  async requests(f: RequestFilters) {
    const where: SQL[] = []
    if (f.method) where.push(eq(httpRequests.method, f.method))
    if (f.status) {
      const lo = Number(f.status[0]) * 100
      where.push(gte(httpRequests.status, lo), lt(httpRequests.status, lo + 100))
    }
    if (f.path) where.push(ilike(httpRequests.path, like(f.path)))
    if (f.email) where.push(ilike(user.email, like(f.email)))
    if (f.slowMs) where.push(gte(httpRequests.ms, f.slowMs))
    if (f.from) where.push(gte(httpRequests.createdAt, f.from))
    if (f.to) where.push(lte(httpRequests.createdAt, f.to))
    const cond = where.length ? and(...where) : undefined
    const page = Math.max(0, f.page ?? 0)
    const [rows, total] = await Promise.all([
      db.select({ id: httpRequests.id, method: httpRequests.method, path: httpRequests.path, query: httpRequests.query, kind: httpRequests.kind, status: httpRequests.status, ms: httpRequests.ms, userId: httpRequests.userId, email: user.email, createdAt: httpRequests.createdAt })
        .from(httpRequests).leftJoin(user, eq(user.id, httpRequests.userId)).where(cond)
        .orderBy(desc(httpRequests.createdAt), desc(httpRequests.id)).limit(PAGE).offset(page * PAGE),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(httpRequests).leftJoin(user, eq(user.id, httpRequests.userId)).where(cond),
    ])
    return { rows, total: total[0]?.n ?? 0, page, pageSize: PAGE }
  },

  async request(id: string) {
    const [req] = await db.select({ r: httpRequests, email: user.email }).from(httpRequests).leftJoin(user, eq(user.id, httpRequests.userId)).where(eq(httpRequests.id, id))
    const logs = await db.select().from(serverLogs).where(eq(serverLogs.requestId, id)).orderBy(serverLogs.id)
    const calls = await db
      .select({ id: llmCalls.id, model: llmCalls.model, provider: llmCalls.provider, promptTokens: llmCalls.promptTokens, completionTokens: llmCalls.completionTokens, costUsd: llmCalls.costUsd, ms: llmCalls.ms, ok: llmCalls.ok, error: llmCalls.error, createdAt: llmCalls.createdAt })
      .from(llmCalls).where(eq(llmCalls.requestId, id)).orderBy(llmCalls.createdAt)
    // A background run (a plan drawing after its page closed) can log under a request that is not in the table.
    if (!req && logs.length === 0 && calls.length === 0) return null
    return { request: req ? { ...req.r, email: req.email } : null, logs, calls }
  },

  async logs(f: LogFilters) {
    const where: SQL[] = []
    if (f.level) where.push(f.level === 'info' ? sql`${serverLogs.level} IN ('log', 'info')` : eq(serverLogs.level, f.level))
    if (f.q) where.push(ilike(serverLogs.message, like(f.q)))
    if (f.afterId) where.push(gt(serverLogs.id, f.afterId))
    const cond = where.length ? and(...where) : undefined
    const page = Math.max(0, f.page ?? 0)
    const [rows, total] = await Promise.all([
      db.select().from(serverLogs).where(cond).orderBy(desc(serverLogs.id)).limit(f.afterId ? 200 : PAGE).offset(f.afterId ? 0 : page * PAGE),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(serverLogs).where(cond),
    ])
    return { rows, total: total[0]?.n ?? 0, page, pageSize: PAGE }
  },

  /** Errors grouped by fingerprint, most recent first. */
  async errors() {
    const r = await db.execute<{ fingerprint: string; count: number; first_seen: number; last_seen: number; message: string; stack: string | null; request_id: string | null }>(sql`
      SELECT fingerprint, count(*) AS count, min(created_at) AS first_seen, max(created_at) AS last_seen,
        (array_agg(message ORDER BY id DESC))[1] AS message,
        (array_agg(stack ORDER BY id DESC) FILTER (WHERE stack IS NOT NULL))[1] AS stack,
        (array_agg(request_id ORDER BY id DESC) FILTER (WHERE request_id IS NOT NULL))[1] AS request_id
      FROM server_logs WHERE level = 'error' AND fingerprint IS NOT NULL
      GROUP BY fingerprint ORDER BY max(created_at) DESC LIMIT 200`)
    return r.rows.map((e) => ({ fingerprint: e.fingerprint, count: Number(e.count), firstSeen: Number(e.first_seen), lastSeen: Number(e.last_seen), message: e.message, stack: e.stack, requestId: e.request_id }))
  },
}

/**
 * OBS-11: from now on every console.log/info/warn/error still prints, and is also stored; an
 * unhandled rejection or uncaught exception is stored as an error. Idempotent.
 */
export function installServerLogs(): void {
  if (G.__odLogsInstalled) return
  G.__odLogsInstalled = true
  const orig: Con = { log: console.log.bind(console), info: console.info.bind(console), warn: console.warn.bind(console), error: console.error.bind(console) }
  G.__odConsole = orig
  let busy = false // a log line written while storing one is printed, not stored again
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    console[level] = (...args: unknown[]) => {
      orig[level](...args)
      if (busy) return
      busy = true
      try {
        void TelescopeService.log(level, args)
      } catch (e) {
        orig.error('[telescope] could not store a log line:', e)
      } finally {
        busy = false
      }
    }
  }
  process.on('unhandledRejection', (reason) => {
    orig.error('Unhandled rejection:', reason)
    void TelescopeService.log('error', ['Unhandled rejection:', reason])
  })
  // A listener here replaces Node's default of printing and exiting, so it does both itself — after
  // giving the row a moment to be written, never swallowing the crash.
  process.on('uncaughtException', (err) => {
    orig.error(err)
    const exit = () => process.exit(1)
    setTimeout(exit, 1000)
    TelescopeService.log('error', [err]).finally(exit)
  })
}
