import { Setting } from '@/app/Models/Setting'
import { SIGNUP_CREDITS } from '@/lib/credit-prices'

// PAY-01: whether anything is sold. `off` — the beta: nobody sees a price, a plan or a Buy button, a checkout is
// refused on the server, and what a plan would limit (projects, export) is open, so the only limit is the free
// credits (PAY-04); a person who runs out asks for more (PAY-03). `on` — plans, packs and their limits as written
// in lib/credit-prices.ts. An admin flips it in the panel (settings `payments.mode`, logged); `PAYMENTS_MODE` in
// the environment wins. With neither, production is off — nothing is sold before the provider can take money —
// and development is on, so the billing code stays exercised.
export type PaymentsMode = 'on' | 'off'
export const PAYMENTS_MODES: readonly PaymentsMode[] = ['on', 'off']
/** PAY-02: the free start is the admin's number, within reason. */
export const SIGNUP_CREDITS_MAX = 1000

const asMode = (v: string | null | undefined): PaymentsMode | null => (v === 'on' || v === 'off' ? v : null)
const CACHE_MS = 10_000
let cached: { mode: PaymentsMode; signup: number; at: number } | null = null

async function read() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached
  const [mode, signup] = await Promise.all([Setting.get('payments.mode'), Setting.get('credits.signup')])
  const n = signup !== null && /^\d{1,4}$/.test(signup) ? Math.min(SIGNUP_CREDITS_MAX, Number(signup)) : SIGNUP_CREDITS
  cached = { mode: asMode(mode) ?? (process.env.NODE_ENV === 'production' ? 'off' : 'on'), signup: n, at: Date.now() }
  return cached
}

export const PaymentsService = {
  envMode: (): PaymentsMode | null => asMode(process.env.PAYMENTS_MODE),
  mode: async (): Promise<PaymentsMode> => PaymentsService.envMode() ?? (await read()).mode,
  on: async (): Promise<boolean> => (await PaymentsService.mode()) === 'on',
  /** PAY-02: what a new account starts with. */
  signupCredits: async (): Promise<number> => (await read()).signup,
  /** The panel changed a value: this server reads the new one at once. */
  clear() {
    cached = null
  },
}

/** What a checkout or the billing portal answers while nothing is sold. */
export const PAYMENTS_OFF = 'Payments are not open yet'
