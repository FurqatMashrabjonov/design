// ADM-11: the admin tables' query — search, sort, page and typed filters — as it travels in the URL
// and to the server. One parser serves both: the route's validateSearch and the server function's
// validator. Anything unknown (a sort column, a filter value, a page) falls back to the default, so a
// hand-edited URL shows the default view instead of an error. A default is left out (undefined), which
// keeps the URL short.

export type Dir = 'asc' | 'desc'
export type TableQuery<S extends string = string> = { q?: string; sort?: S; dir?: Dir; page?: number; size?: number }

export const PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200
export const CSV_MAX_ROWS = 10_000

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => (allowed.includes(v as T) ? (v as T) : undefined)
const text = (v: unknown, max = 100) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
const int = (v: unknown, min: number, max: number) => {
  const n = typeof v === 'string' && v.trim() ? Number(v) : v
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : undefined
}
const amount = (v: unknown) => {
  const n = typeof v === 'string' && v.trim() ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 1e6 ? n : undefined
}
/** A calendar day as <input type="date"> writes it. */
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined)

function base<S extends string>(o: Record<string, unknown>, sorts: readonly S[]): TableQuery<S> {
  // page 0 is the default, so it is left out like every other default.
  return { q: text(o.q), sort: pick(o.sort, sorts), dir: pick(o.dir, ['asc', 'desc'] as const), page: int(o.page, 1, 100_000), size: int(o.size, 1, MAX_PAGE_SIZE) }
}

/** Drops undefined keys, so what goes into the URL is only what differs from the default. */
export const compact = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T

/** LIMIT/OFFSET of a query; page is 0-based. */
export const paging = (t: TableQuery) => {
  const size = t.size ?? PAGE_SIZE
  return { limit: size, offset: (t.page ?? 0) * size }
}

export const CALL_SORTS = ['when', 'cost', 'ms', 'tokens'] as const
export type CallsQuery = TableQuery<(typeof CALL_SORTS)[number]> & { result?: 'ok' | 'error'; model?: string; user?: string; from?: string; to?: string; minCost?: number }

export function parseCallsQuery(v: unknown): CallsQuery {
  const o = rec(v)
  // The old "Only errors" link (?errors=true) still lands on the errors.
  const result = pick(o.result, ['ok', 'error'] as const) ?? (o.errors === true || o.errors === 'true' ? 'error' : undefined)
  return compact({ ...base(o, CALL_SORTS), result, model: text(o.model, 120), user: text(o.user), from: day(o.from), to: day(o.to), minCost: amount(o.minCost) })
}

export const USER_SORTS = ['joined', 'seen', 'projects', 'screens', 'spend', 'credits'] as const
export type UsersQuery = TableQuery<(typeof USER_SORTS)[number]> & { role?: 'admin' | 'user'; status?: 'banned' | 'active'; from?: string; to?: string }

export function parseUsersQuery(v: unknown): UsersQuery {
  const o = rec(v)
  return compact({ ...base(o, USER_SORTS), role: pick(o.role, ['admin', 'user'] as const), status: pick(o.status, ['banned', 'active'] as const), from: day(o.from), to: day(o.to) })
}

/** RFC 4180: every field quoted when it holds a comma, a quote or a line break; quotes doubled. Text a
 *  spreadsheet would run as a formula (a name or an error starting with = + - @) gets a leading '. */
export function toCsv<T>(rows: T[], columns: [header: string, value: (r: T) => unknown][]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? '' : String(v)
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.map(([h]) => cell(h)).join(','), ...rows.map((r) => columns.map(([, f]) => cell(f(r))).join(','))].join('\r\n') + '\r\n'
}
