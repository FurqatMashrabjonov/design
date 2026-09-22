import type { Migration } from '../migrate'

export default {
  name: '0014_add_screen_deleted_at',
  up: (db) => {
    // deleted_at: a deleted screen keeps its row (and its versions) so Cmd+Z can bring it back.
    //   Listing queries skip rows with a value. ponytail: rows are never purged; add a sweep of
    //   old deleted rows once the table is worth the bother.
    try {
      db.exec('ALTER TABLE screens ADD COLUMN deleted_at INTEGER')
    } catch {}
  },
} satisfies Migration
