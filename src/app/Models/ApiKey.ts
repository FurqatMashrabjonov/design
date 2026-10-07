import { createHash, randomBytes } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { all, one, unixNow } from '@/database/query'
import { db } from '@/database/connection'

// MCP-01: a personal API key. The key is `ss_` + 32 random bytes (base64url); only its SHA-256 is stored, so a leaked
// database does not leak keys. A revoked key never works again.
export type ApiKeyRow = { id: string; name: string; prefix: string; createdAt: number; lastUsedAt: number | null; revokedAt: number | null }
const hashOf = (key: string) => createHash('sha256').update(key).digest('hex')
export const MAX_KEYS = 10

export const ApiKey = {
  /** A new key for this person; the plain key is returned once and never stored. */
  async create(userId: string, name: string): Promise<{ key: string; row: ApiKeyRow }> {
    const live = await ApiKey.list(userId)
    if (live.filter((k) => !k.revokedAt).length >= MAX_KEYS) throw new Error(`At most ${MAX_KEYS} keys; revoke one first`)
    const key = `ss_${randomBytes(32).toString('base64url')}`
    const id = crypto.randomUUID()
    const label = (name.trim() || 'API key').slice(0, 60)
    await db.execute(sql`INSERT INTO api_keys (id, user_id, name, prefix, hash) VALUES (${id}, ${userId}, ${label}, ${key.slice(0, 10)}, ${hashOf(key)})`)
    return { key, row: { id, name: label, prefix: key.slice(0, 10), createdAt: unixNow(), lastUsedAt: null, revokedAt: null } }
  },

  async list(userId: string): Promise<ApiKeyRow[]> {
    return all<ApiKeyRow>(sql`SELECT id, name, prefix, created_at AS "createdAt", last_used_at AS "lastUsedAt", revoked_at AS "revokedAt" FROM api_keys WHERE user_id = ${userId} ORDER BY created_at DESC`)
  },

  async revoke(userId: string, id: string): Promise<boolean> {
    const r = await db.execute(sql`UPDATE api_keys SET revoked_at = ${unixNow()} WHERE id = ${id} AND user_id = ${userId} AND revoked_at IS NULL`)
    return (r.rowCount ?? 0) > 0
  },

  /** The owner of a live key, or undefined; marks it used (at most once a minute). */
  async userOf(key: string): Promise<string | undefined> {
    if (!/^ss_[A-Za-z0-9_-]{40,}$/.test(key)) return undefined
    const row = await one<{ id: string; userId: string; lastUsedAt: number | null } | undefined>(sql`SELECT id, user_id AS "userId", last_used_at AS "lastUsedAt" FROM api_keys WHERE hash = ${hashOf(key)} AND revoked_at IS NULL`)
    if (!row) return undefined
    if (!row.lastUsedAt || unixNow() - row.lastUsedAt > 60) db.execute(sql`UPDATE api_keys SET last_used_at = ${unixNow()} WHERE id = ${row.id}`).catch(() => {})
    return row.userId
  },
}
