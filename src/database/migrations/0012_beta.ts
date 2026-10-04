import type { Migration } from '../migrate'

// PAY-03: while nothing is sold, a person out of free credits asks for more — one open request per person, which an
// admin grants (a ledger row) or dismisses. FDB-10: what people say about the product — a rating and their words
// after the first app, or any time from the Feedback button; a prompt that was closed is a row too (rating and text
// empty), so it is asked once.
export default {
  name: '0012_beta',
  up: `
    CREATE TABLE credit_requests (
      id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, note TEXT, status TEXT NOT NULL DEFAULT 'open',
      granted INTEGER, handled_by TEXT, handled_at BIGINT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE UNIQUE INDEX credit_requests_one_open ON credit_requests (user_id) WHERE status = 'open';
    CREATE TABLE app_feedback (
      id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT, source TEXT NOT NULL,
      rating SMALLINT, text TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX app_feedback_user ON app_feedback (user_id, source);
  `,
} satisfies Migration
