import type { Migration } from '../migrate'

export default {
  name: '0016_create_auth_tables',
  up: (db) => {
    // Better Auth's core tables (AUTH-02), in its sqlite shape; timestamps are milliseconds.
    // projects.user_id is the owner (OWN-01); null only for projects made before accounts existed,
    // which the first person to sign in inherits (OWN-05).
    db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0, image TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, token TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS session_user ON session(user_id);
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        access_token TEXT, refresh_token TEXT, id_token TEXT,
        access_token_expires_at INTEGER, refresh_token_expires_at INTEGER, scope TEXT, password TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS account_user ON account(user_id);
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS verification_identifier ON verification(identifier);
    `)
    try {
      db.exec('ALTER TABLE projects ADD COLUMN user_id TEXT REFERENCES user(id) ON DELETE CASCADE')
    } catch {}
    db.exec('CREATE INDEX IF NOT EXISTS projects_user ON projects(user_id)')
  },
} satisfies Migration
