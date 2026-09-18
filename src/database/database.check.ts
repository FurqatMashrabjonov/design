import assert from 'node:assert'
import { unlinkSync } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from './schema.ts'
import { migrate } from './migrate.ts'

// Never the real data.db — a throwaway file per run.
const path = '/tmp/design-database-check.db'
try {
  unlinkSync(path)
} catch {}
const sqlite = new Database(path)
migrate(sqlite)
const db = drizzle(sqlite, { schema })

db.insert(schema.projects).values({ id: 'p1', name: 'Test', designSystem: 'minimal', device: 'mobile' }).run()
const p = db.select().from(schema.projects).where(eq(schema.projects.id, 'p1')).get()
assert.equal(p?.name, 'Test')

db.insert(schema.screens).values({ id: 's1', projectId: 'p1', name: 'S1', prompt: 'x', html: '<h1>hi</h1>', x: 10, y: 20 }).run()
const s = db.select().from(schema.screens).where(eq(schema.screens.id, 's1')).get()
assert.equal(s?.x, 10)
assert.equal(s?.html, '<h1>hi</h1>')

db.insert(schema.screenVersions).values({ id: 'v1', screenId: 's1', name: 'S1', prompt: 'x', html: '<h1>old</h1>' }).run()
const v = db.select().from(schema.screenVersions).where(eq(schema.screenVersions.screenId, 's1')).get()
assert.equal(v?.html, '<h1>old</h1>')

// FK cascade: deleting a project takes its screens with it
db.delete(schema.projects).where(eq(schema.projects.id, 'p1')).run()
assert.equal(db.select().from(schema.screens).where(eq(schema.screens.projectId, 'p1')).all().length, 0, 'cascade delete screens')

// migrations run exactly once — a second migrate() call touches nothing
const before = sqlite.prepare('SELECT count(*) n FROM _migrations').get()
migrate(sqlite)
const after = sqlite.prepare('SELECT count(*) n FROM _migrations').get()
assert.deepEqual(before, after)

sqlite.close()
unlinkSync(path)
console.log('ok')
