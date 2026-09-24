import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { creditLedger } from '@/database/schema'

// BIL-04: the credit ledger. Nothing stores a balance; it is the sum of a user's rows.
export type CreditKind = 'signup' | 'admin' | 'purchase' | 'subscription' | 'expire' | 'hold' | 'refund'
export type CreditEntry = { userId: string; delta: number; kind: CreditKind; actionId?: string; ref?: string; note?: string }

export const Credit = {
  balance(userId: string): number {
    return db.select({ n: sql<number>`coalesce(sum(delta), 0)` }).from(creditLedger).where(eq(creditLedger.userId, userId)).get()?.n ?? 0
  },

  /** Writes one row. With a `ref` it happens once: a second row with the same ref is ignored (false). */
  add(e: CreditEntry): boolean {
    if (!Number.isInteger(e.delta) || e.delta === 0) throw new Error('A credit row moves a whole, non-zero number of credits')
    const r = db
      .insert(creditLedger)
      .values({ id: crypto.randomUUID(), userId: e.userId, delta: e.delta, kind: e.kind, actionId: e.actionId ?? null, ref: e.ref ?? null, note: e.note ?? null })
      .onConflictDoNothing()
      .run()
    return r.changes === 1
  },

  /** The net of an action's rows for this user: what it took after refunds (negative), or 0. */
  ofAction(userId: string, actionId: string): number {
    return db.select({ n: sql<number>`coalesce(sum(delta), 0)` }).from(creditLedger).where(and(eq(creditLedger.userId, userId), eq(creditLedger.actionId, actionId))).get()?.n ?? 0
  },

  hasRef(ref: string): boolean {
    return db.select({ id: creditLedger.id }).from(creditLedger).where(eq(creditLedger.ref, ref)).get() !== undefined
  },

  /** BIL-10: the latest monthly plan grant, and how much generation has used since it (holds net of refunds). */
  lastPlanGrant(userId: string): { delta: number; usedSince: number } | undefined {
    const g = db.select({ delta: creditLedger.delta, rowid: sql<number>`rowid` }).from(creditLedger).where(and(eq(creditLedger.userId, userId), eq(creditLedger.kind, 'subscription'))).orderBy(desc(sql`rowid`)).get()
    if (!g) return undefined
    const used = db.select({ n: sql<number>`coalesce(-sum(delta), 0)` }).from(creditLedger).where(and(eq(creditLedger.userId, userId), sql`rowid > ${g.rowid}`, sql`kind IN ('hold', 'refund')`)).get()?.n ?? 0
    return { delta: g.delta, usedSince: used }
  },

  history(userId: string, limit = 50) {
    return db.select().from(creditLedger).where(eq(creditLedger.userId, userId)).orderBy(desc(creditLedger.createdAt), desc(sql`rowid`)).limit(limit).all()
  },
}
