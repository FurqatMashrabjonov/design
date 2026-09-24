import type { Migration } from '../migrate'

// OBS-10: a model call points at the HTTP request that made it (RequestContext).
export default {
  name: '0004_llm_calls_request_id',
  up: `
    ALTER TABLE llm_calls ADD COLUMN request_id TEXT;
    CREATE INDEX llm_calls_request_id ON llm_calls (request_id);
  `,
} satisfies Migration
