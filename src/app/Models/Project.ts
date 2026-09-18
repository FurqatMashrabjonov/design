import { eq, desc } from 'drizzle-orm'
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

  create(data: { id: string; name: string; designSystem: string; device: string }): ProjectRow {
    db.insert(projects).values(data).run()
    return Project.find(data.id)!
  },

  rename(id: string, name: string) {
    db.update(projects).set({ name }).where(eq(projects.id, id)).run()
  },

  // Cascades to screens and screen_versions via the FK (see database/connection.ts's foreign_keys pragma).
  delete(id: string) {
    db.delete(projects).where(eq(projects.id, id)).run()
  },
}
