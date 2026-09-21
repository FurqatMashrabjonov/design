import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/database/connection'
import { screens } from '@/database/schema'

export type ScreenRow = typeof screens.$inferSelect

export const Screen = {
  forProject(projectId: string): ScreenRow[] {
    return db.select().from(screens).where(eq(screens.projectId, projectId)).orderBy(desc(screens.createdAt)).all()
  },

  find(id: string): ScreenRow | undefined {
    return db.select().from(screens).where(eq(screens.id, id)).get()
  },

  // Scoped by project so an id from another project can never be read or edited.
  findInProject(id: string, projectId: string): ScreenRow | undefined {
    return db
      .select()
      .from(screens)
      .where(and(eq(screens.id, id), eq(screens.projectId, projectId)))
      .get()
  },

  // For auto-placing a new frame to the right of the rest — only x/y are needed.
  positions(projectId: string): { x: number; y: number }[] {
    return db.select({ x: screens.x, y: screens.y }).from(screens).where(eq(screens.projectId, projectId)).all()
  },

  // Measured by the frame itself once it has rendered; see lib/frame-height.ts.
  saveHeight(id: string, height: number) {
    db.update(screens).set({ height }).where(eq(screens.id, id)).run()
  },

  create(data: {
    id: string
    projectId: string
    name: string
    prompt: string
    html: string
    x: number
    y: number
    screenType?: string
    activeTabId?: string | null
    parentScreenName?: string | null
    spec?: string | null
    error?: string | null
  }): ScreenRow {
    db.insert(screens).values(data).run()
    return Screen.findInProject(data.id, data.projectId)!
  },

  // Content only — never touches position, so an edit can't jump the frame on the canvas.
  // A failed attempt leaves the previous design (if any) in place and only records why.
  markFailed(id: string, error: string) {
    db.update(screens).set({ error: error.slice(0, 500) }).where(eq(screens.id, id)).run()
  },

  // A successful draw always clears the failure note.
  updateContent(id: string, data: { name: string; prompt: string; html: string }) {
    db.update(screens).set({ ...data, error: null }).where(eq(screens.id, id)).run()
  },

  move(id: string, x: number, y: number) {
    db.update(screens).set({ x, y }).where(eq(screens.id, id)).run()
  },

  rename(id: string, name: string) {
    db.update(screens).set({ name }).where(eq(screens.id, id)).run()
  },

  delete(id: string) {
    db.delete(screens).where(eq(screens.id, id)).run()
  },
}
