import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { migrate } from './migrate'

// Raw handle — passed to migrate() for DDL and otherwise unused. Everything else goes through `db`.
// DB_PATH lets the eval harness (eval/run.ts) work in a throwaway database instead of the user's projects.
export const sqlite = new Database(process.env.DB_PATH || 'data.db')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
migrate(sqlite) // runs once, on first import — mirrors how the old db.ts set up its schema on load

export const db = drizzle(sqlite, { schema })
