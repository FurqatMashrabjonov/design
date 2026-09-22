import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { Check, ChevronDown, Grid2x2, Home, LayoutList, Monitor, Moon, MoreHorizontal, Pencil, Search, Smartphone, Sparkles, Star, Sun, Trash2 } from 'lucide-react'
import { createProject, deleteProject, favoriteProject, renameProject } from './server/fns'
import { AccountMenu } from '@/components/AccountMenu'
import { PromptBox } from './PromptBox'
import { BRAND, Phone, SETS, shot } from './Landing'
import { frameSize } from './canvas'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// DSH-03…12: the signed-in home. A sidebar (recent projects, today's usage, account), the prompt
// with a visual design-system picker, starting points drawn from real output, and the projects
// as cards that show their own first screen.

type Card = { id: string; name: string; device: string; designSystem: string; favorite: boolean; screenCount: number; coverId: string | null; updatedAt: number }
type System = { id: string; name: string; category: string; swatch: { bg: string | null; fg: string | null; accent: string | null; font: string | null } }
type User = { name: string; email: string }

const LIME = '#C6F24E'
const VIEW_KEY = 'od:projects-view'
export const THEME_KEY = 'od:theme'

/** The project's first screen, loaded only when the card scrolls into view. */
function Thumb({ screenId, device, width }: { screenId: string; device: string; width: number }) {
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
      className="pointer-events-none origin-top-left border-0 bg-white"
      style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}
    />
  )
}

