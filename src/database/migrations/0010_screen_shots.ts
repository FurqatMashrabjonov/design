import type { Migration } from '../migrate'

// KON-10: a screen's picture, keyed by a hash of its source and the look it was drawn in — a changed screen or
// theme is a new key, so a picture is never stale and never recomputed.
export default {
  name: '0010_screen_shots',
  up: `
    CREATE TABLE screen_shots (
      key TEXT PRIMARY KEY, image BYTEA NOT NULL,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
  `,
} satisfies Migration
