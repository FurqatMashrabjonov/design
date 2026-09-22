import { eq, and, asc, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { screenVersions } from '@/database/schema'
import type { ScreenRow } from './Screen'

export type ScreenVersionRow = typeof screenVersions.$inferSelect

// Oldest first, so index 0 is v1. created_at is in seconds and two snapshots often share one, so
// the insertion order (rowid) breaks the tie.
const timeline = (screenId: string) => eq(screenVersions.screenId, screenId)
const order = [asc(screenVersions.createdAt), asc(sql`rowid`)]

export const ScreenVersion = {
  forScreen(screenId: string): ScreenVersionRow[] {
    return db.select().from(screenVersions).where(timeline(screenId)).orderBy(...order).all()
  },

  /** The snapshot ids in order — what the ‹ › arrows walk, without loading every page. */
  ids(screenId: string): string[] {
    return db.select({ id: screenVersions.id }).from(screenVersions).where(timeline(screenId)).orderBy(...order).all().map((r) => r.id)
  },

  findInScreen(id: string, screenId: string): ScreenVersionRow | undefined {
    return db
      .select()
      .from(screenVersions)
      .where(and(eq(screenVersions.id, id), eq(screenVersions.screenId, screenId)))
      .get()
  },

  // Snapshots a screen's current row before the caller overwrites it — shared by every edit path
  // and by "undo", so an undo is itself just another recorded edit and nothing is lost.
  // Returns the snapshot's id, so the message that caused the change can point back at it.
  // A screen that is showing an older version (the ‹ arrow) already has that snapshot: it is
  // returned instead of copied again.
  captureFrom(screen: Pick<ScreenRow, 'id' | 'name' | 'prompt' | 'html'> & { versionId?: string | null }): string {
    if (screen.versionId) {
      const shown = ScreenVersion.findInScreen(screen.versionId, screen.id)
      if (shown && shown.html === screen.html && shown.name === screen.name && shown.prompt === screen.prompt) return shown.id
    }
    const id = crypto.randomUUID()
    db.insert(screenVersions).values({ id, screenId: screen.id, name: screen.name, prompt: screen.prompt, html: screen.html }).run()
    return id
  },

  count(screenId: string): number {
    return ScreenVersion.ids(screenId).length
  },

  /**
   * Where the screen stands in its own timeline, for the `v3 / 5` on the frame: the snapshots are
   * v1…vn and the newest work is one past them, unless the screen is showing an older version.
   */
  position(screen: Pick<ScreenRow, 'id' | 'versionId'>): { position: number; total: number } {
    const ids = ScreenVersion.ids(screen.id)
    const at = screen.versionId ? ids.indexOf(screen.versionId) : -1
    return at < 0 ? { position: ids.length + 1, total: ids.length + 1 } : { position: at + 1, total: ids.length }
  },
}
