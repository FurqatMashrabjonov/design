import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Columns2, Link2, Pencil, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { GeneratingVeil, parseNav, postLook, screenForNav, screenSrc } from '@/ScreenFrame'
import { parseAppTheme } from '@/lib/app-theme'
import { AppLookSwitch } from '@/components/canvas/ThemePanel'
import { Button, buttonVariants } from '@/components/ui/button'
import { DeviceFrame } from '@/components/DeviceFrame'
import { DEVICES, DEFAULT_DEVICE, deviceById, FOLD_PERSPECTIVE, foldLayout, splitPanes, type Device, type FoldFrame } from '@/lib/devices'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { WaitlistButton } from '@/components/Waitlist'

// The clickable preview of an app (SHR-01): the owner's (/preview/$projectId) and, since SHR-02, anyone's with a
// share link (/s/$token) — the same stage, where a shared one has no way back to the editor, frames its screens
// with the token, and offers the waitlist (WLT-01). On a phone-sized window the app fills the screen without a
// drawn device (SHR-05): the viewer's own phone is the device.
export type PreviewScreen = { id: string; name: string; html: string; x: number; y: number; slug: string | null; screenType: string | null; activeTabId: string | null }
export type PreviewProject = { id: string; name: string; plan: string | null; theme: string | null }

// SHR-03: moving between screens is local state, never a route navigation. A navigation re-ran the
// session check and the loader (every screen's HTML from the server) and remounted the frame: ~1 s and a
// white flash per tap. Every screen keeps its own iframe, mounted once and kept, so a tap only changes
// which one is shown — the page inside never reloads, and its Tailwind/icon scripts run once.
type Motion = 'push' | 'pop' | 'fade'
const DEVICE_KEY = 'od:preview-device'

