import type { Migration } from '../migrate'

export default {
  name: '0020_add_project_palette',
  up: (db) => {
    // GQ-10. `palette`: the colours invented for this app by the planner, already repaired to AA
    // (lib/palette.ts Palette as JSON); NULL means the catalogue design system is used as-is.
    // `design_system_auto`: the person did not pick a system themselves, so a generated palette is
    // allowed to replace the catalogue's colours. A system chosen by hand is a choice, and stays.
    try {
      db.exec('ALTER TABLE projects ADD COLUMN palette TEXT')
    } catch {}
    try {
      db.exec('ALTER TABLE projects ADD COLUMN design_system_auto INTEGER NOT NULL DEFAULT 0')
    } catch {}
  },
} satisfies Migration
