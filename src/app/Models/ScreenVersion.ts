import { eq, and, asc } from 'drizzle-orm'
import { db } from '@/database/connection'
import { screenVersions } from '@/database/schema'
import type { ScreenRow } from './Screen'

export type ScreenVersionRow = typeof screenVersions.$inferSelect

// Oldest first, so index 0 is v1. created_at is in seconds and two snapshots often share one, so
// the insertion order (seq) breaks the tie.
const timeline = (screenId: string) => eq(screenVersions.screenId, screenId)
const order = [asc(screenVersions.createdAt), asc(screenVersions.seq)]

export const ScreenVersion = {
  forScreen(screenId: string): Promise<ScreenVersionRow[]> {
    return db.select().from(screenVersions).where(timeline(screenId)).orderBy(...order)
  },

  /** The snapshot ids in order — what the ‹ › arrows walk, without loading every page. */
  async ids(screenId: string): Promise<string[]> {
    return (await db.select({ id: screenVersions.id }).from(screenVersions).where(timeline(screenId)).orderBy(...order)).map((r) => r.id)
  },

  async findInScreen(id: string, screenId: string): Promise<ScreenVersionRow | undefined> {
    return (await db.select().from(screenVersions).where(and(eq(screenVersions.id, id), eq(screenVersions.screenId, screenId))))[0]
  },

  // Snapshots a screen's current row before the caller overwrites it — shared by every edit path
  // and by "undo", so an undo is itself just another recorded edit and nothing is lost.
  // Returns the snapshot's id, so the message that caused the change can point back at it.
  // A screen that is showing an older version (the ‹ arrow) already has that snapshot: it is
  // returned instead of copied again.
  async captureFrom(screen: Pick<ScreenRow, 'id' | 'name' | 'prompt' | 'html'> & { versionId?: string | null }): Promise<string> {
    if (screen.versionId) {
      const shown = await ScreenVersion.findInScreen(screen.versionId, screen.id)
      if (shown && shown.html === screen.html && shown.name === screen.name && shown.prompt === screen.prompt) return shown.id
    }
    const id = crypto.randomUUID()
    await db.insert(screenVersions).values({ id, screenId: screen.id, name: screen.name, prompt: screen.prompt, html: screen.html })
    return id
  },

  async count(screenId: string): Promise<number> {
    return (await ScreenVersion.ids(screenId)).length
  },

  /**
   * Where the screen stands in its own timeline, for the `v3 / 5` on the frame: the snapshots are
   * v1…vn and the newest work is one past them, unless the screen is showing an older version.
   */
  async position(screen: Pick<ScreenRow, 'id' | 'versionId'>): Promise<{ position: number; total: number }> {
    const ids = await ScreenVersion.ids(screen.id)
    const at = screen.versionId ? ids.indexOf(screen.versionId) : -1
    return at < 0 ? { position: ids.length + 1, total: ids.length + 1 } : { position: at + 1, total: ids.length }
  },
}
