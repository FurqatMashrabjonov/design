import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Download, Layers, MousePointerClick, Plus, Smartphone, Sparkles } from 'lucide-react'
import { PromptBox } from './PromptBox'
import { BRAND, Em, Eyebrow, SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { WaitlistDialog } from '@/components/Waitlist'
import { useAccess } from '@/routes/__root'
import { SIGNUP_CREDITS, appsFor } from '@/lib/credit-prices'
import { EXAMPLES } from '@/content/examples'
import { ExampleGallery } from '@/components/ExampleGallery'

// MKT-01/LND-02: the public page. Since 2026-10-02 it speaks the category's language (AI app design, as sleek.design
// and screenflow.dev do): an idea becomes every screen, editable and exportable. It still never promises a built
// app or production code — the FAQ says plainly that it is the design and a clickable prototype. The prompt typed here survives sign-in: it is kept
// in sessionStorage and the dashboard starts the project with it (see PENDING_PROMPT in index.tsx).

// ponytail: brand name is undecided (LND-01); change it in components/SiteChrome.tsx.
export { BRAND }
export const PENDING_PROMPT = 'od:pending-prompt'

const countWord = (n: number) => ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][n] ?? String(n)

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
        submitLabel="Design my app"
        label="Describe your app idea"
        placeholder="Describe your app — e.g. a neobank with cards, transfers and spending insights"
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
            <Sparkles className="size-3.5" /> {access === 'waitlist' ? 'Early access · letting people in a few at a time' : `${SIGNUP_CREDITS} free credits · no card needed`}
          </span>
          <h1 className="text-4xl text-balance sm:text-6xl">
            Your app idea, <br /><Em>designed</Em> in a minute.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Describe it in one sentence. Get every screen — iOS and Android, light and dark — ready to tap through, edit and export.
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
            <h2 className="text-2xl text-balance sm:text-4xl">{countWord(EXAMPLES.length)} apps. <Em>One prompt</Em> each.</h2>
            <p className="mt-3 text-muted-foreground">Untouched, exactly as {BRAND} drew them. Open one to see every screen.</p>
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
          <h2 className="text-2xl text-balance sm:text-4xl">From idea to screens in <Em>three steps</Em>.</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-5 md:grid-cols-3">
          {[
            ['01', 'Describe', 'Say what the app does and who it is for. One sentence is enough.'],
            ['02', 'Generate', `${BRAND} plans the flow, then draws every screen with shared tabs and data.`],
            ['03', 'Refine & export', 'Tap through it, change anything in chat, then take it to Figma or React.'],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl border border-border bg-card p-6 shadow-1 sm:p-7">
              <span className="font-mono text-sm text-muted-foreground">{n}</span>
              <p className="mt-4 text-xl sm:mt-6">{t}</p>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What it does */}
      <section id="features" className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl text-balance sm:text-4xl">Everything you need for the <Em>first version</Em>.</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5">
          {[
            [Layers, 'The whole flow, not one screen', 'Onboarding, tabs, details and settings, designed to work together.'],
            [MousePointerClick, 'Edit by pointing', 'Click a button or a card and say what to change. Only that part changes.'],
            [Smartphone, 'Native on iOS and Android', 'One design, switched with a tap. Light and dark included.'],
            [Download, 'Export to Figma and code', 'Paste editable layers into Figma, or download a React project.'],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Layers
            return (
              <div key={t as string} className="flex gap-4 rounded-xl border border-border bg-card p-6 shadow-1 sm:p-7">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><I className="size-5" aria-hidden /></span>
                <div>
                  <p className="text-lg font-medium">{t as string}</p>
                  <p className="mt-1 text-muted-foreground">{d as string}</p>
                </div>
              </div>
            )
          })}
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
            ['What is ' + BRAND + '?', 'An AI tool that turns an app idea into a full set of mobile screens you can click through, edit and export.'],
            ['Do I need design skills?', 'No. If you can describe the app, you can design it. Designers use it to skip the blank page.'],
            ['What kinds of apps can it design?', 'Any mobile app: health, finance, food, learning, social, shopping and more.'],
            ['Can I export my designs?', 'Yes: editable layers for Figma, a React project, or a single HTML file. Free includes three exports to try; Starter and Pro export without limits.'],
            ['Is it a finished app?', 'No. It is the design and a clickable prototype, with sample data and no backend: a strong starting point for whoever builds it.'],
            access === 'waitlist'
              ? ['When can I try it?', 'We are letting people in a few at a time. Join the waitlist and tell us what you would prototype — it helps us decide who goes first.']
              : ['Is it free?', `You start with ${SIGNUP_CREDITS} free credits — enough for ${appsFor(SIGNUP_CREDITS)} prototypes — no card needed. Plans add monthly credits and more projects.`],
            ['Who owns what I make?', 'You do. Your projects are private to your account until you share a link. You can delete them at any time, and we delete your account when you ask.'],
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
          <h2 className="relative text-2xl sm:text-4xl">Got an app idea? <Em>See it</Em> in a minute.</h2>
          <p className="relative mt-3 text-inverse-foreground/65">{access === 'waitlist' ? 'Tell us the idea and we will save you a spot.' : 'Your first design is a minute away.'}</p>
          <div className="relative mx-auto mt-8 max-w-2xl">
            <HeroPrompt />
          </div>
        </div>
      </section>

      <SiteFooter onLanding />
    </div>
  )
}

