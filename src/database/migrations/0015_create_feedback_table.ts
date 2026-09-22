import type { Migration } from '../migrate'

export default {
  name: '0015_create_feedback_table',
  up: (db) => {
    // FB-01: what people think of a generated screen, with what produced it (design system,
    // archetype, layout variant) so a signal can be traced to a pattern. value: 'up' | 'down' |
    // 'regenerate'. One up/down per screen (the latest wins); every regenerate is its own row.
    db.exec(`CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      screen_id TEXT NOT NULL,
      value TEXT NOT NULL,
      design_system TEXT NOT NULL,
      archetype TEXT,
      variant TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`)
    db.exec('CREATE INDEX IF NOT EXISTS feedback_screen ON feedback(screen_id)')
  },
} satisfies Migration
