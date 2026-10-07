import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Smartphone } from 'lucide-react'
import { frameSize } from './canvas'
import { cn } from '@/lib/utils'
import { hash } from '@/lib/hash'
import type { AppTheme } from '@/lib/app-theme'
import { parseTree, type ODTree } from '@/lib/figma-serialize'
import { installStateBus } from '@/lib/app-state-bus'

// KON-00: a screen is a Konsta component compiled on the server; the frame only points at the page it
// runs in (/api/thumb/$id, sandboxed, CSP sandbox). `r` is the source's hash, so a new version is a new
// URL and the private 60 s cache never shows a stale screen. The look is not in the URL: a theme switch is
// posted into the running page (od:look) and re-rendered there — changing the URL reloaded every frame.
export const screenSrc = (id: string, html: string) => `/api/thumb/${id}?r=${hash(html).toString(36)}`
// FIG-10: frames that can hand over their layer tree, by screen id, and the replies still awaited.
const serializers = new Map<string, () => Promise<ODTree>>()
const waits = new Map<string, { resolve: (t: ODTree) => void; reject: (e: Error) => void }>()
/** A screen's rendered layer tree, read inside its frame by the kit (Copy to Figma). */
export function serializeScreen(screenId: string): Promise<ODTree> {
  const run = serializers.get(screenId)
  return run ? run() : Promise.reject(new Error('Show the screen on the canvas first'))
}

/** Tells a running screen the app's look; the kit's mount re-renders in place. */
export const postLook = (w: Window | null | undefined, t: AppTheme, insets?: { top: number; bottom: number }) =>
  w?.postMessage({ type: 'od:look', accent: t.accent, dark: t.dark, platform: t.platform, style: t.style, insets: insets ?? null }, '*')

export type NavMessage = { action: 'push' | 'pop' | 'reset'; id?: string; params?: Record<string, string | number | boolean | null> }

/** A frame's reported content height, clamped: never shorter than the phone, never absurdly long. */
export function parseHeight(d: unknown, min: number): number | null {
  const m = d as { type?: unknown; height?: unknown } | null
  if (!m || m.type !== 'od:height' || typeof m.height !== 'number' || !Number.isFinite(m.height)) return null
  return Math.round(Math.min(5000, Math.max(min, m.height)))
}
/** A frame's `od:nav` message, validated: anything a frame posts is untrusted. */
export function parseNav(d: unknown): NavMessage | null {
  const m = d as { type?: unknown; action?: unknown; id?: unknown } | null
  if (!m || m.type !== 'od:nav' || (m.action !== 'push' && m.action !== 'pop' && m.action !== 'reset')) return null
  if (m.action === 'pop') return { action: 'pop' }
  if (typeof m.id !== 'string' || !/^[a-z0-9-]{1,60}$/i.test(m.id)) return null
  const params = parseParams((m as { params?: unknown }).params)
  return params ? { action: m.action, id: m.id, params } : { action: m.action, id: m.id }
}

