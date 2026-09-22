import type { Migration } from '../migrate'

export default {
  name: '0013_add_screen_version_cursor',
  up: (db) => {
    // version_id: which of its own snapshots the screen is showing right now (the ‹ › arrows on
    //   the frame). Null means the newest work. Kept on the row so stepping back and forward is
    //   exact instead of guessed from html equality.
    try {
      db.exec('ALTER TABLE screens ADD COLUMN version_id TEXT')
    } catch {}
  },
} satisfies Migration
