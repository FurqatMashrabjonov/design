import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { toast } from 'sonner'
import { getCredits, notifyWhenPaymentsOpen, openBillingPortal, startCheckout } from './server/fns'
import { appsFor, CREDIT_PRICES, PACKS, PAYMENTS_CLOSED, PLAN_LIMIT_ERROR, PLANS, screensFor, type ProductKey } from './lib/credit-prices'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// BIL-08/14: the balance where people work, and one dialog — not an error — when it runs out or a
// plan's limit is reached.

const OUT = 'od:credits-out'
const CHANGED = 'od:credits-changed'
const LIMIT = 'od:plan-limit'
const SOON = 'od:payments-soon'

/** BIL-14: what a plan did not allow — a project over its count, or an export on Free. */
type Limit = { projects: number } | 'export'
export const askUpgrade = (why: Limit) => window.dispatchEvent(new CustomEvent(LIMIT, { detail: why }))

/** The project limit a server error names (`plan-limit:projects:N`), or null. */
export function projectLimitOf(e: unknown): number | null {
  const m = e instanceof Error ? e.message.match(new RegExp(`${PLAN_LIMIT_ERROR}projects:(\\d+)`)) : null
  return m ? Number(m[1]) : null
}

/** A 402 from a guarded route: the action was refused before anything ran, and nothing was charged. */
export class OutOfCredits extends Error {
  constructor(
    public needed: number,
    public balance: number,
  ) {
    super(`This needs ${needed} credits — you have ${balance}.`)
  }
}

/** Turns a failed generation response into an error; a 402 also opens the out-of-credits dialog. */
export async function failFrom(res: Response): Promise<never> {
  const text = await res.text()
  if (res.status === 402) {
    let j: { error?: string; needed?: number; balance?: number } = {}
    try {
      j = JSON.parse(text)
    } catch {}
    if (j.error === 'credits') {
      const e = new OutOfCredits(j.needed ?? 0, j.balance ?? 0)
      window.dispatchEvent(new CustomEvent(OUT, { detail: e }))
      throw e
    }
  }
  throw new Error(text)
}

/** Any generation ended (it may have spent or refunded): balances on screen reload. */
export const creditsChanged = () => window.dispatchEvent(new Event(CHANGED))

/** Error toast for a generation, silent for OutOfCredits — the dialog already says it. */
export function reportError(e: unknown) {
  if (e instanceof OutOfCredits) return
  const limit = projectLimitOf(e)
  if (limit !== null) return askUpgrade({ projects: limit })
  toast.error(e instanceof Error ? e.message : String(e))
}

type CreditState = { balance: number; plan: 'starter' | 'pro' | null; canExport: boolean; month: { granted: number; left: number } | null }

/** The balance and plan, reloaded when a generation ends. `enabled: false` asks nothing (the root dialog asks only
 *  once it opens — it is mounted on every page, signed-out shared previews included). */
export function useCredits(initial?: number, enabled = true): CreditState | undefined {
  const [state, setState] = useState<CreditState | undefined>(initial === undefined ? undefined : { balance: initial, plan: null, canExport: false, month: null })
  useEffect(() => {
    if (!enabled) return
    let live = true
    const load = () => getCredits().then((r) => live && setState(r)).catch(() => {})
    load()
    window.addEventListener(CHANGED, load)
    return () => {
      live = false
      window.removeEventListener(CHANGED, load)
    }
  }, [enabled])
  return state
}

/** BIL-09: off to the provider's hosted checkout. A signed-out visitor signs in first. */
export async function buy(key: ProductKey) {
  try {
    const { url } = await startCheckout({ data: { key } })
    window.location.href = url
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/sign in|unauthori/i.test(m)) window.location.href = '/login'
    // BIL-25: the provider is not taking payments yet — a dialog that says so, not an error.
    else if (m.includes(PAYMENTS_CLOSED)) window.dispatchEvent(new CustomEvent(SOON, { detail: key }))
    else toast.error(m)
  }
}

