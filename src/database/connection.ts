import { spawnSync } from 'node:child_process'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import { migrate } from './migrate'

// INF-10: Postgres. DATABASE_URL names it; locally the default is the `design` database.
// DB_FRESH=1 (tests, the eval) makes a throwaway database for this process and drops it on exit, so a
// run never touches the user's projects — what DB_PATH=':memory:' did with SQLite.

// Counts and sums come back from Postgres as strings (int8, numeric); here they are numbers, as SQLite gave.
pg.types.setTypeParser(20, (v) => Number(v))
pg.types.setTypeParser(1700, (v) => Number(v))

const base = process.env.DATABASE_URL || 'postgres://localhost:5432/design'

async function freshDatabase(): Promise<string> {
  const name = `design_tmp_${Date.now()}_${process.pid}`
  const adminUrl = base.replace(/\/[^/?]*(\?|$)/, '/postgres$1')
  const admin = new pg.Client({ connectionString: adminUrl })
  await admin.connect()
  // Leftovers of runs that crashed before they could clean up, older than an hour.
  const old = await admin.query<{ datname: string }>(`SELECT datname FROM pg_database WHERE datname LIKE 'design_tmp_%'`)
  for (const { datname } of old.rows) if (Date.now() - Number(datname.split('_')[2]) > 3_600_000) await admin.query(`DROP DATABASE IF EXISTS "${datname}" WITH (FORCE)`)
  await admin.query(`CREATE DATABASE "${name}"`)
  await admin.end()
  // On any exit — a finished run, process.exit, an assertion that failed — the database is dropped by a
  // short synchronous child, because an exiting process can no longer wait for its own async work.
  process.once('exit', () => {
    const drop = `import pg from 'pg'; const c = new pg.Client(${JSON.stringify(adminUrl)}); await c.connect(); await c.query('DROP DATABASE IF EXISTS "${name}" WITH (FORCE)'); await c.end()`
    spawnSync(process.execPath, ['--input-type=module', '-e', drop], { stdio: 'ignore' })
  })
  return base.replace(/\/[^/?]*(\?|$)/, `/${name}$1`)
}

// allowExitOnIdle: a script (the eval, a check) ends when its work does, not when idle clients time out.
export const pool = new pg.Pool({ connectionString: process.env.DB_FRESH === '1' ? await freshDatabase() : base, allowExitOnIdle: true })
await migrate(pool) // once, on first import

export const db = drizzle(pool, { schema })
