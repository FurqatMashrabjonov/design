import type { Migration } from '../migrate'
import { nextFramePosition } from '../../canvas.ts'

// One-time fan-out for pre-canvas data: any project whose screens were all stacked at (0,0)
// gets them laid out left-to-right instead of overlapping on the canvas.
export default {
  name: '0004_backfill_stacked_positions',
  up: (db) => {
    const projects = db.prepare('SELECT id, device FROM projects').all() as { id: string; device: string }[]
    for (const { id: projectId, device } of projects) {
      const stacked = db
        .prepare('SELECT id FROM screens WHERE project_id = ? AND x = 0 AND y = 0 ORDER BY created_at ASC')
        .all(projectId) as { id: string }[]
      if (stacked.length < 2) continue
      const placed: { x: number; y: number }[] = []
      for (const { id } of stacked) {
        const pos = nextFramePosition(placed, device)
        db.prepare('UPDATE screens SET x = ?, y = ? WHERE id = ?').run(pos.x, pos.y, id)
        placed.push(pos)
      }
    }
  },
} satisfies Migration
