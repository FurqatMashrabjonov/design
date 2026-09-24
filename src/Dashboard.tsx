import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowUp, Grid2x2, Home, LayoutList, MoreHorizontal, Pencil, Search, Sparkles, Star, Trash2 } from 'lucide-react'
import { createProject, deleteProject, favoriteProject, renameProject } from './server/fns'
import { AccountMenu } from '@/components/AccountMenu'
import { PromptBox } from './PromptBox'
import { BRAND, PENDING_IMAGES, Phone, SETS, shot } from './Landing'
import { reportError, useCredits } from './credits'
import { CREDIT_PRICES, screensFor } from './lib/credit-prices'
import { ThemeToggle } from '@/components/ThemeToggle'
import { frameSize } from './canvas'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PhoneFrame } from '@/components/PhoneFrame'

// DSH-03…12, UI-12: the signed-in home. A sidebar (recent projects, credits, account), the prompt
// as the hero, starting points drawn from real output, and the projects as cards that fan out
// their first three screens.

type Card = { id: string; name: string; device: string; designSystem: string; favorite: boolean; screenCount: number; covers: string[]; updatedAt: number }
type System = { id: string; name: string; category: string; swatch: { bg: string | null; fg: string | null; accent: string | null; font: string | null } }
type User = { name: string; email: string }

const VIEW_KEY = 'od:projects-view'

/** The project's first screen, loaded only when the card scrolls into view. */
export function Thumb({ screenId, device, width }: { screenId: string; device: string; width: number }) {
  const size = frameSize(device)
  const scale = width / size.width
  return (
    <iframe
      src={`/api/thumb/${screenId}`}
      title=""
      aria-hidden
      tabIndex={-1}
      loading="lazy"
      sandbox="allow-scripts"
      className="pointer-events-none origin-top-left border-0 bg-card"
      style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}
    />
  )
}

