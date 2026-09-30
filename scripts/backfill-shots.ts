// KON-10: pictures for screens drawn before /api/shot existed (new screens are warmed as they are drawn).
// Run once after deploying: node --import ./scripts/alias-hook.mjs scripts/backfill-shots.ts
const { db } = await import('@/database/connection')
const { sql } = await import('drizzle-orm')
const { ShotService } = await import('@/app/Services/ShotService')

const rows = (await db.execute(sql`SELECT id, project_id AS "projectId", slug, html FROM screens WHERE deleted_at IS NULL AND html != '' ORDER BY created_at DESC`)).rows as { id: string; projectId: string; slug: string | null; html: string }[]
const looks = new Map<string, Awaited<ReturnType<typeof ShotService.lookOf>>>()
const t0 = Date.now()
let made = 0
await Promise.all(rows.map(async (r) => {
  if (!looks.has(r.projectId)) looks.set(r.projectId, await ShotService.lookOf(r.projectId))
  const look = looks.get(r.projectId)
  if (look && (await ShotService.get(r.html, look, r.slug ?? r.id))) made++
}))
console.log(`${made} of ${rows.length} screens have a picture (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
process.exit(0)
