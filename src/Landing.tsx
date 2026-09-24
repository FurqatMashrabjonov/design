import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Layers, MousePointerClick, Download, Palette, Undo2, BarChart3, ScanEye, Image as ImageIcon, Sparkles } from 'lucide-react'
import { PhoneFrame, PHONE } from '@/components/PhoneFrame'
import { PromptBox } from './PromptBox'
import { buttonVariants } from '@/components/ui/button'
import { AppMap } from '@/components/landing/AppMap'
import { CREDIT_PRICES, SIGNUP_CREDITS, appsFor } from '@/lib/credit-prices'

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
// UI-11: `bg` / `accent` are the system's own `--bg` / `--accent` (design-systems/<id>/tokens.css) and
// `character` is how DesignSystemService describes it. ponytail: copied, not read — the landing has no loader.
export const SETS = [
  { id: 'volt-run', name: 'Stride', kind: 'Running', system: 'Volt', systemId: 'volt', bg: '#0a0a0b', accent: '#d4ff3a', character: 'Black and volt-lime, condensed italic headlines — a training poster.', prompt: 'Running app: a live run screen with duration, distance and pace, a home with weekly volume and a quick-start run, and a run summary with a route map and pace analysis.', screens: [0, 1, 3, 4, 6] },
  { id: 'ember-habit', name: 'Ripple', kind: 'Habit tracker', system: 'Ember', systemId: 'ember', bg: '#ffffff', accent: '#e8845a', character: 'Soft coral tints, one heavy sans, big soft corners — it cheers you on.', prompt: 'make habit tracker', screens: [0, 1, 2, 3, 6] },
  { id: 'lumen-stays', name: 'Nestaway', kind: 'Stays', system: 'Lumen', systemId: 'lumen', bg: '#eff2f7', accent: '#0a6cf0', character: 'Light and translucent, glass controls over content — it feels native.', prompt: 'Stay booking app: browse places to stay with photos, a place detail with gallery, amenities and reviews, a date and guests picker, booking confirmation, and my trips.', screens: [1, 3, 4, 5, 6] },
  { id: 'graphite-ledger', name: 'Plum Ledger', kind: 'Expense tracker', system: 'Graphite', systemId: 'graphite', bg: '#0b0c0e', accent: '#f6a61e', character: 'Engineered dark, dense, mono figures, one amber signal — an instrument.', prompt: 'Expense tracker for freelancers: this month’s spending with a category breakdown, a transactions list, a transaction detail with merchant and receipt fields, add an expense, and a monthly report with a chart.', screens: [1, 2, 3, 5] },
  { id: 'nova-magazine', name: 'Folio', kind: 'Magazine', system: 'Nova', systemId: 'nova', bg: '#f4f3ef', accent: '#d2451e', character: 'Warm tinted neutrals, a serif hero figure, a floating tab bar — a product.', prompt: 'Long-read magazine app: a curated home of essays, an article reader with pull quotes and a progress bar, saved articles, an author page, and reading settings.', screens: [1, 2, 3, 5] },
]

