import type { Migration } from '../migrate'

// INF-10: the whole schema on Postgres, as the 23 SQLite migrations had left it (git history keeps
// their reasons). Times the app writes are unix seconds; Better Auth's tables keep timestamptz.
export default {
  name: '0001_initial',
  up: `
    CREATE TABLE "user" (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT false, image TEXT,
      created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', banned BOOLEAN NOT NULL DEFAULT false, ban_reason TEXT, ban_expires TIMESTAMPTZ
    );
    CREATE TABLE session (
      id TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL, token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, ip_address TEXT, user_agent TEXT,
      impersonated_by TEXT, user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
    );
    CREATE INDEX session_user_id ON session(user_id);
    CREATE TABLE account (
      id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      access_token TEXT, refresh_token TEXT, id_token TEXT,
      access_token_expires_at TIMESTAMPTZ, refresh_token_expires_at TIMESTAMPTZ, scope TEXT, password TEXT,
      created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX account_user ON account(user_id);
    CREATE TABLE verification (
      id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX verification_identifier ON verification(identifier);

    CREATE TABLE projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      design_system TEXT NOT NULL DEFAULT 'minimal', device TEXT NOT NULL DEFAULT 'desktop',
      navigation TEXT, theme TEXT, palette TEXT, design_system_auto BOOLEAN NOT NULL DEFAULT false, plan TEXT,
      user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
      favorite BOOLEAN NOT NULL DEFAULT false,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX projects_user ON projects(user_id);
    CREATE TABLE screens (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL, prompt TEXT NOT NULL, html TEXT NOT NULL,
      x DOUBLE PRECISION NOT NULL DEFAULT 0, y DOUBLE PRECISION NOT NULL DEFAULT 0, height INTEGER,
      screen_type TEXT NOT NULL DEFAULT 'root-tab', active_tab_id TEXT, parent_screen_name TEXT,
      spec TEXT, error TEXT, version_id TEXT, deleted_at BIGINT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX screens_project ON screens(project_id);
    CREATE TABLE screen_versions (
      id TEXT PRIMARY KEY, screen_id TEXT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
      name TEXT NOT NULL, prompt TEXT NOT NULL, html TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint,
      seq BIGSERIAL
    );
    CREATE INDEX screen_versions_screen_id ON screen_versions(screen_id);
    CREATE TABLE image_cache (
      query TEXT PRIMARY KEY, url TEXT NOT NULL, avg_color TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE TABLE messages (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL, meta TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX messages_project_time ON messages(project_id, created_at);
    CREATE TABLE feedback (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      screen_id TEXT NOT NULL, value TEXT NOT NULL, design_system TEXT NOT NULL, archetype TEXT, variant TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX feedback_screen ON feedback(screen_id);

    CREATE TABLE llm_calls (
      id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, provider TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '', action_id TEXT,
      prompt_tokens INTEGER NOT NULL DEFAULT 0, cached_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0, cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0, ms INTEGER NOT NULL DEFAULT 0, ok BOOLEAN NOT NULL, error TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX llm_calls_time ON llm_calls(created_at);
    CREATE INDEX llm_calls_user_time ON llm_calls(user_id, created_at);
    CREATE INDEX llm_calls_action ON llm_calls(action_id);
    CREATE TABLE credit_ledger (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, delta INTEGER NOT NULL, kind TEXT NOT NULL,
      action_id TEXT, ref TEXT, note TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint,
      seq BIGSERIAL
    );
    CREATE INDEX credit_ledger_user ON credit_ledger(user_id);
    CREATE INDEX credit_ledger_action ON credit_ledger(action_id);
    CREATE UNIQUE INDEX credit_ledger_ref ON credit_ledger(ref) WHERE ref IS NOT NULL;
    CREATE TABLE subscriptions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, product_key TEXT NOT NULL, status TEXT NOT NULL,
      started_at BIGINT NOT NULL, current_period_end BIGINT, cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
      updated_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX subscriptions_user ON subscriptions(user_id);
    CREATE TABLE admin_actions (
      id TEXT PRIMARY KEY, admin_id TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX admin_actions_time ON admin_actions(created_at);
    CREATE TABLE settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
  `,
} satisfies Migration
