import type { Migration } from '../migrate'

export default {
  name: '0017_create_llm_calls_table',
  up: (db) => {
    // OBS-01: every model call — who, which project, tokens, estimated cost, time, outcome. The
    // limits (LIM-01, LIM-03) are counted from here, so they survive a restart.
    db.exec(`CREATE TABLE IF NOT EXISTS llm_calls (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      provider TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      cached_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      ms INTEGER NOT NULL DEFAULT 0,
      ok INTEGER NOT NULL,
      error TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`)
    db.exec('CREATE INDEX IF NOT EXISTS llm_calls_user_time ON llm_calls(user_id, created_at)')
    db.exec('CREATE INDEX IF NOT EXISTS llm_calls_time ON llm_calls(created_at)')
  },
} satisfies Migration
