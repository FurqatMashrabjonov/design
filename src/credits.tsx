import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { toast } from 'sonner'
import { getCredits, openBillingPortal, startCheckout } from './server/fns'
import { appsFor, CREDIT_PRICES, PACKS, PLANS, screensFor, type ProductKey } from './lib/credit-prices'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// BIL-08: the balance where people work, and a dialog — not an error — when it runs out.

const OUT = 'od:credits-out'
const CHANGED = 'od:credits-changed'

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
  toast.error(e instanceof Error ? e.message : String(e))
}

type CreditState = { balance: number; plan: 'starter' | 'pro' | null }

export function useCredits(initial?: number): CreditState | undefined {
  const [state, setState] = useState<CreditState | undefined>(initial === undefined ? undefined : { balance: initial, plan: null })
  useEffect(() => {
    let live = true
    const load = () => getCredits().then((r) => live && setState(r)).catch(() => {})
    load()
    window.addEventListener(CHANGED, load)
    return () => {
      live = false
      window.removeEventListener(CHANGED, load)
    }
  }, [])
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
    else toast.error(m)
  }
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

/** Mounted once (root): opens when a generation is refused for credits. */
export function CreditsDialog() {
  const [out, setOut] = useState<OutOfCredits | null>(null)
  const plan = useCredits()?.plan
  useEffect(() => {
    const on = (e: Event) => setOut((e as CustomEvent<OutOfCredits>).detail)
    window.addEventListener(OUT, on)
    return () => window.removeEventListener(OUT, on)
  }, [])
  const p = CREDIT_PRICES['deepseek-flash']!
  return (
    <Dialog open={out !== null} onOpenChange={(o) => !o && setOut(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{out?.balance ? 'Not enough credits' : 'You’re out of credits'}</DialogTitle>
          <DialogDescription>
            {out?.message} Nothing was charged. A whole app is {p.plan + p.draw} credits, a screen {p.screen}, an element edit {p.element}.
          </DialogDescription>
        </DialogHeader>
        {plan ? (
          // A subscriber tops up with a pack (BIL-02: packs are for subscribers only).
          <div className="grid gap-3 sm:grid-cols-2">
            {PACKS.map((k) => (
              <div key={k.credits} className="rounded-xl border p-4">
                <p className="text-sm font-semibold">{k.credits.toLocaleString('en')} credits</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">${k.usd}</p>
                <p className="text-xs text-muted-foreground">{appsFor(k.credits)} whole apps · never expire</p>
                <Button className="mt-3 w-full" variant="outline" onClick={() => buy(`pack-${k.credits}` as ProductKey)}>
                  Buy
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((p) => (
              <div key={p.id} className={`rounded-xl border p-4 ${p.id === 'pro' ? 'border-foreground' : ''}`}>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  ${p.monthly}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="mt-2 text-sm">{p.credits.toLocaleString('en')} credits a month</p>
                <p className="text-xs text-muted-foreground">{appsFor(p.credits)} whole apps · {p.projects}</p>
                <Button className="mt-3 w-full" variant={p.id === 'pro' ? 'default' : 'outline'} onClick={() => buy(`${p.id}-month` as ProductKey)}>
                  Get {p.name}
                </Button>
              </div>
            ))}
          </div>
        )}
        <a href="/pricing" className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline">
          Compare plans and credit packs
        </a>
      </DialogContent>
    </Dialog>
  )
}
