// BIL-02 / BIL-05: the plans and what each action costs in credits — pure data, read by the server
// (CreditService charges it) and by the browser (the out-of-credits dialog and the pricing page
// show it), so the two can never disagree.

export type ActionKind = 'plan' | 'draw' | 'app' | 'screen' | 'element'
export type Prices = Record<Exclude<ActionKind, 'app'>, number>

/** By model: a model that costs more to run costs more credits (LLM-06 adds a row per approved model). */
export const CREDIT_PRICES: Record<string, Prices> = {
  'deepseek-flash': { plan: 1, draw: 14, screen: 2, element: 1 },
}

/** BIL-07: a new account starts with these — four apps, once. */
export const SIGNUP_CREDITS = 60

export const PLANS = [
  { id: 'starter', name: 'Starter', monthly: 12, yearly: 9, credits: 1200, projects: '5 projects' },
  { id: 'pro', name: 'Pro', monthly: 24, yearly: 17, credits: 3000, projects: 'Unlimited projects' },
] as const

/** The cheapest a credit is ever sold for (Pro: $24 / 3 000), which every price is checked against. */
export const CHEAPEST_CREDIT_USD = 24 / 3000

const price = (model: string) => CREDIT_PRICES[model]!
/** What a balance buys, in the units people think in: single screens (2 credits each)… */
export const screensFor = (credits: number, model = 'deepseek-flash') => Math.floor(credits / price(model).screen)
/** …or whole apps (a plan and its drawing, 15 credits). A plan is sold in apps, so the two never disagree. */
export const appsFor = (credits: number, model = 'deepseek-flash') => Math.floor(credits / (price(model).plan + price(model).draw))
