import { desc } from 'drizzle-orm'
import { db } from '@/database/connection'
import { adminActions } from '@/database/schema'

// ADM-01: the audit trail of admin actions.
export const AdminAction = {
  log(adminId: string, action: string, target?: string | null, detail?: string | null) {
    db.insert(adminActions).values({ id: crypto.randomUUID(), adminId, action, target: target ?? null, detail: detail ?? null }).run()
  },

  recent(limit = 100) {
    return db.select().from(adminActions).orderBy(desc(adminActions.createdAt)).limit(limit).all()
  },
}
