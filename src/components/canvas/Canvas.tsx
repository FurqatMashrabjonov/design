import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus, Maximize, MousePointer2, Hand, Keyboard, Undo2, Redo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { framesIn, type Rect } from '@/canvas'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type CanvasFrame = { id: string; x: number; y: number; width: number; height: number }

const MIN_SCALE = 0.1
const MAX_SCALE = 2
const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200]

type Drag =
  | { mode: 'pan'; startX: number; startY: number; startTx: number; startTy: number }
  // Dragging one handle moves every selected frame together; each remembers where it started.
  | { mode: 'frame'; startX: number; startY: number; starts: Record<string, FrameStart> }
  | { mode: 'marquee'; startX: number; startY: number; additive: boolean }

type FrameStart = { startFx: number; startFy: number; fromX: number; fromY: number }

export function Canvas(props: {
  frames: CanvasFrame[]
  /** Frames dropped after a drag — several when a selection was moved together. */
  onMove: (moves: { id: string; x: number; y: number }[]) => void
  renderFrame: (id: string) => ReactNode
  /** A plain click on empty canvas (the select tool). */
  onBackgroundClick?: () => void
  /** A rubber-band selection finished; additive when Shift was held. */
  onMarquee?: (ids: string[], additive: boolean) => void
  /** The selected frames; the last one is primary (⇧1 zooms to it, a handle drag moves them all). */
  selectedIds?: string[]
  /** Change this to bring every frame back into view (a generation finished, a screen was added). */
  fitKey?: string | number
  /** Bring one frame to the centre of the view (a screen chip or the screens list was clicked). */
  focus?: { id: string; key: number }
  /** Opens the shortcuts sheet (the `?` key does the same). */
  onShortcuts?: () => void
  /** UI-13: the page's own undo (redo when true), the same one ⌘Z runs. */
  onUndo?: (redo: boolean) => void
  /** UI-21: how much of each edge the floating panels cover; fit and focus centre in what is left. */
  insets?: { top: number; right: number; bottom: number; left: number }
  /** UI-23: the page's own tools on the right rail, under Select and Hand (screens, theme). */
  rail?: ReactNode
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ scale: 1, x: 80, y: 80 })
  // UI-25: a fit, a focus or a zoom button moves the view smoothly; wheel and drag set it directly.
  const [gliding, setGliding] = useState(false)
  const glideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  function glide() {
    setGliding(true)
    clearTimeout(glideTimer.current)
    glideTimer.current = setTimeout(() => setGliding(false), 360)
  }
  // Where a frame was dragged to, ahead of the saved position arriving through props. An entry
  // remembers the props it was dragged from and stops applying once they change (the save landed,
  // or an undo moved the frame back), so props win again without a flicker.
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; fromX: number; fromY: number }>>({})
  // Select (V) or hand (H). With the hand, frames take no pointer at all: pressing anywhere pans and
  // nothing is selected or moved. Holding Space is the hand for as long as it is held.
  const [tool, setTool] = useState<'select' | 'hand'>('select')
  const [spaceHeld, setSpaceHeld] = useState(false)
  const hand = tool === 'hand' || spaceHeld
  // Keyboard: tools and zoom. Re-attached every render so the zoom keys see the current frames and view.
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof Element && e.target.closest('input, textarea, [contenteditable="true"], [role="dialog"], [role="menu"]')
    function down(e: KeyboardEvent) {
      if (typing(e) || e.altKey) return
      const cmd = e.metaKey || e.ctrlKey
      if (cmd && e.key === '0') {
        e.preventDefault()
        fit()
      } else if (cmd && e.key === '1') {
        e.preventDefault()
        zoomCentered(1)
      } else if (cmd) return
      else if (e.shiftKey && e.code === 'Digit1') focusOn(props.selectedIds?.at(-1))
      else if (e.code === 'Space') {
        e.preventDefault() // the page must not scroll
        setSpaceHeld(true)
      } else if (e.key === 'v' || e.key === 'V') setTool('select')
      else if (e.key === 'h' || e.key === 'H') setTool('hand')
    }
    function up(e: KeyboardEvent) {
      if (e.code === 'Space') setSpaceHeld(false)
    }
    const release = () => setSpaceHeld(false) // a Cmd+Tab mid-press never leaves the hand stuck on
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', release)
    }
  })
  const drag = useRef<Drag | null>(null)

  const pos = useCallback(
    (f: CanvasFrame) => {
      const p = positions[f.id]
      return p && p.fromX === f.x && p.fromY === f.y ? { x: p.x, y: p.y } : { x: f.x, y: f.y }
    },
    [positions],
  )
  // Once the props have moved on, the drag is history — forget it, or an undo back to the very
  // position it was dragged from would show the dragged position again.
  useEffect(() => {
    setPositions((prev) => {
      const stale = props.frames.filter((f) => prev[f.id] && (prev[f.id].fromX !== f.x || prev[f.id].fromY !== f.y))
      if (stale.length === 0) return prev
      const next = { ...prev }
      for (const f of stale) delete next[f.id]
      return next
    })
  }, [props.frames])

  // Zoom keeping the (vx, vy) viewport point visually fixed. Takes a functional updater so the
  // native wheel listener below (attached once, never stale) always computes from the latest view.
  function zoomAt(nextScaleRaw: number, vx: number, vy: number) {
    setView((prev) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScaleRaw))
      const worldX = (vx - prev.x) / prev.scale
      const worldY = (vy - prev.y) / prev.scale
      return { scale: nextScale, x: vx - worldX * nextScale, y: vy - worldY * nextScale }
    })
  }

  function zoomCentered(nextScale: number) {
    glide()
    userMoved.current = true
    const el = viewportRef.current
    const rect = el?.getBoundingClientRect()
    zoomAt(nextScale, rect ? rect.width / 2 : 0, rect ? rect.height / 2 : 0)
  }

  // The part of the viewport the floating panels leave free, in viewport coordinates.
  function freeArea() {
    const r = viewportRef.current!.getBoundingClientRect()
    const i = props.insets ?? { top: 0, right: 0, bottom: 0, left: 0 }
    const width = Math.max(200, r.width - i.left - i.right)
    const height = Math.max(200, r.height - i.top - i.bottom)
    return { width, height, cx: i.left + width / 2, cy: i.top + height / 2, top: i.top }
  }

  // `maxScale` lets an automatic fit stop at 100%: one small screen should not be blown up to 200%.
  function fit(maxScale = MAX_SCALE) {
    glide()
    const el = viewportRef.current
    if (!el || props.frames.length === 0) return
    const rect = freeArea()
    const xs = props.frames.map((f) => pos(f).x)
    const ys = props.frames.map((f) => pos(f).y)
    const rights = props.frames.map((f) => pos(f).x + f.width)
    const bottoms = props.frames.map((f) => pos(f).y + f.height)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const w = Math.max(...rights) - minX
    const h = Math.max(...bottoms) - minY
    const next = Math.min(maxScale, Math.max(MIN_SCALE, Math.min(rect.width / w, rect.height / h) * 0.9))
    setView({ scale: next, x: rect.cx - (minX + w / 2) * next, y: rect.cy - (minY + h / 2) * next })
  }

  // A project opens with all of its screens in view, and comes back to that whenever the set of
  // screens changes. It used to open at 100%, showing two and a half of six phone frames.
  const hasFrames = props.frames.length > 0
  const userMoved = useRef(false)
  useEffect(() => {
    if (!hasFrames) return
    userMoved.current = false
    fit(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFrames, props.fitKey])
  // Frames report their real height a moment after they render, which makes the first fit too
  // tight. Follow them — but only until the person pans or zooms; after that the view is theirs.
  const extent = props.frames.reduce((m, f) => Math.max(m, pos(f).y + f.height), 0)
  useEffect(() => {
    if (hasFrames && !userMoved.current) fit(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extent])

  function focusOn(id: string | null | undefined) {
    glide()
    const el = viewportRef.current
    const f = id ? props.frames.find((x) => x.id === id) : undefined
    if (!el || !f) return
    const rect = freeArea()
    const p = pos(f)
    // Whole frame in view, never magnified, and never zoomed out so far that it cannot be read.
    const scale = Math.min(1, Math.max(0.35, Math.min((rect.width * 0.9) / f.width, (rect.height * 0.86) / f.height)))
    userMoved.current = true
    setView({ scale, x: rect.cx - (p.x + f.width / 2) * scale, // room above for the frame's name row and its selection bar (48px on screen)
      y: Math.max(rect.top + 12, rect.cy - (p.y + f.height / 2) * scale) })
  }
  useEffect(() => {
    focusOn(props.focus?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.focus?.key])

  function reset() {
    glide()
    setView({ scale: 1, x: 80, y: 80 })
  }

  // React's onWheel is a passive listener at the root by default, so preventDefault() inside it is
  // silently ignored — the page pinch-zooms underneath the canvas. A native listener with
  // passive: false is the only way to actually stop that. Attached once; setView's functional form
  // means it never reads a stale scale/x/y from a closure.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      userMoved.current = true
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect()
        setView((prev) => {
          const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * (1 - e.deltaY * 0.01)))
          const vx = e.clientX - rect.left
          const vy = e.clientY - rect.top
          const worldX = (vx - prev.x) / prev.scale
          const worldY = (vy - prev.y) / prev.scale
          return { scale: nextScale, x: vx - worldX * nextScale, y: vy - worldY * nextScale }
        })
      } else {
        setView((prev) => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // Empty canvas: the hand pans; the select tool draws a rubber band (a plain click just deselects).
  const [marquee, setMarquee] = useState<Rect | null>(null)
  function onBackgroundPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    drag.current = hand
      ? { mode: 'pan', startX: e.clientX, startY: e.clientY, startTx: view.x, startTy: view.y }
      : { mode: 'marquee', startX: e.clientX, startY: e.clientY, additive: e.shiftKey }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  // Viewport pixels → world (frame) coordinates.
  function toWorld(clientX: number, clientY: number) {
    const r = viewportRef.current!.getBoundingClientRect()
    return { x: (clientX - r.left - view.x) / view.scale, y: (clientY - r.top - view.y) / view.scale }
  }
  function marqueeRect(d: { startX: number; startY: number }, e: { clientX: number; clientY: number }): Rect {
    const a = toWorld(d.startX, d.startY)
    const b = toWorld(e.clientX, e.clientY)
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
  }

  // A frame moves only by its handle (data-canvas-handle, the ⠿ in its toolbar). Pressing anywhere
  // else on it selects it and nothing more — it used to drag from anywhere, so a click that moved a
  // pixel or two moved the screen.
  function onFramePointerDown(id: string, f: CanvasFrame) {
    return (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      if (!(e.target instanceof Element && e.target.closest('[data-canvas-handle]'))) return
      // The whole selection moves with a selected frame's handle; an unselected frame moves alone.
      const group = props.selectedIds?.includes(id) ? props.frames.filter((x) => props.selectedIds!.includes(x.id)) : [f]
      const starts: Record<string, FrameStart> = {}
      for (const g of group) {
        const p = pos(g)
        starts[g.id] = { startFx: p.x, startFy: p.y, fromX: g.x, fromY: g.y }
      }
      drag.current = { mode: 'frame', startX: e.clientX, startY: e.clientY, starts }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.mode === 'pan') {
      userMoved.current = true
      setView((prev) => ({ ...prev, x: d.startTx + dx, y: d.startTy + dy }))
    } else if (d.mode === 'marquee') {
      if (Math.abs(dx) + Math.abs(dy) > 3) setMarquee(marqueeRect(d, e))
    } else {
      // Arranging frames is the person's layout too: the view must not re-fit under a drag.
      userMoved.current = true
      setPositions((prev) => {
        const next = { ...prev }
        for (const [id, s] of Object.entries(d.starts)) next[id] = { x: s.startFx + dx / view.scale, y: s.startFy + dy / view.scale, fromX: s.fromX, fromY: s.fromY }
        return next
      })
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current
    drag.current = null
    if (d?.mode === 'frame') {
      const moves = Object.keys(d.starts).map((id) => ({ id, ...positions[id] })).filter((m) => m.x !== undefined)
      if (moves.length) props.onMove(moves.map((m) => ({ id: m.id, x: m.x, y: m.y })))
    } else if (d?.mode === 'marquee') {
      if (marquee) props.onMarquee?.(framesIn(marqueeRect(d, e), props.frames), d.additive)
      else props.onBackgroundClick?.()
      setMarquee(null)
    }
  }

  // UI-13: zoomed out, the grid doubles its step instead of turning into a grey haze.
  let dotSize = 22 * view.scale
  while (dotSize < 14) dotSize *= 2
  const bg = useMemo(
    () => ({
      backgroundImage: 'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px)',
      backgroundSize: `${dotSize}px ${dotSize}px`,
      backgroundPosition: `${view.x}px ${view.y}px`,
    }),
    [dotSize, view.x, view.y],
  )

  return (
    <div className="relative size-full select-none overflow-hidden bg-canvas [view-transition-name:od-project]" style={gliding ? { ...bg, transition: 'background-position var(--duration-slow) var(--motion-ease-out), background-size var(--duration-slow) var(--motion-ease-out)' } : bg}>
      <div
        ref={viewportRef}
        data-canvas-viewport
        className={cn('absolute inset-0 touch-none', hand ? 'cursor-grab active:cursor-grabbing' : 'cursor-default')}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className={cn('absolute left-0 top-0 origin-top-left', hand && 'pointer-events-none', gliding && 'od-glide')}
          // --canvas-scale lets overlays (the element panel) stay readable at any zoom.
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, ['--canvas-scale' as string]: view.scale }}
        >
          {props.frames.map((f, i) => {
            const p = pos(f)
            return (
              <div
                key={f.id}
                // UI-25: a frame lands when it first appears (staggered on open); later renders do not replay it.
                className="od-land absolute"
                // UI-20: a selected frame's bar and element panel spill over its neighbours; it paints above them.
                style={{ left: p.x, top: p.y, zIndex: props.selectedIds?.includes(f.id) ? 20 : undefined, ['--i' as string]: Math.min(i, 8) }}
                onPointerDown={onFramePointerDown(f.id, f)}
              >
                {props.renderFrame(f.id)}
              </div>
            )
          })}
          {marquee && (
            <div
              className="pointer-events-none absolute border border-ring/60 bg-primary/15"
              style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, borderWidth: 1 / view.scale }}
            />
          )}
        </div>
      </div>

      {/* UI-23: tools on a rail at the right edge, as in Stitch; the page adds its own under them. */}
      <div className="absolute top-1/2 right-3 z-20 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-2">
        <ToolButton label="Select (V)" pressed={!hand} onClick={() => setTool('select')}>
          <MousePointer2 />
        </ToolButton>
        <ToolButton label="Hand (H, or hold Space)" pressed={hand} onClick={() => setTool('hand')}>
          <Hand />
        </ToolButton>
        {props.rail && (
          <>
            <span className="my-0.5 h-px w-5 bg-border" aria-hidden />
            {props.rail}
          </>
        )}
      </div>

      {/* UI-23: history and zoom in the bottom-right corner, out of the screens' way. */}
      <div className="absolute right-3 bottom-3 z-20 flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-2">
        {props.onUndo && (
          <>
            <ToolButton label="Undo (⌘Z)" side="top" onClick={() => props.onUndo!(false)}>
              <Undo2 />
            </ToolButton>
            <ToolButton label="Redo (⇧⌘Z)" side="top" onClick={() => props.onUndo!(true)}>
              <Redo2 />
            </ToolButton>
            <Divider />
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 min-w-14 rounded-lg px-2 text-sm font-medium tabular-nums" aria-label="Zoom">
              {Math.round(view.scale * 100)}%
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-44">
            <DropdownMenuItem onSelect={() => zoomCentered(view.scale + 0.1)}>
              <Plus /> Zoom in
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => zoomCentered(view.scale - 0.1)}>
              <Minus /> Zoom out
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => fit()}>
              <Maximize /> Zoom to fit <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={reset}>Reset view</DropdownMenuItem>
            <DropdownMenuSeparator />
            {ZOOM_PRESETS.map((p) => (
              <DropdownMenuItem key={p} onSelect={() => zoomCentered(p / 100)}>
                {p}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {props.onShortcuts && (
          <ToolButton label="Keyboard shortcuts (?)" side="top" onClick={props.onShortcuts}>
            <Keyboard />
          </ToolButton>
        )}
      </div>
    </div>
  )
}

/** UI-23: a button on the canvas's right rail, for the page's own tools. */
export function RailButton(props: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return <ToolButton {...props} />
}

function ToolButton(props: { label: string; pressed?: boolean; side?: 'left' | 'top'; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('rounded-lg text-muted-foreground hover:text-foreground', props.pressed && 'bg-muted text-foreground')}
          onClick={props.onClick}
          aria-label={props.label}
          aria-pressed={props.pressed}
        >
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={props.side ?? 'left'}>{props.label}</TooltipContent>
    </Tooltip>
  )
}

const Divider = () => <div className="mx-1 h-5 w-px bg-border" />
