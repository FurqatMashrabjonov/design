import type { Migration } from '../migrate'

export default {
  name: '0005_create_screen_versions_table',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS screen_versions (
        id TEXT PRIMARY KEY,
        screen_id TEXT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        html TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `)
    db.exec('CREATE INDEX IF NOT EXISTS screen_versions_screen_id ON screen_versions(screen_id)')
  },
} satisfies Migration
