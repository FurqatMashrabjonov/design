import type { Migration } from '../migrate'

export default {
  name: '0023_create_subscriptions',
  up: (db) => {
    // BIL-10. A plan as the payment provider reports it, one row per provider subscription, updated by
    // every subscription webhook. Credits are not here: a plan's monthly credits are ledger rows
    // granted against `started_at` (CreditService.refresh), so a yearly plan gets them monthly too.
    db.exec(`CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_key TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      current_period_end INTEGER,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`)
    db.exec('CREATE INDEX IF NOT EXISTS subscriptions_user ON subscriptions(user_id)')
  },
} satisfies Migration
