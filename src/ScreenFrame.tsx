import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { frameSize } from './canvas'
import { cn } from '@/lib/utils'
import { themeMessage, withLiveTheme, type Theme } from '@/lib/theme-override'
import { parseHeightMessage, withHeightProbe } from '@/lib/frame-height'
import { annotateElements } from '@/lib/element-ops'
import { parseRect, safeElementId, withEditBridge, type BridgeRect } from '@/lib/edit-bridge'
import { AUDIT_BRIDGE, parseAudit, type AuditFinding } from '@/lib/render-audit'

// Renders at native device width; the height grows to fit the screen (see lib/frame-height.ts).
// The canvas's own transform handles zoom.
//
// A saved screen always carries the edit bridge (lib/edit-bridge.ts) and is switched between
// "look" and "edit" by message, so selecting it never reloads the frame.
export function ScreenFrame(props: {
  html: string
  title: string
  device: string
  hint?: string
  selected?: boolean
  /** False when other screens are selected too: the frame shows the ring but does not take the pointer. */
  solo?: boolean
  streaming?: boolean
  theme?: Theme
  label?: ReactNode
  /** Identifies this frame in height messages; omit to keep the frame at the device height. */
  frameId?: string
  /** Last known content height, so the frame opens at the right size instead of jumping. */
  height?: number
  onHeight?: (frameId: string, height: number) => void
  /** The selected element of this (selected) screen. */
  selectedElementId?: string | null
  onSelectElement?: (elementId: string | null) => void
  /** Resolves false when the edit was refused, so the frame puts the old text back. */
  onTextEdit?: (elementId: string, text: string) => Promise<boolean>
  onEscape?: () => void
  /** Cmd+Z (redo: Shift+Cmd+Z) pressed inside the frame. */
  onUndo?: (redo: boolean) => void
  /** What the render audit found once the screen settled (lib/render-audit.ts, EYE-01). */
  onAudit?: (findings: AuditFinding[]) => void
  /** Floating panel shown under the selected element. */
  panel?: ReactNode
  /** Start editing the selected element's text in place (a panel button); bump `key` to repeat. */
  editRequest?: { elementId: string; key: number }
}) {
  const f = frameSize(props.device)
  const height = Math.max(f.height, props.height ?? f.height)
  // A new srcdoc reloads the iframe, so a streaming preview refreshes at most every 600ms
  const rawHtml = useThrottled(props.html, props.streaming ? 600 : 0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [rect, setRect] = useState<BridgeRect | null>(null)
  const editable = Boolean(props.frameId) && !props.streaming
  const active = editable && Boolean(props.selected) && props.solo !== false

  // The srcDoc carries the theme as it was when the HTML last changed. Later theme edits are
  // pushed into the running frame instead, so dragging a colour never reloads it.
  const themeRef = useRef(props.theme)
  themeRef.current = props.theme
  const themedHtml = useMemo(() => {
    if (!rawHtml) return rawHtml
    // The same annotation the server applies before an element edit, so both see the same ids.
    const base = editable ? annotateElements(rawHtml) : rawHtml
    const themed = withLiveTheme(base, themeRef.current)
    return editable ? withEditBridge(withHeightProbe(themed, props.frameId!, f.height)).replace('</body>', `${AUDIT_BRIDGE}</body>`) : themed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawHtml, editable, props.frameId, f.height])

  function send(message: unknown) {
    iframeRef.current?.contentWindow?.postMessage(message, '*')
  }
  function pushTheme() {
    send(themeMessage(themeRef.current))
  }
  function pushMode() {
    if (editable) send({ type: 'od:mode', active, selectedId: active ? (props.selectedElementId ?? null) : null })
  }
  useEffect(pushTheme, [props.theme])
  useEffect(() => {
    if (!active || !props.selectedElementId) setRect(null)
    pushMode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, props.selectedElementId])
  useEffect(() => {
    if (props.editRequest) send({ type: 'od:start_edit', elementId: props.editRequest.elementId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.editRequest?.key])

  const latest = useRef(props)
  latest.current = props
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // Every frame on the canvas listens on the same window. Without this check each of them
      // answered every frame's message, so picking an element in one screen selected another.
      if (e.source !== iframeRef.current?.contentWindow) return
      const d = e.data
      const p = latest.current
      if (d?.type === 'od:select_element') {
        const id = safeElementId(d.elementId)
        setRect(id ? parseRect(d.rect) : null)
        p.onSelectElement?.(id)
      } else if (d?.type === 'od:selected_rect') {
        if (safeElementId(d.elementId) === p.selectedElementId) setRect(parseRect(d.rect))
      } else if (d?.type === 'od:text_edit') {
        const id = safeElementId(d.elementId)
        if (!id || typeof d.text !== 'string' || !p.onTextEdit) return
        p.onTextEdit(id, d.text.slice(0, 2000)).then((ok) => {
          if (!ok) send({ type: 'od:cancel_edit', elementId: id })
        })
      } else if (d?.type === 'od:escape') {
        p.onEscape?.()
      } else if (d?.type === 'od:undo') {
        p.onUndo?.(d.redo === true)
      } else if (d?.type === 'od:audit') {
        p.onAudit?.(parseAudit(d.findings))
      } else if (d?.type === 'od:wheel') {
        forwardWheel(iframeRef.current, d)
      } else {
        const reported = p.onHeight ? parseHeightMessage(d, f.height) : null
        if (reported) p.onHeight!(reported.frameId, reported.height)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [f.height])

  return (
    <figure className="group relative" style={{ width: f.width }}>
      {props.label ?? (
        <figcaption
          className="mb-2 flex items-center gap-1.5 truncate text-sm font-medium text-muted-foreground"
          title={props.hint}
        >
          {props.streaming && <span className="size-2 shrink-0 animate-ping rounded-full bg-primary" />}
          {props.title}
        </figcaption>
      )}

      <div className="relative">
        <div
          className={cn(
            'overflow-hidden rounded-xl border bg-white shadow-sm transition-all',
            props.selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
            props.streaming && 'ring-2 ring-primary/40'
          )}
          style={{ width: f.width, height }}
        >
          <iframe
            ref={iframeRef}
            onLoad={() => {
              pushTheme()
              pushMode()
            }}
            title={props.title}
            srcDoc={themedHtml}
            sandbox="allow-scripts"
            // Only the selected screen takes the pointer; the others stay whole objects to click and drag.
            className={cn('size-full', active ? 'pointer-events-auto' : 'pointer-events-none')}
            style={{ width: f.width, height }}
          />
        </div>

        {active && rect && props.panel && (
          <div
            className="absolute z-20"
            // Kept at screen size whatever the canvas zoom (Canvas sets --canvas-scale).
            style={{ left: Math.max(0, Math.min(rect.x, f.width - 40)), top: rect.y + rect.h + 8, transformOrigin: 'top left', transform: 'scale(calc(1 / var(--canvas-scale, 1)))' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {props.panel}
          </div>
        )}
      </div>
    </figure>
  )
}

// The selected frame receives the wheel; replay it on the canvas viewport so pan and zoom keep working.
function forwardWheel(iframe: HTMLIFrameElement | null, d: Record<string, unknown>) {
  const viewport = iframe?.closest('[data-canvas-viewport]')
  if (!iframe || !viewport) return
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-5000, Math.min(5000, v)) : 0)
  const r = iframe.getBoundingClientRect()
  const scale = iframe.offsetWidth ? r.width / iframe.offsetWidth : 1
  viewport.dispatchEvent(
    new WheelEvent('wheel', {
      deltaX: num(d.deltaX),
      deltaY: num(d.deltaY),
      ctrlKey: d.ctrlKey === true,
      metaKey: d.metaKey === true,
      clientX: r.left + num(d.clientX) * scale,
      clientY: r.top + num(d.clientY) * scale,
      bubbles: true,
      cancelable: true,
    }),
  )
}

function useThrottled<T>(value: T, ms: number) {
  const [out, setOut] = useState(value)
  const last = useRef(0)
  useEffect(() => {
    if (ms <= 0) {
      setOut(value)
      return
    }
    const t = setTimeout(
      () => {
        last.current = Date.now()
        setOut(value)
      },
      Math.max(0, last.current + ms - Date.now()),
    )
    return () => clearTimeout(t)
  }, [value, ms])
  return out
}
