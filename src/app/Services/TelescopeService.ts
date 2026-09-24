import { createHash } from 'node:crypto'
import { format } from 'node:util'
import { and, desc, eq, gt, gte, ilike, lt, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '@/database/connection'
import { AsyncLocalStorage } from 'node:async_hooks'
import { httpRequests, llmCalls, outgoingRequests, serverLogs, user, webhookEvents } from '@/database/schema'
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
const G = globalThis as typeof globalThis & { __odConsole?: Con; __odLogsInstalled?: boolean; __odCleanupAt?: number; __odFetchInstalled?: boolean }
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

/** Free text with secret-looking URL params and bearer tokens masked. */
export const maskText = (s: string) =>
  s.replace(/([?&][^=&\s]*(?:token|key|secret|code|password|session|signature)[^=&\s]*=)[^&\s"'<>]+/gi, '$1***').replace(/(Bearer\s+)\S+/gi, '$1***')

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
    const message = maskText(format(...args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : a)))).slice(0, 4000)
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
    for (const t of [httpRequests, serverLogs, outgoingRequests, webhookEvents]) {
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
    const outgoing = await db.select().from(outgoingRequests).where(eq(outgoingRequests.requestId, id)).orderBy(outgoingRequests.id)
    // A background run (a plan drawing after its page closed) can log under a request that is not in the table.
    if (!req && logs.length === 0 && calls.length === 0 && outgoing.length === 0) return null
    return { request: req ? { ...req.r, email: req.email } : null, logs, calls, outgoing }
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

  /** OBS-12: one outgoing call. Fire-and-forget, and inside `quiet`, so nothing it does is recorded as outgoing again. */
  recordOutgoing(r: OutgoingRecord): void {
    quiet.run(true, () => {
      try {
        db.insert(outgoingRequests)
          .values({ requestId: r.requestId, method: r.method, host: r.host.slice(0, 200), path: r.path.slice(0, 500), query: r.query, purpose: r.purpose, status: r.status, error: r.error?.slice(0, 500) ?? null, ms: Math.round(r.ms), size: r.size })
          .catch((e) => original().error('[telescope] could not record an outgoing call:', e))
        maybeCleanup()
      } catch (e) {
        original().error('[telescope] could not record an outgoing call:', e)
      }
    })
  },

  /** OBS-12: one webhook POST. The payload is kept only when verified and at most 64 KB. */
  recordWebhook(w: WebhookRecord): Promise<void> {
    const payload = w.verified && w.payload && Buffer.byteLength(w.payload) <= MAX_PAYLOAD ? w.payload : null
    maybeCleanup()
    return db
      .insert(webhookEvents)
      .values({ provider: w.provider, eventType: w.eventType?.slice(0, 100) ?? null, eventId: w.eventId?.slice(0, 200) ?? null, verified: w.verified, result: w.result.slice(0, 500), httpStatus: w.httpStatus, payload, requestId: RequestContext.get()?.requestId ?? null })
      .then(() => undefined, (e) => original().error('[telescope] could not store a webhook:', e))
  },

  async outgoing(f: OutgoingFilters) {
    const where: SQL[] = []
    if (f.purpose) where.push(eq(outgoingRequests.purpose, f.purpose))
    if (f.status === 'error') where.push(sql`${outgoingRequests.status} IS NULL`)
    else if (f.status) {
      const lo = Number(f.status[0]) * 100
      where.push(gte(outgoingRequests.status, lo), lt(outgoingRequests.status, lo + 100))
    }
    if (f.host) where.push(ilike(outgoingRequests.host, like(f.host)))
    if (f.slowMs) where.push(gte(outgoingRequests.ms, f.slowMs))
    if (f.from) where.push(gte(outgoingRequests.createdAt, f.from))
    if (f.to) where.push(lte(outgoingRequests.createdAt, f.to))
    const cond = where.length ? and(...where) : undefined
    const page = Math.max(0, f.page ?? 0)
    const [rows, total] = await Promise.all([
      db.select().from(outgoingRequests).where(cond).orderBy(desc(outgoingRequests.id)).limit(PAGE).offset(page * PAGE),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(outgoingRequests).where(cond),
    ])
    return { rows, total: total[0]?.n ?? 0, page, pageSize: PAGE }
  },

  /** The list leaves the payload out; one event (below) carries it. */
  async webhooks(f: WebhookFilters) {
    const where: SQL[] = []
    if (f.type) where.push(ilike(webhookEvents.eventType, like(f.type)))
    if (f.verified !== undefined) where.push(eq(webhookEvents.verified, f.verified))
    if (f.result) where.push(ilike(webhookEvents.result, like(f.result)))
    const cond = where.length ? and(...where) : undefined
    const page = Math.max(0, f.page ?? 0)
    const w = webhookEvents
    const [rows, total] = await Promise.all([
      db.select({ id: w.id, provider: w.provider, eventType: w.eventType, eventId: w.eventId, verified: w.verified, result: w.result, httpStatus: w.httpStatus, hasPayload: sql<boolean>`${w.payload} IS NOT NULL`, requestId: w.requestId, createdAt: w.createdAt })
        .from(w).where(cond).orderBy(desc(w.id)).limit(PAGE).offset(page * PAGE),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(w).where(cond),
    ])
    return { rows, total: total[0]?.n ?? 0, page, pageSize: PAGE }
  },

  async webhook(id: number) {
    const [row] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, id))
    return row ?? null
  },
}

