import type { Migration } from '../migrate'

export default {
  name: '0018_add_favorite_to_projects',
  up: (db) => {
    // DSH-08: a star on the dashboard card. 0 / 1.
    db.exec('ALTER TABLE projects ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0')
  },
} satisfies Migration
