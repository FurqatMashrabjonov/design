import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { frameSize } from './canvas'
import { cn } from '@/lib/utils'
import { applyThemeOverride, themeMessage, withLiveTheme, type Theme } from '@/lib/theme-override'
import { repairPartialHtml } from '@/lib/partial-html'
import { STREAM_MESSAGE, streamFrameDoc } from '@/lib/stream-frame'
import { SERIALIZE_BRIDGE, parseTree, type ODTree } from '@/lib/figma-serialize'
import { clampFrameHeight, parseHeightMessage, withHeightProbe } from '@/lib/frame-height'
import { annotateElements } from '@/lib/element-ops'
import { parseRect, safeElementId, withEditBridge, type BridgeRect } from '@/lib/edit-bridge'
import { AUDIT_BRIDGE, parseAudit, type AuditFinding } from '@/lib/render-audit'

// Renders at native device width; the height grows to fit the screen (see lib/frame-height.ts).
// The canvas's own transform handles zoom.
//
// A saved screen always carries the edit bridge (lib/edit-bridge.ts) and is switched between
// "look" and "edit" by message, so selecting it never reloads the frame.
// FIG-01: frames that can hand over their layer tree, by frame id, and replies still awaited.
const serializers = new Map<string, () => Promise<ODTree>>()
const serializeWaits = new Map<string, { resolve: (t: ODTree) => void; reject: (e: Error) => void }>()
/** The rendered screen's layer tree, read inside its frame (lib/figma-serialize.ts). */
export function serializeScreen(frameId: string): Promise<ODTree> {
  const run = serializers.get(frameId)
  return run ? run() : Promise.reject(new Error('Open the screen on the canvas first'))
}

