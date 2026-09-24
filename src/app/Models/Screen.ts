import { eq, and, desc, isNull } from 'drizzle-orm'
import { db } from '@/database/connection'
import { screens } from '@/database/schema'

export type ScreenRow = typeof screens.$inferSelect

// A deleted screen keeps its row (deleted_at) so it can be brought back; listings leave it out,
// lookups by id still find it.
const live = (projectId: string) => and(eq(screens.projectId, projectId), isNull(screens.deletedAt))

export const Screen = {
  forProject(projectId: string): Promise<ScreenRow[]> {
    return db.select().from(screens).where(live(projectId)).orderBy(desc(screens.createdAt))
  },

  async find(id: string): Promise<ScreenRow | undefined> {
    return (await db.select().from(screens).where(eq(screens.id, id)))[0]
  },

  // Scoped by project so an id from another project can never be read or edited.
  async findInProject(id: string, projectId: string): Promise<ScreenRow | undefined> {
    return (await db.select().from(screens).where(and(eq(screens.id, id), eq(screens.projectId, projectId))))[0]
  },

  // For auto-placing a new frame to the right of the rest — only x/y are needed.
  positions(projectId: string): Promise<{ x: number; y: number }[]> {
    return db.select({ x: screens.x, y: screens.y }).from(screens).where(live(projectId))
  },

  // Measured by the frame itself once it has rendered; see lib/frame-height.ts.
  async saveHeight(id: string, height: number) {
    await db.update(screens).set({ height }).where(eq(screens.id, id))
  },

  async create(data: {
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
  }): Promise<ScreenRow> {
    return (await db.insert(screens).values(data).returning())[0]!
  },

  // Content only — never touches position, so an edit can't jump the frame on the canvas.
  // A failed attempt leaves the previous design (if any) in place and only records why.
  async markFailed(id: string, error: string) {
    await db.update(screens).set({ error: error.slice(0, 500) }).where(eq(screens.id, id))
  },

  // A successful draw always clears the failure note, and any new content is the newest work: the
  // screen stops pointing at an older version unless the caller is the one stepping to it.
  async updateContent(id: string, data: { name: string; prompt: string; html: string; versionId?: string | null }) {
    await db.update(screens).set({ versionId: null, ...data, error: null }).where(eq(screens.id, id))
  },

  async move(id: string, x: number, y: number) {
    await db.update(screens).set({ x, y }).where(eq(screens.id, id))
  },

  async rename(id: string, name: string) {
    await db.update(screens).set({ name }).where(eq(screens.id, id))
  },

  async delete(id: string) {
    await db.update(screens).set({ deletedAt: Math.floor(Date.now() / 1000) }).where(eq(screens.id, id))
  },

  async restore(id: string) {
    await db.update(screens).set({ deletedAt: null }).where(eq(screens.id, id))
  },
}
