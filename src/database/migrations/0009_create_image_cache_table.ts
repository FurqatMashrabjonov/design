import type { Migration } from '../migrate'

export default {
  name: '0009_create_image_cache_table',
  up: (db) => {
    // One stock-photo lookup per distinct query, ever: the free API tier is 200 requests an hour.
    // `url` is empty when the search found nothing, so a dead query is not retried on every screen.
    db.exec(`CREATE TABLE IF NOT EXISTS image_cache (
      query TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      avg_color TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`)
  },
} satisfies Migration
