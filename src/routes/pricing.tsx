import { useState } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getSession } from '../server/fns'
import { Check, Minus, Plus, Sparkles } from 'lucide-react'
import { BRAND, Em, Eyebrow, SitePage } from '@/components/SiteChrome'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { appsFor, CREDIT_PRICES, FREE_EXPORTS, PACKS, PLANS, screensFor, SIGNUP_CREDITS, type ProductKey } from '@/lib/credit-prices'
import { buy } from '../credits'
import { WaitlistButton } from '@/components/Waitlist'
import { useAccess } from './__root'
import { cn } from '@/lib/utils'

// BIL-12 / PRC-04: the plans and what a credit buys, in public. Every number comes from lib/credit-prices.ts — the
// same table the server charges from — so this page cannot promise a price the product does not keep. Open to
// everyone (BIL-20); while the app is waitlist-only every button joins the waitlist instead of buying.
export const Route = createFileRoute('/pricing')({
  // PAY-01: while nothing is sold there is no price list; only an admin still sees the page.
  beforeLoad: async ({ context }) => {
    if (context.payments === 'on') return
    const { user } = await getSession()
    if (!user?.admin) throw redirect({ to: '/' })
  },
  head: () => ({
    meta: [
      { title: `Pricing — ${BRAND}` },
      { name: 'description', content: `Start free with ${appsFor(SIGNUP_CREDITS)} apps. Starter and Pro plans in credits: a whole app is 15, a screen 2, an element edit 1.` },
    ],
  }),
  component: Pricing,
})

const P = CREDIT_PRICES['deepseek-flash']!
const APP = P.plan + P.draw
const bestSaving = Math.max(...PLANS.map((p) => Math.floor((1 - p.yearly / p.monthly) * 100)))
const starter = PLANS.find((p) => p.id === 'starter')!
const pro = PLANS.find((p) => p.id === 'pro')!

type Tier = { id: 'free' | 'starter' | 'pro'; name: string; tagline: string; price: number; note: string; credits: string; sub: string; features: string[] }

