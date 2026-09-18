import { DatabaseSync } from 'node:sqlite'
import { nextFramePosition } from '../canvas'

// ponytail: Node's built-in sqlite, raw SQL. Add Drizzle when schema grows past a few tables.
export const db = new DatabaseSync('data.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    design_system TEXT NOT NULL DEFAULT 'minimal',
    device TEXT NOT NULL DEFAULT 'desktop',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS screens (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    html TEXT NOT NULL,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`)

// ponytail: no migration framework for two columns. Ignore "duplicate column" on repeat boots.
for (const col of ['x REAL NOT NULL DEFAULT 0', 'y REAL NOT NULL DEFAULT 0']) {
  try {
    db.exec(`ALTER TABLE screens ADD COLUMN ${col}`)
  } catch {}
}

// One-time fan-out for pre-canvas data: any project whose screens are still all stacked at (0,0)
// gets them laid out left-to-right. Self-idempotent — already-positioned screens never match again.
for (const { id: projectId, device } of db.prepare('SELECT id, device FROM projects').all() as { id: string; device: string }[]) {
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

export type Project = { id: string; name: string; design_system: string; device: string; created_at: number }
export type Screen = {
  id: string
  project_id: string
  name: string
  prompt: string
  html: string
  x: number
  y: number
  created_at: number
}
