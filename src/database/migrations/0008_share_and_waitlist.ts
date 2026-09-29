import type { Migration } from '../migrate'

// SHR-02: a project the owner made public has an unguessable share token; null = private (the default), and
// turning sharing off drops the token, so an old link dies. WLT-01: who opened a shared link (by the post it came
// from, `ref`) and who asked to be let in — the waitlist the build-in-public posts collect.
export default {
  name: '0008_share_and_waitlist',
  up: `
    ALTER TABLE projects ADD COLUMN share_token TEXT UNIQUE;
    CREATE TABLE share_views (
      id BIGSERIAL PRIMARY KEY, project_id TEXT NOT NULL, ref TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX share_views_time ON share_views(created_at);
    CREATE TABLE waitlist (
      id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, ref TEXT, project_id TEXT, note TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
  `,
} satisfies Migration
