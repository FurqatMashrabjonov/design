import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Link2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { getProject, getSession } from '../server/fns'
import { frameSize } from '../canvas'
import { orderScreens, screenByName, screenForBack, screenForTab, withPreviewBridge } from '@/lib/preview-bridge'
import { applyThemeOverride, parseTheme } from '@/lib/theme-override'
import { Button, buttonVariants } from '@/components/ui/button'
import { PhoneFrame } from '@/components/PhoneFrame'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const Route = createFileRoute('/preview/$projectId')({
  beforeLoad: async ({ location }) => {
    const { user } = await getSession()
    if (!user) throw redirect({ to: '/login', search: { next: location.href } })
    return { user }
  },
  validateSearch: (s: Record<string, unknown>): { s?: string } => (typeof s.s === 'string' ? { s: s.s } : {}),
  loader: ({ params }) => getProject({ data: params.projectId }),
  head: () => ({ meta: [{ title: 'Preview' }] }),
  component: PreviewPage,
})

// SHR-03: moving between screens is local state, never a route navigation. A navigation re-ran the
// session check and the loader (every screen's HTML from the server) and remounted the frame: ~1 s and a
// white flash per tap. Every screen keeps its own iframe, mounted once and kept, so a tap only changes
// which one is shown — the page inside never reloads, and its Tailwind/icon scripts run once.
type Motion = 'push' | 'pop' | 'fade'