/** BIL-25: mounted once (root). Shown when a checkout cannot open yet; offers to email when it does. */
export function PaymentsSoonDialog() {
  const [key, setKey] = useState<ProductKey | null>(null)
  const [asked, setAsked] = useState(false)
  useEffect(() => {
    const on = (e: Event) => (setAsked(false), setKey((e as CustomEvent<ProductKey>).detail))
    window.addEventListener(SOON, on)
    return () => window.removeEventListener(SOON, on)
  }, [])
  return (
    <Dialog open={key !== null} onOpenChange={(o) => !o && setKey(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payments open in a few days</DialogTitle>
          <DialogDescription>We’re finishing the checkout setup with our payment provider. Nothing was charged. Want an email the moment you can upgrade?</DialogDescription>
        </DialogHeader>
        {asked ? (
          <p className="text-sm">Done — we’ll email you as soon as payments open.</p>
        ) : (
          <Button
            className="w-full"
            onClick={async () => {
              try {
                await notifyWhenPaymentsOpen({ data: { key: key! } })
                setAsked(true)
              } catch {
                toast.error('Could not save that — try again in a moment.')
              }
            }}
          >
            Email me when it opens
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** BIL-11: the provider's billing portal — cards, invoices, cancelling. */
export async function manageBilling() {
  try {
    window.location.href = (await openBillingPortal()).url
  } catch {
    toast.error('No billing yet — it appears after your first purchase.')
  }
}

export function CreditsBadge() {
  const balance = useCredits()?.balance
  if (balance === undefined) return null
  return (
    <span className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium tabular-nums ${balance <= 0 ? 'border-destructive/40 text-destructive' : ''}`} title={`${balance} credits · about ${screensFor(Math.max(0, balance))} screens`}>
      <Coins className="size-3.5" aria-hidden /> {balance}
      <span className="sr-only">credits</span>
    </span>
  )
}

/** BIL-24: a line above a composer once the balance cannot pay for a whole app — before a 402 says so. */
export function LowCredits() {
  const c = useCredits()
  if (!c) return null
  const p = CREDIT_PRICES['deepseek-flash']!
  if (c.balance >= p.plan + p.draw) return null
  const action = c.plan ? 'Buy credits' : 'Upgrade'
  return (
    <div className="od-rise mb-1.5 flex items-center gap-2 px-0.5 text-xs">
      <span className={`size-1.5 shrink-0 rounded-full ${c.balance <= 0 ? 'bg-destructive' : 'bg-chart-3'}`} aria-hidden />
      <span className="text-muted-foreground">
        {c.balance <= 0 ? 'You’re out of credits.' : `${c.balance} credit${c.balance === 1 ? '' : 's'} left — ${screensFor(c.balance)} screen${screensFor(c.balance) === 1 ? '' : 's'}, not a whole app.`}
      </span>
      <a href={c.plan ? '/billing' : '/billing#plans'} className="ml-auto shrink-0 font-medium text-foreground underline-offset-2 hover:underline">{action}</a>
    </div>
  )
}

/** Mounted once (root): opens when a generation is refused for credits. */
export function CreditsDialog() {
  const [why, setWhy] = useState<OutOfCredits | Limit | null>(null)
  const plan = useCredits(undefined, why !== null)?.plan
  useEffect(() => {
    const on = (e: Event) => setWhy((e as CustomEvent<OutOfCredits | Limit>).detail)
    window.addEventListener(OUT, on)
    window.addEventListener(LIMIT, on)
    return () => {
      window.removeEventListener(OUT, on)
      window.removeEventListener(LIMIT, on)
    }
  }, [])
  const p = CREDIT_PRICES['deepseek-flash']!
  const out = why instanceof OutOfCredits ? why : null
  const projects = why && typeof why === 'object' && 'projects' in why ? why.projects : 0
  const [title, text] = out
    ? [out.balance ? 'Not enough credits' : 'You’re out of credits', `${out.message} Nothing was charged. A whole app is ${p.plan + p.draw} credits, a screen ${p.screen}, an element edit ${p.element}.`]
    : why === 'export'
      ? ['Export is on Starter and Pro', 'Download the app as code, copy screens as HTML or paste them into Figma with a paid plan. Your screens stay here either way.']
      : ['Project limit reached', `Your plan includes ${projects} project${projects === 1 ? '' : 's'}. Delete one, or move to a plan with more room.`]
  // A subscriber short of credits tops up with a pack (packs are for subscribers only); everything else is a plan.
  const offerPacks = out !== null && plan !== null && plan !== undefined
  const plans = PLANS.filter((x) => x.id !== plan)
  // BIL-23: monthly or yearly, as on /pricing and /billing.
  const [yearly, setYearly] = useState(false)
  const save = Math.max(...PLANS.map((x) => Math.floor((1 - x.yearly / x.monthly) * 100)))
  return (
    <Dialog open={why !== null} onOpenChange={(o) => !o && setWhy(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        {offerPacks ? (
          // A subscriber tops up with a pack (BIL-02: packs are for subscribers only).
          <div className="grid gap-3 sm:grid-cols-2">
            {PACKS.map((k) => (
              <div key={k.credits} className="rounded-xl border p-4">
                <p className="text-sm font-semibold">{k.credits.toLocaleString('en')} credits</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">${k.usd}</p>
                <p className="text-xs text-muted-foreground">{appsFor(k.credits)} whole apps · never expire</p>
                <Button className="mt-3 w-full" variant="outline" onClick={() => buy(`pack-${k.credits}` as ProductKey)}>
                  Buy
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">You’re on <span className="font-medium text-foreground">{plan ? PLANS.find((x) => x.id === plan)!.name : 'Free'}</span></p>
              <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs" role="group" aria-label="Billing period">
                {[false, true].map((y) => (
                  <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => setYearly(y)} className={`h-7 rounded-sm px-2.5 transition-colors duration-(--duration-base) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${yearly === y ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {y ? `Yearly · save ${save}%` : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((p) => (
                <div key={p.id} className={`rounded-xl border p-4 ${p.id === 'pro' ? 'border-foreground' : ''}`}>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    ${yearly ? p.yearly : p.monthly}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{yearly ? `billed $${p.yearly * 12} a year` : 'billed monthly'}</p>
                  <p className="mt-2 text-sm">{p.credits.toLocaleString('en')} credits a month</p>
                  <p className="text-xs text-muted-foreground">{appsFor(p.credits)} whole apps · {p.projects} · export</p>
                  <Button className="mt-3 w-full" variant={p.id === 'pro' ? 'default' : 'outline'} onClick={() => buy(`${p.id}-${yearly ? 'year' : 'month'}` as ProductKey)}>
                    Get {p.name}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
        <a href="/billing" className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline">
          See your plan, credits and packs
        </a>
      </DialogContent>
    </Dialog>
  )
}
