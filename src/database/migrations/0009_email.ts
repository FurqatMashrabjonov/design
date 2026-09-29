import type { Migration } from '../migrate'

// EML-03: every email the product sends (to, subject, what kind, how it went), the bulk sends an admin makes, and
// the addresses that asked for no more bulk email. System emails' words live in settings (email.template.<kind>).
export default {
  name: '0009_email',
  up: `
    CREATE TABLE email_campaigns (
      id BIGSERIAL PRIMARY KEY, audience TEXT NOT NULL, subject TEXT NOT NULL, content TEXT NOT NULL,
      recipients INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0, admin_id TEXT, created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE TABLE emails (
      id BIGSERIAL PRIMARY KEY, to_email TEXT NOT NULL, subject TEXT NOT NULL, tag TEXT NOT NULL, status TEXT NOT NULL,
      provider_id TEXT, error TEXT, campaign_id BIGINT, created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX emails_time ON emails(created_at);
    CREATE TABLE email_suppressions (
      email TEXT PRIMARY KEY, reason TEXT NOT NULL, created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
  `,
} satisfies Migration
