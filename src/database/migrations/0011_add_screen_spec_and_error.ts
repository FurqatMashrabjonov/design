import type { Migration } from '../migrate'

export default {
  name: '0011_add_screen_spec_and_error',
  up: (db) => {
    // spec: what the screen was planned to be. `prompt` is overwritten by every edit, so without
    //   this a screen could never be regenerated from scratch.
    // error: why the last attempt to draw it failed. A failed screen keeps its place on the canvas
    //   (html is empty) and can be retried there, instead of silently not existing.
    for (const column of ['spec TEXT', 'error TEXT']) {
      try {
        db.exec(`ALTER TABLE screens ADD COLUMN ${column}`)
      } catch {}
    }
  },
} satisfies Migration
