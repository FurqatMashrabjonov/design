import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Layers, MousePointerClick, Download, Palette, Undo2, BarChart3, ScanEye, Image as ImageIcon, Sparkles } from 'lucide-react'
import { PhoneFrame, PHONE } from '@/components/PhoneFrame'
import { PromptBox } from './PromptBox'
import { buttonVariants } from '@/components/ui/button'

// MKT-01: the public page. Everything shown is real output of the pipeline (public/showcase is
// copied from an eval run), nothing is a mock. The prompt typed here survives sign-in: it is kept
// in sessionStorage and the dashboard starts the project with it (see PENDING_PROMPT in index.tsx).

// ponytail: brand name is undecided (LND-01); change it here.
export const BRAND = 'Design'
export const PENDING_PROMPT = 'od:pending-prompt'
/** IMG-01: reference pictures typed alongside that prompt, handed to the project page that starts the run. */
export const PENDING_IMAGES = 'od:pending-images'

// One set per design system written for a phone, each real output of today's pipeline. The first
// screen is the cover, so it is always one the render audit found clean.
export const SETS = [
  { id: 'volt-run', name: 'Stride', kind: 'Running', system: 'Volt', systemId: 'volt', prompt: 'Running app: a live run screen with duration, distance and pace, a home with weekly volume and a quick-start run, and a run summary with a route map and pace analysis.', screens: [0, 1, 3, 4, 6] },
  { id: 'ember-habit', name: 'Ripple', kind: 'Habit tracker', system: 'Ember', systemId: 'ember', prompt: 'make habit tracker', screens: [0, 1, 2, 3, 6] },
  { id: 'lumen-stays', name: 'Nestaway', kind: 'Stays', system: 'Lumen', systemId: 'lumen', prompt: 'Stay booking app: browse places to stay with photos, a place detail with gallery, amenities and reviews, a date and guests picker, booking confirmation, and my trips.', screens: [1, 3, 4, 5, 6] },
  { id: 'graphite-ledger', name: 'Plum Ledger', kind: 'Expense tracker', system: 'Graphite', systemId: 'graphite', prompt: 'Expense tracker for freelancers: this month’s spending with a category breakdown, a transactions list, a transaction detail with merchant and receipt fields, add an expense, and a monthly report with a chart.', screens: [1, 2, 3, 5] },
  { id: 'nova-magazine', name: 'Folio', kind: 'Magazine', system: 'Nova', systemId: 'nova', prompt: 'Long-read magazine app: a curated home of essays, an article reader with pull quotes and a progress bar, saved articles, an author page, and reading settings.', screens: [1, 2, 3, 5] },
]

const TRY = ['Meditation app with daily sessions and streaks', 'Food delivery with restaurant menus and live order tracking', 'Language learning with lessons and a leaderboard', 'Plant care reminders with a photo journal']

/** One real generated screen, drawn at phone size and scaled into `width` pixels. */
export function Phone({ src, width, className = '', eager = false }: { src: string; width: number; className?: string; eager?: boolean }) {
  const scale = width / PHONE.width
  return (
    <PhoneFrame width={width} className={className}>
      <iframe
        src={src}
        title=""
        aria-hidden
        tabIndex={-1}
        loading={eager ? 'eager' : 'lazy'}
        sandbox="allow-scripts"
        className="pointer-events-none origin-top-left border-0"
        style={{ width: PHONE.width, height: PHONE.height, transform: `scale(${scale})` }}
      />
    </PhoneFrame>
  )
}

export const shot = (set: string, i: number) => `/showcase/${set}-${i}.html`

