import type { Migration } from '../migrate'

// OBS-12: every HTTP call the server makes (host, path with secrets masked, status, time — never a
// body or a header) and every webhook that reached us (the payload only when its signature held).
// Kept 7 days and at most 200 000 rows each, like the rest of Telescope.
export default {
  name: '0005_outgoing_and_webhooks',
  up: `
    CREATE TABLE outgoing_requests (
      id BIGSERIAL PRIMARY KEY,
      request_id TEXT,
      method TEXT NOT NULL,
      host TEXT NOT NULL,
      path TEXT NOT NULL,
      query TEXT,
      purpose TEXT NOT NULL,
      status INTEGER,
      error TEXT,
      ms INTEGER NOT NULL,
      size INTEGER,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX outgoing_requests_created_at ON outgoing_requests (created_at);
    CREATE INDEX outgoing_requests_request_id ON outgoing_requests (request_id);

    CREATE TABLE webhook_events (
      id BIGSERIAL PRIMARY KEY,
      provider TEXT NOT NULL,
      event_type TEXT,
      event_id TEXT,
      verified BOOLEAN NOT NULL,
      result TEXT NOT NULL,
      http_status INTEGER NOT NULL,
      payload TEXT,
      request_id TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX webhook_events_created_at ON webhook_events (created_at);
  `,
} satisfies Migration
