import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
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
  const [scale, setScale] = useState(1)
  const [t, setT] = useState({ x: 80, y: 80 })
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const drag = useRef<Drag | null>(null)

  const pos = useCallback((f: CanvasFrame) => positions[f.id] ?? { x: f.x, y: f.y }, [positions])

  // Zoom keeping the (vx, vy) viewport point visually fixed. Reads current scale/t directly —
  // called only from synchronous event handlers, never queued behind another pending update.
  function zoomAt(nextScaleRaw: number, vx: number, vy: number) {
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScaleRaw))
    const worldX = (vx - t.x) / scale
    const worldY = (vy - t.y) / scale
    setScale(nextScale)
    setT({ x: vx - worldX * nextScale, y: vy - worldY * nextScale })
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
    setScale(next)
    setT({ x: rect.width / 2 - (minX + w / 2) * next, y: rect.height / 2 - (minY + h / 2) * next })
  }

  function reset() {
    setScale(1)
    setT({ x: 80, y: 80 })
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const rect = viewportRef.current!.getBoundingClientRect()
      zoomAt(scale * (1 - e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top)
    } else {
      setT((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
    }
  }

  function onBackgroundPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    props.onBackgroundClick?.()
    drag.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, startTx: t.x, startTy: t.y }
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
      setT({ x: d.startTx + dx, y: d.startTy + dy })
    } else {
      setPositions((prev) => ({ ...prev, [d.id]: { x: d.startFx + dx / scale, y: d.startFy + dy / scale } }))
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

  const dotSize = 22 * scale
  const bg = useMemo(
    () => ({
      backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
      backgroundSize: `${dotSize}px ${dotSize}px`,
      backgroundPosition: `${t.x}px ${t.y}px`,
    }),
    [dotSize, t.x, t.y],
  )

  return (
    <div className="relative size-full select-none overflow-hidden bg-muted/30" style={bg}>
      <div
        ref={viewportRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${scale})` }}
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
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => zoomCentered(scale - 0.1)}>
            <Minus className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 min-w-14 rounded-full px-2 text-xs tabular-nums">
                {Math.round(scale * 100)}%
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
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => zoomCentered(scale + 0.1)}>
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
