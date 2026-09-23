import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowUp, Layers, MousePointerClick, Download, Palette, Undo2, BarChart3, ScanEye, Image as ImageIcon, Sparkles } from 'lucide-react'

// MKT-01: the public page. Everything shown is real output of the pipeline (public/showcase is
// copied from an eval run), nothing is a mock. The prompt typed here survives sign-in: it is kept
// in sessionStorage and the dashboard starts the project with it (see PENDING_PROMPT in index.tsx).

// ponytail: brand name is undecided (LND-01); change it here.
export const BRAND = 'Design'
export const PENDING_PROMPT = 'od:pending-prompt'
/** IMG-01: reference pictures typed alongside that prompt, handed to the project page that starts the run. */
export const PENDING_IMAGES = 'od:pending-images'

const INK = '#0E0F12'
const LIME = '#C6F24E'

export const SETS = [
  { id: 'fit-tracker', name: 'Stride', kind: 'Running tracker', system: 'Nike', systemId: 'nike', prompt: 'Fitness tracker for runners: today’s run, weekly mileage, training plan, run detail with pace splits and route map, profile with personal records.', screens: [0, 1, 2, 3, 4] },
  { id: 'bank-neo', name: 'Nova Bank', kind: 'Neobank', system: 'Stripe', systemId: 'stripe', prompt: 'Neobank app: balance and cards overview, transaction list with search, send money flow, transaction detail, spending analytics by category.', screens: [0, 1, 2, 3, 5] },
  { id: 'crypto-wallet', name: 'Nova Wallet', kind: 'Crypto wallet', system: 'Midnight', systemId: 'midnight', prompt: 'Crypto wallet: portfolio value with chart, asset list, coin detail with price chart and buy/sell, swap form, settings with security options.', screens: [0, 1, 2, 3, 4] },
  { id: 'habit-quest', name: 'HabitQuest', kind: 'Habit tracker', system: 'Midnight', systemId: 'midnight', prompt: 'Gamified habit tracker: today’s habits with check-in, habit detail with streak calendar, add habit form, achievements and stats.', screens: [0, 1, 3, 5, 2] },
]

const TRY = ['Meditation app with daily sessions and streaks', 'Food delivery with restaurant menus and live order tracking', 'Language learning with lessons and a leaderboard', 'Plant care reminders with a photo journal']

