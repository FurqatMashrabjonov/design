import { Credit } from '@/app/Models/Credit'
import { BILLED_MODEL } from './LlmService.ts'
import { UsageService } from './UsageService.ts'

// BIL-05: what each action costs in credits. One table, by model, because a model that costs more
// to run costs more credits (LLM-06 adds a row per model it approves). An app is `plan` + `draw`:
// the plan is charged when it is made, the drawing when it is approved.
export type ActionKind = 'plan' | 'draw' | 'app' | 'screen' | 'element'
type Prices = Record<Exclude<ActionKind, 'app'>, number>
export const CREDIT_PRICES: Record<string, Prices> = {
  'deepseek-flash': { plan: 1, draw: 14, screen: 2, element: 1 },
}

/** The cheapest a credit is ever sold for (Pro: $24 / 3 000), which every price is checked against. */
export const CHEAPEST_CREDIT_USD = 24 / 3000

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
