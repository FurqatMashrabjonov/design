import type { Migration } from '../migrate'

export default {
  name: '0006_add_navigation_columns',
  up: (db) => {
    // The planner already decides each screen's role and which tab it belongs to, but that
    // was thrown away at persist time — so nothing downstream could link screens together.
    for (const col of [
      "screen_type TEXT NOT NULL DEFAULT 'root-tab'",
      'active_tab_id TEXT',
      'parent_screen_name TEXT',
    ]) {
      try {
        db.exec(`ALTER TABLE screens ADD COLUMN ${col}`)
      } catch {}
    }
    try {
      db.exec('ALTER TABLE projects ADD COLUMN navigation TEXT')
    } catch {}
  },
} satisfies Migration
