import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { BRAND, Em, Eyebrow, SitePage } from '@/components/SiteChrome'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { appsFor, CREDIT_PRICES, PACKS, PLANS, SIGNUP_CREDITS, type ProductKey } from '@/lib/credit-prices'
import { buy } from '../credits'

// BIL-12: the plans and what a credit buys, in public. Every number comes from lib/credit-prices.ts,
// the same table the server charges from, so this page cannot promise a price the product does not keep.
export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [
      { title: `Pricing — ${BRAND}` },
      { name: 'description', content: 'Start free with four apps. Starter and Pro plans in credits: a whole app is 15, a screen 2, an element edit 1.' },
    ],
  }),
  component: Pricing,
})

const P = CREDIT_PRICES['deepseek-flash']!
const bestSaving = Math.max(...PLANS.map((p) => Math.floor((1 - p.yearly / p.monthly) * 100)))

function Pricing() {
  const [yearly, setYearly] = useState(false)
  const tiers = [
    { id: 'free', name: 'Free', price: 0, note: 'no card', credits: `${SIGNUP_CREDITS} credits, once`, apps: appsFor(SIGNUP_CREDITS), features: ['1 project', 'Every design system', 'Clickable preview'] },
    ...PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      price: yearly ? p.yearly : p.monthly,
      note: yearly ? `billed $${p.yearly * 12} a year` : 'billed monthly',
      credits: `${p.credits.toLocaleString('en')} credits a month`,
      apps: appsFor(p.credits),
      features: [p.projects, 'Figma and code export', 'Extra credit packs'],
    })),
  ]
  return (
    <SitePage className="max-w-5xl">
      <Eyebrow>Pricing</Eyebrow>
      <h1 className="text-3xl sm:text-5xl">Pay for what you <Em>make</Em>.</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Pay for what you generate, in credits. A whole app is {P.plan + P.draw} credits, a new or redrawn screen {P.screen}, an element edit {P.element}. A
        screen that fails or that you stop is given back.
      </p>

      <div className="mt-8 inline-flex rounded-md border border-border bg-card p-0.5 text-sm shadow-1" role="group" aria-label="Billing period">
        {[false, true].map((y) => (
          <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => setYearly(y)} className={`h-8 rounded-sm px-3.5 outline-none transition-colors duration-(--duration-base) focus-visible:ring-2 focus-visible:ring-ring ${yearly === y ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {y ? `Yearly · save up to ${bestSaving}%` : 'Monthly'}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <section key={t.id} className={`flex flex-col rounded-xl border bg-card p-6 ${t.id === 'pro' ? 'border-transparent shadow-3 ring-2 ring-foreground' : 'border-border shadow-1'}`}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{t.name}</h2>
              {t.id === 'pro' && <Badge variant="lime">Most room</Badge>}
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">
              ${t.price}
              <span className="text-base font-normal text-muted-foreground">{t.id === 'free' ? '' : '/mo'}</span>
            </p>
            <p className="text-xs text-muted-foreground">{t.note}</p>
            <p className="mt-5 text-sm font-medium">{t.credits}</p>
            <p className="text-sm text-muted-foreground">{t.apps} whole apps</p>
            <ul className="mt-4 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              {t.id === 'free' ? (
                <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}>
                  Start free
                </Link>
              ) : (
                <Button size="lg" variant={t.id === 'pro' ? 'default' : 'outline'} className={`w-full ${t.id === 'pro' ? 'font-semibold' : ''}`} onClick={() => buy(`${t.id}-${yearly ? 'year' : 'month'}` as ProductKey)}>
                  Get {t.name}
                </Button>
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl">Need more?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Starter and Pro can add a pack when they run low. Plan credits renew each month and unused ones do not carry over; pack credits never expire.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {PACKS.map((p) => (
            <div key={p.credits} className="min-w-44 rounded-lg border border-border bg-card px-5 py-4 shadow-1">
              <p className="text-sm font-medium">{p.credits.toLocaleString('en')} credits</p>
              <p className="text-xl font-semibold tabular-nums">${p.usd}</p>
              <p className="text-xs text-muted-foreground">{appsFor(p.credits)} whole apps · never expire</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => buy(`pack-${p.credits}` as ProductKey)}>
                Buy
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 overflow-x-auto">
        <h2 className="text-2xl">What a credit buys</h2>
        <table className="mt-4 w-full max-w-lg text-sm">
          <tbody className="divide-y">
            {[
              ['A whole app (plan and every screen)', P.plan + P.draw],
              ['A new, edited or redrawn screen', P.screen],
              ['An edit to one element', P.element],
            ].map(([what, n]) => (
              <tr key={what as string}>
                <td className="py-2.5">{what}</td>
                <td className="py-2.5 text-right tabular-nums">{n} credit{n === 1 ? '' : 's'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </SitePage>
  )
}
