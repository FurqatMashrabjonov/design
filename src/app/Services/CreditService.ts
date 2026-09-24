import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { creditLedger } from '@/database/schema'
import { Credit, type Executor } from '@/app/Models/Credit'
import { modelFor, type Site } from './LlmService.ts'
import { UsageService } from './UsageService.ts'
import { CREDIT_PRICES, PLAN_LIMITS, SIGNUP_CREDITS, productOf, type ActionKind, type Limits, type PlanId } from '@/lib/credit-prices'
import { monthIndex, Subscription } from '@/app/Models/Subscription'

// BIL-05/06/07: charging credits for actions. The prices themselves live in lib/credit-prices.ts,
// shared with the browser. An app is `plan` + `draw`: the plan is charged when it is made, the
// drawing when it is approved.
export { CREDIT_PRICES, CHEAPEST_CREDIT_USD, SIGNUP_CREDITS, type ActionKind } from '@/lib/credit-prices'

export const CreditService = {
  /**
   * LLM-07: an action is priced at the model its call site is set to run on — a plan at the plan
   * model, a drawing and a screen at the screen model, an element at the edit model. A screen request
   * may be a patch edit (the edit model), so it costs the dearer of the two. `model` pins one model.
   */
  async priceOf(kind: ActionKind, model?: string): Promise<number> {
    const row = (m: string) => {
      const p = CREDIT_PRICES[m]
      if (!p) throw new Error(`No credit price for model "${m}"`)
      return p
    }
    const at = async (site: Site) => row(model ?? (await modelFor(site)))
    if (kind === 'plan') return (await at('plan')).plan
    if (kind === 'draw') return (await at('screen')).draw
    if (kind === 'app') return (await at('plan')).plan + (await at('screen')).draw
    if (kind === 'element') return (await at('edit')).element
    return Math.max((await at('screen')).screen, (await at('edit')).screen)
  },

  /** Which action a guarded request is, from its route and body. */
  kindOf(path: string, body: Record<string, unknown>): ActionKind {
    if (path.endsWith('/generate-plan')) return body.approve ? 'draw' : body.gate === true ? 'plan' : 'app'
    return typeof body.editElementId === 'string' && body.editElementId ? 'element' : 'screen'
  },

  /**
   * BIL-10: a plan's credits, one grant per month of the plan (a yearly plan too), each at most once
   * (its ref names the subscription, the month and the product). Before a new month's grant, what is
   * left of the last one lapses — plan credits do not pile up; bought packs never lapse (BIL-02).
   * Plan credits are spent first, so "left" is the last grant minus what generation used since.
   * ponytail: an upgrade mid-month grants the new plan in full on top; prorating waits for a real case.
   */
  async refresh(userId: string, nowSec = Math.floor(Date.now() / 1000)) {
    const sub = await Subscription.activeFor(userId, nowSec)
    const product = productOf(sub?.productKey)
    if (!sub || !product?.plan) return
    const ref = `sub:${sub.id}:${monthIndex(sub.startedAt, nowSec)}:${sub.productKey}`
    if (await Credit.hasRef(ref)) return
    await locked(userId, async (tx) => {
      const last = await Credit.lastPlanGrant(userId)
      const lapse = last ? Math.min(Math.max(0, last.delta - last.usedSince), await Credit.balance(userId, tx)) : 0
      if (lapse > 0) await Credit.add({ userId, delta: -lapse, kind: 'expire', ref: `expire:${ref}`, note: 'unused plan credits from last month' }, tx)
      await Credit.add({ userId, delta: product.credits, kind: 'subscription', ref, note: product.name }, tx)
    })
  },

  /** BIL-14: the plan in force and what it allows. An admin is not limited. */
  async limitsFor(userId: string, admin = false): Promise<{ plan: PlanId } & Limits> {
    const plan: PlanId = productOf((await Subscription.activeFor(userId))?.productKey)?.plan ?? 'free'
    return { plan, ...(admin ? { projects: null, export: true } : PLAN_LIMITS[plan]) }
  },

  /** BIL-07: the free start. Keyed by the user, so it is granted once however often it is called. */
  async signupGrant(userId: string): Promise<boolean> {
    return await Credit.add({ userId, delta: SIGNUP_CREDITS, kind: 'signup', ref: `signup:${userId}` })
  },

  /**
   * BIL-06: take the action's price before any model is called. False when the balance is short.
   * The check and the write are one transaction under a per-user lock, so two requests — on one
   * server or several — cannot both spend the same credits.
   */
  hold(userId: string, actionId: string, amount: number): Promise<boolean> {
    return locked(userId, async (tx) => {
      if ((await Credit.balance(userId, tx)) < amount) return false
      await Credit.add({ userId, delta: -amount, kind: 'hold', actionId }, tx)
      return true
    })
  },

  /** Gives back up to `amount` of what the action still holds; never more than it took. */
  refund(userId: string, actionId: string, amount: number, note?: string): Promise<number> {
    return locked(userId, async (tx) => {
      const held = -(await tx.select({ n: sql<number>`coalesce(sum(delta), 0)`.mapWith(Number) }).from(creditLedger).where(and(eq(creditLedger.userId, userId), eq(creditLedger.actionId, actionId))))[0]!.n
      const back = Math.min(amount, held)
      if (back > 0) await Credit.add({ userId, delta: back, kind: 'refund', actionId, note }, tx)
      return Math.max(back, 0)
    })
  },

  /** When the action ends: if no model call of it succeeded, nothing was delivered — all of it comes back. */
  async settle(userId: string, actionId: string) {
    if ((await UsageService.actionCost(actionId)).ok === 0) await CreditService.refund(userId, actionId, Infinity, 'nothing was generated')
  },

  /** A planned run's screens that ended undrawn (failed or stopped) are paid back at a screen's price. */
  async refundScreens(count: number): Promise<number> {
    const who = UsageService.who()
    if (!who?.actionId || count <= 0) return 0
    return await CreditService.refund(who.userId, who.actionId, count * (await CreditService.priceOf('screen', await modelFor('screen'))), `${count} screen${count === 1 ? '' : 's'} not drawn`)
  },
}

/** One user's credits change one at a time: a transaction holding that user's advisory lock. */
function locked<T>(userId: string, fn: (tx: Executor) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`)
    return fn(tx)
  })
}
