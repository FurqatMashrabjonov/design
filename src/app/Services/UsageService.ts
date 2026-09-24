import { AsyncLocalStorage } from 'node:async_hooks'
import { and, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { llmCalls } from '@/database/schema'
import { costOf, onLlmCall } from './LlmService'
import { Setting } from '@/app/Models/Setting'

// OBS-01 + LIM-01/02/03. Every model call made inside a request is written to llm_calls with the
// user and project of that request (carried by AsyncLocalStorage, so no controller has to pass
// them down). The limits are read back from the same table, so they survive a restart.

/** Who a call is for, and the one guarded request (`actionId`) it belongs to. */
type Ctx = { userId: string; projectId?: string; actionId?: string }
const ctx = new AsyncLocalStorage<Ctx>()

let listening = false
function listen() {
  if (listening) return
  listening = true
  onLlmCall((c) => {
    const who = ctx.getStore()
    db.insert(llmCalls)
      .values({
        id: crypto.randomUUID(),
        userId: who?.userId ?? null,
        projectId: who?.projectId ?? null,
        actionId: who?.actionId ?? null,
        provider: c.provider,
        model: c.model,
        promptTokens: c.usage.promptTokens,
        cachedTokens: c.usage.cachedTokens,
        cacheWriteTokens: c.usage.cacheWriteTokens ?? 0,
        completionTokens: c.usage.completionTokens,
        // A local subscription run (claude-cli) costs nothing on the API bill.
        costUsd: c.provider === 'claude-cli' ? 0 : costOf(c.usage, c.model),
        ms: c.ms,
        ok: c.ok,
        error: c.error ?? null,
      })
      .run()
  })
}

export const LIMITS = {
  /** Model calls per user per rolling day. A 6-screen app is ~8 calls; an edit is 1. */
  callsPerDay: Number(process.env.LIMIT_CALLS_PER_DAY ?? 150),
  /** All users together, per UTC day, in USD. Generation pauses when it is reached. */
  dailyBudgetUsd: Number(process.env.LLM_DAILY_BUDGET_USD ?? 5),
}

// LIM-02: one generation at a time per user. ponytail: in memory, fine for one server process;
// move to the database or a lock service if the app ever runs on several.
const running = new Set<string>()

export const UsageService = {
  /** Runs `fn` with calls attributed to this user and project. */
  run<T>(who: Ctx, fn: () => T): T {
    listen()
    return ctx.run(who, fn)
  },

  /** ADM-08: the limits in force — an admin's setting wins over the env/code default. */
  limits(userId?: string) {
    const num = (key: string, fallback: number) => {
      const v = Number(Setting.get(key))
      return Setting.get(key) !== null && Number.isFinite(v) && v >= 0 ? v : fallback
    }
    const callsPerDay = num('limits.callsPerDay', LIMITS.callsPerDay)
    return {
      callsPerDay: userId ? num(`limits.user.${userId}`, callsPerDay) : callsPerDay,
      dailyBudgetUsd: num('limits.dailyBudgetUsd', LIMITS.dailyBudgetUsd),
      paused: process.env.GENERATION_PAUSED === '1' || Setting.get('generation.paused') === '1',
    }
  },

  /** Generations running right now (ADM-02's "now" panel). */
  running(): string[] {
    return [...running]
  },

  /** Why this user may not start a generation now, or null. */
  refusal(userId: string): { status: number; message: string } | null {
    const limits = UsageService.limits(userId)
    if (limits.paused) return { status: 503, message: 'Generation is paused for maintenance. Try again later.' }
    if (running.has(userId)) return { status: 429, message: 'A generation is already running. Wait for it to finish or stop it.' }
    if (UsageService.callsToday(userId) >= limits.callsPerDay) return { status: 429, message: 'You have reached today’s generation limit. It resets within 24 hours.' }
    const midnight = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)
    const spent = db.select({ usd: sql<number>`coalesce(sum(cost_usd), 0)` }).from(llmCalls).where(gte(llmCalls.createdAt, midnight)).get()?.usd ?? 0
    if (spent >= limits.dailyBudgetUsd) return { status: 503, message: 'Generation is paused for today — the service reached its daily limit. Try again tomorrow.' }
    return null
  },

  /** Model calls this user made in the last 24 hours — what the daily limit counts (DSH-12 shows it). */
  callsToday(userId: string): number {
    const dayAgo = Math.floor(Date.now() / 1000) - 86400
    return db.select({ n: sql<number>`count(*)` }).from(llmCalls).where(and(eq(llmCalls.userId, userId), gte(llmCalls.createdAt, dayAgo))).get()?.n ?? 0
  },

  begin(userId: string) {
    running.add(userId)
  },
  end(userId: string) {
    running.delete(userId)
  },

  /** LLM-05: what one action really cost — every call it made, priced by its own model. */
  actionCost(actionId: string): { calls: number; ok: number; usd: number } {
    const r = db
      .select({ calls: sql<number>`count(*)`, ok: sql<number>`coalesce(sum(ok), 0)`, usd: sql<number>`coalesce(sum(cost_usd), 0)` })
      .from(llmCalls)
      .where(eq(llmCalls.actionId, actionId))
      .get()
    return { calls: r?.calls ?? 0, ok: r?.ok ?? 0, usd: r?.usd ?? 0 }
  },

  /** The user, project and action the current code runs for, if any (the eval and tests have none). */
  who(): Ctx | undefined {
    return ctx.getStore()
  },

  /** OBS-05 groundwork: spend per user over a window. */
  spendByUser(sinceUnix: number) {
    return db
      .select({ userId: llmCalls.userId, calls: sql<number>`count(*)`, usd: sql<number>`sum(cost_usd)` })
      .from(llmCalls)
      .where(gte(llmCalls.createdAt, sinceUnix))
      .groupBy(llmCalls.userId)
      .all()
  },
}