export function AppPreview({ project, screens: rows, start, share }: { project: PreviewProject; screens: PreviewScreen[]; start?: string; share?: { token: string; ref: string | null } }) {
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

  // SHR-05: on a phone-sized window the app fills the screen and the viewer's phone is the device.
  const [viewport, setViewport] = useState({ w: 1280, h: 800 })

  useEffect(() => {
    const read = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])
  const phone = viewport.w < 640
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
  // PRV-02: a foldable opens to its inner screen. Open, the app is shown the way a tablet-class screen shows
  // a phone app that has a list and a detail: the list on the left of the hinge, what it opens on the right.
  // `fold` is how far it is open (0 folded … 1 open): the Fold button tweens it, the slider scrubs it.
  const duo = !!device.unfolded && !phone
  const [fold, setFold] = useState(0)
  const foldRef = useRef(fold)
  foldRef.current = fold
  const tween = useRef(0)
  const foldTo = useCallback((target: number) => {
    cancelAnimationFrame(tween.current)
    const from = foldRef.current
    const ms = 900 * Math.abs(target - from)
    if (!ms || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setFold(target)
    const start = performance.now()
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      setFold(from + (target - from) * e)
      if (t < 1) tween.current = requestAnimationFrame(frame)
    }
    tween.current = requestAnimationFrame(frame)
  }, [])
  const toggleFold = useCallback(() => foldTo(foldRef.current > 0.5 ? 0 : 1), [foldTo])
  // On a real phone the browser keeps its own bars, so the app needs no room for a drawn status bar.
  const insets = phone ? { top: 0, bottom: 0 } : { top: device.top, bottom: device.bottom }
  // A switch re-renders every mounted screen in place (od:look); none of them reloads.
  const lookRef = useRef({ theme, insets })
  lookRef.current = { theme, insets }
  useEffect(() => {
    for (const f of frames.current.values()) postLook(f.contentWindow, theme, insets)
  }, [theme, device, phone]) // eslint-disable-line react-hooks/exhaustive-deps
  // What `pop` goes back to: the screens this session pushed from.
  const back = useRef<string[]>([])
  const [shownId, setShownId] = useState(() => screens.find((s) => s.id === start)?.id ?? screens[0]?.id)
  // The plan knows which screen opens from which (kind + parent), so the two panes are decided in code.
  const planned = useMemo(() => {
    try {
      const plan = JSON.parse(project.plan ?? '{}') as { screens?: { id: string; kind?: string; parent?: string }[] }
      return new Map((plan.screens ?? []).map((p) => [p.id, p]))
    } catch {
      return new Map<string, { id: string; kind?: string; parent?: string }>()
    }
  }, [project.plan])
  const panes = useMemo(() => (duo && shownId ? splitPanes(screens, planned, shownId) : { left: shownId }), [duo, screens, planned, shownId])
  const half = (device.unfolded?.w ?? 0) / 2
  const layout = duo && shownId ? foldLayout(fold, panes as { left: string; right?: string }, shownId, half) : null
  // Left to right, so the caption reads in the order the panes do.
  const visible = layout ? [...layout.frames].sort((a, z) => a[1].left - z[1].left).map(([id]) => id) : shownId ? [shownId] : []
  // A screen can only be tapped when the phone is fully folded or fully open.
  const settled = !duo || fold === 0 || fold === 1
  const visibleKey = visible.join()
  const currentIndex = Math.max(0, screens.findIndex((s) => s.id === shownId))
  const current = screens[currentIndex]
  const [leaving, setLeaving] = useState<{ id: string; motion: Motion } | null>(null)
  const [motion, setMotion] = useState<Motion>('fade')
  // PRV-03: the controls step back while the app is in use. Two seconds without the pointer moving over the page
  // (moves inside the phone never reach it) or a key press, and they fade out; any move brings them back. They
  // stay while the pointer is on them, while one has focus, or while the device menu is open.
  const [idle, setIdle] = useState(false)
  const hold = useRef(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wake = useCallback(() => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => !hold.current && setIdle(true), 2000)
  }, [])
  const holdChrome = (on: boolean) => {
    hold.current = on
    if (on) setIdle(false)
    else wake()
  }
  useEffect(() => {
    wake()
    window.addEventListener('pointermove', wake)
    window.addEventListener('keydown', wake)
    return () => {
      clearTimeout(idleTimer.current)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [wake])
  const chrome = { onPointerEnter: () => holdChrome(true), onPointerLeave: () => holdChrome(false), onFocus: () => holdChrome(true), onBlur: () => holdChrome(false) }
  // Frames are mounted as they are needed and never unmounted: the shown one and its neighbours first,
  // then the rest once the first has loaded, so a later tap finds its screen already drawn.
  const [mounted, setMounted] = useState<Set<string>>(() => new Set([shownId, screens[currentIndex - 1]?.id, screens[currentIndex + 1]?.id].filter(Boolean) as string[]))


  const goTo = useCallback(
    (id: string, how: Motion) => {
      if (id === shownId) return
      const want = device.unfolded ? [id, ...(Object.values(splitPanes(screens, planned, id)).filter(Boolean) as string[])] : [id]
      setMounted((m) => (want.every((w) => m.has(w)) ? m : new Set([...m, ...want])))
      // Open, the panes change in place (a fade); the phone's push/pop slide is for one screen at a time.
      const split = !!device.unfolded && foldRef.current > 0
      setLeaving(shownId && !split ? { id: shownId, motion: how } : null)
      setMotion(split ? 'fade' : how)
      setShownId(id)
      // The address bar is left alone: the router notices even a replaceState and reloads the project
      // (~1 s). "Copy preview link" builds the link to the screen on show instead.
    },
    [shownId, device, screens, planned],
  )
  // A foldable's panes are mounted before it opens, so they are drawn by the time they swing into view.
  useEffect(() => {
    const want = [...visible, panes.left, panes.right].filter(Boolean) as string[]
    setMounted((m) => (want.every((v) => m.has(v)) ? m : new Set([...m, ...want])))
  }, [visibleKey, panes.left, panes.right]) // eslint-disable-line react-hooks/exhaustive-deps
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
      if (!shownId || !settled || !visible.some((v) => e.source === frames.current.get(v)?.contentWindow)) return
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
  }, [screens, goTo, shownId, visibleKey, settled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && device.unfolded) toggleFold()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, device, toggleFold])

  // A foldable is always laid out at its open size, so no frame is resized (and reflowed) while it folds.
  const shown = duo ? { ...device, ...device.unfolded! } : device
  const native = { width: shown.w, height: shown.h }
  const bezel = device.bezel
  // Leave room for the arrows on the sides and a caption below.
  // Room for the top controls (~72px) and the caption below, so the phone never runs under either.
  const availH = Math.max(240, viewport.h - 180)
  const availW = Math.max(240, viewport.w - 240)
  const scale = Math.min(1, availH / (native.height + bezel * 2), availW / (native.width + bezel * 2))
  const phoneW = (native.width + bezel * 2) * scale
  const phoneH = (native.height + bezel * 2) * scale


  // Every mounted screen and the veil over the one still drawing — inside the drawn device, or (on a phone) the page.
  const frameEls = (
    <>
      {screens.filter((s) => mounted.has(s.id)).map((s) => (
        <iframe
          key={s.id}
          ref={(el) => {
            if (el) frames.current.set(s.id, el)
            else frames.current.delete(s.id)
          }}
          title={s.name}
          src={screenSrc(s.id, s.html) + (share ? `&t=${share.token}` : '')}
          sandbox="allow-scripts"
          onLoad={(e) => {
            postLook(e.currentTarget.contentWindow, lookRef.current.theme, lookRef.current.insets)
            setLoaded((l) => (l.has(s.id) ? l : new Set(l).add(s.id)))
            if (s.id === shownId) warmAll()
          }}
          data-state={visible.includes(s.id) ? 'shown' : s.id === leaving?.id ? 'leaving' : 'hidden'}
          onAnimationEnd={s.id === leaving?.id ? () => setLeaving(null) : undefined}
          style={layout ? foldStyle(layout.frames.get(s.id) ?? { left: half, width: half, z: 0 }) : undefined}
          aria-hidden={!visible.includes(s.id)}
          tabIndex={visible.includes(s.id) ? 0 : -1}
        />
      ))}
      <GeneratingVeil show={!shownId || visible.some((v) => !loaded.has(v))} />
    </>
  )

  async function copyLink() {
    try {
      const url = new URL(window.location.href)
      if (shownId) url.searchParams.set('s', shownId)
      url.searchParams.delete('ref') // a re-shared link is not the post it first came from
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
        {!share && (
          <Link to="/p/$projectId" params={{ projectId: project.id }} className={buttonVariants({ variant: 'outline' })}>
            <Pencil /> Back to editor
          </Link>
        )}
      </div>
    )
  }

  // SHR-05: on a phone the app is the page — no drawn device, no arrows; a shared one keeps a slim bar for the waitlist.
  if (phone) {
    return (
      <div className={`flex h-dvh flex-col bg-canvas text-foreground ${theme.dark ? 'dark' : 'light'}`}>
        {share && (
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
            <WaitlistButton share={share} size="sm" />
          </div>
        )}
        <div className="od-preview-stage flex-1" data-motion={motion}>
          {frameEls}
        </div>
      </div>
    )
  }

  // UI-17: the stage is drawn with the studio's tokens (no hex stage colours), in the app's light/dark (PRV-03).
  return (
    // PRV-03: a presentation, not a workspace — one flat tone and no grid, so nothing competes with the phone. The
    // stage and its controls wear the app's light/dark, not the studio's: a dark app is shown on a dark stage.
    <div className={`relative flex h-screen flex-col items-center justify-center overflow-hidden bg-canvas text-foreground ${theme.dark ? 'dark' : 'light'}`} data-idle={idle || undefined}>
      {share ? (
        <p className="od-chrome absolute left-5 top-5 flex h-9 items-center rounded-full bg-card px-4 text-sm font-medium shadow-1 ring-1 ring-border" {...chrome}>
          {project.name}
        </p>
      ) : (
        <Link
          to="/p/$projectId"
          params={{ projectId: project.id }}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'od-chrome absolute left-5 top-5 rounded-full bg-card shadow-1' })}
          {...chrome}
        >
          <ChevronLeft /> {project.name || 'Editor'}
        </Link>
      )}
      {/* The app's platform and light/dark lead the cluster; the stage follows the app's light/dark, so there is
          one moon here and it is the app's. */}
      <div {...chrome} className="od-chrome absolute right-5 top-5 flex items-center gap-0.5 rounded-full bg-card/85 p-1 shadow-2 ring-1 ring-border backdrop-blur">
        <DropdownMenu onOpenChange={holdChrome}>
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
        {!share && <Tip label="Back to editor">
          <Link
            to="/p/$projectId"
            params={{ projectId: project.id }}
            aria-label="Back to editor"
            className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'rounded-full text-muted-foreground hover:text-foreground' })}
          >
            <Pencil />
          </Link>
        </Tip>}
      </div>
      {/* WLT-01: what the shared link is for. It stays while the rest of the chrome fades. */}
      {share && (
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-3 rounded-xl bg-card p-3 pl-4 shadow-2 ring-1 ring-border">
          <p className="text-sm">
            <span className="font-medium">Made with AI in a minute.</span>
            <br />
            <span className="text-muted-foreground">Want one for your idea?</span>
          </p>
          <WaitlistButton share={share} />
        </div>
      )}

      <div className="relative flex items-center gap-8">
        {/* A soft light in the app's own colour behind the phone, and its shadow on the floor: the eye goes to the
            middle, and the stage belongs to this app (it follows the accent). */}
        <div aria-hidden className="od-stage-glow pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 rounded-full" style={{ width: phoneW * 2.2, height: phoneH * 1.4, background: `radial-gradient(closest-side, color-mix(in oklab, ${theme.accent} 20%, transparent), transparent)` }} />
        <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: `calc(50% + ${phoneH / 2 - 14}px)`, width: phoneW * 0.9, height: 36, background: 'radial-gradient(closest-side, rgb(0 0 0 / 38%), transparent)' }} />
        <Arrow label="Previous screen" disabled={currentIndex === 0} onClick={() => step(-1)}>
          <ChevronLeft className="size-5" />
        </Arrow>

        <div className="relative">
        {/* Folded, the hinge is the cover's left edge: a metal spine, as on the real phone. */}
        {layout && layout.clipLeft >= half - 1 && (
          <span aria-hidden className="absolute z-10 rounded-full" style={{ left: (layout.clipLeft / 2) * scale - 9, top: '2.5%', bottom: '2.5%', width: 7, background: 'linear-gradient(to right, #6f6b65, #e9e5de 45%, #a29d95)', boxShadow: '0 1px 3px rgb(0 0 0 / 35%)' }} />
        )}
        <div style={layout ? { clipPath: foldClip(fold, layout.clipLeft * scale, (shown.radius + shown.bezel) * scale), transform: `translateX(${(-layout.clipLeft / 2) * scale}px)` } : undefined}>
        <DeviceFrame device={shown} scale={scale} dark={theme.dark} cover={duo && fold < 0.5} moving={duo && fold > 0 && fold < 1} split={duo && fold === 1 && !!panes.right}>
          <div className="od-preview-stage" data-motion={motion} style={{ width: native.width, height: native.height, overflow: duo && fold > 0 && fold < 1 ? 'visible' : undefined }}>
            {frameEls}
          </div>
        </DeviceFrame>
        </div>
        </div>

        <Arrow label="Next screen" disabled={currentIndex === screens.length - 1} onClick={() => step(1)}>
          <ChevronRight className="size-5" />
        </Arrow>
      </div>

      {duo && (
        <div {...chrome} className="od-chrome relative mt-5 flex items-center gap-3 rounded-full bg-card/85 py-1 pr-4 pl-1 shadow-2 ring-1 ring-border backdrop-blur">
          <Button size="sm" className="rounded-full font-medium" aria-pressed={fold > 0.5} onClick={toggleFold} title="Fold or unfold (F)">
            {fold > 0.5 ? <Smartphone /> : <Columns2 />} {fold > 0.5 ? 'Fold' : 'Unfold'}
          </Button>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(fold * 1000)}
            aria-label="How far the phone is open"
            onChange={(e) => (cancelAnimationFrame(tween.current), setFold(Number(e.target.value) / 1000))}
            onPointerUp={() => foldTo(foldRef.current > 0.5 ? 1 : 0)}
            className="w-40 cursor-ew-resize accent-foreground"
          />
          <kbd className="rounded border border-border px-1.5 text-[12px] text-muted-foreground">F</kbd>
        </div>
      )}
      <p className="od-chrome relative mt-4 text-xs tabular-nums text-muted-foreground">
        {currentIndex + 1} / {screens.length} · <span className="text-foreground">{visible.map((v) => screens.find((s) => s.id === v)?.name).join(' · ')}</span>
      </p>
    </div>
  )
}

