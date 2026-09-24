// INF-10: one-off copy of the SQLite data.db into Postgres (DATABASE_URL, default `design`).
// Refuses a target that already has projects or users, copies every table in foreign-key order,
// converts SQLite's 0/1 booleans and Better Auth's millisecond integers, then checks row counts.
// Run: node --env-file-if-exists=.env --import ./eval/alias-hook.mjs scripts/sqlite-to-pg.ts [path/to/data.db]
import Database from 'better-sqlite3'
import { pool } from '../src/database/connection.ts'

const src = new Database(process.argv[2] ?? 'data.db', { readonly: true })
const BOOL: Record<string, string[]> = { user: ['email_verified', 'banned'], projects: ['design_system_auto', 'favorite'], llm_calls: ['ok'], subscriptions: ['cancel_at_period_end'] }
const MS: Record<string, string[]> = {
  user: ['created_at', 'updated_at', 'ban_expires'],
  session: ['expires_at', 'created_at', 'updated_at'],
  account: ['access_token_expires_at', 'refresh_token_expires_at', 'created_at', 'updated_at'],
  verification: ['expires_at', 'created_at', 'updated_at'],
}
// Parents before children; ordered by rowid so the new seq columns keep insertion order.
const TABLES = ['user', 'session', 'account', 'verification', 'projects', 'screens', 'screen_versions', 'messages', 'feedback', 'image_cache', 'llm_calls', 'credit_ledger', 'subscriptions', 'admin_actions', 'settings']

const has = (t: string) => Boolean(src.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(t))

const busy = (await pool.query('SELECT (SELECT count(*) FROM projects) + (SELECT count(*) FROM "user") AS n')).rows[0].n
if (busy > 0) throw new Error(`The target already has ${busy} users/projects — refusing to copy over it`)

const client = await pool.connect()
try {
  await client.query('BEGIN')
  for (const t of TABLES) {
    // A data.db from before the credits work has no credit_ledger or subscriptions: nothing to copy.
    if (!has(t)) continue
    const rows = src.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all() as Record<string, unknown>[]
    for (const r of rows) {
      for (const c of BOOL[t] ?? []) if (c in r) r[c] = r[c] === 1 || r[c] === true
      for (const c of MS[t] ?? []) if (r[c] !== null && r[c] !== undefined) r[c] = new Date(Number(r[c]))
      const cols = Object.keys(r)
      await client.query(`INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, cols.map((c) => r[c]))
    }
  }
  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  throw e
} finally {
  client.release()
}

let ok = true
for (const t of TABLES) {
  if (!has(t)) {
    console.log(`${t.padEnd(16)} sqlite    —  (table absent, skipped)`)
    continue
  }
  const a = (src.prepare(`SELECT count(*) n FROM "${t}"`).get() as { n: number }).n
  const b = Number((await pool.query(`SELECT count(*) n FROM "${t}"`)).rows[0].n)
  if (a !== b) ok = false
  console.log(`${t.padEnd(16)} sqlite ${String(a).padStart(4)}  postgres ${String(b).padStart(4)}${a === b ? '' : '  MISMATCH'}`)
}
await pool.end()
if (!ok) process.exit(1)
