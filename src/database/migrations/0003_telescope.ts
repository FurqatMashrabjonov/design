import type { Migration } from '../migrate'

// OBS-10/OBS-11: the request log and the server log ("Telescope"). Kept 7 days and at most 200 000
// rows each (TelescopeService.cleanup). No request body, cookie or Authorization header is ever stored.
export default {
  name: '0003_telescope',
  up: `
    CREATE TABLE http_requests (
      id TEXT PRIMARY KEY,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      query TEXT,
      kind TEXT NOT NULL,
      status INTEGER NOT NULL,
      ms INTEGER NOT NULL,
      user_id TEXT,
      ip_hash TEXT,
      user_agent TEXT,
      size INTEGER,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX http_requests_created_at ON http_requests (created_at);
    CREATE INDEX http_requests_status ON http_requests (status);
    CREATE INDEX http_requests_user_id ON http_requests (user_id);

    CREATE TABLE server_logs (
      id BIGSERIAL PRIMARY KEY,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      fingerprint TEXT,
      request_id TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX server_logs_created_at ON server_logs (created_at);
    CREATE INDEX server_logs_request_id ON server_logs (request_id);
    CREATE INDEX server_logs_fingerprint ON server_logs (fingerprint);
  `,
} satisfies Migration
