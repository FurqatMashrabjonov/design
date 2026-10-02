import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Download, Link2, Smartphone, Moon, Code2 } from 'lucide-react'
import { FigmaMark } from '@/components/BrandMarks'
import { useCredits } from '@/credits'
import { appsFor, CREDIT_PRICES, PLANS, screensFor } from '@/lib/credit-prices'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// BIL-22: the bottom of the dashboard's sidebar — a few slides on what the product does (Sleek's pattern), then the
// plan, the credits with this month's bar, and one action: Upgrade on Free (lime, the one filled control here), Buy
// credits on Starter, nothing on Pro. The whole credits card opens /billing.

type Slide = { title: string; text: string; icons: ReactNode[]; cta?: { label: string; to: string } }

function slidesFor(plan: 'starter' | 'pro' | null): Slide[] {
  return [
    {
      title: 'Export to React & Figma',
      text: plan ? 'Download a React project, one HTML file, or paste editable layers into Figma.' : 'Take your screens out as a React project, an HTML file or Figma layers.',
      icons: [<Code2 key="c" />, <FigmaMark key="f" />, <Download key="d" />],
      cta: plan ? undefined : { label: 'Unlock export', to: '/billing' },
    },
    { title: 'Native on iOS and Android', text: 'Every design switches between iOS and Material You with one tap — light and dark included.', icons: [<Smartphone key="s" />, <Moon key="m" />] },
    { title: 'Share a live link', text: 'Turn on a public link and anyone can tap through your app — no sign-up.', icons: [<Link2 key="l" />] },
  ]
}

function Slides({ plan }: { plan: 'starter' | 'pro' | null }) {
  const slides = slidesFor(plan)
  const [i, setI] = useState(0)
  const [hold, setHold] = useState(false)
  useEffect(() => {
    if (hold) return
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [hold, slides.length])
  const s = slides[i]!
  return (
    <div onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <div key={i} className="od-fade relative overflow-hidden rounded-lg border bg-card p-3 shadow-1" aria-live="polite">
        <p className="text-sm font-semibold leading-snug">{s.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          {s.cta ? (
            <Link to={s.cta.to} hash="plans" className="text-xs font-medium underline-offset-2 hover:underline">{s.cta.label} →</Link>
          ) : <span />}
          <span className="flex -space-x-1.5" aria-hidden>
            {s.icons.map((icon, k) => (
              <span key={k} className="grid size-7 place-items-center rounded-md border bg-background text-muted-foreground shadow-1 [&>svg]:size-3.5" style={{ transform: `rotate(${(k - (s.icons.length - 1) / 2) * 6}deg)` }}>{icon}</span>
            ))}
          </span>
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-1.5" role="tablist" aria-label="Tips">
        {slides.map((x, k) => (
          <button key={x.title} type="button" role="tab" aria-selected={k === i} aria-label={x.title} onClick={() => setI(k)} className={cn('h-1.5 rounded-full transition-all duration-(--duration-base)', k === i ? 'w-4 bg-foreground' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60')} />
        ))}
      </div>
    </div>
  )
}

export function UpgradePanel({ initial }: { initial: number }) {
  const c = useCredits(initial)
  const balance = c?.balance ?? initial
  const plan = c?.plan ?? null
  const price = CREDIT_PRICES['deepseek-flash']!
  const low = balance < price.plan + price.draw
  const planName = plan ? PLANS.find((p) => p.id === plan)!.name : 'Free'
  const month = c?.month
  return (
    <div className="space-y-3">
      <Slides plan={plan} />
      <Link to="/billing" className="block rounded-md border bg-card p-3 text-xs shadow-1 transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className={`size-1.5 rounded-full ${balance <= 0 ? 'bg-destructive' : low ? 'bg-chart-3' : 'bg-lime-500'}`} aria-hidden />
            {planName} · credits
          </span>
          <span className={`text-sm font-semibold tabular-nums ${balance <= 0 ? 'text-destructive' : ''}`}>{balance.toLocaleString('en')}</span>
        </div>
        {month && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Plan credits left this month" aria-valuemin={0} aria-valuemax={month.granted} aria-valuenow={month.left}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((month.left / Math.max(1, month.granted)) * 100)}%` }} />
          </div>
        )}
        <p className="mt-1.5 text-muted-foreground">≈ {screensFor(Math.max(0, balance))} screens{low ? ' · not enough for a new app' : ` · ${appsFor(Math.max(0, balance))} apps`}</p>
      </Link>
      {plan === null ? (
        <Link to="/billing" hash="plans" className={buttonVariants({ className: 'w-full font-semibold' })}>Upgrade</Link>
      ) : plan === 'starter' ? (
        <Link to="/billing" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>Buy credits</Link>
      ) : null}
    </div>
  )
}
