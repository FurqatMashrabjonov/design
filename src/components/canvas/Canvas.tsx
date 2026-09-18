import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus, RotateCcw, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type CanvasFrame = { id: string; x: number; y: number; width: number; height: number }

const MIN_SCALE = 0.1
const MAX_SCALE = 2
const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200]

type Drag =
  | { mode: 'pan'; startX: number; startY: number; startTx: number; startTy: number }
  | { mode: 'frame'; id: string; startX: number; startY: number; startFx: number; startFy: number }

export function Canvas(props: {
  frames: CanvasFrame[]
  onMove: (id: string, x: number, y: number) => void
  renderFrame: (id: string) => ReactNode
  onBackgroundClick?: () => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ scale: 1, x: 80, y: 80 })
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const drag = useRef<Drag | null>(null)

  const pos = useCallback((f: CanvasFrame) => positions[f.id] ?? { x: f.x, y: f.y }, [positions])

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
    const el = viewportRef.current
    const rect = el?.getBoundingClientRect()
    zoomAt(nextScale, rect ? rect.width / 2 : 0, rect ? rect.height / 2 : 0)
  }

  function fit() {
    const el = viewportRef.current
    if (!el || props.frames.length === 0) return
    const rect = el.getBoundingClientRect()
    const xs = props.frames.map((f) => pos(f).x)
    const ys = props.frames.map((f) => pos(f).y)
    const rights = props.frames.map((f) => pos(f).x + f.width)
    const bottoms = props.frames.map((f) => pos(f).y + f.height)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const w = Math.max(...rights) - minX
    const h = Math.max(...bottoms) - minY
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(rect.width / w, rect.height / h) * 0.85))
    setView({ scale: next, x: rect.width / 2 - (minX + w / 2) * next, y: rect.height / 2 - (minY + h / 2) * next })
  }

  function reset() {
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

  function onBackgroundPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    props.onBackgroundClick?.()
    drag.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, startTx: view.x, startTy: view.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onFramePointerDown(id: string, f: CanvasFrame) {
    return (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      const p = pos(f)
      drag.current = { mode: 'frame', id, startX: e.clientX, startY: e.clientY, startFx: p.x, startFy: p.y }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.mode === 'pan') {
      setView((prev) => ({ ...prev, x: d.startTx + dx, y: d.startTy + dy }))
    } else {
      setPositions((prev) => ({ ...prev, [d.id]: { x: d.startFx + dx / view.scale, y: d.startFy + dy / view.scale } }))
    }
  }

  function onPointerUp() {
    const d = drag.current
    drag.current = null
    if (d?.mode === 'frame') {
      const p = positions[d.id]
      if (p) props.onMove(d.id, p.x, p.y)
    }
  }

  const dotSize = 22 * view.scale
  const bg = useMemo(
    () => ({
      backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
      backgroundSize: `${dotSize}px ${dotSize}px`,
      backgroundPosition: `${view.x}px ${view.y}px`,
    }),
    [dotSize, view.x, view.y],
  )

  return (
    <div className="relative size-full select-none overflow-hidden bg-muted/30" style={bg}>
      <div
        ref={viewportRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {props.frames.map((f) => {
            const p = pos(f)
            return (
              <div
                key={f.id}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{ left: p.x, top: p.y }}
                onPointerDown={onFramePointerDown(f.id, f)}
              >
                {props.renderFrame(f.id)}
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-5 flex justify-center">
        <div className="flex items-center gap-1 rounded-full border bg-background/95 p-1 shadow-md backdrop-blur">
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => zoomCentered(view.scale - 0.1)}>
            <Minus className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 min-w-14 rounded-full px-2 text-xs tabular-nums">
                {Math.round(view.scale * 100)}%
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {ZOOM_PRESETS.map((p) => (
                <DropdownMenuItem key={p} onSelect={() => zoomCentered(p / 100)}>
                  {p}%
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => zoomCentered(view.scale + 0.1)}>
            <Plus className="size-4" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={reset} title="Reset view">
            <RotateCcw className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={fit} title="Fit to screen">
            <Maximize className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
