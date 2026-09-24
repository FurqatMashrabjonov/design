import { desc } from 'drizzle-orm'
import { db } from '@/database/connection'
import { adminActions } from '@/database/schema'

// ADM-01: the audit trail of admin actions.
export const AdminAction = {
  async log(adminId: string, action: string, target?: string | null, detail?: string | null) {
    await db.insert(adminActions).values({ id: crypto.randomUUID(), adminId, action, target: target ?? null, detail: detail ?? null })
  },

  recent(limit = 100) {
    return db.select().from(adminActions).orderBy(desc(adminActions.createdAt)).limit(limit)
  },
}
