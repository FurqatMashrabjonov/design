import type { Pool } from 'pg'
import m0001 from './migrations/0001_initial.ts'
import m0002 from './migrations/0002_create_secrets.ts'
import m0003 from './migrations/0003_telescope.ts'
import m0004 from './migrations/0004_llm_calls_request_id.ts'
import m0006 from './migrations/0006_orders.ts'

// INF-10: numbered migrations, each run at most once ever and tracked in _migrations, each in its own
// transaction — a migration that fails leaves the database as it was. A new one is a new file here.
export type Migration = { name: string; up: string }

const migrations: Migration[] = [m0001, m0002, m0003, m0004, m0006]

export async function migrate(pool: Pool) {
  await pool.query('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, run_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint)')
  const done = new Set((await pool.query<{ name: string }>('SELECT name FROM _migrations')).rows.map((r) => r.name))
  for (const m of migrations) {
    if (done.has(m.name)) continue
    const c = await pool.connect()
    try {
      await c.query('BEGIN')
      await c.query(m.up)
      await c.query('INSERT INTO _migrations (name) VALUES ($1)', [m.name])
      await c.query('COMMIT')
    } catch (e) {
      await c.query('ROLLBACK')
      throw e
    } finally {
      c.release()
    }
  }
}