export function ScreenFrame(props: {
  html: string
  title: string
  device: string
  hint?: string
  selected?: boolean
  /** False when other screens are selected too: the frame shows the ring but does not take the pointer. */
  solo?: boolean
  streaming?: boolean
  /** Photo URLs by slot query, found while the screen streams (LP-06). */
  photos?: Record<string, string>
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
  const height0 = Math.max(f.height, props.height ?? f.height)
  // While streaming, updates are posted into a frame opened once (LP-02); 300ms is what the eye
  // needs and what Tailwind's JIT keeps up with.
  const rawHtml = useThrottled(props.html, props.streaming ? 300 : 0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [rect, setRect] = useState<BridgeRect | null>(null)
  const editable = Boolean(props.frameId) && !props.streaming
  const active = editable && Boolean(props.selected) && props.solo !== false

  // The srcDoc carries the theme as it was when the HTML last changed. Later theme edits are
  // pushed into the running frame instead, so dragging a colour never reloads it.
  const themeRef = useRef(props.theme)
  themeRef.current = props.theme
  // A half-written screen is repaired and gets no scripts at all (LP-01): appended to a cut
  // document, a script prints as text. It is posted into the stream frame, never set as srcdoc.
  const streamHtml = useMemo(() => (props.streaming && rawHtml ? applyThemeOverride(repairPartialHtml(rawHtml), themeRef.current) : ''), [rawHtml, props.streaming]) // eslint-disable-line react-hooks/exhaustive-deps
  const streamReady = useRef(false)
  const streamRef = useRef<HTMLIFrameElement>(null)
  const streamDoc = useMemo(streamFrameDoc, [])
  const sendStream = (m: unknown) => streamRef.current?.contentWindow?.postMessage(m, '*')
  useEffect(() => {
    if (props.streaming && streamReady.current && streamHtml) sendStream({ type: STREAM_MESSAGE, html: streamHtml })
  }, [streamHtml, props.streaming])
  useEffect(() => {
    if (props.streaming && streamReady.current && props.photos) sendStream({ type: STREAM_MESSAGE, photos: props.photos })
  }, [props.photos, props.streaming])
  // LP-04: when streaming ends, the finished screen loads in a frame underneath while the streamed
  // one stays on top, then fades out — the swap to the real document is never seen as a reload.
  const [handoff, setHandoff] = useState(false)
  const [fading, setFading] = useState(false)
  const wasStreaming = useRef(props.streaming)
  useEffect(() => {
    if (wasStreaming.current && !props.streaming) setHandoff(true)
    wasStreaming.current = props.streaming
  }, [props.streaming])
  const showStream = props.streaming || handoff
  // LP-06: the frame grows with its content while it streams, instead of jumping at the end.
  const [streamHeight, setStreamHeight] = useState(0)
  const height = props.streaming || handoff ? Math.max(height0, streamHeight) : height0
  useEffect(() => {
    if (!props.streaming) return
    // The runtime says when it is listening; a message sent before that is lost.
    const onReady = (e: MessageEvent) => {
      if (e.source !== streamRef.current?.contentWindow) return
      if (e.data?.type === `${STREAM_MESSAGE}:height`) {
        const h = clampFrameHeight(e.data.height, f.height)
        if (h) {
          setStreamHeight(h)
          if (props.frameId) props.onHeight?.(props.frameId, h)
        }
        return
      }
      if (e.data?.type !== `${STREAM_MESSAGE}:ready`) return
      streamReady.current = true
      if (streamHtml) sendStream({ type: STREAM_MESSAGE, html: streamHtml, photos: props.photos ?? {} })
    }
    window.addEventListener('message', onReady)
    return () => window.removeEventListener('message', onReady)
  }, [props.streaming, streamHtml]) // eslint-disable-line react-hooks/exhaustive-deps
  const themedHtml = useMemo(() => {
    if (props.streaming || !rawHtml) return ''
    // The same annotation the server applies before an element edit, so both see the same ids.
    // Photos load at once on the canvas: a lazy photo popped in after the streamed frame faded out.
    // Removed after annotation, so element ids are computed from exactly what the server sees.
    const base = (editable ? annotateElements(rawHtml) : rawHtml).replace(/\sloading="lazy"/g, '')
    const themed = withLiveTheme(base, themeRef.current)
    return editable ? withEditBridge(withHeightProbe(themed, props.frameId!, f.height)).replace('</body>', `${AUDIT_BRIDGE}${SERIALIZE_BRIDGE}</body>`) : themed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawHtml, editable, props.streaming, props.frameId, f.height])

  function send(message: unknown) {
    iframeRef.current?.contentWindow?.postMessage(message, '*')
  }
  function pushTheme() {
    send(themeMessage(themeRef.current))
  }
  function pushMode() {
    if (editable) send({ type: 'od:mode', active, selectedId: active ? (props.selectedElementId ?? null) : null })
  }
  // FIG-01: another part of the editor asks for this screen's layer tree by frame id.
  useEffect(() => {
    if (!props.frameId || props.streaming) return
    const id = props.frameId
    serializers.set(id, () => {
      const requestId = Math.random().toString(36).slice(2)
      return new Promise<ODTree>((resolve, reject) => {
        serializeWaits.set(requestId, { resolve, reject })
        setTimeout(() => serializeWaits.delete(requestId) && reject(new Error('The screen did not answer')), 8000)
        send({ type: 'od:serialize', requestId })
      })
    })
    return () => void serializers.delete(id)
  }, [props.frameId, props.streaming])
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
      } else if (d?.type === 'od:serialized') {
        const wait = serializeWaits.get(d.requestId)
        if (wait) {
          serializeWaits.delete(d.requestId)
          const tree = parseTree(d.tree)
          if (tree) wait.resolve(tree)
          else wait.reject(new Error(d.error || 'The screen could not be read'))
        }
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
            'relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all',
            props.selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
            props.streaming && 'od-stream-ring'
          )}
          style={{ width: f.width, height }}
        >
          {!props.streaming && (
            <iframe
              key="main"
              ref={iframeRef}
              onLoad={() => {
                pushTheme()
                pushMode()
                if (handoff) setTimeout(() => setFading(true), 250) // fonts and photos settle first
              }}
              title={props.title}
              srcDoc={themedHtml}
              sandbox="allow-scripts"
              // Only the selected screen takes the pointer; the others stay whole objects to click and drag.
              className={cn('size-full', active ? 'pointer-events-auto' : 'pointer-events-none')}
              style={{ width: f.width, height }}
            />
          )}
          {showStream && (
            <iframe
              key="stream"
              ref={streamRef}
              title={props.title}
              srcDoc={streamDoc}
              sandbox="allow-scripts"
              aria-hidden={!props.streaming}
              className="pointer-events-none absolute inset-0 size-full transition-opacity duration-300"
              style={{ width: f.width, height, opacity: fading ? 0 : 1 }}
              onTransitionEnd={() => {
                if (!fading) return
                setHandoff(false)
                setFading(false)
              }}
            />
          )}
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
