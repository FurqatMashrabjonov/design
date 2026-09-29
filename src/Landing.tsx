import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Sparkles } from 'lucide-react'
import { PromptBox } from './PromptBox'
import { BRAND, Em, Eyebrow, SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { CREDIT_PRICES, SIGNUP_CREDITS, appsFor } from '@/lib/credit-prices'

// MKT-01: the public page. The prompt typed here survives sign-in: it is kept
// in sessionStorage and the dashboard starts the project with it (see PENDING_PROMPT in index.tsx).

// ponytail: brand name is undecided (LND-01); change it in components/SiteChrome.tsx.
export { BRAND }
export const PENDING_PROMPT = 'od:pending-prompt'

// UI-11: facts the code keeps, never marketing numbers. MAX_SCREENS is 6 (PlannerService, server-only).
const APP = CREDIT_PRICES['deepseek-flash']!
const FACTS = [
  ['iOS', 'native components, light and dark'],
  ['8', 'screens at most, planned as one app'],
  [String(APP.plan + APP.draw), 'credits for a whole app'],
  [String(appsFor(SIGNUP_CREDITS)), `apps from the ${SIGNUP_CREDITS} free credits`],
]

const TRY = ['Meditation app with daily sessions and streaks', 'Food delivery with restaurant menus and live order tracking', 'Language learning with lessons and a leaderboard', 'Plant care reminders with a photo journal']


function HeroPrompt({ big = false }: { big?: boolean }) {
  const navigate = useNavigate()
  const [fill, setFill] = useState<{ text: string; key: number }>()
  // A style page (MKT-06) can hand the landing a prompt on its way here; it stays in storage so it
  // survives signing in, where index.tsx picks it up and starts the project.
  // Read after mount, not during the first render: the server has no sessionStorage, so reading it in
  // render made the client's first tree differ from the server's (a hydration mismatch on the button).
  useEffect(() => {
    try {
      const text = sessionStorage.getItem(PENDING_PROMPT)
      if (text) setFill({ text, key: 1 })
    } catch {}
  }, [])
  return (
    <div className="w-full text-left">
      <PromptBox
        variant="hero"
        submitLabel="Design it"
        label="Describe your app"
        placeholder="Describe your app — e.g. a neobank with cards, transfers and spending insights"
        fill={fill}
        onSubmit={async (prompt) => {
          try {
            sessionStorage.setItem(PENDING_PROMPT, prompt.slice(0, 2000))
          } catch {}
          await navigate({ to: '/login', search: { next: '/' } })
        }}
      />
      {big && (
        <>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {TRY.map((t) => (
              <button key={t} type="button" onClick={() => setFill((f) => ({ text: t, key: (f?.key ?? 0) + 1 }))} className="h-8 rounded-full border border-border bg-card/70 px-3 text-xs text-muted-foreground transition-colors duration-(--duration-fast) ease-out hover:border-foreground/30 hover:text-foreground">
                {t}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}




export function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SiteHeader onLanding />

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-0 [background-image:radial-gradient(var(--canvas-dot)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pt-16 text-center sm:pt-24">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" /> {SIGNUP_CREDITS} free credits · no card needed
          </span>
          <h1 className="text-4xl sm:text-6xl">
            Describe an app. <br />Get <Em>all of it</Em>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Every screen planned together and built from native iOS components — one tab bar, one data model, light and dark. Tap through it, change it in the chat, keep going.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <HeroPrompt big />
          </div>
        </div>
      </section>

      {/* UI-11: proof — only numbers the code keeps */}
      <section className="border-y border-border bg-card/60">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-4 py-12 lg:grid-cols-4">
          {FACTS.map(([n, t]) => (
            <div key={t} className="flex flex-col-reverse px-2 text-center">
              <dt className="mt-1 text-sm text-muted-foreground">{t}</dt>
              <dd className="font-serif text-5xl italic sm:text-6xl">{n}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="text-2xl sm:text-4xl">From idea to prototype in <Em>three steps</Em>.</h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            ['01', 'Describe', 'Say what the app does, in a sentence or a page.'],
            ['02', 'Get the whole app', 'A planner scopes the screens, the data and the navigation, then designs every screen in parallel.'],
            ['03', 'Click and change', 'Tap through it as a prototype, ask the chat for changes, undo anything.'],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl border border-border bg-card p-7 shadow-1">
              <span className="font-mono text-sm text-muted-foreground">{n}</span>
              <p className="mt-6 text-xl">{t}</p>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-24">
        <div className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-2xl sm:text-3xl">Questions, answered.</h2>
        </div>
        <div className="mt-10 divide-y divide-border rounded-lg border border-border bg-card shadow-1">
          {[
            ['What do I get from one prompt?', 'A planned app: up to 8 screens that share one navigation and one data model, built from native iOS components, each one clickable.'],
            ['Is it free?', `You start with ${SIGNUP_CREDITS} free credits — ${appsFor(SIGNUP_CREDITS)} whole apps — and one project, no card needed. Plans add monthly credits and more projects.`],
            ['Do I need design experience?', 'No. Describe the app in plain words. Designers use it to get past the blank page and iterate faster.'],
            ['Can I change a screen after it is made?', 'Select it and describe the change in the chat, or add a new screen — it will match the rest.'],
            ['Who owns the designs?', 'You do. Your projects are private to your account and you can delete them, or your account, at any time.'],
          ].map(([q, a]) => (
            <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition duration-(--duration-base) group-open:rotate-45"><Plus className="size-3.5" /></span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-xl bg-inverse [--ring:var(--inverse-foreground)] px-6 py-16 text-center text-inverse-foreground ring-1 ring-border sm:py-20">
          <div className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-primary opacity-25 blur-3xl" />
          <h2 className="relative text-2xl sm:text-4xl">What are we designing today?</h2>
          <p className="relative mt-3 text-inverse-foreground/65">Your first app is a minute away.</p>
          <div className="relative mx-auto mt-8 max-w-2xl">
            <HeroPrompt />
          </div>
        </div>
      </section>

      <SiteFooter onLanding />
    </div>
  )
}

