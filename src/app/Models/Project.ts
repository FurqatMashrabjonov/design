import { and, eq, desc, isNull, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { projects } from '@/database/schema'

export type ProjectRow = typeof projects.$inferSelect

export const Project = {
  all(): Promise<ProjectRow[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt))
  },

  async find(id: string): Promise<ProjectRow | undefined> {
    return (await db.select().from(projects).where(eq(projects.id, id)))[0]
  },

  /** A user's own projects, newest first (OWN-02). */
  forUser(userId: string): Promise<ProjectRow[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt))
  },

  /**
   * The dashboard's cards (DSH-04/11): each project with how many screens it shows, the first three
   * (its collage, UI-12) and when it last changed — every change writes a message, so that is the
   * latest message. Failed and deleted screens are not counted.
   */
  async cardsForUser(userId: string) {
    const shown = sql`s.project_id = ${projects.id} AND s.deleted_at IS NULL AND s.html != ''`
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        device: projects.device,
        designSystem: projects.designSystem,
        favorite: projects.favorite,
        shared: sql<boolean>`${projects.shareToken} IS NOT NULL`.mapWith(Boolean),
        createdAt: projects.createdAt,
        screenCount: sql<number>`(SELECT count(*) FROM screens s WHERE ${shown})`.mapWith(Number),
        covers: sql<string[]>`ARRAY(SELECT s.id FROM screens s WHERE ${shown} ORDER BY s.created_at, s.id LIMIT 3)`,
        updatedAt: sql<number>`GREATEST(${projects.createdAt}, coalesce((SELECT max(m.created_at) FROM messages m WHERE m.project_id = ${projects.id}), 0))`.mapWith(Number),
      })
      .from(projects)
      .where(eq(projects.userId, userId))
    return rows.sort((a, b) => b.updatedAt - a.updatedAt)
  },

  /** SHR-02: the project a share link names, or nothing — never a hint that it exists but is private. */
  async byShareToken(token: string): Promise<ProjectRow | undefined> {
    return (await db.select().from(projects).where(eq(projects.shareToken, token)))[0]
  },

  async setShareToken(id: string, shareToken: string | null) {
    await db.update(projects).set({ shareToken }).where(eq(projects.id, id))
  },

  async setFavorite(id: string, favorite: boolean) {
    await db.update(projects).set({ favorite }).where(eq(projects.id, id))
  },

  /** The project only if this user owns it — the one ownership check every request goes through. */
  async findOwned(id: string, userId: string): Promise<ProjectRow | undefined> {
    return (await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))))[0]
  },

  /** OWN-05: projects from before accounts existed go to the first person who signs in. */
  async adoptOrphans(userId: string) {
    await db.update(projects).set({ userId }).where(isNull(projects.userId))
  },

  async create(data: { id: string; name: string; designSystem: string; device: string; userId?: string | null; designSystemAuto?: boolean }): Promise<ProjectRow> {
    return (await db.insert(projects).values(data).returning())[0]!
  },

  async rename(id: string, name: string) {
    await db.update(projects).set({ name }).where(eq(projects.id, id))
  },

  async saveTheme(id: string, theme: unknown) {
    await db.update(projects).set({ theme: JSON.stringify(theme) }).where(eq(projects.id, id))
  },

  async saveNavigation(id: string, navigation: unknown) {
    await db.update(projects).set({ navigation: JSON.stringify(navigation) }).where(eq(projects.id, id))
  },

  async savePlan(id: string, plan: unknown) {
    await db.update(projects).set({ plan: JSON.stringify(plan) }).where(eq(projects.id, id))
  },

  // Cascades to screens and screen_versions via the foreign keys.
  async delete(id: string) {
    await db.delete(projects).where(eq(projects.id, id))
  },
}
