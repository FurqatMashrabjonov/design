import type { Migration } from '../migrate'

// MCP-01: personal API keys for the MCP endpoint (and any headless caller). Only a SHA-256 of the key is kept; the
// key itself is shown once. `prefix` is its first characters, so a person can tell their keys apart.
export default {
  name: '0013_api_keys',
  up: `
    CREATE TABLE api_keys (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, prefix TEXT NOT NULL, hash TEXT NOT NULL UNIQUE,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint, last_used_at BIGINT, revoked_at BIGINT
    );
    CREATE INDEX api_keys_user ON api_keys (user_id);
  `,
} satisfies Migration
