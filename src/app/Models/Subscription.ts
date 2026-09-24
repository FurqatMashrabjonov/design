import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/database/connection'
import { subscriptions } from '@/database/schema'

// BIL-10: plans as the payment provider reports them. Every subscription webhook writes the whole row.
export type SubscriptionRow = typeof subscriptions.$inferSelect
const LIVE = ['active', 'trialing']

export const Subscription = {
  async upsert(s: Omit<SubscriptionRow, 'updatedAt'>) {
    const row = { ...s, updatedAt: Math.floor(Date.now() / 1000) }
    await db.insert(subscriptions).values(row).onConflictDoUpdate({ target: subscriptions.id, set: row })
  },

  /** The plan in force now: live, and not past its paid period. A cancelled plan stays until its period ends. */
  async activeFor(userId: string, nowSec = Math.floor(Date.now() / 1000)): Promise<SubscriptionRow | undefined> {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, LIVE)))
      .orderBy(desc(subscriptions.startedAt))
    return rows.find((s) => s.currentPeriodEnd === null || s.currentPeriodEnd > nowSec)
  },
}

/** Whole months from `startSec` to `nowSec` (the anniversary clamps to short months: Jan 31 → Feb 28). */
export function monthIndex(startSec: number, nowSec: number): number {
  const a = new Date(startSec * 1000)
  const b = new Date(nowSec * 1000)
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()
  const anniversary = (k: number) => {
    const y = a.getUTCFullYear(), mo = a.getUTCMonth() + k
    const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()
    return Date.UTC(y, mo, Math.min(a.getUTCDate(), last), a.getUTCHours(), a.getUTCMinutes(), a.getUTCSeconds())
  }
  if (b.getTime() < anniversary(m)) m--
  return Math.max(0, m)
}