export function ago(unix: number) {
  const s = Math.max(0, Date.now() / 1000 - unix)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (s < 60) return 'just now'
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute')
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour')
  if (s < 86400 * 30) return rtf.format(-Math.round(s / 86400), 'day')
  return new Date(unix * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function read(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch {}
}

export function Swatch({ s, size = 14 }: { s: System['swatch'] | undefined; size?: number }) {
  return (
    <span className="inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10" style={{ width: size, height: size }} aria-hidden>
      <span className="h-full w-1/2" style={{ background: s?.bg ?? 'var(--card)' }} />
      <span className="h-full w-1/2" style={{ background: s?.accent ?? 'var(--muted-foreground)' }} />
    </span>
  )
}


/** BIL-08: the credit balance, in credits and in the screens it buys, so running out is never a surprise. */
function Credits({ initial }: { initial: number }) {
  const balance = useCredits(initial)?.balance ?? initial
  const low = balance < CREDIT_PRICES['deepseek-flash']!.plan + CREDIT_PRICES['deepseek-flash']!.draw
  return (
    <div className="rounded-md border bg-card p-3 text-xs shadow-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className={`size-1.5 rounded-full ${balance <= 0 ? 'bg-destructive' : low ? 'bg-chart-3' : 'bg-lime-500'}`} aria-hidden /> Credits</span>
        <span className={`text-sm font-semibold tabular-nums ${balance <= 0 ? 'text-destructive' : ''}`}>{balance.toLocaleString('en')}</span>
      </div>
      <p className="mt-1 text-muted-foreground">≈ {screensFor(Math.max(0, balance))} screens{low ? ' · not enough for a new app' : ''}</p>
    </div>
  )
}

function ProjectMenu({ card, onRename, onDelete }: { card: Card; onRename: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`More actions for ${card.name}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onRename}><Pencil /> Rename</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


/** The canvas's own dot grid, so a card's stage reads as a small piece of the project's canvas. */
const DOTS = { backgroundImage: 'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px)', backgroundSize: '18px 18px' }

/**
 * UI-12: a project's first three screens, fanned. The first stands in front; the others lean out
 * behind it, and spread a little further while the card is hovered (`--fan`). At most three
 * iframes per card, all lazy.
 */
function Collage({ covers, device }: { covers: string[]; device: string }) {
  if (!covers.length) return <div className="grid h-full place-items-center text-xs text-muted-foreground">No screens yet</div>
  if (device !== 'mobile') return <div className="absolute inset-4 overflow-hidden rounded-sm border shadow-2"><Thumb screenId={covers[0]!} device={device} width={260} /></div>
  const [front, ...back] = covers
  const at = (side: number) => ({
    transform: `translateX(calc(-50% + ${side} * 56px * var(--fan))) rotate(calc(${side} * 7deg * var(--fan)))`,
  })
  return (
    <>
      {back.map((id, i) => (
        <div key={id} className="absolute top-9 left-1/2 origin-bottom transition-transform duration-(--duration-slow) ease-spring" style={at(back.length === 1 ? 1 : i ? 1 : -1)}>
          <PhoneFrame width={100}><Thumb screenId={id} device="mobile" width={100} /></PhoneFrame>
        </div>
      ))}
      <div className="absolute top-5 left-1/2 transition-transform duration-(--duration-slow) ease-spring" style={{ transform: 'translateX(-50%) translateY(calc((var(--fan) - 1) * -24px))' }}>
        <PhoneFrame width={112}><Thumb screenId={front!} device="mobile" width={112} /></PhoneFrame>
      </div>
    </>
  )
}

function StarButton({ card, on, toggle }: { card: Card; on: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} className="grid size-8 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={on ? `Remove ${card.name} from favourites` : `Add ${card.name} to favourites`} aria-pressed={on}>
      <Star className={on ? 'size-4 fill-primary text-foreground' : 'size-4'} />
    </button>
  )
}

/** UI-12: the clicked card's collage is the one element the view transition morphs into the canvas. */
function nameForTransition(e: MouseEvent<HTMLElement>) {
  const stage = e.currentTarget.closest('[data-card]')?.querySelector<HTMLElement>('[data-collage]')
  if (stage) stage.style.viewTransitionName = 'od-project'
}

export function Dashboard({ projects, designSystems, credits, user }: { projects: Card[]; designSystems: System[]; credits: number; user: User | undefined }) {
  const navigate = useNavigate()
  const router = useRouter()
  // DS-02: nobody picks a style up front any more. This stays only so an idea card lands on the
  // system it is showing off — a card is a picture of an output, so clicking it should reproduce it.
  const [designSystem, setDesignSystem] = useState('auto')
  const [fill, setFill] = useState<{ text: string; key: number }>()
  const [tab, setTab] = useState<'all' | 'favorites'>('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [renaming, setRenaming] = useState<Card | null>(null)
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState<Card | null>(null)
  const [stars, setStars] = useState<Record<string, boolean>>({})
  useEffect(() => { if (read(VIEW_KEY) === 'list') setView('list') }, [])

  const systems = useMemo(() => new Map(designSystems.map((s) => [s.id, s])), [designSystems])
  const starred = (c: Card) => stars[c.id] ?? c.favorite
  const shown = projects.filter((c) => (tab === 'all' || starred(c)) && c.name.toLowerCase().includes(query.trim().toLowerCase()))
  const first = (user?.name || user?.email || '').split(/[\s@]/)[0]

  async function toggleStar(c: Card) {
    const next = !starred(c)
    setStars((s) => ({ ...s, [c.id]: next }))
    try { await favoriteProject({ data: { id: c.id, favorite: next } }) } catch { setStars((s) => ({ ...s, [c.id]: !next })) }
  }
  async function saveName() {
    if (!renaming || !draft.trim()) return
    await renameProject({ data: { id: renaming.id, name: draft.trim() } })
    setRenaming(null)
    router.invalidate()
  }
  async function remove() {
    if (!deleting) return
    await deleteProject({ data: deleting.id })
    setDeleting(null)
    router.invalidate()
  }
  function pickIdea(i: number) {
    const s = SETS[i]!
    if (systems.has(s.systemId)) setDesignSystem(s.systemId)
    setFill({ text: s.prompt, key: Date.now() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function chooseView(v: 'grid' | 'list') {
    setView(v)
    write(VIEW_KEY, v)
  }
  function toPrompt() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.querySelector<HTMLTextAreaElement>('#top textarea')?.focus({ preventScroll: true })
  }
  const menu = (c: Card) => <ProjectMenu card={c} onRename={() => { setDraft(c.name); setRenaming(c) }} onDelete={() => setDeleting(c)} />
  const chip = (c: Card) => (
    <span className="inline-flex max-w-40 shrink-0 items-center gap-1.5 rounded-full border bg-background py-0.5 pr-2 pl-1 text-xs text-muted-foreground">
      <Swatch s={systems.get(c.designSystem)?.swatch} size={12} /> <span className="truncate">{systems.get(c.designSystem)?.name ?? c.designSystem}</span>
    </span>
  )

  const ideas = (
    <section id="ideas" className="mt-16 scroll-mt-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{projects.length ? 'Need a start?' : 'New here? Start from one of these'}</h2>
        <p className="mt-0.5 text-md text-muted-foreground">Real output from one prompt — pick one to fill the box above.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SETS.map((s, i) => {
          const accent = systems.get(s.systemId)?.swatch.accent
          return (
            <button key={s.id} type="button" onClick={() => pickIdea(i)} className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left shadow-1 transition duration-(--duration-base) ease-out hover:-translate-y-0.5 hover:shadow-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {/* The system's own accent tints the stage; swatch values are literal colours only (swatchOf). */}
              <div className="relative flex h-40 justify-center overflow-hidden pt-5" style={{ background: accent ? `color-mix(in oklab, ${accent} 16%, var(--muted))` : 'var(--muted)' }}>
                <Phone src={shot(s.id, s.screens[0]!)} width={108} className="transition duration-(--duration-slow) ease-spring group-hover:-translate-y-1.5" />
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="text-sm font-semibold">{s.kind}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.prompt}</p>
                <p className="mt-auto inline-flex items-center gap-1.5 pt-2.5 text-xs font-medium text-muted-foreground">
                  <Swatch s={systems.get(s.systemId)?.swatch} size={10} /> {s.system}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )

  const projectList = projects.length === 0 ? (
    /* UI-12: the first visit. Nothing to list yet, so the section says where the first app comes from. */
    <section id="projects" className="mt-16 scroll-mt-6">
      <div className="rounded-lg border border-dashed bg-card/60 px-6 py-10 text-center">
        <div className="relative mx-auto h-28 w-56" aria-hidden>
          {[-1, 1, 0].map((side) => (
            <span key={side} className="absolute top-0 left-1/2 h-28 w-14 rounded-[14px] border-2 border-dashed bg-background" style={{ transform: `translateX(calc(-50% + ${side * 34}px)) rotate(${side * 8}deg)` }}>
              {!side && <Sparkles className="absolute top-1/2 left-1/2 size-5 -translate-1/2 text-muted-foreground" />}
            </span>
          ))}
        </div>
        <h2 className="mt-5 text-lg font-semibold">Your projects will live here</h2>
        <p className="mx-auto mt-1 max-w-sm text-md text-muted-foreground">Describe an app in a sentence — or pick an example above — and every screen lands on a canvas you can click through and edit.</p>
        <Button className="mt-5" onClick={toPrompt}><ArrowUp /> Write your first prompt</Button>
      </div>
    </section>
  ) : (
    <section id="projects" className="mt-16 scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto flex items-center gap-2 text-lg font-semibold">
          Your projects <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">{projects.length}</span>
        </h2>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex rounded-md border bg-card p-0.5 text-md" role="tablist">
            {(['all', 'favorites'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-7 rounded-sm px-3 capitalize transition-colors ${tab === t ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t}
              </button>
            ))}
          </div>
          <label className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="h-8 w-full bg-card pl-8 sm:w-52" />
          </label>
          <div className="flex rounded-md border bg-card p-0.5">
            <button type="button" onClick={() => chooseView('grid')} className={`grid size-7 place-items-center rounded-sm ${view === 'grid' ? 'bg-muted' : 'text-muted-foreground hover:text-foreground'}`} aria-label="Grid view" aria-pressed={view === 'grid'}><Grid2x2 className="size-4" /></button>
            <button type="button" onClick={() => chooseView('list')} className={`grid size-7 place-items-center rounded-sm ${view === 'list' ? 'bg-muted' : 'text-muted-foreground hover:text-foreground'}`} aria-label="List view" aria-pressed={view === 'list'}><LayoutList className="size-4" /></button>
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
          {query.trim() ? (
            <>
              <Search className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No projects match “{query.trim()}”</p>
              <p className="mt-1 text-md text-muted-foreground">Try another name{tab === 'favorites' ? ', or look in all projects' : ''}.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQuery(''); setTab('all') }}>Clear search</Button>
            </>
          ) : (
            <>
              <Star className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No favourites yet</p>
              <p className="mt-1 text-md text-muted-foreground">Star a project to keep it here.</p>
            </>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <div key={c.id} data-card className="group relative rounded-lg border bg-card shadow-1 transition duration-(--duration-base) ease-out hover:-translate-y-0.5 hover:shadow-3">
              <Link to="/p/$projectId" params={{ projectId: c.id }} viewTransition onClick={nameForTransition} className="block rounded-t-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`Open ${c.name}`}>
                <div data-collage className="relative h-56 overflow-hidden rounded-t-lg border-b bg-canvas [--fan:1] group-hover:[--fan:1.2]" style={DOTS}>
                  <Collage covers={c.covers} device={c.device} />
                </div>
              </Link>
              <div className="flex items-center gap-1 py-2.5 pr-2 pl-3.5">
                <div className="min-w-0 flex-1">
                  <Link to="/p/$projectId" params={{ projectId: c.id }} viewTransition onClick={nameForTransition} className="block truncate text-sm font-semibold hover:underline">{c.name}</Link>
                  <p className="mt-1 flex min-w-0 items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
                    {chip(c)}
                    <span className="truncate">{c.screenCount} screen{c.screenCount === 1 ? '' : 's'} · {ago(c.updatedAt)}</span>
                  </p>
                </div>
                <StarButton card={c} on={starred(c)} toggle={() => toggleStar(c)} />
                {menu(c)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border bg-card shadow-1">
          {shown.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50">
              <Link to="/p/$projectId" params={{ projectId: c.id }} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-xs border bg-muted">{c.covers[0] && <Thumb screenId={c.covers[0]} device={c.device} width={36} />}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                <span className="hidden w-36 sm:flex">{chip(c)}</span>
                <span className="hidden w-20 text-xs text-muted-foreground sm:block">{c.screenCount} screens</span>
                <span className="w-24 text-right text-xs text-muted-foreground">{ago(c.updatedAt)}</span>
              </Link>
              <StarButton card={c} on={starred(c)} toggle={() => toggleStar(c)} />
              {menu(c)}
            </div>
          ))}
        </div>
      )}
    </section>
  )

  const logo = (
    <span className="grid size-7 place-items-center rounded-sm bg-primary shadow-1">
      <span className="size-2.5 rounded-[3px] bg-brand-ink" />
    </span>
  )
  const navItem = 'flex h-9 items-center gap-2.5 rounded-sm px-2.5 transition-colors'

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar (DSH-10) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <Link to="/" className="flex h-14 items-center gap-2 px-4 font-semibold tracking-tight">{logo}{BRAND}</Link>
        <nav className="space-y-0.5 px-2 pt-1 text-sm">
          <a href="#top" className={`${navItem} bg-sidebar-accent font-medium`} aria-current="page"><Home className="size-4" /> Home</a>
          <a href="#projects" className={`${navItem} text-muted-foreground hover:bg-sidebar-accent hover:text-foreground`}><Grid2x2 className="size-4" /> Projects</a>
          <a href="#ideas" className={`${navItem} text-muted-foreground hover:bg-sidebar-accent hover:text-foreground`}><Sparkles className="size-4" /> Examples</a>
        </nav>
        {projects.length > 0 && (
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-2">
            <p className="px-2.5 pb-1.5 text-xs font-medium text-muted-foreground">Recent</p>
            {projects.slice(0, 6).map((c) => (
              <Link key={c.id} to="/p/$projectId" params={{ projectId: c.id }} className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-md transition-colors hover:bg-sidebar-accent">
                <span className="relative h-9 w-7 shrink-0 overflow-hidden rounded-xs border bg-muted">
                  {c.covers[0] && <Thumb screenId={c.covers[0]} device={c.device} width={28} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{ago(c.updatedAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-auto space-y-3 border-t p-3">
          <Credits initial={credits} />
          <div className="flex items-center gap-2.5 px-1">
            <AccountMenu />
            <div className="min-w-0 text-xs">
              <div className="truncate font-medium">{user?.name}</div>
              <div className="truncate text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      <main id="top" className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between px-4 md:justify-end md:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold md:hidden">{logo}{BRAND}</Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <span className="md:hidden"><AccountMenu /></span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pb-24 md:px-8">
          {/* Prompt: the hero of the page (UI-12) */}
          <section className="mx-auto max-w-3xl pt-8 text-center md:pt-16">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-1">
              <span className="size-1.5 rounded-full bg-primary ring-1 ring-brand-ink/20" aria-hidden />
              {greeting()}{first ? `, ${first}` : ''}
            </p>
            <h1 className="mt-4 text-3xl text-balance md:text-4xl">What should we <em className="font-serif font-normal italic">design</em> today?</h1>
            <p className="mt-2 text-sm text-muted-foreground">One sentence in, a whole app out — every screen in one design language.</p>
            <div className="mt-8 text-left">
              {/* DS-02: no style to choose before there is anything to look at. The brief decides
                  (a style it names wins; otherwise the app type offers a few and the project picks
                  one), and the Theme panel can change it once the screens are on the canvas. */}
              <PromptBox
                variant="hero"
                submitLabel="Design it"
                label="Describe your app"
                hint="iPhone · 3–6 screens · real photos"
                placeholder="Describe your app — e.g. a habit tracker with streaks, reminders and weekly stats"
                fill={fill}
                attachments
                onSubmit={async (prompt, images) => {
                  // The pictures travel in session storage, not the URL: the project page starts the
                  // run and reads them there, exactly once.
                  try {
                    if (images?.length) sessionStorage.setItem(PENDING_IMAGES, JSON.stringify(images))
                    else sessionStorage.removeItem(PENDING_IMAGES)
                  } catch {}
                  try {
                    const { id } = await createProject({ data: { designSystem, brief: prompt } })
                    navigate({ to: '/p/$projectId', params: { projectId: id }, search: { brief: prompt } })
                  } catch (e) {
                    reportError(e) // BIL-14: over the plan's project count opens the upgrade dialog
                  }
                }}
              />
            </div>
          </section>

          {/* A returning person sees their projects first; a new one sees the examples first. */}
          {projects.length ? <>{projectList}{ideas}</> : <>{ideas}{projectList}</>}
        </div>
      </main>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Rename project</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveName() }}>
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} autoFocus aria-label="Project name" />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
              <Button type="submit" disabled={!draft.trim()}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>All its screens and history are deleted. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} variant="destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