/** One real generated screen, drawn at phone size and scaled into `width` pixels. */
export function Phone({ src, width, className = '', eager = false }: { src: string; width: number; className?: string; eager?: boolean }) {
  const scale = width / 390
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-[28px] bg-black p-[5px] shadow-[0_30px_60px_-20px_rgba(14,15,18,.45)] ring-1 ring-black/10 ${className}`} style={{ width: width + 10 }}>
      <div className="overflow-hidden rounded-[23px] bg-white" style={{ width, height: 844 * scale }}>
        <iframe
          src={src}
          title=""
          aria-hidden
          tabIndex={-1}
          loading={eager ? 'eager' : 'lazy'}
          sandbox="allow-scripts"
          className="pointer-events-none origin-top-left border-0"
          style={{ width: 390, height: 844, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  )
}

export const shot = (set: string, i: number) => `/showcase/${set}-${i}.html`

function HeroPrompt({ big = false }: { big?: boolean }) {
  const navigate = useNavigate()
  // A style page (MKT-06) can hand the landing a prompt on its way here; it stays in storage so it
  // survives signing in, where index.tsx picks it up and starts the project.
  const [text, setText] = useState(() => {
    try {
      return sessionStorage.getItem(PENDING_PROMPT) ?? ''
    } catch {
      return ''
    }
  })
  function go(prompt = text) {
    if (!prompt.trim()) return
    try { sessionStorage.setItem(PENDING_PROMPT, prompt.trim().slice(0, 2000)) } catch {}
    navigate({ to: '/login', search: { next: '/' } })
  }
  return (
    <div className="w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); go() }}
        className="group rounded-2xl border border-border bg-card p-2 text-left shadow-[0_1px_0_rgba(0,0,0,.04),0_20px_40px_-24px_rgba(14,15,18,.35)] transition focus-within:border-foreground/30"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); go() } }}
          rows={big ? 3 : 2}
          maxLength={2000}
          aria-label="Describe your app"
          placeholder="Describe your app — e.g. a neobank with cards, transfers and spending insights"
          className="block w-full resize-none bg-transparent px-3 pt-2 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <span className="px-2 text-xs text-muted-foreground">iPhone · 3–6 screens · real photos</span>
          <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40" style={{ background: INK }} disabled={!text.trim()}>
            Design it <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
      {big && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {TRY.map((t) => (
            <button key={t} type="button" onClick={() => setText(t)} className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground">
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

function Em({ children }: { children: React.ReactNode }) {
  return (
    <em className="relative isolate whitespace-nowrap font-normal italic" style={{ fontFamily: '"Instrument Serif", serif' }}>
      <span className="absolute inset-x-0 bottom-[.08em] -z-10 h-[.32em] rounded-sm" style={{ background: LIME }} />
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
            <span className="grid size-7 place-items-center rounded-lg" style={{ background: INK }}>
              <span className="size-2.5 rounded-sm" style={{ background: LIME }} />
            </span>
            {BRAND}
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
            <a href="#examples" className="hover:text-foreground">Examples</a>
            <Link to="/systems" className="hover:text-foreground">Design systems</Link>
            <Link to="/playbook" className="hover:text-foreground">Playbook</Link>
            <a href="#how" className="hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">Sign in</Link>
            <Link to="/login" className="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold text-white" style={{ background: INK }}>Start free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-[.5] [background-image:radial-gradient(rgba(14,15,18,.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pt-16 text-center sm:pt-24">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" /> Free during beta · no card needed
          </span>
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[64px]">
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
          <svg className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 hidden h-24 w-full -translate-y-1/2 sm:block" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden>
            <path d="M120 60 C 300 0, 400 100, 500 50 S 760 0, 880 60" fill="none" stroke={INK} strokeOpacity=".25" strokeWidth="1.5" strokeDasharray="6 8" className="animate-[dash_12s_linear_infinite]" />
          </svg>
          <Phone src={shot('bank-neo', 0)} width={210} eager className="hidden -rotate-6 md:block translate-y-6" />
          <Phone src={shot('fit-tracker', 0)} width={250} eager className="z-10" />
          <Phone src={shot('crypto-wallet', 0)} width={210} eager className="hidden rotate-6 md:block translate-y-6" />
        </div>
      </section>

      {/* Coherence */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Why it looks like one app</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Every screen <Em>agrees</Em> with the others.</h2>
          <p className="mt-4 text-muted-foreground">Other tools draw each screen on its own, so the tab bar moves, prices change and the style drifts. Here the app is planned first and consistency is enforced in code after generation.</p>
        </div>
        <div className="mt-4 -mx-4 flex gap-5 overflow-x-auto px-4 py-10 [scrollbar-width:none] sm:justify-center">
          {SETS[1].screens.map((i) => <Phone key={i} src={shot('bank-neo', i)} width={190} />)}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {[
            ['One navigation', 'The same tab bar and back button on every screen, injected by code.'],
            ['One data model', 'A payment of $88.42 is $88.42 on the list, the detail and the receipt.'],
            ['Real photos', 'Every image slot is filled with a matching photo, never a grey box.'],
            ['One design system', '33 systems, each with its own type, colour and component personality.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5">
              <p className="font-semibold">{t}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="py-24 text-white" style={{ background: INK }}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-white/45">Made from a single prompt</p>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Real output. <span className="text-white/40">No retouching.</span></h2>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist">
              {SETS.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === set}
                  onClick={() => setSet(i)}
                  className={`rounded-full px-3.5 py-1.5 text-sm transition ${i === set ? 'font-semibold text-black' : 'text-white/60 ring-1 ring-white/15 hover:text-white'}`}
                  style={i === set ? { background: LIME } : undefined}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-8 max-w-3xl rounded-xl bg-white/5 px-4 py-3 font-mono text-[13px] leading-relaxed text-white/70 ring-1 ring-white/10">
            <span className="text-white/40">prompt ›</span> {active.prompt}
            <span className="ml-2 whitespace-nowrap text-white/40">· {active.system} system</span>
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
          <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">From idea to prototype in <Em>three steps</Em>.</h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            ['01', 'Describe', 'Say what the app does, in a sentence or a page. Pick a design system or let it choose.'],
            ['02', 'Get the whole app', 'A planner scopes the screens, the data and the navigation, then designs every screen in parallel.'],
            ['03', 'Click, edit, export', 'Tap through it as a prototype, change any element by clicking it, undo anything, download a zip.'],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-3xl border border-border bg-card p-7">
              <span className="font-mono text-sm text-muted-foreground">{n}</span>
              <p className="mt-6 text-xl font-semibold tracking-tight">{t}</p>
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
          <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Questions, answered.</h2>
        </div>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
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
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-16 text-center text-white sm:py-20" style={{ background: INK }}>
          <div className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: LIME }} />
          <h2 className="relative text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">What are we designing today?</h2>
          <p className="relative mt-3 text-white/60">Your first app is a minute away.</p>
          <div className="relative mx-auto mt-8 max-w-2xl text-black">
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
    <div className={`group rounded-3xl border border-border bg-card p-7 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-28px_rgba(14,15,18,.4)] ${className}`}>
      <span className="grid size-10 place-items-center rounded-xl" style={{ background: LIME }}>
        <Icon className="size-5" />
      </span>
      <p className="mt-6 text-lg font-semibold tracking-tight">{title}</p>
      <p className="mt-1.5 text-muted-foreground">{text}</p>
    </div>
  )
}
