import { eq } from 'drizzle-orm'
import { db } from '@/database/connection'
import { session, user } from '@/database/schema'

// ADM-04: the writes an admin makes to an account. Better Auth owns the table; these touch only
// the admin plugin's fields and the sessions.
export const User = {
  find(id: string) {
    return db.select().from(user).where(eq(user.id, id)).get()
  },

  setBan(id: string, banned: boolean, reason: string | null = null) {
    db.update(user).set({ banned, banReason: banned ? reason : null, banExpires: null }).where(eq(user.id, id)).run()
    if (banned) User.revokeSessions(id)
  },

  revokeSessions(id: string) {
    db.delete(session).where(eq(session.userId, id)).run()
  },

  setRole(id: string, role: 'admin' | 'user') {
    db.update(user).set({ role }).where(eq(user.id, id)).run()
  },
}
