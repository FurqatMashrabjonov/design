import { eq, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { settings } from '@/database/schema'

// ADM-08: runtime switches an admin changes without a deploy. Keys in use:
//   generation.paused = '1'          limits.callsPerDay = '150'       limits.dailyBudgetUsd = '5'
//   limits.user.<userId> = '300'     (a per-user daily call limit)
export const Setting = {
  async get(key: string): Promise<string | null> {
    return (await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)))[0]?.value ?? null
  },

  /** null removes the key, so the default (env or code) applies again. */
  async set(key: string, value: string | null) {
    if (value === null) await db.delete(settings).where(eq(settings.key, key))
    else await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: sql`extract(epoch from now())::bigint` } })
  },

  all() {
    return db.select().from(settings)
  },
}
