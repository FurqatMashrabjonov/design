import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/database/connection'
import { screenVersions } from '@/database/schema'
import type { ScreenRow } from './Screen'

export type ScreenVersionRow = typeof screenVersions.$inferSelect

export const ScreenVersion = {
  forScreen(screenId: string): ScreenVersionRow[] {
    return db.select().from(screenVersions).where(eq(screenVersions.screenId, screenId)).orderBy(desc(screenVersions.createdAt)).all()
  },

  findInScreen(id: string, screenId: string): ScreenVersionRow | undefined {
    return db
      .select()
      .from(screenVersions)
      .where(and(eq(screenVersions.id, id), eq(screenVersions.screenId, screenId)))
      .get()
  },

  // Snapshots a screen's current row before the caller overwrites it — shared by the edit path
  // and restoreVersion, so "restore" is itself just another recorded edit and nothing is lost.
  captureFrom(screen: Pick<ScreenRow, 'id' | 'name' | 'prompt' | 'html'>) {
    db.insert(screenVersions)
      .values({ id: crypto.randomUUID(), screenId: screen.id, name: screen.name, prompt: screen.prompt, html: screen.html })
      .run()
  },
}
