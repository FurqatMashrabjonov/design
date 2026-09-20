import type { Migration } from '../migrate'

export default {
  name: '0008_add_screen_height',
  up: (db) => {
    // Measured content height of the screen, in CSS pixels. NULL means "not measured yet",
    // and the canvas falls back to the device height until the frame reports in.
    try {
      db.exec('ALTER TABLE screens ADD COLUMN height INTEGER')
    } catch {}
  },
} satisfies Migration
