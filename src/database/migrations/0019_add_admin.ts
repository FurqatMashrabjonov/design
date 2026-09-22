import type { Migration } from '../migrate'

export default {
  name: '0019_add_admin',
  up: (db) => {
    // ADM-01: Better Auth's admin plugin fields — a role, and a ban that blocks sign-in (its hook)
    // and generation (server/auth.ts treats a banned user as signed out).
    for (const sql of [
      "ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user'",
      'ALTER TABLE user ADD COLUMN banned INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE user ADD COLUMN ban_reason TEXT',
      'ALTER TABLE user ADD COLUMN ban_expires INTEGER',
      'ALTER TABLE session ADD COLUMN impersonated_by TEXT',
    ]) {
      try {
        db.exec(sql)
      } catch {}
    }
    // Every admin action, so a ban or a pause never happens without a trace.
    db.exec(`CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`)
    db.exec('CREATE INDEX IF NOT EXISTS admin_actions_time ON admin_actions(created_at)')
    // ADM-08: switches an admin changes without a deploy (pause, limits, budget, per-user limits).
    db.exec(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`)
    db.exec('CREATE INDEX IF NOT EXISTS messages_project_time ON messages(project_id, created_at)')
  },
} satisfies Migration
