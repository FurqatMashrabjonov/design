import type { Migration } from '../migrate'

export default {
  name: '0012_create_messages_table',
  up: (db) => {
    // The project's conversation: what the person asked for and what the agent did about it.
    // `meta` (JSON) ties a message to the screens and versions it touched, which is what makes
    // "go back to before this" possible, and carries the agent's log.
    db.exec(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      kind TEXT NOT NULL,
      text TEXT NOT NULL,
      meta TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`)
    db.exec('CREATE INDEX IF NOT EXISTS messages_project_idx ON messages(project_id, created_at)')
  },
} satisfies Migration
