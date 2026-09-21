import type { Database } from 'better-sqlite3'
import m0001 from './migrations/0001_create_projects_table.ts'
import m0002 from './migrations/0002_create_screens_table.ts'
import m0003 from './migrations/0003_add_screen_position_columns.ts'
import m0004 from './migrations/0004_backfill_stacked_positions.ts'
import m0005 from './migrations/0005_create_screen_versions_table.ts'
import m0006 from './migrations/0006_add_navigation_columns.ts'
import m0007 from './migrations/0007_add_project_theme.ts'
import m0008 from './migrations/0008_add_screen_height.ts'
import m0009 from './migrations/0009_create_image_cache_table.ts'
import m0010 from './migrations/0010_add_project_plan.ts'
import m0011 from './migrations/0011_add_screen_spec_and_error.ts'

export type Migration = { name: string; up: (db: Database) => void }

const migrations: Migration[] = [m0001, m0002, m0003, m0004, m0005, m0006, m0007, m0008, m0009, m0010, m0011]

// Runs once at boot. Each migration runs at most once ever, tracked in _migrations —
// unlike the old db.ts, later ones don't re-scan the whole table on every start.
// Takes the raw handle as a parameter (rather than importing it from connection.ts) so
// this module has no import-time dependency back on connection.ts — no circular import.
export function migrate(sqlite: Database) {
  sqlite.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, run_at INTEGER NOT NULL DEFAULT (unixepoch()))')
  const done = new Set((sqlite.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name))
  for (const m of migrations) {
    if (done.has(m.name)) continue
    m.up(sqlite)
    sqlite.prepare('INSERT INTO _migrations (name) VALUES (?)').run(m.name)
  }
}
