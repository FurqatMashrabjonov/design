import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/database/connection'
import { feedback } from '@/database/schema'

export type FeedbackValue = 'up' | 'down' | 'regenerate'
export type FeedbackRow = typeof feedback.$inferSelect

export const Feedback = {
  /** Up/down replaces the screen's earlier up/down (null clears it); regenerate always appends. */
  record(data: { projectId: string; screenId: string; value: FeedbackValue | null; designSystem: string; archetype: string | null; variant: string | null }) {
    if (data.value !== 'regenerate') db.delete(feedback).where(and(eq(feedback.screenId, data.screenId), inArray(feedback.value, ['up', 'down']))).run()
    if (!data.value) return
    const { value, ...rest } = data
    db.insert(feedback).values({ id: crypto.randomUUID(), value, ...rest }).run()
  },

  /** The current up/down per screen of a project. */
  ratings(projectId: string): Map<string, 'up' | 'down'> {
    const rows = db.select().from(feedback).where(and(eq(feedback.projectId, projectId), inArray(feedback.value, ['up', 'down']))).all()
    return new Map(rows.map((r) => [r.screenId, r.value as 'up' | 'down']))
  },

  forProject(projectId: string): FeedbackRow[] {
    return db.select().from(feedback).where(eq(feedback.projectId, projectId)).all()
  },
}
