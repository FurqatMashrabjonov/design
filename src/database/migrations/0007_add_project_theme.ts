import type { Migration } from '../migrate'

export default {
  name: '0007_add_project_theme',
  up: (db) => {
    // JSON of validated theme overrides (accent, radius preset, font ids); NULL means "design system as-is".
    try {
      db.exec('ALTER TABLE projects ADD COLUMN theme TEXT')
    } catch {}
  },
} satisfies Migration
