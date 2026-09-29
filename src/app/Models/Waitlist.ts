import { sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { shareViews, waitlist } from '@/database/schema'

// WLT-01: opens of shared previews and the waitlist they collect, both by the post they came from (`ref`).
export const Waitlist = {
  async view(projectId: string, ref: string | null) {
    await db.insert(shareViews).values({ projectId, ref })
  },

  /** True when the email is new; a second sign-up keeps the first row (and its ref) and adds the note if it had none. */
  async join(row: { email: string; ref: string | null; projectId: string | null; note: string | null }) {
    const r = await db.insert(waitlist).values(row).onConflictDoUpdate({ target: waitlist.email, set: { note: sql`coalesce(${waitlist.note}, excluded.note)` } }).returning({ created: sql<boolean>`xmax = 0` })
    return r[0]?.created === true
  },
}
