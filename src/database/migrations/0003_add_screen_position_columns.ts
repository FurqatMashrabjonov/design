import type { Migration } from '../migrate'

export default {
  name: '0003_add_screen_position_columns',
  up: (db) => {
    // A dev database from before this migration existed may already have these columns
    // (added by the old ad-hoc ALTER-on-every-boot code) — ignore "duplicate column" once.
    for (const col of ['x REAL NOT NULL DEFAULT 0', 'y REAL NOT NULL DEFAULT 0']) {
      try {
        db.exec(`ALTER TABLE screens ADD COLUMN ${col}`)
      } catch {}
    }
  },
} satisfies Migration
