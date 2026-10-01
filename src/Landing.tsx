import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, Plus, Sparkles, X } from 'lucide-react'
import { PromptBox } from './PromptBox'
import { BRAND, Em, Eyebrow, SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { WaitlistDialog } from '@/components/Waitlist'
import { useAccess } from '@/routes/__root'
import { SIGNUP_CREDITS, appsFor } from '@/lib/credit-prices'
import { EXAMPLES } from '@/content/examples'
import { ExampleGallery } from '@/components/ExampleGallery'

// MKT-01: the public page. What we make is a clickable prototype of a mobile app — the copy says that and no
// more (2026-10-01): no "whole app", no production promise. The prompt typed here survives sign-in: it is kept
// in sessionStorage and the dashboard starts the project with it (see PENDING_PROMPT in index.tsx).

// ponytail: brand name is undecided (LND-01); change it in components/SiteChrome.tsx.
export { BRAND }
export const PENDING_PROMPT = 'od:pending-prompt'

const TRY = ['Meditation app with daily sessions and streaks', 'Food delivery with restaurant menus and live order tracking', 'Language learning with lessons and a leaderboard', 'Plant care reminders with a photo journal']


function HeroPrompt({ big = false }: { big?: boolean }) {
  const navigate = useNavigate()
  const [fill, setFill] = useState<{ text: string; key: number }>()
  // ACC-03: waitlist-only — the prompt goes into the waitlist as the person's note instead of into an app.
  const access = useAccess()
  const [waitlist, setWaitlist] = useState<string | null>(null)
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
        submitLabel="Prototype it"
        label="Describe your app idea"
        placeholder="Describe your app idea — e.g. a neobank with cards, transfers and spending insights"
        fill={fill}
        onSubmit={async (prompt) => {
          if (access === 'waitlist') return setWaitlist(prompt.slice(0, 1000))
          try {
            sessionStorage.setItem(PENDING_PROMPT, prompt.slice(0, 2000))
          } catch {}
          await navigate({ to: '/login', search: { next: '/' } })
        }}
      />
      <WaitlistDialog open={waitlist !== null} onOpenChange={(o) => !o && setWaitlist(null)} note={waitlist ?? ''} />
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
  const access = useAccess()
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SiteHeader onLanding />

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-0 [background-image:radial-gradient(var(--canvas-dot)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pt-16 pb-16 text-center sm:pt-24 sm:pb-20">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" /> {access === 'waitlist' ? 'Early access · we let people in a few at a time' : `${SIGNUP_CREDITS} free credits · no card needed`}
          </span>
          <h1 className="text-4xl text-balance sm:text-6xl">
            Describe an app idea. <br />Tap through the <Em>prototype</Em>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            One sentence becomes a clickable prototype of a mobile app — every screen planned together, native iOS look, real navigation. Test the idea before anyone writes code.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <HeroPrompt big />
          </div>
        </div>
      </section>

      {/* Real prototypes, as generated */}
      {EXAMPLES.length > 0 && <section id="examples" className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Examples</Eyebrow>
            <h2 className="text-2xl text-balance sm:text-4xl">Each one from a <Em>single</Em> prompt.</h2>
            <p className="mt-3 text-muted-foreground">Screens exactly as {BRAND} drew them, not retouched. Open one to see every screen.</p>
          </div>
          <div className="mt-12">
            <ExampleGallery />
          </div>
        </div>
      </section>}

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="text-2xl text-balance sm:text-4xl">Idea to prototype in <Em>a minute</Em>.</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-5 md:grid-cols-3">
          {[
            ['01', 'Describe the idea', 'What the app is for and what people do in it — a sentence is enough.'],
            ['02', 'Get the prototype', 'The screens, the tabs and the sample data are planned together, then every screen is drawn at once.'],
            ['03', 'Tap, test, change', 'Click through it like a real app, ask the chat for changes, share a link to it.'],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl border border-border bg-card p-6 shadow-1 sm:p-7">
              <span className="font-mono text-sm text-muted-foreground">{n}</span>
              <p className="mt-4 text-xl sm:mt-6">{t}</p>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What a prototype is, and is not */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:pb-24">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-7 shadow-1">
            <p className="text-lg font-medium">Good for</p>
            <ul className="mt-4 space-y-3 text-sm">
              {['Seeing whether an idea holds up as an app', 'Showing it to users, a team or investors', 'Briefing a designer or a developer', 'Trying three directions before choosing one'].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-7 shadow-1">
            <p className="text-lg font-medium">Not a finished app</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {['No backend: nothing is saved, sent or paid for real', 'Not ready for the App Store', 'Sample data, not your data'].map((t) => (
                <li key={t} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0" aria-hidden /> {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-16 sm:pb-24">
        <div className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-2xl sm:text-3xl">Questions, answered.</h2>
        </div>
        <div className="mt-10 divide-y divide-border rounded-lg border border-border bg-card shadow-1">
          {[
            ['What do I get from one prompt?', 'A clickable prototype: up to 8 screens that share one tab bar and one set of sample data, drawn with native iOS components, in light and dark. Every tab and link goes where it should.'],
            ['Is it a real app?', 'No — a prototype. It looks and moves like the app, so you can judge the idea, but there is no server behind it. When you are ready to build, the screens export as React code a developer can start from.'],
            ['Who is it for?', 'Founders testing an idea, product people who need something to show, designers who want a first draft past the blank page, developers who want screens to start from.'],
            ['Can I change it?', 'Yes. Select a screen — or one button or card in it — and say what to change. Add screens, and undo any step.'],
            access === 'waitlist'
              ? ['When can I try it?', 'We are letting people in a few at a time. Join the waitlist and tell us what you would prototype — it helps us decide who goes first.']
              : ['Is it free?', `You start with ${SIGNUP_CREDITS} free credits — enough for ${appsFor(SIGNUP_CREDITS)} prototypes — no card needed. Plans add monthly credits and more projects.`],
            ['Who owns what I make?', 'You do. Your projects are private to your account until you share a link, and you can delete them, or your account, at any time.'],
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
      <section className="px-4 pb-16 sm:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-xl bg-inverse [--ring:var(--inverse-foreground)] px-6 py-16 text-center text-inverse-foreground ring-1 ring-border sm:py-20">
          <div className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-primary opacity-25 blur-3xl" />
          <h2 className="relative text-2xl sm:text-4xl">What would you like to prototype?</h2>
          <p className="relative mt-3 text-inverse-foreground/65">{access === 'waitlist' ? 'Tell us the idea and we will save you a spot.' : 'Your first prototype is a minute away.'}</p>
          <div className="relative mx-auto mt-8 max-w-2xl">
            <HeroPrompt />
          </div>
        </div>
      </section>

      <SiteFooter onLanding />
    </div>
  )
}