/** FUN-02: what a push carries to the screen it opens (`nav.push('habit', { id })`) — a few plain values, else none. */
export function parseParams(p: unknown): NavMessage['params'] | undefined {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return undefined
  const out: NonNullable<NavMessage['params']> = {}
  for (const [k, v] of Object.entries(p).slice(0, 12)) {
    if (!/^[a-zA-Z_][\w]{0,30}$/.test(k)) continue
    if (v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v
    else if (typeof v === 'string') out[k] = v.slice(0, 200)
  }
  return Object.keys(out).length ? out : undefined
}

/** Which screen a nav message leads to: a slug, or a tab id (its root screen). */
export function screenForNav<T extends { slug: string | null; screenType: string | null; activeTabId: string | null }>(screens: T[], id: string): T | undefined {
  return screens.find((s) => s.slug === id) ?? screens.find((s) => s.screenType === 'root-tab' && s.activeTabId === id)
}

/** REG-02: the element a person picked in a frame — where it is in the source, what it looks like, its text. */
export type PickedElement = { loc: string; kind: string; text: string }
/** A picked message from the page, trusted only in shape: a loc is two offsets, the rest short text. */
export function parsePicked(d: { loc?: unknown; kind?: unknown; text?: unknown }): PickedElement | null {
  if (typeof d.loc !== 'string' || !/^\d{1,6}:\d{1,6}$/.test(d.loc)) return null
  return { loc: d.loc, kind: typeof d.kind === 'string' ? d.kind.slice(0, 20) : 'Element', text: typeof d.text === 'string' ? d.text.slice(0, 40) : '' }
}

export function ScreenFrame(props: {
  screenId: string
  html: string
  title: string
  device: string
  /** The app's look (accent, light/dark, iOS/Android) — the app's, not the studio's. */
  theme: AppTheme
  hint?: string
  selected?: boolean
  /** False when other screens are selected too: the frame shows the ring but does not take the pointer. */
  solo?: boolean
  /** Being redrawn: the old screen stays under a shimmer. */
  busy?: boolean
  label?: ReactNode
  onNav?: (nav: NavMessage) => void
  /** Last known content height (stored on the screen), so the frame opens at its length. */
  height?: number
  /** The page measured its content; the canvas lays the frame out at that height and saves it. */
  onHeight?: (height: number) => void
  /** REG-02: pick one element in this screen; the kit answers with its place in the source (null = cancelled). */
  picking?: boolean
  onPick?: (p: PickedElement | null) => void
}) {
  const f = frameSize(props.device)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  useEffect(installStateBus, []) // FUN-01: the app's frames share one store
  const active = Boolean(props.selected) && props.solo !== false
  const latest = useRef(props)
  latest.current = props
  const height = Math.max(f.height, props.height ?? f.height)
  const src = screenSrc(props.screenId, props.html)
  // Each version is measured from a phone-tall viewport, then grown: measured inside an already tall frame,
  // a screen that fills its page (min-h-full) would report the old height and never shrink after an edit.
  const [measured, setMeasured] = useState<{ src: string; h: number } | null>(null)
  const srcRef = useRef(src)
  srcRef.current = src
  const iframeHeight = measured?.src === src ? measured.h : f.height
  // Until this version has drawn itself (its first height report), the frame wears the generating veil.
  const ready = measured?.src === src
  useEffect(() => postLook(iframeRef.current?.contentWindow, props.theme), [props.theme])
  // Until this version has reported its height, ask for it (od:measure) once a second: a report the page sent
  // before this frame was listening would otherwise leave the frame under its veil.
  useEffect(() => {
    if (ready) return
    const t = setInterval(() => iframeRef.current?.contentWindow?.postMessage({ type: 'od:measure' }, '*'), 1000)
    return () => clearInterval(t)
  }, [ready, src])
  // REG-02: picking is switched in the running page, and again whenever the page (re)loads.
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'od:pick', on: Boolean(props.picking) }, '*')
  }, [props.picking, ready])
  useEffect(() => {
    const id = props.screenId
    serializers.set(id, () => {
      const requestId = Math.random().toString(36).slice(2)
      return new Promise<ODTree>((resolve, reject) => {
        waits.set(requestId, { resolve, reject })
        setTimeout(() => waits.delete(requestId) && reject(new Error('The screen did not answer')), 8000)
        iframeRef.current?.contentWindow?.postMessage({ type: 'od:serialize', requestId }, '*')
      })
    })
    return () => void serializers.delete(id)
  }, [props.screenId])
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Every frame listens on the same window; only this frame's own messages count.
      if (e.source !== iframeRef.current?.contentWindow) return
      const nav = parseNav(e.data)
      if (nav) return latest.current.onNav?.(nav)
      if (e.data?.type === 'od:picked') return latest.current.onPick?.(parsePicked(e.data))
      if (e.data?.type === 'od:serialized' && typeof e.data.requestId === 'string') {
        const wait = waits.get(e.data.requestId)
        if (!wait) return
        waits.delete(e.data.requestId)
        const tree = parseTree(e.data.tree)
        return tree ? wait.resolve(tree) : wait.reject(new Error(typeof e.data.error === 'string' ? e.data.error.slice(0, 200) : 'The screen could not be read'))
      }
      const h = parseHeight(e.data, f.height)
      if (!h) return
      setMeasured({ src: srcRef.current, h })
      latest.current.onHeight?.(h)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [f.height])

  return (
    <figure className="group relative" style={{ width: f.width }}>
      <FrameLabel width={f.width} free={Boolean(props.label) && active}>
        {props.label ?? (
          <figcaption className="flex h-7 items-center gap-1.5 text-md font-medium text-muted-foreground" title={props.hint}>
            <span className="shrink-0 [&_svg]:size-3.5"><Smartphone /></span>
            <span className="truncate">{props.title}</span>
          </figcaption>
        )}
      </FrameLabel>
      <div
        className="od-frame relative overflow-hidden bg-card shadow-phone transition-shadow duration-(--duration-base) ease-out"
        data-selected={props.selected || undefined}
        style={{ width: f.width, height, borderRadius: 'var(--radius-phone)' }}
      >
        <iframe
          ref={iframeRef}
          title={props.title}
          src={src}
          sandbox="allow-scripts"
          onLoad={() => postLook(iframeRef.current?.contentWindow, latest.current.theme)}
          // Only the selected screen takes the pointer; the others stay whole objects to click and drag.
          className={cn('block w-full border-0', active ? 'pointer-events-auto' : 'pointer-events-none')}
          style={{ height: iframeHeight }}
        />
        <GeneratingVeil show={Boolean(props.busy) || !ready} mode={props.busy ? 'edit' : 'load'} accent={props.theme.accent} name={props.title} />
      </div>
    </figure>
  )
}

