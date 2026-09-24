import { eq } from 'drizzle-orm'
import { db } from '@/database/connection'
import { session, user } from '@/database/schema'

// ADM-04: the writes an admin makes to an account. Better Auth owns the table; these touch only
// the admin plugin's fields and the sessions.
export const User = {
  async find(id: string) {
    return (await db.select().from(user).where(eq(user.id, id)))[0]
  },

  async setBan(id: string, banned: boolean, reason: string | null = null) {
    await db.update(user).set({ banned, banReason: banned ? reason : null, banExpires: null }).where(eq(user.id, id))
    if (banned) await User.revokeSessions(id)
  },

  async revokeSessions(id: string) {
    await db.delete(session).where(eq(session.userId, id))
  },

  async setRole(id: string, role: 'admin' | 'user') {
    await db.update(user).set({ role }).where(eq(user.id, id))
  },
}
