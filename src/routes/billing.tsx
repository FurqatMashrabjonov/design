import { useState } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ArrowLeft, Check } from 'lucide-react'
import { getBilling, getSession } from '../server/fns'
import { BrandLink } from '@/components/SiteChrome'
import { AccountMenu } from '@/components/AccountMenu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { appsFor, FREE_EXPORTS, PACKS, PLANS, screensFor, type ProductKey } from '@/lib/credit-prices'
import { buy, manageBilling } from '../credits'

// BIL-21: the account's money in one place — the plan in force and when it renews, what this month's plan credits
// have left beside the pack credits that never expire, changing plan (monthly or yearly), buying a pack, the
// provider's portal for cards and invoices, and the last credit movements. Account → Billing opens it.

export const Route = createFileRoute('/billing')({
  beforeLoad: async ({ location }) => {
    const { user } = await getSession()
    if (!user) throw redirect({ to: '/login', search: { next: location.href } })
    return { user } // the account menu reads it from the route context
  },
  loader: () => getBilling(),
  head: () => ({ meta: [{ title: 'Billing' }] }),
  component: BillingPage,
})

const day = (s: number) => new Date(s * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
const KIND: Record<string, string> = { signup: 'Free start', subscription: 'Plan credits', purchase: 'Credit pack', hold: 'Used', refund: 'Given back', expire: 'Unused plan credits lapsed', admin: 'Adjustment' }
const bestSaving = Math.max(...PLANS.map((p) => Math.floor((1 - p.yearly / p.monthly) * 100)))

function BillingPage() {
  const b = Route.useLoaderData()
  const [yearly, setYearly] = useState(b.interval === 'year')
  const planName = b.plan === 'free' ? 'Free' : PLANS.find((p) => p.id === b.plan)?.name ?? b.plan
  const card = 'rounded-xl border bg-card p-6 shadow-1'
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <BrandLink />
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Projects</Link>
        <h1 className="mt-3 text-3xl">Billing</h1>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className={card} aria-label="Your plan">
            <p className="text-sm text-muted-foreground">Your plan</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              {planName}
              {b.interval && <Badge variant="outline">{b.interval === 'year' ? 'Yearly' : 'Monthly'}</Badge>}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {b.plan === 'free' ? `1 project · ${b.exportsLeft} of ${FREE_EXPORTS} free exports left` : b.renews ? `${b.cancelling ? 'Ends' : 'Renews'} ${day(b.renews)} · ${b.projects === null ? 'unlimited projects' : `${b.projects} projects`} · export included` : 'Export included'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {b.plan === 'free' ? (
                <Button asChild><a href="#plans">Upgrade</a></Button>
              ) : (
                <Button variant="outline" onClick={() => manageBilling()}>Manage subscription & invoices</Button>
              )}
            </div>
          </section>

          <section className={card} aria-label="Credits">
            <p className="text-sm text-muted-foreground">Credits</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{b.balance.toLocaleString('en')}</p>
            <p className="text-sm text-muted-foreground">≈ {screensFor(Math.max(0, b.balance))} screens · {appsFor(Math.max(0, b.balance))} whole apps</p>
            {b.month && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>This month’s plan credits</span>
                  <span className="tabular-nums">{b.month.left.toLocaleString('en')} of {b.month.granted.toLocaleString('en')} left</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={b.month.granted} aria-valuenow={b.month.left}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((b.month.left / Math.max(1, b.month.granted)) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Unused plan credits lapse when the next month starts{b.packCredits > 0 ? ` · ${b.packCredits.toLocaleString('en')} pack credits never expire` : ''}.</p>
              </div>
            )}
          </section>
        </div>

        <section id="plans" className="mt-10 scroll-mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold">{b.plan === 'free' ? 'Upgrade' : 'Change plan'}</h2>
            <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-sm shadow-1" role="group" aria-label="Billing period">
              {[false, true].map((y) => (
                <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => setYearly(y)} className={`h-8 rounded-sm px-3.5 transition-colors duration-(--duration-base) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${yearly === y ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {y ? `Yearly · save ${bestSaving}%` : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {PLANS.map((p) => {
              const current = b.plan === p.id && (b.interval === 'year') === yearly
              return (
                <div key={p.id} className={`${card} ${p.id === 'pro' ? 'ring-2 ring-foreground' : ''}`}>
                  <p className="flex items-center justify-between font-semibold">{p.name}{current && <Badge variant="lime">Current</Badge>}</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">${yearly ? p.yearly : p.monthly}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground">{yearly ? `billed $${p.yearly * 12} a year` : 'billed monthly'}</p>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {[`${p.credits.toLocaleString('en')} credits a month · ${appsFor(p.credits)} apps`, p.projects, 'Export to React, HTML and Figma'].map((f) => (
                      <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {f}</li>
                    ))}
                  </ul>
                  <Button className="mt-5 w-full" variant={p.id === 'pro' ? 'default' : 'outline'} disabled={current} onClick={() => buy(`${p.id}-${yearly ? 'year' : 'month'}` as ProductKey)}>
                    {current ? 'Your plan' : `Get ${p.name}`}
                  </Button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Credit packs</h2>
          <p className="mt-1 text-sm text-muted-foreground">{b.plan === 'free' ? 'Packs top up a Starter or Pro plan.' : 'Top up when you run low. Pack credits never expire.'}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:max-w-xl">
            {PACKS.map((k) => (
              <div key={k.credits} className={card}>
                <p className="text-sm font-semibold">{k.credits.toLocaleString('en')} credits</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">${k.usd}</p>
                <p className="text-xs text-muted-foreground">{appsFor(k.credits)} whole apps</p>
                <Button className="mt-4 w-full" variant="outline" disabled={b.plan === 'free'} onClick={() => buy(`pack-${k.credits}` as ProductKey)}>Buy</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <ul className="mt-4 divide-y divide-border rounded-xl border bg-card shadow-1">
            {b.history.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nothing yet.</li>}
            {b.history.map((h) => (
              <li key={h.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{day(h.at)}</span>
                <span className="min-w-0 flex-1 truncate">{KIND[h.kind] ?? h.kind}{h.note ? <span className="text-muted-foreground"> · {h.note}</span> : null}</span>
                <span className={`tabular-nums ${h.delta > 0 ? 'text-success' : 'text-muted-foreground'}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
