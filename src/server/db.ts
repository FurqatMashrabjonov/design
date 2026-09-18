import { DatabaseSync } from 'node:sqlite'

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
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`)

export type Project = { id: string; name: string; design_system: string; device: string; created_at: number }
export type Screen = { id: string; project_id: string; name: string; prompt: string; html: string; created_at: number }
