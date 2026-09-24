import type { Migration } from '../migrate'

// ADM-13: API keys entered in the admin panel, sealed with SECRETS_KEY (lib/secret-box.ts). `last4`
// is all the panel ever shows of one; the plaintext never leaves the server.
export default {
  name: '0002_create_secrets',
  up: `
    CREATE TABLE secrets (
      name TEXT PRIMARY KEY,
      sealed TEXT NOT NULL,
      last4 TEXT NOT NULL,
      updated_by TEXT,
      updated_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
  `,
} satisfies Migration
