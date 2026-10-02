import type { Migration } from '../migrate'

// PRC-02: every export (React project, HTML file, Figma copy) is a row, so Free's three tries are counted on the
// server and the admin can see what is exported.
export default {
  name: '0011_export_uses',
  up: `
    CREATE TABLE export_uses (
      id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT, kind TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX export_uses_user ON export_uses (user_id);
  `,
} satisfies Migration
