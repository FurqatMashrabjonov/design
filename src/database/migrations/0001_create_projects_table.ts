import type { Migration } from '../migrate'

export default {
  name: '0001_create_projects_table',
  up: (db) =>
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        design_system TEXT NOT NULL DEFAULT 'minimal',
        device TEXT NOT NULL DEFAULT 'desktop',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `),
} satisfies Migration
