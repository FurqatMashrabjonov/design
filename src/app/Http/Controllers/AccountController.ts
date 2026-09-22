import { eq } from 'drizzle-orm'
import { db } from '@/database/connection'
import { user } from '@/database/schema'

export const AccountController = {
  // AUTH-09: deleting the account deletes everything that was theirs. Projects cascade from the
  // user row (projects.user_id), and screens, versions, messages and feedback from the projects;
  // sessions and linked sign-in accounts cascade from the user as well.
  destroy(userId: string) {
    db.delete(user).where(eq(user.id, userId)).run()
    return { ok: true }
  },
}
