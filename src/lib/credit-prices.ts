// BIL-02 / BIL-05: the plans and what each action costs in credits — pure data, read by the server
// (CreditService charges it) and by the browser (the out-of-credits dialog and the pricing page
// show it), so the two can never disagree.

export type ActionKind = 'plan' | 'draw' | 'app' | 'screen' | 'element'
export type Prices = Record<Exclude<ActionKind, 'app'>, number>

/**
 * By model: a model that costs more to run costs more credits. LLM-07: every model an admin can pick
 * has a row. The rows past DeepSeek's come from its measured token profile scaled to each model's
 * token prices (Claude's cached prompt counted as a cache write, its worst case), × 1.25, at the
 * cheapest credit, rounded up — then a little headroom (Sonnet 5's tokenizer counts ~30% more).
 */
export const CREDIT_PRICES: Record<string, Prices> = {
  'deepseek-flash': { plan: 1, draw: 14, screen: 2, element: 1 },
  'gemini-3.1-flash-lite': { plan: 1, draw: 20, screen: 3, element: 1 },
  'gemini-2.5-flash': { plan: 2, draw: 26, screen: 4, element: 2 },
  'claude-haiku-4-5': { plan: 3, draw: 65, screen: 10, element: 4 },
  'claude-sonnet-5': { plan: 8, draw: 156, screen: 24, element: 9 },
}

/** BIL-07: a new account starts with these — four apps, once. */
export const SIGNUP_CREDITS = 60

export const PLANS = [
  { id: 'starter', name: 'Starter', monthly: 12, yearly: 9, credits: 1200, projects: '5 projects' },
  { id: 'pro', name: 'Pro', monthly: 24, yearly: 17, credits: 3000, projects: 'Unlimited projects' },
] as const

/**
 * BIL-14: what each plan may do beyond spending credits — the promises /pricing makes, kept in code.
 * `projects: null` is unlimited. Admins are not limited (they test the product).
 */
export type PlanId = 'free' | 'starter' | 'pro'
export type Limits = { projects: number | null; export: boolean }
export const PLAN_LIMITS: Record<PlanId, Limits> = {
  free: { projects: 1, export: false },
  starter: { projects: 5, export: true },
  pro: { projects: null, export: true },
}
export const PLAN_LIMIT_ERROR = 'plan-limit:'

/** Extra credits, for subscribers only — a pack tops a plan up, it does not replace one (BIL-02). */
export const PACKS = [
  { credits: 500, usd: 6 },
  { credits: 1500, usd: 15 },
] as const

/**
 * BIL-09: everything sold, keyed as the payment provider's products are tagged (`metadata.od`), so a
 * paid order is traced back to what it grants without a hand-kept list of provider ids.
 */
export type ProductKey = 'starter-month' | 'starter-year' | 'pro-month' | 'pro-year' | 'pack-500' | 'pack-1500'
export type Product = { key: ProductKey; name: string; cents: number; interval: 'month' | 'year' | null; credits: number; plan: 'starter' | 'pro' | null }
export const PRODUCTS: Product[] = [
  ...PLANS.flatMap((p) => [
    { key: `${p.id}-month` as ProductKey, name: `${p.name} (monthly)`, cents: p.monthly * 100, interval: 'month' as const, credits: p.credits, plan: p.id },
    { key: `${p.id}-year` as ProductKey, name: `${p.name} (yearly)`, cents: p.yearly * 12 * 100, interval: 'year' as const, credits: p.credits, plan: p.id },
  ]),
  ...PACKS.map((k) => ({ key: `pack-${k.credits}` as ProductKey, name: `${k.credits} credits`, cents: k.usd * 100, interval: null, credits: k.credits, plan: null })),
]
export const productOf = (key: string | undefined) => PRODUCTS.find((p) => p.key === key)

/** The cheapest a credit is ever sold for (Pro: $24 / 3 000), which every price is checked against. */
export const CHEAPEST_CREDIT_USD = 24 / 3000

const price = (model: string) => CREDIT_PRICES[model]!
/** What a balance buys, in the units people think in: single screens (2 credits each)… */
export const screensFor = (credits: number, model = 'deepseek-flash') => Math.floor(credits / price(model).screen)
/** …or whole apps (a plan and its drawing, 15 credits). A plan is sold in apps, so the two never disagree. */
export const appsFor = (credits: number, model = 'deepseek-flash') => Math.floor(credits / (price(model).plan + price(model).draw))
