import type { Migration } from '../migrate'

export default {
  name: '0022_create_credit_ledger',
  up: (db) => {
    // BIL-04. Credits are a ledger, not a number on the user: every grant, hold, refund and purchase
    // is a row, and a balance is their sum — so it can always be explained, and never drifts.
    // `ref` names what caused a row outside an action (a payment event, a signup); it is unique, so
    // a webhook delivered twice grants once.
    db.exec(`CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      kind TEXT NOT NULL,
      action_id TEXT,
      ref TEXT,
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`)
    db.exec('CREATE INDEX IF NOT EXISTS credit_ledger_user ON credit_ledger(user_id)')
    db.exec('CREATE INDEX IF NOT EXISTS credit_ledger_action ON credit_ledger(action_id)')
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_ref ON credit_ledger(ref) WHERE ref IS NOT NULL')
  },
} satisfies Migration
