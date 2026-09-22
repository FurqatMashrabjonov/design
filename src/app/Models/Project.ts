import { and, eq, desc, isNull, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { projects } from '@/database/schema'

export type ProjectRow = typeof projects.$inferSelect

export const Project = {
  all(): ProjectRow[] {
    return db.select().from(projects).orderBy(desc(projects.createdAt)).all()
  },

  find(id: string): ProjectRow | undefined {
    return db.select().from(projects).where(eq(projects.id, id)).get()
  },

  /** A user's own projects, newest first (OWN-02). */
  forUser(userId: string): ProjectRow[] {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt)).all()
  },

  /**
   * The dashboard's cards (DSH-04/11): each project with how many screens it shows, the first one
   * (its thumbnail) and when it last changed — every change writes a message, so that is the
   * latest message. Failed and deleted screens are not counted.
   */
  cardsForUser(userId: string) {
    const shown = sql`s.project_id = ${projects.id} AND s.deleted_at IS NULL AND s.html != ''`
    return db
      .select({
        id: projects.id,
        name: projects.name,
        device: projects.device,
        designSystem: projects.designSystem,
        favorite: projects.favorite,
        createdAt: projects.createdAt,
        screenCount: sql<number>`(SELECT count(*) FROM screens s WHERE ${shown})`,
        coverId: sql<string | null>`(SELECT s.id FROM screens s WHERE ${shown} ORDER BY s.created_at, s.rowid LIMIT 1)`,
        updatedAt: sql<number>`max(${projects.createdAt}, coalesce((SELECT max(m.created_at) FROM messages m WHERE m.project_id = ${projects.id}), 0))`,
      })
      .from(projects)
      .where(eq(projects.userId, userId))
      .all()
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },

  setFavorite(id: string, favorite: boolean) {
    db.update(projects).set({ favorite }).where(eq(projects.id, id)).run()
  },

  /** The project only if this user owns it — the one ownership check every request goes through. */
  findOwned(id: string, userId: string): ProjectRow | undefined {
    return db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).get()
  },

  /** OWN-05: projects from before accounts existed go to the first person who signs in. */
  adoptOrphans(userId: string) {
    db.update(projects).set({ userId }).where(isNull(projects.userId)).run()
  },

  create(data: { id: string; name: string; designSystem: string; device: string; userId?: string | null }): ProjectRow {
    db.insert(projects).values(data).run()
    return Project.find(data.id)!
  },

  rename(id: string, name: string) {
    db.update(projects).set({ name }).where(eq(projects.id, id)).run()
  },

  saveTheme(id: string, theme: unknown) {
    db.update(projects).set({ theme: JSON.stringify(theme) }).where(eq(projects.id, id)).run()
  },

  saveNavigation(id: string, navigation: unknown) {
    db.update(projects).set({ navigation: JSON.stringify(navigation) }).where(eq(projects.id, id)).run()
  },

  savePlan(id: string, plan: unknown) {
    db.update(projects).set({ plan: JSON.stringify(plan) }).where(eq(projects.id, id)).run()
  },

  // Cascades to screens and screen_versions via the FK (see database/connection.ts's foreign_keys pragma).
  delete(id: string) {
    db.delete(projects).where(eq(projects.id, id)).run()
  },
}
