import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { migrate } from './migrate'

// Raw handle — passed to migrate() for DDL and otherwise unused. Everything else goes through `db`.
export const sqlite = new Database('data.db')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
migrate(sqlite) // runs once, on first import — mirrors how the old db.ts set up its schema on load

export const db = drizzle(sqlite, { schema })
