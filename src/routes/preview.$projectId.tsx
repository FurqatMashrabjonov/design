import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Link2, Pencil, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { getProject, getSession } from '../server/fns'
import { frameSize } from '../canvas'
import { GeneratingVeil, parseNav, postLook, screenForNav, screenSrc } from '../ScreenFrame'
import { parseAppTheme } from '@/lib/app-theme'
import { AppLookSwitch } from '@/components/canvas/ThemePanel'
import { Button, buttonVariants } from '@/components/ui/button'
import { DeviceFrame } from '@/components/DeviceFrame'
import { DEVICES, DEFAULT_DEVICE, deviceById, type Device } from '@/lib/devices'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
const DEVICE_KEY = 'od:preview-device'

function PreviewPage() {
  const { project, screens: rows } = Route.useLoaderData()
  const search = Route.useSearch()
  const frames = useRef(new Map<string, HTMLIFrameElement>())

  // Canvas order is plan order: left to right.
  const screens = useMemo(() => rows.filter((sc) => sc.html).sort((a, z) => a.x - z.x || a.y - z.y), [rows])
  // The app's own look; the stage around the phone follows the studio's light/dark.
  // Show the prototype as iOS or Android, light or dark, without changing the project (the canvas saves it).
  const saved = useMemo(() => parseAppTheme(project.theme), [project.theme])
  const [theme, setTheme] = useState(saved)
  // Screens whose page has loaded; the one on show wears the veil until then.
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set())
  const loadedRef = useRef(loaded)
  loadedRef.current = loaded
  // A screen has drawn itself when its page reports a height (the kit's first od:height). That — not the
  // iframe's load event, which can fire before this page hydrates — clears the veil and sends the look.
  useEffect(() => {
    function onDrawn(e: MessageEvent) {
      if (e.data?.type !== 'od:height') return
      for (const [id, f] of frames.current) {
        if (f.contentWindow !== e.source) continue
        postLook(f.contentWindow, lookRef.current.theme, lookRef.current.insets)
        setLoaded((l) => (l.has(id) ? l : new Set(l).add(id)))
      }
    }
    window.addEventListener('message', onDrawn)
    // Ask every mounted screen that has not answered yet, in case its report came before this listener.
    const ask = setInterval(() => {
      for (const [id, f] of frames.current) if (!loadedRef.current.has(id)) f.contentWindow?.postMessage({ type: 'od:measure' }, '*')
    }, 1000)
    return () => {
      window.removeEventListener('message', onDrawn)
      clearInterval(ask)
    }
  }, [])

  // PRV-01: the phone it is shown on — remembered per viewer; an Android phone shows the app as Material.
  const [device, setDevice] = useState<Device>(DEFAULT_DEVICE)
  useEffect(() => {
    try {
      const saved = deviceById(localStorage.getItem(DEVICE_KEY))
      setDevice(saved)
      setTheme((t) => ({ ...t, platform: saved.platform }))
    } catch {}
  }, [])
  function chooseDevice(d: Device) {
    setDevice(d)
    setTheme((t) => ({ ...t, platform: d.platform }))
    try {
      localStorage.setItem(DEVICE_KEY, d.id)
    } catch {}
  }
  const insets = { top: device.top, bottom: device.bottom }
  // A switch re-renders every mounted screen in place (od:look); none of them reloads.
  const lookRef = useRef({ theme, insets })
  lookRef.current = { theme, insets }
  useEffect(() => {
    for (const f of frames.current.values()) postLook(f.contentWindow, theme, insets)
  }, [theme, device]) // eslint-disable-line react-hooks/exhaustive-deps
  // What `pop` goes back to: the screens this session pushed from.
  const back = useRef<string[]>([])
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

  // The kit's useNav posts od:nav (runtime/kit/nav.jsx); only the frame on show may navigate.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!shownId || e.source !== frames.current.get(shownId)?.contentWindow) return
      const nav = parseNav(e.data)
      if (!nav) return
      if (nav.action === 'pop') {
        const to = back.current.pop()
        if (to) goTo(to, 'pop')
        return
      }
      const target = screenForNav(screens, nav.id!)
      if (!target) return void toast.info('That screen has not been designed yet')
      if (nav.action === 'push') back.current.push(shownId)
      else back.current = []
      goTo(target.id, nav.action === 'push' ? 'push' : 'fade')
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

  const native = { width: device.w, height: device.h }
  const bezel = device.bezel
  // Leave room for the arrows on the sides and a caption below.
  // Room for the top controls (~72px) and the caption below, so the phone never runs under either.
  const availH = Math.max(240, viewport.h - 180)
  const availW = Math.max(240, viewport.w - 240)
  const scale = Math.min(1, availH / (native.height + bezel * 2), availW / (native.width + bezel * 2))


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
      {/* The app's platform and light/dark lead the cluster; the stage itself follows the studio's own
          theme (set in the studio), so there is one moon here and it is the app's. */}
      <div className="absolute right-5 top-5 flex items-center gap-0.5 rounded-full bg-card/85 p-1 shadow-2 ring-1 ring-border backdrop-blur">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-full font-medium" title="Show the app on another phone">
              <Smartphone /> {device.name} <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {DEVICES.map((d) => (
              <DropdownMenuItem key={d.id} onSelect={() => chooseDevice(d)} className="justify-between">
                <span className="flex items-center gap-2">{d.id === device.id ? <Check className="size-4" /> : <span className="size-4" />}{d.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{d.w}×{d.h}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <AppLookSwitch theme={theme} onChange={setTheme} />
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
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

        <DeviceFrame device={device} scale={scale} dark={theme.dark}>
          <div className="od-preview-stage" data-motion={motion} style={{ width: native.width, height: native.height }}>
            {screens.filter((s) => mounted.has(s.id)).map((s) => (
              <iframe
                key={s.id}
                ref={(el) => {
                  if (el) frames.current.set(s.id, el)
                  else frames.current.delete(s.id)
                }}
                title={s.name}
                src={screenSrc(s.id, s.html)}
                sandbox="allow-scripts"
                onLoad={(e) => {
                  postLook(e.currentTarget.contentWindow, lookRef.current.theme, lookRef.current.insets)
                  setLoaded((l) => (l.has(s.id) ? l : new Set(l).add(s.id)))
                  if (s.id === shownId) warmAll()
                }}
                data-state={s.id === shownId ? 'shown' : s.id === leaving?.id ? 'leaving' : 'hidden'}
                onAnimationEnd={s.id === leaving?.id ? () => setLeaving(null) : undefined}
                aria-hidden={s.id !== shownId}
                tabIndex={s.id === shownId ? 0 : -1}
              />
            ))}
            <GeneratingVeil show={!shownId || !loaded.has(shownId)} />
          </div>
        </DeviceFrame>

        <Arrow label="Next screen" disabled={currentIndex === screens.length - 1} onClick={() => step(1)}>
          <ChevronRight className="size-5" />
        </Arrow>
      </div>

      <p className="relative mt-5 text-xs tabular-nums text-muted-foreground">
        {currentIndex + 1} / {screens.length} · <span className="text-foreground">{current.name}</span>
        {/* Pexels' API guidelines ask for a link back wherever its photos are shown. */}
        {' · '}<a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">Photos by Pexels</a>
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