function Pricing() {
  const [yearly, setYearly] = useState(false)
  const access = useAccess()
  const tiers: Tier[] = [
    { id: 'free', name: 'Free', tagline: `Try ${BRAND}`, price: 0, note: 'no card needed', credits: `${SIGNUP_CREDITS} credits, once`, sub: `≈ ${appsFor(SIGNUP_CREDITS)} whole apps`, features: ['1 project', `${FREE_EXPORTS} exports to try — React, HTML or Figma`, 'iOS + Android, light and dark', 'Clickable preview and share link'] },
    { id: 'starter', name: starter.name, tagline: 'For your next few ideas', price: yearly ? starter.yearly : starter.monthly, note: yearly ? `billed $${starter.yearly * 12} a year` : 'billed monthly', credits: `${starter.credits.toLocaleString('en')} credits a month`, sub: `≈ ${appsFor(starter.credits)} apps or ${screensFor(starter.credits)} screens`, features: [starter.projects, 'Unlimited export — React, HTML, Figma', 'Share links without our badge', 'Top up with credit packs'] },
    { id: 'pro', name: pro.name, tagline: 'For people who design every week', price: yearly ? pro.yearly : pro.monthly, note: yearly ? `billed $${pro.yearly * 12} a year` : 'billed monthly', credits: `${pro.credits.toLocaleString('en')} credits a month`, sub: `≈ ${appsFor(pro.credits)} apps or ${screensFor(pro.credits)} screens`, features: ['Everything in Starter', pro.projects, 'The most credits for the price', 'Top up with credit packs'] },
  ]
  const action = (t: Tier) =>
    access === 'waitlist' ? (
      <WaitlistButton size="lg" label="Join the waitlist" className={cn('w-full', t.id === 'pro' && 'font-semibold')} />
    ) : t.id === 'free' ? (
      <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}>Start free</Link>
    ) : (
      <Button size="lg" variant={t.id === 'pro' ? 'default' : 'outline'} className={cn('w-full', t.id === 'pro' && 'font-semibold')} onClick={() => buy(`${t.id}-${yearly ? 'year' : 'month'}` as ProductKey)}>
        Get {t.name}
      </Button>
    )

  return (
    <SitePage className="max-w-6xl">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Pricing</Eyebrow>
        <h1 className="text-4xl text-balance sm:text-5xl">A whole app for <Em>less than a coffee</Em>.</h1>
        <p className="mt-4 text-muted-foreground">
          Pay in credits for what you make. A whole app is {APP} credits, a new or redrawn screen {P.screen}, an element edit {P.element}. Anything that fails or that you stop is given back.
        </p>
        <div className="mt-8 inline-flex items-center rounded-full border border-border bg-card p-1 text-sm shadow-1" role="group" aria-label="Billing period">
          {[false, true].map((y) => (
            <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => setYearly(y)} className={cn('flex h-9 items-center gap-2 rounded-full px-5 transition-colors duration-(--duration-base) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', yearly === y ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {y ? 'Yearly' : 'Monthly'}
              {y && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">save {bestSaving}%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid items-stretch gap-5 md:grid-cols-3">
        {tiers.map((t) => (
          <section key={t.id} className={cn('relative flex flex-col rounded-2xl border bg-card p-7', t.id === 'pro' ? 'border-transparent shadow-3 ring-2 ring-foreground' : 'border-border shadow-1')}>
            {t.id === 'pro' && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs font-semibold tracking-wide text-background">MOST POPULAR</span>}
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{t.name}</h2>
              {t.id !== 'free' && <Badge variant="lime">Early bird</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
            <p className="mt-6 text-5xl font-semibold tracking-tight tabular-nums">
              {t.price === 0 ? 'Free' : `$${t.price}`}
              {t.price > 0 && <span className="text-base font-normal tracking-normal text-muted-foreground"> /mo</span>}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>
            <div className="mt-6">{action(t)}</div>
            <div className="mt-6 flex gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{t.credits}</p>
                <p className="text-sm text-muted-foreground">{t.sub}</p>
              </div>
            </div>
            <p className="mt-6 text-xs font-semibold tracking-wider text-muted-foreground">INCLUDES</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {f}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Early-bird prices are for the first subscribers and stay yours while you stay subscribed.</p>

      <Calculator yearly={yearly} />

      <section className="mt-20">
        <h2 className="text-center text-2xl sm:text-3xl">Compare plans</h2>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-1">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground" />
                {tiers.map((t) => <th key={t.id} className="p-4 text-center font-semibold">{t.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {([
                ['Credits', `${SIGNUP_CREDITS} once`, `${starter.credits.toLocaleString('en')} / mo`, `${pro.credits.toLocaleString('en')} / mo`],
                ['Whole apps', `≈ ${appsFor(SIGNUP_CREDITS)}`, `≈ ${appsFor(starter.credits)} / mo`, `≈ ${appsFor(pro.credits)} / mo`],
                ['Projects', '1', starter.projects.replace(' projects', ''), 'Unlimited'],
                ['Export to React, HTML, Figma', `${FREE_EXPORTS} to try`, 'Unlimited', 'Unlimited'],
                ['iOS + Android, light and dark', true, true, true],
                ['Clickable preview and share link', true, true, true],
                ['Share links without our badge', false, true, true],
                ['Credit packs', false, true, true],
              ] as [string, ...(string | boolean)[]][]).map(([label, ...cells]) => (
                <tr key={label}>
                  <td className="p-4 text-muted-foreground">{label}</td>
                  {cells.map((c, i) => (
                    <td key={i} className="p-4 text-center tabular-nums">
                      {c === true ? <Check className="mx-auto size-4" aria-label="Included" /> : c === false ? <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not included" /> : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-center text-2xl sm:text-3xl">Need more credits?</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">Starter and Pro can add a pack whenever they run low. Plan credits renew each month and unused ones do not carry over; pack credits never expire.</p>
        <div className="mx-auto mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
          {PACKS.map((k) => (
            <div key={k.credits} className="rounded-2xl border border-border bg-card p-6 shadow-1">
              <p className="text-sm font-medium">{k.credits.toLocaleString('en')} credits</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">${k.usd}</p>
              <p className="text-xs text-muted-foreground">≈ {appsFor(k.credits)} whole apps · never expire</p>
              {access === 'open' && <Button variant="outline" className="mt-4 w-full" onClick={() => buy(`pack-${k.credits}` as ProductKey)}>Buy</Button>}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl sm:text-3xl">Questions</h2>
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card shadow-1">
          {[
            ['What is a credit?', `What a generation costs: a whole app (its plan and every screen) is ${APP} credits, a new or redrawn screen ${P.screen}, an edit to one element ${P.element}. If something fails or you stop it, the credits for what was not made come back at once.`],
            ['What happens when I run out?', 'Nothing is charged by surprise: a generation that cannot be paid for does not start. On Starter or Pro you can add a credit pack, or wait for next month’s credits.'],
            ['Do unused credits roll over?', 'Plan credits are for the month they are given; what is left lapses when the next month starts. Pack credits never expire.'],
            ['Can I try export on Free?', `Yes — Free includes ${FREE_EXPORTS} exports in all, as a React project, one HTML file or editable layers in Figma. Starter and Pro export without limits.`],
            ['Can I cancel?', 'Any time, from Billing. The plan runs to the end of the period you paid for and is not renewed.'],
            ['What is your refund policy?', 'A first payment is refunded in full within 14 days if you have used less than 10% of the plan’s credits; an unused credit pack within 14 days of buying it. The full terms are on the refunds page.'],
          ].map(([q, a]) => (
            <details key={q} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition duration-(--duration-base) group-open:rotate-45"><Plus className="size-3.5" /></span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Payments are handled by Polar, our merchant of record. <Link to="/refunds" className="underline underline-offset-2 hover:text-foreground">Refund policy</Link>
        </p>
      </section>
    </SitePage>
  )
}

/** PRC-04: "how many apps a month?" → the plan that fits and what it costs. */
function Calculator({ yearly }: { yearly: boolean }) {
  const [apps, setApps] = useState(20)
  const needed = apps * APP
  const fit = needed <= SIGNUP_CREDITS ? null : needed <= starter.credits ? starter : pro
  const extra = fit === pro && needed > pro.credits ? needed - pro.credits : 0
  const packs = extra ? Math.ceil(extra / PACKS[PACKS.length - 1]!.credits) : 0
  const monthly = fit ? (yearly ? fit.yearly : fit.monthly) + packs * PACKS[PACKS.length - 1]!.usd : 0
  return (
    <section className="mx-auto mt-20 max-w-3xl rounded-2xl border border-border bg-card p-7 shadow-1">
      <h2 className="text-xl font-semibold">How much will you make?</h2>
      <label className="mt-6 block text-sm text-muted-foreground" htmlFor="apps">
        Whole apps a month: <span className="font-semibold text-foreground tabular-nums">{apps}</span>
      </label>
      <input id="apps" type="range" min={1} max={250} value={apps} onChange={(e) => setApps(Number(e.target.value))} className="mt-3 w-full accent-[var(--primary)]" />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{needed.toLocaleString('en')} credits a month</p>
          <p className="mt-1 text-2xl font-semibold">
            {fit ? `${fit.name}${packs ? ` + ${packs} pack${packs === 1 ? '' : 's'}` : ''}` : 'Free is enough to start'}
          </p>
        </div>
        {fit && (
          <p className="text-3xl font-semibold tabular-nums">
            ${monthly}<span className="text-base font-normal text-muted-foreground"> /mo</span>
            <span className="block text-right text-xs font-normal text-muted-foreground">≈ ${(monthly / apps).toFixed(2)} an app</span>
          </p>
        )}
      </div>
    </section>
  )
}