function HeroPrompt({ big = false }: { big?: boolean }) {
  const navigate = useNavigate()
  const [fill, setFill] = useState<{ text: string; key: number }>()
  // A style page (MKT-06) can hand the landing a prompt on its way here; it stays in storage so it
  // survives signing in, where index.tsx picks it up and starts the project.
  const [initial] = useState(() => {
    try {
      return sessionStorage.getItem(PENDING_PROMPT) ?? ''
    } catch {
      return ''
    }
  })
  return (
    <div className="w-full text-left">
      <PromptBox
        variant="hero"
        submitLabel="Design it"
        label="Describe your app"
        placeholder="Describe your app — e.g. a neobank with cards, transfers and spending insights"
        hint="iPhone · 3–6 screens · real photos"
        defaultValue={initial}
        fill={fill}
        onSubmit={async (prompt) => {
          try { sessionStorage.setItem(PENDING_PROMPT, prompt.slice(0, 2000)) } catch {}
          await navigate({ to: '/login', search: { next: '/' } })
        }}
      />
      {big && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {TRY.map((t) => (
            <button key={t} type="button" onClick={() => setFill((f) => ({ text: t, key: (f?.key ?? 0) + 1 }))} className="h-8 rounded-full border border-border bg-card/70 px-3 text-xs text-muted-foreground transition-colors duration-(--duration-fast) ease-out hover:border-foreground/30 hover:text-foreground">
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">{children}</p>
}

/** The one emphasised word of a big heading: Instrument Serif italic over a lime highlighter stroke. */
function Em({ children }: { children: React.ReactNode }) {
  return (
    <em className="relative isolate whitespace-nowrap font-serif font-normal italic tracking-normal">
      <span className="absolute inset-x-0 bottom-[.08em] -z-10 h-[.32em] rounded-xs bg-primary dark:bg-primary/45" />
      {children}
    </em>
  )
}

export function Landing() {
  const [set, setSet] = useState(0)
  const active = SETS[set]
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-sm bg-primary shadow-1">
              <span className="size-2.5 rounded-[3px] bg-brand-ink" />
            </span>
            {BRAND}
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
            <a href="#examples" className="hover:text-foreground">Examples</a>
            <Link to="/systems" className="hover:text-foreground">Design systems</Link>
            <Link to="/playbook" className="hover:text-foreground">Playbook</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">Sign in</Link>
            <Link to="/login" className={buttonVariants({ className: 'font-semibold' })}>Start free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-0 [background-image:radial-gradient(var(--canvas-dot)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pt-16 text-center sm:pt-24">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" /> Free during beta · no card needed
          </span>
          <h1 className="text-3xl sm:text-5xl">
            One prompt. <br className="sm:hidden" />A <Em>whole app</Em>,<br />not a pile of screens.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Describe it once. Get every screen in one design language — the same data, the same navigation, real photos — clickable, editable and ready to export.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <HeroPrompt big />
          </div>
        </div>

        {/* Phones, linked the way the app's screens link */}
        <div className="relative mx-auto mt-16 flex max-w-6xl items-end justify-center gap-4 px-4 pb-6 sm:gap-8">
          <svg className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 hidden h-24 w-full -translate-y-1/2 sm:block text-foreground" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden>
            <path d="M120 60 C 300 0, 400 100, 500 50 S 760 0, 880 60" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="1.5" strokeDasharray="6 8" className="animate-[dash_12s_linear_infinite]" />
          </svg>
          <Phone src={shot(SETS[1].id, SETS[1].screens[0]!)} width={210} eager className="hidden -rotate-6 md:block translate-y-6" />
          <Phone src={shot(SETS[0].id, SETS[0].screens[0]!)} width={250} eager className="z-10" />
          <Phone src={shot(SETS[2].id, SETS[2].screens[0]!)} width={210} eager className="hidden rotate-6 md:block translate-y-6" />
        </div>
      </section>

      {/* Coherence */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Why it looks like one app</Eyebrow>
          <h2 className="text-2xl sm:text-4xl">Every screen <Em>agrees</Em> with the others.</h2>
          <p className="mt-4 text-muted-foreground">Other tools draw each screen on its own, so the tab bar moves, prices change and the style drifts. Here the app is planned first and consistency is enforced in code after generation.</p>
        </div>
        <div className="mt-4 -mx-4 flex gap-5 overflow-x-auto px-4 py-10 [scrollbar-width:none] sm:justify-center">
          {SETS[1].screens.map((i) => <Phone key={i} src={shot(SETS[1].id, i)} width={190} />)}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {[
            ['One navigation', 'The same tab bar and back button on every screen, injected by code.'],
            ['One data model', 'A payment of $88.42 is $88.42 on the list, the detail and the receipt.'],
            ['Real photos', 'Every image slot is filled with a matching photo, never a grey box.'],
            ['One design system', 'Systems built for a phone, each with its own type, colour and component personality.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-border bg-card p-5 shadow-1">
              <p className="font-semibold">{t}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="bg-inverse py-24 text-inverse-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-inverse-foreground/55">Made from a single prompt</p>
              <h2 className="text-2xl sm:text-4xl">Real output. <span className="text-inverse-foreground/50">No retouching.</span></h2>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist">
              {SETS.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === set}
                  onClick={() => setSet(i)}
                  className={`rounded-full px-3.5 py-1.5 text-sm transition-colors duration-(--duration-fast) ease-out ${i === set ? 'bg-primary font-semibold text-primary-foreground' : 'text-inverse-foreground/70 ring-1 ring-inverse-foreground/15 hover:text-inverse-foreground'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-8 max-w-3xl rounded-md bg-inverse-foreground/5 px-4 py-3 font-mono text-md leading-relaxed text-inverse-foreground/75 ring-1 ring-inverse-foreground/10">
            <span className="text-inverse-foreground/50">prompt ›</span> {active.prompt}
            <span className="ml-2 whitespace-nowrap text-inverse-foreground/50">· {active.system} system</span>
          </p>
          <div key={active.id} className="mt-2 -mx-4 flex gap-5 overflow-x-auto px-4 py-10 [scrollbar-width:none] animate-in fade-in duration-500">
            {active.screens.map((i) => <Phone key={i} src={shot(active.id, i)} width={200} />)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="text-2xl sm:text-4xl">From idea to prototype in <Em>three steps</Em>.</h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            ['01', 'Describe', 'Say what the app does, in a sentence or a page. The style is picked to suit the app; change it after.'],
            ['02', 'Get the whole app', 'A planner scopes the screens, the data and the navigation, then designs every screen in parallel.'],
            ['03', 'Click, edit, export', 'Tap through it as a prototype, change any element by clicking it, undo anything, download a zip.'],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl border border-border bg-card p-7 shadow-1">
              <span className="font-mono text-sm text-muted-foreground">{n}</span>
              <p className="mt-6 text-xl">{t}</p>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 md:grid-cols-6">
          <Feature className="md:col-span-4" icon={MousePointerClick} title="Edit any element" text="Click a button, a card or a headline and say what to change. The rest of the screen stays byte-for-byte the same." />
          <Feature className="md:col-span-2" icon={Undo2} title="Undo everything" text="⌘Z on the canvas, version arrows on every screen, and “undo this step” in the chat." />
          <Feature className="md:col-span-2" icon={Palette} title="33 design systems" text="From calm minimal to neo-brutalist, each with its own component personality. Retheme at any time." />
          <Feature className="md:col-span-2" icon={BarChart3} title="Charts drawn from data" text="Bar, line, donut and heatmap charts rendered in code, in the system’s colours." />
          <Feature className="md:col-span-2" icon={ScanEye} title="Checked like a reviewer" text="Every screen is audited after it renders — tiny tap targets, faint text, overflow — and fixed in one click." />
          <Feature className="md:col-span-3" icon={ImageIcon} title="Real photos, locked in place" text="Image slots are filled with matching photos and sized so a picture never breaks the layout." />
          <Feature className="md:col-span-3" icon={Download} title="Export a working prototype" text="Download the whole app as a zip of clickable HTML — open it offline, share it, build from it." />
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
            ['What do I get from one prompt?', 'A planned app: 3–6 screens that share one navigation, one data model and one design system, each one clickable and editable.'],
            ['Is it free?', 'Yes, during the beta, with a daily generation limit. Paid plans come later; beta users will hear first.'],
            ['Do I need design experience?', 'No. Describe the app in plain words. Designers use it to get past the blank page and iterate faster.'],
            ['Can I change a screen after it is made?', 'Click any element and describe the change, ask the chat for bigger changes, or add a new screen — it will match the rest.'],
            ['Can I export?', 'Yes — the whole app as a zip of HTML that works offline as a clickable prototype.'],
            ['Who owns the designs?', 'You do. Your projects are private to your account and you can delete them, or your account, at any time.'],
          ].map(([q, a]) => (
            <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-xl bg-inverse px-6 py-16 text-center text-inverse-foreground ring-1 ring-border sm:py-20">
          <div className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-primary opacity-25 blur-3xl" />
          <h2 className="relative text-2xl sm:text-4xl">What are we designing today?</h2>
          <p className="relative mt-3 text-inverse-foreground/65">Your first app is a minute away.</p>
          <div className="relative mx-auto mt-8 max-w-2xl">
            <HeroPrompt />
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} {BRAND}</span>
          {/* ponytail: Terms / Privacy links land with LEG-01…04. */}
          <div className="flex gap-6">
            <a href="#examples" className="hover:text-foreground">Examples</a>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, text, className = '' }: { icon: typeof Layers; title: string; text: string; className?: string }) {
  return (
    <div className={`group rounded-xl border border-border bg-card p-7 shadow-1 transition shadow-1 duration-(--duration-base) ease-out hover:-translate-y-0.5 hover:shadow-3 ${className}`}>
      <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-6 text-lg font-semibold">{title}</p>
      <p className="mt-1.5 text-muted-foreground">{text}</p>
    </div>
  )
}