// --- OBS-12: outgoing HTTP ---

const MAX_PAYLOAD = 64 * 1024

export const PURPOSES = ['deepseek', 'gemini', 'anthropic', 'pexels', 'polar', 'google', 'other'] as const
export type Purpose = (typeof PURPOSES)[number]
export type OutgoingRecord = { requestId: string | null; method: string; host: string; path: string; query: string | null; purpose: Purpose; status: number | null; error?: string | null; ms: number; size: number | null }
export type OutgoingFilters = { purpose?: Purpose; status?: '2xx' | '3xx' | '4xx' | '5xx' | 'error'; host?: string; slowMs?: number; from?: number; to?: number; page?: number }
export type WebhookRecord = { provider: string; eventType: string | null; eventId: string | null; verified: boolean; result: string; httpStatus: number; payload: string | null }
export type WebhookFilters = { type?: string; verified?: boolean; result?: string; page?: number }

/** What a call was for, from its host alone. */
export function purposeOf(host: string): Purpose {
  const h = host.toLowerCase().replace(/:\d+$/, '')
  if (/(^|\.)deepseek\.com$/.test(h)) return 'deepseek'
  if (h === 'generativelanguage.googleapis.com') return 'gemini'
  if (/(^|\.)anthropic\.com$/.test(h)) return 'anthropic'
  if (/(^|\.)pexels\.com$/.test(h)) return 'pexels'
  if (/(^|\.)polar\.sh$/.test(h)) return 'polar'
  if (/(^|\.)(google\.com|googleapis\.com|gstatic\.com)$/.test(h)) return 'google'
  return 'other'
}

const isLocal = (hostname: string) => /^(localhost|127(\.\d+){3}|\[::1\]|0\.0\.0\.0)$/i.test(hostname) || hostname.endsWith('.localhost')

// Anything run inside this (the recorder's own insert) is passed straight through, never recorded:
// recursion is impossible even if the database path ever used fetch.
const quiet = new AsyncLocalStorage<true>()

/**
 * `inner` with every call to a non-local http(s) host recorded: host, method, path (secret params
 * masked), status or network error, time to headers, size when the response says it. No body and no
 * header is read or stored; the response is returned as it came, so a stream streams untouched.
 */
export function wrapFetch(inner: typeof fetch): typeof fetch {
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (quiet.getStore()) return inner(input, init)
    let url: URL
    try {
      url = new URL(input instanceof Request ? input.url : String(input))
    } catch {
      return inner(input, init)
    }
    if (!/^https?:$/.test(url.protocol) || isLocal(url.hostname)) return inner(input, init)
    const base = {
      requestId: RequestContext.get()?.requestId ?? null, method: (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
      host: url.host, path: url.pathname, query: maskQuery(url.search), purpose: purposeOf(url.host),
    }
    const t0 = performance.now()
    let res: Response
    try {
      res = await inner(input, init)
    } catch (e) {
      const cause = e instanceof Error && e.cause instanceof Error ? ` (${e.cause.message})` : ''
      TelescopeService.recordOutgoing({ ...base, status: null, error: maskText(e instanceof Error ? `${e.name}: ${e.message}${cause}` : String(e)), ms: performance.now() - t0, size: null })
      throw e
    }
    const len = res.headers.get('content-length')
    TelescopeService.recordOutgoing({ ...base, status: res.status, ms: performance.now() - t0, size: len ? Number(len) : null })
    return res
  }
  return wrapped as typeof fetch
}

/**
 * OBS-12: the server's global fetch, wrapped once (idempotent across dev reloads). A later assignment
 * to globalThis.fetch (a test's mock) simply replaces it.
 */
export function installOutgoing(): void {
  if (G.__odFetchInstalled) return
  G.__odFetchInstalled = true
  globalThis.fetch = wrapFetch(globalThis.fetch)
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