function PreviewPage() {
  const { project, screens: rows } = Route.useLoaderData()
  const search = Route.useSearch()
  const frames = useRef(new Map<string, HTMLIFrameElement>())

  const screens = useMemo(() => orderScreens(rows.filter((sc) => sc.html)), [rows])
  const [shownId, setShownId] = useState(() => screens.find((s) => s.id === search.s)?.id ?? screens[0]?.id)
  const currentIndex = Math.max(0, screens.findIndex((s) => s.id === shownId))
  const current = screens[currentIndex]
  const [leaving, setLeaving] = useState<{ id: string; motion: Motion } | null>(null)
  const [motion, setMotion] = useState<Motion>('fade')
  // Frames are mounted as they are needed and never unmounted: the shown one and its neighbours first,
  // then the rest once the first has loaded, so a later tap finds its screen already drawn.
  const [mounted, setMounted] = useState<Set<string>>(() => new Set([shownId, screens[currentIndex - 1]?.id, screens[currentIndex + 1]?.id].filter(Boolean) as string[]))

  const [viewport, setViewport] = useState({ w: 1280, h: 800 })

  useEffect(() => {
    const read = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  const goTo = useCallback(
    (id: string, how: Motion) => {
      if (id === shownId) return
      setMounted((m) => (m.has(id) ? m : new Set(m).add(id)))
      if (shownId) setLeaving({ id: shownId, motion: how })
      setMotion(how)
      setShownId(id)
      // The address bar is left alone: the router notices even a replaceState and reloads the project
      // (~1 s). "Copy preview link" builds the link to the screen on show instead.
    },
    [shownId],
  )
  const step = useCallback(
    (delta: number) => {
      const next = screens[currentIndex + delta]
      if (next) goTo(next.id, delta > 0 ? 'push' : 'pop')
    },
    [screens, currentIndex, goTo],
  )
  const warmAll = useCallback(() => setMounted((m) => (m.size >= screens.length ? m : new Set(screens.map((s) => s.id)))), [screens])

  // The shell inside the frame reports tab and back taps; only trust our own iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Every frame is live; only the one on show may navigate.
      if (!shownId || e.source !== frames.current.get(shownId)?.contentWindow || !e.data) return
      if (e.data.type === 'od:navigate_tab') {
        const target = screenForTab(screens, e.data.tabId)
        if (target) goTo(target.id, 'fade')
        else toast.info(`No screen was designed for the "${e.data.tabId}" tab`)
      } else if (e.data.type === 'od:navigate_back') {
        const target = screenForBack(screens, e.data.parentName)
        if (target) goTo(target.id, 'pop')
      } else if (e.data.type === 'od:navigate_link' && typeof e.data.name === 'string') {
        // Links to screens that were never designed stay quiet: most rows in a list have no screen behind them.
        const target = screenByName(screens, e.data.name)
        if (target) goTo(target.id, 'push')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [screens, goTo, shownId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  const native = frameSize(project.device)
  const bezel = 10
  // Leave room for the arrows on the sides and a caption below.
  const availH = Math.max(240, viewport.h - 130)
  const availW = Math.max(240, viewport.w - 240)
  const scale = Math.min(1, availH / (native.height + bezel * 2), availW / (native.width + bezel * 2))
  const frameW = native.width * scale

  // The project's own theme override — distinct from the studio's light/dark, which the stage follows.
  const appTheme = useMemo(() => parseTheme(project.theme), [project.theme])
  const docs = useMemo(() => new Map(screens.map((s) => [s.id, withPreviewBridge(applyThemeOverride(s.html, appTheme))])), [screens, appTheme])

  async function copyLink() {
    try {
      const url = new URL(window.location.href)
      if (shownId) url.searchParams.set('s', shownId)
      await navigator.clipboard.writeText(url.toString())
      toast.success('Preview link copied')
    } catch {
      toast.error('Could not copy — clipboard access was blocked')
    }
  }

  if (!current) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-canvas text-sm text-muted-foreground">
        This project has no screens to preview yet.
        <Link to="/p/$projectId" params={{ projectId: project.id }} className={buttonVariants({ variant: 'outline' })}>
          <Pencil /> Back to editor
        </Link>
      </div>
    )
  }

  // UI-17: the stage is the studio's canvas in the studio's own theme, and the phone is the one
  // PhoneFrame — no hex stage colours, no second bezel, no light/dark of its own.
  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-canvas text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--canvas-dot)_1px,transparent_1px)] [background-size:22px_22px]" />
      <Link
        to="/p/$projectId"
        params={{ projectId: project.id }}
        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'absolute left-5 top-5 rounded-full bg-card shadow-1' })}
      >
        <ChevronLeft /> {project.name || 'Editor'}
      </Link>
      <div className="absolute right-5 top-5 flex items-center gap-0.5 rounded-full bg-card/85 p-1 shadow-2 ring-1 ring-border backdrop-blur">
        <ThemeToggle className="rounded-full" />
        <Tip label="Copy preview link">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground" aria-label="Copy preview link" onClick={copyLink}>
            <Link2 />
          </Button>
        </Tip>
        <Tip label="Back to editor">
          <Link
            to="/p/$projectId"
            params={{ projectId: project.id }}
            aria-label="Back to editor"
            className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'rounded-full text-muted-foreground hover:text-foreground' })}
          >
            <Pencil />
          </Link>
        </Tip>
      </div>

      <div className="relative flex items-center gap-8">
        <Arrow label="Previous screen" disabled={currentIndex === 0} onClick={() => step(-1)}>
          <ChevronLeft className="size-5" />
        </Arrow>

        <PhoneFrame width={frameW}>
          <div className="od-preview-stage" data-motion={motion} style={{ width: native.width, height: native.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {screens.filter((s) => mounted.has(s.id)).map((s) => (
              <iframe
                key={s.id}
                ref={(el) => {
                  if (el) frames.current.set(s.id, el)
                  else frames.current.delete(s.id)
                }}
                title={s.name}
                srcDoc={docs.get(s.id)}
                sandbox="allow-scripts"
                onLoad={s.id === shownId ? warmAll : undefined}
                data-state={s.id === shownId ? 'shown' : s.id === leaving?.id ? 'leaving' : 'hidden'}
                onAnimationEnd={s.id === leaving?.id ? () => setLeaving(null) : undefined}
                aria-hidden={s.id !== shownId}
                tabIndex={s.id === shownId ? 0 : -1}
              />
            ))}
          </div>
        </PhoneFrame>

        <Arrow label="Next screen" disabled={currentIndex === screens.length - 1} onClick={() => step(1)}>
          <ChevronRight className="size-5" />
        </Arrow>
      </div>

      <p className="relative mt-5 text-xs tabular-nums text-muted-foreground">
        {currentIndex + 1} / {screens.length} · <span className="text-foreground">{current.name}</span>
      </p>
    </div>
  )
}

function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function Arrow(props: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="outline" size="icon-lg" aria-label={props.label} title={props.label} disabled={props.disabled} onClick={props.onClick} className="rounded-full bg-card shadow-1 disabled:opacity-30">
      {props.children}
    </Button>
  )
}
