import { Credit } from '@/app/Models/Credit'
import { BILLED_MODEL } from './LlmService.ts'
import { UsageService } from './UsageService.ts'
import { CREDIT_PRICES, PLAN_LIMITS, SIGNUP_CREDITS, productOf, type ActionKind, type Limits, type PlanId } from '@/lib/credit-prices'
import { monthIndex, Subscription } from '@/app/Models/Subscription'

// BIL-05/06/07: charging credits for actions. The prices themselves live in lib/credit-prices.ts,
// shared with the browser. An app is `plan` + `draw`: the plan is charged when it is made, the
// drawing when it is approved.
export { CREDIT_PRICES, CHEAPEST_CREDIT_USD, SIGNUP_CREDITS, type ActionKind } from '@/lib/credit-prices'

export const CreditService = {
  priceOf(kind: ActionKind, model = BILLED_MODEL): number {
    const p = CREDIT_PRICES[model]
    if (!p) throw new Error(`No credit price for model "${model}"`)
    return kind === 'app' ? p.plan + p.draw : p[kind]
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
  refresh(userId: string, nowSec = Math.floor(Date.now() / 1000)) {
    const sub = Subscription.activeFor(userId, nowSec)
    const product = productOf(sub?.productKey)
    if (!sub || !product?.plan) return
    const ref = `sub:${sub.id}:${monthIndex(sub.startedAt, nowSec)}:${sub.productKey}`
    if (Credit.hasRef(ref)) return
    const last = Credit.lastPlanGrant(userId)
    const lapse = last ? Math.min(Math.max(0, last.delta - last.usedSince), Credit.balance(userId)) : 0
    if (lapse > 0) Credit.add({ userId, delta: -lapse, kind: 'expire', ref: `expire:${ref}`, note: 'unused plan credits from last month' })
    Credit.add({ userId, delta: product.credits, kind: 'subscription', ref, note: product.name })
  },

  /** BIL-14: the plan in force and what it allows. An admin is not limited. */
  limitsFor(userId: string, admin = false): { plan: PlanId } & Limits {
    const plan: PlanId = productOf(Subscription.activeFor(userId)?.productKey)?.plan ?? 'free'
    return { plan, ...(admin ? { projects: null, export: true } : PLAN_LIMITS[plan]) }
  },

  /** BIL-07: the free start. Keyed by the user, so it is granted once however often it is called. */
  signupGrant(userId: string): boolean {
    return Credit.add({ userId, delta: SIGNUP_CREDITS, kind: 'signup', ref: `signup:${userId}` })
  },

  /**
   * BIL-06: take the action's price before any model is called. False when the balance is short.
   * ponytail: the check and the write are one synchronous step on one connection, so two requests
   * cannot both spend the same credits; with several server processes this becomes a transaction.
   */
  hold(userId: string, actionId: string, amount: number): boolean {
    if (Credit.balance(userId) < amount) return false
    Credit.add({ userId, delta: -amount, kind: 'hold', actionId })
    return true
  },

  /** Gives back up to `amount` of what the action still holds; never more than it took. */
  refund(userId: string, actionId: string, amount: number, note?: string): number {
    const back = Math.min(amount, -Credit.ofAction(userId, actionId))
    if (back > 0) Credit.add({ userId, delta: back, kind: 'refund', actionId, note })
    return Math.max(back, 0)
  },

  /** When the action ends: if no model call of it succeeded, nothing was delivered — all of it comes back. */
  settle(userId: string, actionId: string) {
    if (UsageService.actionCost(actionId).ok === 0) CreditService.refund(userId, actionId, Infinity, 'nothing was generated')
  },

  /** A planned run's screens that ended undrawn (failed or stopped) are paid back at a screen's price. */
  refundScreens(count: number) {
    const who = UsageService.who()
    if (!who?.actionId || count <= 0) return 0
    return CreditService.refund(who.userId, who.actionId, count * CreditService.priceOf('screen'), `${count} screen${count === 1 ? '' : 's'} not drawn`)
  },
}
