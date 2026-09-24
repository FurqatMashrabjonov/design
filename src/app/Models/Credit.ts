import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { creditLedger } from '@/database/schema'

// BIL-04: the credit ledger. Nothing stores a balance; it is the sum of a user's rows.
export type CreditKind = 'signup' | 'admin' | 'purchase' | 'subscription' | 'expire' | 'hold' | 'refund'
export type CreditEntry = { userId: string; delta: number; kind: CreditKind; actionId?: string; ref?: string; note?: string }
/** The database, or a transaction on it (BIL-06 holds a balance check and its write in one). */
export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export const Credit = {
  async balance(userId: string, ex: Executor = db): Promise<number> {
    return (await ex.select({ n: sql<number>`coalesce(sum(delta), 0)`.mapWith(Number) }).from(creditLedger).where(eq(creditLedger.userId, userId)))[0]?.n ?? 0
  },

  /** Writes one row. With a `ref` it happens once: a second row with the same ref is ignored (false). */
  async add(e: CreditEntry, ex: Executor = db): Promise<boolean> {
    if (!Number.isInteger(e.delta) || e.delta === 0) throw new Error('A credit row moves a whole, non-zero number of credits')
    const rows = await ex
      .insert(creditLedger)
      .values({ id: crypto.randomUUID(), userId: e.userId, delta: e.delta, kind: e.kind, actionId: e.actionId ?? null, ref: e.ref ?? null, note: e.note ?? null })
      .onConflictDoNothing()
      .returning({ id: creditLedger.id })
    return rows.length === 1
  },

  /** The net of an action's rows for this user: what it took after refunds (negative), or 0. */
  async ofAction(userId: string, actionId: string): Promise<number> {
    return (await db.select({ n: sql<number>`coalesce(sum(delta), 0)`.mapWith(Number) }).from(creditLedger).where(and(eq(creditLedger.userId, userId), eq(creditLedger.actionId, actionId))))[0]?.n ?? 0
  },

  async hasRef(ref: string): Promise<boolean> {
    return (await db.select({ id: creditLedger.id }).from(creditLedger).where(eq(creditLedger.ref, ref)).limit(1)).length > 0
  },

  /** BIL-10: the latest monthly plan grant, and how much generation has used since it (holds net of refunds). */
  async lastPlanGrant(userId: string): Promise<{ delta: number; usedSince: number } | undefined> {
    const g = (await db.select({ delta: creditLedger.delta, seq: creditLedger.seq }).from(creditLedger).where(and(eq(creditLedger.userId, userId), eq(creditLedger.kind, 'subscription'))).orderBy(desc(creditLedger.seq)).limit(1))[0]
    if (!g) return undefined
    const used = (await db
      .select({ n: sql<number>`coalesce(-sum(delta), 0)`.mapWith(Number) })
      .from(creditLedger)
      .where(and(eq(creditLedger.userId, userId), gt(creditLedger.seq, g.seq), inArray(creditLedger.kind, ['hold', 'refund']))))[0]?.n ?? 0
    return { delta: g.delta, usedSince: used }
  },

  history(userId: string, limit = 50) {
    return db.select().from(creditLedger).where(eq(creditLedger.userId, userId)).orderBy(desc(creditLedger.seq)).limit(limit)
  },
}
