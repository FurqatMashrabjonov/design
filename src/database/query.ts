import { sql, type SQL } from 'drizzle-orm'
import { db } from './connection'

// The raw-SQL helpers the read-side services share (admin, dashboard, billing, provider stats, Telescope). App
// tables store unix seconds; Better Auth's are timestamptz (`epoch` converts).

export const DAY = 86400
export const unixNow = () => Math.floor(Date.now() / 1000)

export const all = async <T>(q: SQL) => (await db.execute(q)).rows as T[]
/** The first row. An aggregate always has one; for a lookup, ask for `T | undefined`. */
export const one = async <T>(q: SQL) => (await all<T>(q))[0] as T
/** A column that may come back as a string (count, sum) or null, as a number. */
export const num = (r: Record<string, unknown>, k: string) => Number(r[k] ?? 0)

/** The calendar day (UTC) of a unix-seconds column, as 'YYYY-MM-DD'. */
export const dayOf = (col: SQL) => sql`to_char(to_timestamp(${col}) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
/** Unix seconds of a timestamptz column. */
export const epoch = (col: SQL) => sql`extract(epoch from ${col})::bigint`
/** Unix seconds at 00:00 UTC of a 'YYYY-MM-DD' day (the table parser has checked the shape). */
export const dayStart = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000)
/** ILIKE pattern that matches `text` literally anywhere: %, _ and \ are escaped. */
export const likeOf = (text: string) => `%${text.replace(/[\\%_]/g, (c) => '\\' + c)}%`
