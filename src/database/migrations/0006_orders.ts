import type { Migration } from '../migrate'

// ADM-15: every paid order, so revenue is a fact the provider reported, not an estimate from prices.
// The id is the provider's order id, so a webhook delivered twice stores one row.
export default {
  name: '0006_orders',
  up: `
    CREATE TABLE orders (
      id TEXT PRIMARY KEY, provider TEXT NOT NULL DEFAULT 'polar', user_id TEXT NOT NULL, product_key TEXT NOT NULL,
      amount_cents INTEGER NOT NULL, currency TEXT NOT NULL, billing_reason TEXT, subscription_id TEXT,
      created_at BIGINT NOT NULL DEFAULT extract(epoch from now())::bigint
    );
    CREATE INDEX orders_user ON orders(user_id);
    CREATE INDEX orders_time ON orders(created_at);
  `,
} satisfies Migration
