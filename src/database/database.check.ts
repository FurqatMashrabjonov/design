import assert from 'node:assert'
import { eq } from 'drizzle-orm'

// Never the real database — a throwaway one for this run (DB_FRESH), dropped when it ends.
process.env.DB_FRESH = '1'
const { db, pool } = await import('./connection.ts')
const schema = await import('./schema.ts')
const { migrate } = await import('./migrate.ts')

await db.insert(schema.projects).values({ id: 'p1', name: 'Test', designSystem: 'minimal', device: 'mobile' })
const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, 'p1'))
assert.equal(p?.name, 'Test')
assert.equal(typeof p?.createdAt, 'number', 'times the app writes come back as unix seconds')

await db.insert(schema.screens).values({ id: 's1', projectId: 'p1', name: 'S1', prompt: 'x', html: '<h1>hi</h1>', x: 10.5, y: 20 })
const [s] = await db.select().from(schema.screens).where(eq(schema.screens.id, 's1'))
assert.equal(s?.x, 10.5)
assert.equal(s?.html, '<h1>hi</h1>')

await db.insert(schema.screenVersions).values({ id: 'v1', screenId: 's1', name: 'S1', prompt: 'x', html: '<h1>old</h1>' })
const [v] = await db.select().from(schema.screenVersions).where(eq(schema.screenVersions.screenId, 's1'))
assert.equal(v?.html, '<h1>old</h1>')

// FK cascade: deleting a project takes its screens with it
await db.delete(schema.projects).where(eq(schema.projects.id, 'p1'))
assert.equal((await db.select().from(schema.screens).where(eq(schema.screens.projectId, 'p1'))).length, 0, 'cascade delete screens')

// A count comes back a number, not the string node-postgres gives int8 by default.
assert.equal(typeof (await pool.query('SELECT count(*) AS n FROM projects')).rows[0].n, 'number')

// migrations run exactly once — a second migrate() touches nothing
const count = async () => (await pool.query('SELECT count(*) AS n FROM _migrations')).rows[0].n
const before = await count()
await migrate(pool)
assert.equal(await count(), before)

console.log('ok')