/** A foldable's frame at its place in the fold. A half that is swinging is foreshortened, wears its own bezel and
 *  goes soft (blurred and dimmed) as it turns; a pane still unfolding is soft until the phone is open. */
function foldStyle(f: FoldFrame): React.CSSProperties {
  const style: React.CSSProperties = { left: f.left, width: f.width, right: 'auto', zIndex: f.z, borderRadius: f.card ? 22 : undefined }
  const turn = f.angle ? Math.abs(Math.sin((f.angle * Math.PI) / 180)) : 0
  const soft = Math.max(turn, f.soft ?? 0)
  if (soft > 0.001) style.filter = `blur(${(soft * 12).toFixed(1)}px) brightness(${(1 - 0.5 * soft).toFixed(2)})`
  if (!f.angle) return style
  return { ...style, transform: `perspective(${FOLD_PERSPECTIVE}px) rotateY(${f.angle}deg)`, transformOrigin: `${f.origin} center`, backfaceVisibility: 'hidden', borderRadius: 40, boxShadow: '0 0 0 11px #0d0c0b, 0 0 0 12.5px #6f6b65' }
}

/** What of the device is in view. Folded: the cover, with small corners at the spine and the phone's big ones at the
 *  free edge. Swinging: nothing above or below is cut off, since the near edge of a turning half grows. */
function foldClip(p: number, left: number, big: number): string | undefined {
  if (p >= 1) return undefined
  if (p <= 0) return `inset(0 0 0 ${left}px round 10px ${big}px ${big}px 10px)`
  return `inset(-30% -4% -30% ${left}px)`
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
    <Button variant="outline" size="icon-lg" aria-label={props.label} title={props.label} disabled={props.disabled} onClick={props.onClick} className="od-chrome rounded-full bg-card shadow-1 disabled:opacity-30">
      {props.children}
    </Button>
  )
}