/** UI-30: what a frame shows while it works. `draw` — nothing yet, over the skeleton: a light in the app's accent
 *  sweeps down and the edge breathes, no blur. `edit` — the screen stays visible, lightly dimmed, under the same
 *  light. `load` — the page is still starting: one light blur that resolves when it is ready. */
/** UI-32: a frame at work. Drawing — the screen's blocks gather one after another, with a line saying what is
 *  happening; editing — the screen stays in view, lightly dimmed, under the same line; loading — a quick fade, no blur.
 *  (A drifting aurora behind the blocks was tried and dropped: the owner found it ugly.) */
export function GeneratingVeil(props: { show: boolean; mode?: 'draw' | 'edit' | 'load'; accent?: string; name?: string }) {
  const mode = props.mode ?? 'load'
  return (
    <div aria-hidden className="od-gen z-10" data-show={props.show || undefined} data-mode={mode} style={props.accent ? ({ '--gen-accent': props.accent } as CSSProperties) : undefined}>
      <div className="od-gen-dim" />
      {mode === 'edit' && props.show && <WorkLine steps={[`Updating ${props.name ?? 'the screen'}`, 'Checking every tap']} />}
    </div>
  )
}

/** The line under a frame at work: what is being done, one step after another, with a caret. */
function WorkLine({ steps }: { steps: string[] }) {
  const [k, setK] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setK((x) => x + 1), 2400)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="od-workline">
      <span key={k % steps.length} className="od-workline-text">{steps[k % steps.length]}</span>
    </div>
  )
}

/** UI-13: the name row above a frame, kept at screen size whatever the zoom and never wider than the frame. */
export function FrameLabel(props: { width: number; children: ReactNode; free?: boolean }) {
  return (
    <div
      // UI-20: a selected frame's bar is as wide as its buttons, not as the frame looks at this zoom.
      className={cn('@container absolute bottom-full left-0 origin-bottom-left', props.free ? 'z-30 pb-2' : 'pb-1.5')}
      style={{ width: props.free ? 'max-content' : `calc(${props.width}px * var(--canvas-scale, 1))`, transform: 'scale(calc(1 / var(--canvas-scale, 1)))' }}
    >
      {props.children}
    </div>
  )
}

/** UI-13 / UI-32: a slot with nothing to show yet — the screen's blocks gather one after another, and a line says what
 *  is being drawn. */
export function ScreenSkeleton(props: { className?: string; style?: CSSProperties; accent?: string; name?: string }) {
  let n = 0
  const i = (style: CSSProperties, className?: string) => <i className={className} style={{ ...style, '--i': n++ } as CSSProperties} />
  return (
    <div className={cn('od-skel pointer-events-none absolute inset-0 overflow-hidden bg-card', props.className)} style={{ ...props.style, ...(props.accent ? { '--gen-accent': props.accent } : {}) } as CSSProperties} aria-hidden>
      <div className="relative flex h-full flex-col gap-3.5 px-5 pt-14 pb-6">
      {i({ height: 14, width: '38%' })}
      {i({ height: 30, width: '70%' })}
      {i({ height: 150, borderRadius: 20 })}
      <div className="flex gap-3">
        {i({ height: 64, flex: 1 })}
        {i({ height: 64, flex: 1 })}
      </div>
      {i({ height: 14, width: '30%', marginTop: 6 })}
      {[0, 1, 2].map((k) => (
        <div key={k} className="flex items-center gap-3">
          {i({ height: 44, width: 44, borderRadius: 14 })}
          <div className="flex flex-1 flex-col gap-2">
            {i({ height: 12, width: '65%' })}
            {i({ height: 10, width: '40%' })}
          </div>
        </div>
      ))}
      {i({ height: 56, borderRadius: 28 }, 'mt-auto')}
      </div>
      <WorkLine steps={[`Laying out ${props.name ?? 'the screen'}`, 'Filling in the content', 'Checking every tap']} />
    </div>
  )
}
