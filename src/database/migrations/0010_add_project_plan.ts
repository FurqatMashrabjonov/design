import type { Migration } from '../migrate'

export default {
  name: '0010_add_project_plan',
  up: (db) => {
    // The parts of the plan a later screen still needs: the app's summary, type and data model (JSON).
    // Without it, a screen added from chat would invent its own dishes, transactions or habits.
    try {
      db.exec('ALTER TABLE projects ADD COLUMN plan TEXT')
    } catch {}
  },
} satisfies Migration