// UI-11: facts the code keeps, never marketing numbers. MAX_SCREENS is 6 (PlannerService, server-only).
const APP = CREDIT_PRICES['deepseek-flash']!
const FACTS = [
  [String(SETS.length), 'design systems made for a phone'],
  ['6', 'screens at most, planned as one app'],
  [String(APP.plan + APP.draw), 'credits for a whole app'],
  [String(appsFor(SIGNUP_CREDITS)), `apps from the ${SIGNUP_CREDITS} free credits`],
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
        hint="Add a picture to match its look"
        attachments
        defaultValue={initial}
        fill={fill}
        onSubmit={async (prompt, images) => {
          // IMG-01: the pictures wait in session storage like the prompt; the project page reads them once.
          try {
            sessionStorage.setItem(PENDING_PROMPT, prompt.slice(0, 2000))
            if (images?.length) sessionStorage.setItem(PENDING_IMAGES, JSON.stringify(images))
            else sessionStorage.removeItem(PENDING_IMAGES)
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
          {/* DS-02: no picker before there is anything to look at — these say which systems the app
              is drawn in (the brief and the app type choose), and each opens its style page. */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-xs text-muted-foreground">
            <span className="mr-1">Drawn in the style that suits it:</span>
            {SETS.map((s) => (
              <Link key={s.systemId} to="/systems/$id" params={{ id: s.systemId }} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 font-medium text-foreground transition-colors duration-(--duration-fast) ease-out hover:border-foreground/30">
                <Dot s={s} /> {s.system}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** A system's ground with its accent inside: the two colours that tell the systems apart. */
function Dot({ s, size = 14 }: { s: (typeof SETS)[number]; size?: number }) {
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full ring-1 ring-foreground/15" style={{ width: size, height: size, background: s.bg }}>
      <span className="rounded-full" style={{ width: size / 2, height: size / 2, background: s.accent }} />
    </span>
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
            <Sparkles className="size-3.5" /> {SIGNUP_CREDITS} free credits · no card needed
          </span>
          <h1 className="text-4xl sm:text-6xl">
            Describe an app. <br />Get <Em>all of it</Em>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Every screen planned together — one tab bar, one data model, one design system, real photos. Tap through it, edit any element, keep going.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <HeroPrompt big />
          </div>
        </div>
      </section>

      {/* UI-11: the whole-app map — the USP, drawn from one real app's own links */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Not a pile of screens</Eyebrow>
          <h2 className="text-2xl sm:text-4xl">Screens that <Em>know</Em> each other.</h2>
          <p className="mt-4 text-muted-foreground">
            The app is planned before a pixel is drawn, so every tab and every button goes somewhere real. This is Ripple, made from the prompt “make habit tracker” — each line is a link in its screens.
          </p>
        </div>
        <div className="mt-12 sm:mt-16">
          <AppMap />
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['One navigation', 'The same tab bar and back button on every screen, injected by code.'],
            ['One data model', 'A payment of $88.42 is $88.42 on the list, the detail and the receipt.'],
            ['Real photos', 'Every image slot is filled with a matching photo, never a grey box.'],
            ['One design system', 'Tokens, type and components shared by every screen of the app.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-border bg-card p-5 shadow-1">
              <p className="font-semibold">{t}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* UI-11: the five phone systems */}
      <section id="systems" className="mx-auto max-w-6xl px-4 py-24">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <Eyebrow>Five systems, made for a phone</Eyebrow>
            <h2 className="text-2xl sm:text-4xl">A look with a <Em>point of view</Em>.</h2>
            <p className="mt-4 text-muted-foreground">Your app is drawn in the one that suits it, or in the one your reference picture looks like. Switch it after, in one click.</p>
          </div>
          <Link to="/systems" className="shrink-0 text-sm font-medium underline-offset-4 hover:underline">All design systems →</Link>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {SETS.map((s, k) => (
            <Link
              key={s.systemId}
              to="/systems/$id"
              params={{ id: s.systemId }}
              className={`group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-1 transition duration-(--duration-base) ease-out hover:-translate-y-0.5 hover:shadow-3 ${k < 2 ? 'lg:col-span-3' : 'lg:col-span-2'}`}
            >
              <div className="relative flex h-64 items-start justify-center gap-3 overflow-hidden pt-8" style={{ background: s.bg }}>
                <Phone src={shot(s.id, s.screens[0]!)} width={k < 2 ? 150 : 136} />
                <Phone src={shot(s.id, s.screens[1]!)} width={k < 2 ? 150 : 136} className="translate-y-8" />
              </div>
              <div className="flex flex-1 flex-col gap-1 border-t border-border p-5">
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <Dot s={s} size={16} /> {s.system}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">{s.name} · {s.kind}</span>
                </p>
                <p className="text-sm text-muted-foreground">{s.character}</p>
              </div>
            </Link>
          ))}
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
          <Feature className="md:col-span-2" icon={Palette} title="Picked to suit the app" text="One of five systems made for a phone, chosen from your brief or your reference picture. Name a brand (“like Notion”) to get its look instead, or retheme at any time." />
          <Feature className="md:col-span-2" icon={BarChart3} title="Charts drawn from data" text="Bar, line, area, donut, ring and heatmap charts rendered in code, in the system’s colours." />
          <Feature className="md:col-span-2" icon={ScanEye} title="Craft rules, applied in code" text="Minimum text size, 44px tap areas, focus rings and tabular figures are set on every screen after it is drawn." />
          <Feature className="md:col-span-3" icon={ImageIcon} title="Real photos, locked in place" text="Image slots are filled with matching photos and sized so a picture never breaks the layout." />
          <Feature className="md:col-span-3" icon={Download} title="Export a working prototype" text="On a paid plan, download the whole app as a zip of clickable HTML — open it offline, build from it — or take it to Figma." />
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
            ['What do I get from one prompt?', 'A planned app: up to 6 screens that share one navigation, one data model and one design system, each one clickable and editable.'],
            ['Is it free?', `You start with ${SIGNUP_CREDITS} free credits — ${appsFor(SIGNUP_CREDITS)} whole apps — and one project, no card needed. Plans add monthly credits, more projects and export.`],
            ['Do I need design experience?', 'No. Describe the app in plain words. Designers use it to get past the blank page and iterate faster.'],
            ['Can I change a screen after it is made?', 'Click any element and describe the change, ask the chat for bigger changes, or add a new screen — it will match the rest.'],
            ['Can I export?', 'On a paid plan — the whole app as a zip of HTML that works offline as a clickable prototype, or into Figma.'],
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
