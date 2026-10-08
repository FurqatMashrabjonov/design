import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { screenshotScreen } from './RenderAudit'
import { runtimeUrl, type AppLook } from './ScreenDocument'
import { appLook } from './JsxGenerator'
import { Project } from '@/app/Models/Project'
import { parseAppTheme } from '@/lib/app-theme'

// KON-10: a screen's picture, made once and kept. The key is a hash of the source and the look it is shown in, so a
// changed screen or theme makes a new picture and an old one is never shown for it. Pictures are made on first ask
// (and warmed right after a screen is drawn), one per key however many ask; Chrome itself is capped server-wide
// (RenderAudit's CHROME_MAX).
// The runtime's build is in the key too: a picture taken while a deploy was half done (a module 404, "This screen
// crashed") was kept for good; each new runtime now makes its pictures again, on first ask.
// ponytail: pictures of screens that changed stay in the table; prune by age if it ever matters (~30-60 KB each).

const inflight = new Map<string, Promise<Buffer | null>>()

export const ShotService = {
  key(source: string, look: AppLook) {
    return createHash('sha1').update(runtimeUrl()).update('\0').update(source).update('\0').update(JSON.stringify([look.accent, look.dark, look.platform, look.style, look.tabs, ...(look.store ? [look.store] : [])])).digest('base64url').slice(0, 24)
  },

  /** The picture for this source in this look, made now if it has not been. null when it cannot be made (no Chrome). */
  async get(source: string, look: AppLook, slug: string): Promise<Buffer | null> {
    const key = ShotService.key(source, look)
    const row = (await db.execute(sql`SELECT image FROM screen_shots WHERE key = ${key}`)).rows[0] as { image: Buffer } | undefined
    if (row) return row.image
    let made = inflight.get(key)
    if (!made) {
      made = screenshotScreen(source, look, slug)
        .then(async (image) => {
          if (image) await db.execute(sql`INSERT INTO screen_shots (key, image) VALUES (${key}, ${image}) ON CONFLICT (key) DO NOTHING`)
          return image
        })
        .finally(() => inflight.delete(key))
      inflight.set(key, made)
    }
    return made
  },

  /** The look a project's screens are shown in — the same one /api/shot keys its pictures by. */
  async lookOf(projectId: string): Promise<AppLook | null> {
    const p = await Project.find(projectId)
    return p ? appLook(p, parseAppTheme(p.theme)) : null
  },

  /** Make it now, without waiting — right after a screen is drawn, so the dashboard finds it ready. */
  warm(projectId: string, source: string, slug: string) {
    if (process.env.SCREEN_SHOTS === '0') return // the tests: no Chrome per drawn screen
    void ShotService.lookOf(projectId).then((look) => look && ShotService.get(source, look, slug)).catch(() => {})
  },
}