function ago(unix: number) {
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

function Swatch({ s, size = 14 }: { s: System['swatch'] | undefined; size?: number }) {
  return (
    <span className="inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-black/10" style={{ width: size, height: size }} aria-hidden>
      <span className="h-full w-1/2" style={{ background: s?.bg ?? '#fff' }} />
      <span className="h-full w-1/2" style={{ background: s?.accent ?? '#888' }} />
    </span>
  )
}

/** DSH-07: pick a system by how it looks — its colours and display type — not by name alone. */
function SystemPicker({ systems, value, onChange }: { systems: System[]; value: string; onChange: (id: string) => void }) {
  const current = systems.find((s) => s.id === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex h-8 items-center gap-2 rounded-lg border bg-background px-2.5 text-sm hover:bg-muted" aria-label="Design system">
          <Swatch s={current?.swatch} />
          <span className="max-w-[140px] truncate">{current?.name ?? value}</span>
          <ChevronDown className="size-3.5 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[420px] w-[min(92vw,560px)] overflow-y-auto p-2">
        {/* One grid, already ordered by category: most categories hold one or two systems. */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {systems.map((s) => (
            <DropdownMenuItem key={s.id} onSelect={() => onChange(s.id)} className="flex-col items-stretch gap-0 overflow-hidden rounded-lg border p-0 focus:ring-2 focus:ring-ring">
              <div className="flex h-14 items-center justify-between px-3" style={{ background: s.swatch.bg ?? undefined, color: s.swatch.fg ?? undefined }}>
                <span className="text-xl font-semibold" style={{ fontFamily: s.swatch.font ? `"${s.swatch.font}", system-ui` : undefined }}>Aa</span>
                <span className="h-5 w-8 rounded-full" style={{ background: s.swatch.accent ?? undefined }} />
              </div>
              <div className="flex items-center justify-between gap-1 px-2.5 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate text-xs">{s.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{s.category}</span>
                </span>
                {s.id === value && <Check className="size-3.5 shrink-0" />}
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])
  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    write(THEME_KEY, next ? 'dark' : 'light')
    setDark(next)
  }
  return (
    <button type="button" onClick={toggle} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

/** DSH-12: today's calls against the limit, so the limit is never a surprise. */
function Usage({ calls, limit }: { calls: number; limit: number }) {
  const share = Math.min(1, calls / Math.max(1, limit))
  const color = share >= 1 ? 'var(--destructive)' : share >= 0.8 ? '#e2a400' : 'var(--foreground)'
  return (
    <div className="rounded-xl border bg-background p-3 text-xs">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground">Today</span>
        <span className="font-medium tabular-nums">{calls} / {limit}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Generations used today" aria-valuenow={calls} aria-valuemin={0} aria-valuemax={limit}>
        <div className="h-full rounded-full transition-all" style={{ width: `${share * 100}%`, background: color }} />
      </div>
      {share >= 0.8 && <p className="mt-2 text-muted-foreground">{share >= 1 ? 'Limit reached — it resets within 24 hours.' : 'Close to today’s limit.'}</p>}
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

export function Dashboard({ projects, designSystems, usage, user }: { projects: Card[]; designSystems: System[]; usage: { calls: number; limit: number }; user: User | undefined }) {
  const navigate = useNavigate()
  const router = useRouter()
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [designSystem, setDesignSystem] = useState('minimal')
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
    setDevice('mobile')
    if (systems.has(s.systemId)) setDesignSystem(s.systemId)
    setFill({ text: s.prompt, key: Date.now() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function chooseView(v: 'grid' | 'list') {
    setView(v)
    write(VIEW_KEY, v)
  }

  return (
    <div className="flex min-h-screen bg-muted/40 text-foreground">
      {/* Sidebar (DSH-10) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
        <Link to="/" className="flex h-14 items-center gap-2 px-4 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-foreground">
            <span className="size-2.5 rounded-sm" style={{ background: LIME }} />
          </span>
          {BRAND}
        </Link>
        <nav className="space-y-0.5 px-2 text-sm">
          <a href="#top" className="flex h-9 items-center gap-2.5 rounded-lg bg-muted px-2.5 font-medium"><Home className="size-4" /> Home</a>
          {projects.length > 0 && (<a href="#projects" className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Grid2x2 className="size-4" /> Projects</a>)}
          <a href="#ideas" className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Sparkles className="size-4" /> Examples</a>
        </nav>
        {projects.length > 0 && (
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-2">
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</p>
            {projects.slice(0, 6).map((c) => (
              <Link key={c.id} to="/p/$projectId" params={{ projectId: c.id }} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-muted">
                <span className="relative h-9 w-7 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {c.coverId && <Thumb screenId={c.coverId} device={c.device} width={28} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{ago(c.updatedAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-auto space-y-3 border-t p-3">
          <Usage {...usage} />
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
          <Link to="/" className="flex items-center gap-2 font-semibold md:hidden">
            <span className="grid size-7 place-items-center rounded-lg bg-foreground"><span className="size-2.5 rounded-sm" style={{ background: LIME }} /></span>
            {BRAND}
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <span className="md:hidden"><AccountMenu /></span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pb-24 md:px-8">
          {/* Prompt */}
          <section className="mx-auto max-w-3xl pt-6 text-center md:pt-12">
            <p className="text-sm text-muted-foreground">{greeting()}{first ? `, ${first}` : ''}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">What should we design today?</h1>
            <div className="mt-6 text-left">
              <PromptBox
                placeholder="Describe your app — e.g. a habit tracker with streaks, reminders and weekly stats"
                fill={fill}
                extra={
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm hover:bg-muted" aria-label="Device">
                          {device === 'mobile' ? <Smartphone className="size-3.5" /> : <Monitor className="size-3.5" />}
                          {device === 'mobile' ? 'iPhone' : 'Desktop'}
                          <ChevronDown className="size-3.5 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={() => setDevice('mobile')}><Smartphone /> iPhone</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDevice('desktop')}><Monitor /> Desktop</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <SystemPicker systems={designSystems} value={designSystem} onChange={setDesignSystem} />
                  </>
                }
                onSubmit={async (prompt) => {
                  const { id } = await createProject({ data: { device, designSystem } })
                  navigate({ to: '/p/$projectId', params: { projectId: id }, search: { brief: prompt } })
                }}
              />
            </div>
          </section>

          {/* Starting points (DSH-03) */}
          <section id="ideas" className="mt-12 scroll-mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{projects.length ? 'Need a start?' : 'New here? Start from one of these'}</h2>
              <span className="hidden text-xs text-muted-foreground sm:inline">Real output from one prompt</span>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {SETS.map((s, i) => (
                <button key={s.id} type="button" onClick={() => pickIdea(i)} className="group overflow-hidden rounded-2xl border bg-background text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="relative flex h-36 justify-center overflow-hidden bg-muted pt-4">
                    <Phone src={shot(s.id, s.screens[0]!)} width={104} className="shadow-md transition group-hover:-translate-y-1" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold">{s.kind}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.prompt}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <Swatch s={systems.get(s.systemId)?.swatch} size={10} /> {s.system}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Projects (DSH-04/05/08/11) */}
          {projects.length > 0 && (
            <section id="projects" className="mt-12 scroll-mt-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="mr-auto text-lg font-semibold tracking-tight">Your projects</h2>
                <div className="flex rounded-lg border bg-background p-0.5 text-sm" role="tablist">
                  {(['all', 'favorites'] as const).map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-7 rounded-md px-3 capitalize ${tab === t ? 'bg-muted font-medium' : 'text-muted-foreground'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <label className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="h-8 w-48 bg-background pl-8" />
                </label>
                <div className="flex rounded-lg border bg-background p-0.5">
                  <button type="button" onClick={() => chooseView('grid')} className={`grid size-7 place-items-center rounded-md ${view === 'grid' ? 'bg-muted' : 'text-muted-foreground'}`} aria-label="Grid view" aria-pressed={view === 'grid'}><Grid2x2 className="size-4" /></button>
                  <button type="button" onClick={() => chooseView('list')} className={`grid size-7 place-items-center rounded-md ${view === 'list' ? 'bg-muted' : 'text-muted-foreground'}`} aria-label="List view" aria-pressed={view === 'list'}><LayoutList className="size-4" /></button>
                </div>
              </div>

              {shown.length === 0 ? (
                <p className="rounded-2xl border border-dashed bg-background py-12 text-center text-sm text-muted-foreground">
                  {query.trim() ? `No projects match “${query.trim()}”.` : 'No favourites yet — star a project to keep it here.'}
                </p>
              ) : view === 'grid' ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {shown.map((c) => (
                    <div key={c.id} className="group relative overflow-hidden rounded-2xl border bg-background transition hover:shadow-lg">
                      <Link to="/p/$projectId" params={{ projectId: c.id }} className="block" aria-label={`Open ${c.name}`}>
                        <div className="relative h-48 overflow-hidden bg-muted">
                          {c.coverId ? (
                            c.device === 'mobile' ? (
                              <div className="absolute top-5 left-1/2 -translate-x-1/2 overflow-hidden rounded-[18px] border-4 border-foreground/90 shadow-md" style={{ width: 128, height: 280 }}>
                                <Thumb screenId={c.coverId} device="mobile" width={120} />
                              </div>
                            ) : (
                              <div className="absolute inset-3 overflow-hidden rounded-lg border shadow-sm"><Thumb screenId={c.coverId} device="desktop" width={260} /></div>
                            )
                          ) : (
                            <div className="grid h-full place-items-center text-xs text-muted-foreground">No screens yet</div>
                          )}
                        </div>
                      </Link>
                      <div className="flex items-start gap-2 p-3">
                        <div className="min-w-0 flex-1">
                          <Link to="/p/$projectId" params={{ projectId: c.id }} className="block truncate text-sm font-medium hover:underline">{c.name}</Link>
                          <p className="mt-0.5 flex items-center gap-1.5 truncate whitespace-nowrap text-xs text-muted-foreground">
                            <Swatch s={systems.get(c.designSystem)?.swatch} size={10} />
                            {c.screenCount} screen{c.screenCount === 1 ? '' : 's'} · {ago(c.updatedAt)}
                          </p>
                        </div>
                        <button type="button" onClick={() => toggleStar(c)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={starred(c) ? `Remove ${c.name} from favourites` : `Add ${c.name} to favourites`} aria-pressed={starred(c)}>
                          <Star className="size-4" fill={starred(c) ? 'currentColor' : 'none'} style={starred(c) ? { color: '#e2a400' } : undefined} />
                        </button>
                        <ProjectMenu card={c} onRename={() => { setDraft(c.name); setRenaming(c) }} onDelete={() => setDeleting(c)} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y overflow-hidden rounded-2xl border bg-background">
                  {shown.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                      <Link to="/p/$projectId" params={{ projectId: c.id }} className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md border bg-muted">{c.coverId && <Thumb screenId={c.coverId} device={c.device} width={36} />}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                        <span className="hidden w-32 items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Swatch s={systems.get(c.designSystem)?.swatch} size={10} /> <span className="truncate">{systems.get(c.designSystem)?.name ?? c.designSystem}</span></span>
                        <span className="hidden w-20 text-xs text-muted-foreground sm:block">{c.screenCount} screens</span>
                        <span className="w-24 text-right text-xs text-muted-foreground">{ago(c.updatedAt)}</span>
                      </Link>
                      <button type="button" onClick={() => toggleStar(c)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={starred(c) ? `Remove ${c.name} from favourites` : `Add ${c.name} to favourites`} aria-pressed={starred(c)}>
                        <Star className="size-4" fill={starred(c) ? 'currentColor' : 'none'} style={starred(c) ? { color: '#e2a400' } : undefined} />
                      </button>
                      <ProjectMenu card={c} onRename={() => { setDraft(c.name); setRenaming(c) }} onDelete={() => setDeleting(c)} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
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
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
