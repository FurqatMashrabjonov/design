import { BILLED_MODEL } from './LlmService.ts'

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
}
