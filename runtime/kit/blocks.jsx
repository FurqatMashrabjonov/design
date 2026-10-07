// KIT-20: the building blocks top apps share and Konsta does not have — a week strip, a month calendar, a step
// timeline, a carousel, empty and loading states, pull to refresh, an accordion, swipe actions, ratings, an avatar
// stack, story rings and a code input. Hand-written and reviewed in a gallery (gallery/*.jsx) before they joined the
// kit; plain React + Tailwind on the style's tokens, so the export can copy this file as it is.
import { useEffect, useRef, useState } from 'react'
import { Button, Glass, List, ListItem, Preloader } from 'konsta/react'
import { ArrowDown, ChevronLeft, ChevronRight, Check, MapPin, Star, Plus, Play, Pause, SkipBack, SkipForward, Delete, Crown, Nfc, X, Plane, Phone, MessageCircle, Heart, Share, Bike } from 'lucide-react'
import { Dots, Photo, Avatar, Meter, Medal, Confetti, tint, gradient, onColor, cssColor, STATIC } from './ui.jsx'

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7)) // Monday first
const sameDay = (a, b) => !!a && !!b && ymd(a) === ymd(b)
const dayOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
// A screen may pass a Date, 'YYYY-MM-DD' or a timestamp (one passed strings and the calendar crashed); every
// date prop goes through this, and a value that is not a date is no date.
const asDate = (v) => {
  if (v instanceof Date) return isNaN(v) ? null : v
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) { const [y, m, d] = v.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d) }
  if (typeof v === 'number' || typeof v === 'string') { const d = new Date(v); return isNaN(d) ? null : d }
  return null
}
// A number may arrive as a number, '4.92' or '1,284' (a screen passed a string and Rating crashed on toFixed).
const asNum = (v, d = 0) => { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : d }
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthLabel = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

function NavArrows({ onPrev, onNext, prevLabel, nextLabel }) {
  const btn = 'w-11 h-11 -my-2 flex items-center justify-center rounded-full text-primary motion-safe:transition-transform motion-safe:duration-150 ease-out active:scale-90'
  return (
    <div className="flex items-center -mr-3">
      <button type="button" aria-label={prevLabel} onClick={onPrev} className={btn}><ChevronLeft className="w-5 h-5" strokeWidth={2.5} /></button>
      <button type="button" aria-label={nextLabel} onClick={onNext} className={btn}><ChevronRight className="w-5 h-5" strokeWidth={2.5} /></button>
    </div>
  )
}

// The filled accent disc behind a selected day: it scales in rather than blinking.
function Disc({ on }) {
  return <span aria-hidden className={`absolute inset-0 rounded-full bg-primary motion-safe:transition-[transform,opacity] motion-safe:duration-200 ease-out ${on ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
}

// ── WeekStrip ────────────────────────────────────────────────────────────────
// value: Date · onChange(Date) · today: Date · marks: 'YYYY-MM-DD'[] (days with something on them)
export function WeekStrip({ value: rawValue, onChange, today: rawToday, marks = [] }) {
  const today = asDate(rawToday) ?? new Date()
  const value = asDate(rawValue) ?? today
  const [start, setStart] = useState(() => startOfWeek(value))
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const marked = new Set((marks ?? []).map((m) => { const d = asDate(m); return d ? ymd(d) : m }))
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-headline">{monthLabel(addDays(start, 3))}</span>
        <NavArrows prevLabel="Previous week" nextLabel="Next week" onPrev={() => setStart(addDays(start, -7))} onNext={() => setStart(addDays(start, 7))} />
      </div>
      <div className="grid grid-cols-7" role="listbox" aria-label="Week">
        {days.map((d, i) => {
          const sel = sameDay(d, value), now = sameDay(d, today)
          return (
            <button key={ymd(d)} type="button" role="option" aria-selected={sel} aria-label={d.toDateString()} onClick={() => onChange(d)}
              className="flex flex-col items-center gap-1.5 py-1 min-h-11 motion-safe:transition-transform motion-safe:duration-150 ease-out active:scale-95">
              <span className={`text-caption2 font-semibold uppercase tracking-wide ${now ? 'text-primary' : 'opacity-50'}`}>{WEEKDAYS[i]}</span>
              <span className="relative w-10 h-10 flex items-center justify-center">
                <Disc on={sel} />
                <span className={`relative text-callout tabular-nums ${sel ? 'text-white font-semibold' : now ? 'text-primary font-semibold' : 'font-medium'}`}>{d.getDate()}</span>
              </span>
              <span aria-hidden className={`w-1.5 h-1.5 rounded-full bg-primary ${marked.has(ymd(d)) ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── MonthCalendar ────────────────────────────────────────────────────────────
// mode 'single': value Date · onChange(Date)
// mode 'range':  value { start: Date|null, end: Date|null } · onChange({ start, end })
// month: any Date in the first month shown · min: days before it are disabled · today · marks: 'YYYY-MM-DD'[]
export function MonthCalendar({ mode = 'single', value: rawValue, onChange, month: rawMonth, min: rawMin, today: rawToday, marks = [] }) {
  const today = asDate(rawToday) ?? new Date()
  const value = mode === 'range' ? { start: asDate(rawValue?.start), end: asDate(rawValue?.end) } : asDate(rawValue)
  const min = asDate(rawMin)
  const month = asDate(rawMonth) ?? (mode === 'range' ? value.start : value) ?? today
  const [shown, setShown] = useState(() => new Date(month.getFullYear(), month.getMonth(), 1))
  const first = startOfWeek(shown)
  const last = new Date(shown.getFullYear(), shown.getMonth() + 1, 0)
  const weeks = Math.ceil(((last - first) / 864e5 + 1) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i))
  const marked = new Set((marks ?? []).map((m) => { const d = asDate(m); return d ? ymd(d) : m }))
  const floor = min && dayOnly(min)
  const start = mode === 'range' ? value?.start : value
  const end = mode === 'range' ? value?.end : null

  const pick = (d) => {
    if (mode !== 'range') return onChange(d)
    if (!start || end || d < start) onChange({ start: d, end: null })
    else onChange({ start, end: d })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-headline">{monthLabel(shown)}</span>
        <NavArrows prevLabel="Previous month" nextLabel="Next month"
          onPrev={() => setShown(new Date(shown.getFullYear(), shown.getMonth() - 1, 1))}
          onNext={() => setShown(new Date(shown.getFullYear(), shown.getMonth() + 1, 1))} />
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => <span key={w} className="text-center text-caption2 font-semibold uppercase tracking-wide opacity-50">{w.slice(0, 1)}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1" role="grid" aria-label={monthLabel(shown)}>
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === shown.getMonth()
          if (!inMonth) return <span key={ymd(d)} />
          const off = floor && d < floor
          const isStart = sameDay(d, start), isEnd = sameDay(d, end)
          const sel = isStart || isEnd
          const between = start && end && d > start && d < end
          const col = i % 7
          const edgeL = col === 0 || d.getDate() === 1, edgeR = col === 6 || d.getDate() === last.getDate()
          // the soft band: full cell between the ends, half a cell on the start/end, rounded at row and month edges
          const band = end && (between || (isStart && !sameDay(start, end)) || (isEnd && !sameDay(start, end)))
          const bandCls = isStart ? 'left-1/2 right-0' : isEnd ? 'left-0 right-1/2' : `left-0 right-0 ${edgeL ? 'rounded-l-full' : ''} ${edgeR ? 'rounded-r-full' : ''}`
          const now = sameDay(d, today)
          return (
            <div key={ymd(d)} className="relative h-11 flex items-center justify-center">
              {band && <span aria-hidden className={`absolute inset-y-0.5 bg-primary/15 ${bandCls}`} />}
              <button type="button" disabled={off} aria-label={d.toDateString()} aria-pressed={sel} onClick={() => pick(d)}
                className={`relative w-10 h-10 flex items-center justify-center rounded-full motion-safe:transition-transform motion-safe:duration-150 ease-out enabled:active:scale-90 ${off ? 'opacity-30' : ''}`}>
                <Disc on={sel} />
                <span className={`relative text-callout tabular-nums ${sel ? 'text-white font-semibold' : now ? 'text-primary font-semibold' : between ? 'font-medium' : ''}`}>{d.getDate()}</span>
                {marked.has(ymd(d)) && !off && <span aria-hidden className={`absolute bottom-1 w-1 h-1 rounded-full ${sel ? 'bg-white' : 'bg-primary'}`} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── StepTimeline ─────────────────────────────────────────────────────────────────
// steps: [{ title, time, detail?, status: 'done' | 'current' | 'upcoming' }]
export function StepTimeline({ steps }) {
  return (
    <ol>
      {steps.map((s, i) => {
        const lastStep = i === steps.length - 1
        const next = steps[i + 1]
        return (
          <li key={s.title} className="flex gap-3.5">
            <div className="flex flex-col items-center w-6 shrink-0">
              <span className="relative w-6 h-6 mt-px flex items-center justify-center">
                {s.status === 'done' && <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white"><Check className="w-3.5 h-3.5" strokeWidth={3.5} /></span>}
                {s.status === 'current' && <>
                  <span aria-hidden className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping" />
                  <span className="relative w-6 h-6 rounded-full border-2 border-primary bg-card flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-primary" /></span>
                </>}
                {s.status === 'upcoming' && <span className="w-6 h-6 rounded-full border-2 border-black/20 dark:border-white/25" />}
              </span>
              {!lastStep && <span aria-hidden className={`w-0.5 flex-1 my-1 rounded-full ${s.status === 'done' && next?.status !== 'upcoming' ? 'bg-primary' : 'bg-black/10 dark:bg-white/15'}`} />}
            </div>
            <div className={`flex-1 min-w-0 ${lastStep ? '' : 'pb-6'} ${s.status === 'upcoming' ? 'opacity-50' : ''}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-headline ${s.status === 'current' ? 'text-primary' : ''}`}>{s.title}</span>
                <span className="text-footnote opacity-60 tabular-nums shrink-0">{s.time}</span>
              </div>
              {s.detail && <p className="text-subhead opacity-60 mt-0.5">{s.detail}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ── demo screen ──────────────────────────────────────────────────────────────

const EASE = 'cubic-bezier(.2,.8,.2,1)'

// ── Carousel ────────────────────────────────────────────────────────────────────────────────────────────────
/** Horizontal snap carousel; the next card peeks at the edge, Dots follow the scroll. */
export function Carousel({ items, renderItem, itemWidth = '84%', gap = 12 }) {
  const [index, setIndex] = useState(0)
  const onScroll = (e) => {
    const el = e.currentTarget
    const step = (el.firstChild?.offsetWidth ?? 1) + gap
    // The last card cannot snap to the start (nothing peeks after it), so the end of the scroll is the last page.
    const i = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2 ? items.length - 1 : Math.round(el.scrollLeft / step)
    if (i !== index) setIndex(i)
  }
  return (
    <div>
      <div onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ gap }}>
        {items.map((item, i) => (
          <div key={item.id ?? i} className="shrink-0 snap-start" style={{ width: itemWidth }}>{renderItem(item, i)}</div>
        ))}
      </div>
      <div className="mt-3"><Dots count={items.length} active={index} /></div>
    </div>
  )
}

/** A carousel card: a photo (gradient until it loads) with its title over a dark gradient. */
export function PhotoCard({ q, color, title, meta, badge }) {
  return (
    <Photo q={q} className="h-60 rounded-card" style={{ background: gradient(color) }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      {badge && <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-caption1 font-semibold text-white backdrop-blur-md">{badge}</span>}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="text-title3">{title}</div>
        <div className="mt-0.5 flex items-center gap-1 text-footnote text-white/85"><MapPin className="size-3.5" />{meta}</div>
      </div>
    </Photo>
  )
}

// ── EmptyState ──────────────────────────────────────────────────────────────────────────────────────────────
/** Centred empty state: art in a soft tinted circle, a title, one line, one primary action, an optional link. */
export function EmptyState({ emoji, icon, color, title, text, action, onAction, secondary, onSecondary }) {
  return (
    <div className="flex flex-col items-center px-6 py-9 text-center">
      <div className="flex size-24 items-center justify-center rounded-full" style={{ background: tint(color, 14), color: color ?? 'var(--color-primary)', fontSize: 44 }}>
        {emoji ?? icon}
      </div>
      <div className="mt-5 text-title3">{title}</div>
      <p className="mt-1.5 max-w-[17rem] text-subhead opacity-60">{text}</p>
      {action && <Button large rounded inline className="mt-6 px-8" onClick={onAction}>{action}</Button>}
      {secondary && <button type="button" onClick={onSecondary} className="mt-1 min-h-11 px-4 text-subhead font-medium text-primary active:opacity-50">{secondary}</button>}
    </div>
  )
}

// ── Skeleton ────────────────────────────────────────────────────────────────────────────────────────────────
/** A placeholder bone with a shimmer: a two-period gradient strip slid by `vs-wave` (transform only; the runtime
 *  stops it under reduced motion). Flipped so the light travels left to right. */
export function SkeletonBlock({ className = '' }) {
  return (
    <span aria-hidden className={`relative block overflow-hidden bg-black/[.07] dark:bg-white/[.09] ${className}`}>
      <span
        className="vs-wave absolute inset-y-0 -left-full w-[200%] -scale-x-100 [--sh:rgba(255,255,255,.6)] dark:[--sh:rgba(255,255,255,.08)]"
        style={{ background: 'linear-gradient(90deg, transparent 20%, var(--sh) 25%, transparent 30%, transparent 70%, var(--sh) 75%, transparent 80%)' }}
      />
    </span>
  )
}

export function SkeletonRow() {
  return <ListItem media={<SkeletonBlock className="size-11 rounded-full" />} title={<SkeletonBlock className="mt-1 h-3.5 w-36 rounded-full" />} text={<SkeletonBlock className="mt-2.5 h-3 w-52 rounded-full" />} />
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-card bg-card">
      <SkeletonBlock className="h-36 w-full" />
      <div className="space-y-2.5 p-4">
        <SkeletonBlock className="h-4 w-2/3 rounded-full" />
        <SkeletonBlock className="h-3 w-1/2 rounded-full" />
      </div>
    </div>
  )
}

// ── PullToRefresh ───────────────────────────────────────────────────────────────────────────────────────────
/** A scroll area you pull down past `threshold` to run `onRefresh` (a promise); the content springs back after. */
export function PullToRefresh({ onRefresh, threshold = 64, className = '', children }) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const start = useRef(null)
  const ready = pull >= threshold

  const down = (e) => { if (!busy && e.currentTarget.scrollTop <= 0) start.current = e.clientY }
  const move = (e) => {
    if (start.current == null) return
    const dy = e.clientY - start.current
    if (dy > 4 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId)
    setPull(dy > 0 ? Math.min(threshold * 1.8, dy * 0.5) : 0)
  }
  const up = () => {
    if (start.current == null) return
    start.current = null
    if (!ready) return setPull(0)
    setBusy(true)
    setPull(threshold * 0.8)
    Promise.resolve(onRefresh?.()).finally(() => { setBusy(false); setPull(0) })
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {(busy || pull > 0) && <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2" style={{ height: threshold * 0.8, opacity: busy ? 1 : Math.min(1, pull / threshold) }}>
        {busy ? <Preloader className="size-5" /> : <ArrowDown className="size-5 opacity-60" style={{ transform: `rotate(${ready ? 180 : (pull / threshold) * 180}deg)` }} />}
        <span className="text-footnote opacity-60">{busy ? 'Refreshing…' : ready ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>}
      <div
        onScroll={(e) => setAtTop(e.currentTarget.scrollTop <= 0)}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="relative h-full select-none overflow-y-auto overscroll-contain"
        style={{ touchAction: atTop ? 'pan-x pan-up' : 'auto' }}
      >
        <div className={`bg-card ${start.current == null ? 'motion-safe:transition-transform motion-safe:duration-300' : ''}`} style={{ transform: `translateY(${pull}px)`, transitionTimingFunction: EASE }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Accordion ───────────────────────────────────────────────────────────────────────────────────────────────
/** Disclosure rows in an inset list; the chevron turns 90° and the body grows (grid-rows 0fr → 1fr). */
export function Accordion({ items, single = true, defaultOpen = [] }) {
  const [open, setOpen] = useState(() => new Set(defaultOpen))
  const toggle = (i) => setOpen((s) => {
    const n = new Set(single ? [] : s)
    if (!s.has(i)) n.add(i)
    return n
  })
  return (
    <List strong inset>
      {items.map((it, i) => {
        const on = open.has(i)
        return (
          <li key={it.title} className="relative">
            <button type="button" aria-expanded={on} onClick={() => toggle(i)} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left active:bg-black/5 dark:active:bg-white/5">
              <span className="flex-1 text-body">{it.title}</span>
              <ChevronRight className="size-5 shrink-0 opacity-35 motion-safe:transition-transform motion-safe:duration-200 ease-out" style={{ transform: on ? 'rotate(90deg)' : 'none' }} />
            </button>
            <div className="grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 ease-out" style={{ gridTemplateRows: on ? '1fr' : '0fr' }}>
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-subhead opacity-65" style={{ opacity: on ? 0.65 : 0, transition: 'opacity 250ms ease-out' }}>{it.body}</p>
              </div>
            </div>
            {i < items.length - 1 && <div className="absolute bottom-0 left-4 right-0 h-px bg-line" />}
          </li>
        )
      })}
    </List>
  )
}

// ── Demo data ───────────────────────────────────────────────────────────────────────────────────────────────

const STAR = '#ff9f0a'
const MUTED = 'rgba(120,120,128,.28)'

// A one-shot transform animation that reduced motion skips (Web Animations, so no stylesheet is needed).
const play = (el, frames, ms = 240) => {
  if (!el || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  el.animate(frames, { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' })
}

/* ───────── SwipeRow ───────── */

const ACTION_W = 76

/** A row of a `List` that drags sideways to reveal actions. `right` shows on a left drag (a full swipe runs the last one),
 *  `left` on a right drag. Actions: `{ label, icon, color, onClick }`. `open` false closes it (one row open at a time). */
export function SwipeRow({ children, left = [], right = [], open = true, onOpenChange, onClick }) {
  const [x, setX] = useState(0)
  const [drag, setDrag] = useState(false)
  const [gone, setGone] = useState(false)
  const box = useRef(null)
  const g = useRef(null)
  const rw = right.length * ACTION_W
  const lw = left.length * ACTION_W

  useEffect(() => { if (!open) setX(0) }, [open])

  const settle = (nx, isOpen) => { setX(nx); onOpenChange?.(isOpen) }
  const run = (a) => {
    setGone(true)
    setTimeout(() => a.onClick?.(), 260)
  }

  const down = (e) => { g.current = { x0: e.clientX, y0: e.clientY, base: x, moved: false, nx: x } }
  const move = (e) => {
    const s = g.current
    if (!s) return
    const dx = e.clientX - s.x0
    if (!s.moved) {
      if (Math.abs(dx) < 8) return
      if (Math.abs(e.clientY - s.y0) > Math.abs(dx)) { g.current = null; return } // a scroll, not a swipe
      s.moved = true
      setDrag(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    let nx = s.base + dx
    const w = box.current?.offsetWidth ?? 360
    if (nx > 0) nx = left.length ? Math.min(nx, lw + (nx - lw) * 0.3) : nx * 0.15
    if (nx < 0 && !right.length) nx *= 0.15
    s.nx = Math.max(nx, -w)
    setX(s.nx)
  }
  const up = () => {
    const s = g.current
    g.current = null
    setDrag(false)
    if (!s) return
    if (!s.moved) {
      if (x !== 0) settle(0, false)
      else onClick?.()
      return
    }
    const w = box.current?.offsetWidth ?? 360
    if (right.length && s.nx < -w * 0.6) { setX(-w); run(right[right.length - 1]) }
    else if (right.length && s.nx < -rw / 2) settle(-rw, true)
    else if (left.length && s.nx > lw / 2) settle(lw, true)
    else settle(0, false)
  }

  const reveal = x < 0 ? right : left
  const width = Math.abs(x)
  const full = x < 0 && width > rw + 48
  return (
    <li className={`group grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-out ${gone ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'}`}>
      <div ref={box} className="relative overflow-hidden min-h-0">
        {width > 0 && (
          <div className={`absolute inset-y-0 flex ${x < 0 ? 'right-0 flex-row' : 'left-0'}`} style={{ width: Math.max(width, x < 0 ? rw : lw) }}>
            {reveal.map((a, i) => {
              const Icon = a.icon
              const last = i === reveal.length - 1
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => (x < 0 && last ? (setX(-(box.current?.offsetWidth ?? 360)), run(a)) : (settle(0, false), a.onClick?.()))}
                  className={`flex flex-col items-center justify-center gap-1 text-white text-caption1 font-semibold overflow-hidden`}
                  style={{ background: a.color, flex: full ? (last ? 1 : 0) : 1, minWidth: 0 }}
                >
                  <span className={`flex flex-col items-center gap-1 ${full && last ? 'mr-auto ml-6' : ''}`} style={{ width: ACTION_W }}>
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                    {a.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <div
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className={`relative bg-card select-none ${drag ? '' : 'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out'}`}
          style={{ transform: `translateX(${x}px)`, touchAction: 'pan-y' }}
        >
          {children}
          <span className="absolute bottom-0 right-0 left-[72px] h-px bg-line group-last:hidden" />
        </div>
      </div>
    </li>
  )
}

export function Rating({ value: rawValue, count: rawCount, onChange, size = 18 }) {
  const value = Math.max(0, Math.min(5, asNum(rawValue)))
  const count = rawCount == null ? null : asNum(rawCount)
  const refs = useRef([])
  const input = !!onChange
  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.max(0, Math.min(1, value - i))
    const shown = input ? (i < value ? 1 : 0) : fill >= 0.75 ? 1 : fill >= 0.25 ? 0.5 : 0
    const star = (
      <span ref={(el) => (refs.current[i] = el)} className="relative inline-flex" style={{ width: size, height: size }}>
        <Star className="absolute inset-0" style={{ width: size, height: size, color: MUTED }} fill={MUTED} strokeWidth={0} />
        {shown > 0 && (
          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${shown * 100}%` }}>
            <Star style={{ width: size, height: size, color: STAR }} fill={STAR} strokeWidth={0} />
          </span>
        )}
      </span>
    )
    if (!input) return <span key={i}>{star}</span>
    return (
      <button
        key={i}
        type="button"
        aria-label={`${i + 1} star${i ? 's' : ''}`}
        aria-pressed={i < value}
        className="flex items-center justify-center w-11 h-11 -mx-0.5"
        onClick={() => {
          onChange(i + 1)
          refs.current.slice(0, i + 1).forEach((el, k) => setTimeout(() => play(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], 260), k * 35))
        }}
      >
        {star}
      </button>
    )
  })
  return (
    <div className="flex items-center gap-1.5" role={input ? 'radiogroup' : 'img'} aria-label={input ? 'Your rating' : `${value} out of 5`}>
      <div className={`flex ${input ? '' : 'gap-0.5'}`}>{stars}</div>
      {count != null && <span className="text-footnote opacity-60 tabular-nums"><span className="font-semibold opacity-100">{value.toFixed(1)}</span> · {count.toLocaleString('en-US')} reviews</span>}
    </div>
  )
}

/** The App Store summary: the average large, then one bar per star count. `dist` is five counts, 5★ first. */
export function RatingSummary({ value: rawValue, dist: rawDist }) {
  const value = Math.max(0, Math.min(5, asNum(rawValue)))
  // Five counts, 5★ first — or an object keyed by star ({ 5: 912, 4: 241, … }).
  const dist = (Array.isArray(rawDist) ? rawDist : rawDist && typeof rawDist === 'object' ? [5, 4, 3, 2, 1].map((k) => rawDist[k]) : []).map((n) => asNum(n)).concat([0, 0, 0, 0, 0]).slice(0, 5)
  const total = dist.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...dist)
  return (
    <div className="flex items-center gap-5">
      <div className="text-center shrink-0 w-24">
        <div className="text-figure tabular-nums">{value.toFixed(1)}</div>
        <div className="flex justify-center mt-1.5"><Rating value={value} size={13} /></div>
        <div className="text-caption1 opacity-60 mt-1">{total.toLocaleString('en-US')} ratings</div>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        {dist.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-caption1 opacity-60 w-3 text-right tabular-nums">{5 - i}</span>
            <div className="flex-1"><Meter value={n / max} color={STAR} height={6} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AvatarStack({ people: rawPeople, max = 4, size = 36, ring = 'var(--color-card)' }) {
  const people = (Array.isArray(rawPeople) ? rawPeople : []).map((p) => (typeof p === 'string' ? { name: p } : p ?? { name: '?' }))
  const shown = people.slice(0, asNum(max, 4))
  const extra = people.length - shown.length
  const edge = { boxShadow: `0 0 0 2.5px ${ring}`, marginLeft: -size * 0.22 }
  return (
    <div className="flex items-center shrink-0" aria-label={`${people.length} people`}>
      {shown.map((p, i) => (
        <span key={p.name} className="block shrink-0 rounded-full" style={i ? edge : { boxShadow: edge.boxShadow, marginLeft: 0 }}>
          <Avatar name={p.name} color={p.color} photo={p.photo} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span className="shrink-0 rounded-full flex items-center justify-center bg-card-2 text-caption1 font-semibold tabular-nums" style={{ ...edge, width: size, height: size }}>
          +{extra}
        </span>
      )}
    </div>
  )
}

export function Stories({ items: rawItems, me, onOpen, onAdd }) {
  const items = (Array.isArray(rawItems) ? rawItems : []).map((s, i) => (typeof s === 'string' ? { id: s, name: s } : { id: s?.id ?? String(i), name: s?.name ?? '', ...s }))
  const [seen, setSeen] = useState(() => new Set(items.filter((s) => s.seen).map((s) => s.id)))
  const SIZE = 68
  const circle = (ring, inner) => (
    <span className="rounded-full p-[2.5px] block" style={{ background: ring, width: SIZE, height: SIZE }}>
      <span className="rounded-full p-[2.5px] bg-page block w-full h-full">{inner}</span>
    </span>
  )
  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x scroll-px-4">
      {me && (
        <button type="button" onClick={onAdd} aria-label="Add to your story" className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 snap-start">
          <span className="relative block" style={{ width: SIZE, height: SIZE }}>
            {circle('transparent', <Avatar name={me.name} color={me.color} photo={me.photo} size={SIZE - 10} />)}
            <span className="absolute right-0 bottom-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center" style={{ boxShadow: '0 0 0 2.5px var(--color-page)' }}>
              <Plus className="w-4 h-4" strokeWidth={3} />
            </span>
          </span>
          <span className="text-caption1 opacity-60 w-full truncate text-center">Your story</span>
        </button>
      )}
      {items.map((s) => {
        const isSeen = seen.has(s.id)
        return (
          <button
            key={s.id}
            type="button"
            aria-label={`${s.name}’s story${isSeen ? ', seen' : ''}`}
            onClick={(e) => {
              play(e.currentTarget.firstChild, [{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1)' }], 220)
              setSeen((p) => new Set(p).add(s.id))
              onOpen?.(s)
            }}
            className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 snap-start"
          >
            <span className="block">
              {circle(isSeen ? MUTED : `linear-gradient(45deg, ${s.color}, var(--color-primary))`, <Avatar name={s.name} color={s.color} photo={s.photo} size={SIZE - 10} />)}
            </span>
            <span className={`text-caption1 w-full truncate text-center ${isSeen ? 'opacity-50' : ''}`}>{s.name.split(' ')[0]}</span>
          </button>
        )
      })}
    </div>
  )
}

export function CodeInput({ length = 6, value, onChange, error }) {
  const refs = useRef([])
  const row = useRef(null)
  const [focus, setFocus] = useState(null)
  const digits = value.split('')

  useEffect(() => {
    if (error) play(row.current, [0, -10, 9, -7, 5, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })), 420)
  }, [error])

  const set = (v, at) => {
    const clean = v.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    refs.current[Math.min(at ?? clean.length, length - 1)]?.focus()
  }
  const type = (i, ch) => {
    const d = ch.replace(/\D/g, '')
    if (!d) return
    if (d.length > 1) return set(d) // autofill drops the whole code into one box
    const next = (value.slice(0, i) + d + value.slice(i + 1)).slice(0, length)
    set(next, i + 1)
  }
  const key = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[i]) set(value.slice(0, i) + value.slice(i + 1), i)
      else if (i > 0) set(value.slice(0, i - 1) + value.slice(i), i - 1)
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1].focus()
    else if (e.key === 'ArrowRight' && i < value.length) refs.current[i + 1]?.focus()
  }
  // The box you type into next is lit even before focus, so the row always says where the code goes.
  const active = focus ?? (value.length < length ? value.length : -1)

  return (
    <div ref={row} className="flex justify-center gap-2">
      {Array.from({ length }, (_, i) => {
        const filled = !!digits[i]
        const lit = i === active && !error
        const border = error ? '#ff3b30' : lit ? 'var(--color-primary)' : filled ? 'color-mix(in oklab, var(--color-primary) 35%, var(--color-line))' : 'var(--color-line)'
        return (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={digits[i] ?? ''}
            onChange={(e) => type(i, e.target.value.slice(digits[i] ? 1 : 0) || e.target.value)}
            onKeyDown={(e) => key(i, e)}
            onPaste={(e) => { e.preventDefault(); set(e.clipboardData.getData('text')) }}
            onFocus={(e) => { setFocus(i); e.target.select() }}
            onBlur={() => setFocus(null)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={length}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error || undefined}
            className={`w-12 h-14 rounded-xl bg-card text-center text-title2 tabular-nums caret-transparent outline-none border-2 motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150 ${error ? 'text-[#ff3b30]' : ''}`}
            style={{ borderColor: border, boxShadow: lit ? '0 0 0 4px color-mix(in oklab, var(--color-primary) 18%, transparent)' : 'none' }}
          />
        )
      })}
    </div>
  )
}


// ── SignInButtons ───────────────────────────────────────────────────────────────────────────────────────────
// PRM-02: the sign-in a first-run screen ends on — Apple (black, as Apple's guidelines draw it), Google (white with
// its four-colour G), and an optional email link. The marks are drawn here so a screen never improvises a logo.
const AppleMark = () => (
  <svg viewBox="0 0 17 20" width="16" height="19" aria-hidden fill="currentColor"><path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.6 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z" /></svg>
)
const GoogleMark = () => (
  <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z" /><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.7H.9v2.3C2.4 15.9 5.5 18 9 18z" /><path fill="#FBBC05" d="M3.9 10.8c-.2-.5-.3-1.1-.3-1.8s.1-1.2.3-1.8V4.9H.9C.3 6.1 0 7.5 0 9s.3 2.9.9 4.1l3-2.3z" /><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6C13.5.9 11.4 0 9 0 5.5 0 2.4 2.1.9 4.9l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" /></svg>
)
export function SignInButtons({ onApple, onGoogle, onEmail, email = 'Continue with email' }) {
  const btn = 'w-full h-12 rounded-2xl flex items-center justify-center gap-2.5 text-callout font-semibold motion-safe:transition-transform active:scale-[.98]'
  return (
    <div className="space-y-2.5 w-full">
      <button type="button" onClick={onApple} className={`${btn} bg-black text-white dark:bg-white dark:text-black`}><AppleMark />Continue with Apple</button>
      <button type="button" onClick={onGoogle} className={`${btn} bg-white text-black border border-black/10 dark:border-white/10`}><GoogleMark />Continue with Google</button>
      {onEmail && <button type="button" onClick={onEmail} className="w-full h-10 text-subhead font-medium text-primary">{email}</button>}
    </div>
  )
}

// ── BentoGrid ───────────────────────────────────────────────────────────────────────────────────────────────
// PRM-05: the top of a dashboard as a bento grid — cards of different sizes, so the eye has an order and nothing is a
// plain row. A card is a photo with a glass panel (`photo`), a filled colour (`fill`), or a surface with a coloured
// figure; `tall` spans two rows, `wide` two columns. An example dashboard drawn this way was copied on 1 screen in 63;
// a part with props is copied every time. The glass is dark: light glass under white text failed in light mode.
export function BentoGrid({ children, className = '' }) {
  return <div className={`grid grid-cols-2 gap-3 px-4 ${className}`}>{children}</div>
}

export function BentoCard({ tall, wide, photo, fill, color, icon, title, value, detail, progress, badge, onClick, children, delay = 0 }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const Tag = onClick ? 'button' : 'div'
  const size = `${tall ? 'row-span-2 min-h-[264px]' : 'min-h-[124px]'} ${wide ? 'col-span-2' : ''}`
  const base = `${size} relative overflow-hidden rounded-[26px] text-left vs-rise ${onClick ? 'active:scale-[.98] motion-safe:transition-transform' : ''}`
  const style = { animationDelay: `${delay}ms` }
  const text = (light) => (
    <>
      {title && <div className={`text-footnote ${light ? 'opacity-85' : 'opacity-60'}`}>{title}</div>}
      {value != null && <div className="text-title2 leading-tight tabular-nums" style={light || fill ? undefined : { color: c }}>{value}</div>}
      {detail && <div className={`text-caption1 ${light ? 'opacity-85' : 'opacity-60'} mt-0.5`}>{detail}</div>}
    </>
  )
  if (photo) {
    return (
      <Tag onClick={onClick} className={base} style={style}>
        <Photo q={photo} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />
        {badge && <span className="absolute top-3 left-3 text-caption1 font-semibold px-2.5 py-1 rounded-full bg-black/30 text-white backdrop-blur-md">{badge}</span>}
        <Glass className="!absolute left-2.5 right-2.5 bottom-2.5 !rounded-[20px] p-3 text-white !bg-black/35 backdrop-blur-xl">{children ?? text(true)}</Glass>
      </Tag>
    )
  }
  if (fill) {
    const fg = onColor(color ?? '#5e5ce6')
    return (
      <Tag onClick={onClick} className={`${base} p-3.5 flex flex-col justify-between`} style={{ ...style, background: gradient(color ?? '#5e5ce6'), color: fg }}>
        <div className="flex items-center justify-between [&>svg]:w-5 [&>svg]:h-5">{icon}{badge && <span className="text-caption1 font-semibold opacity-90">{badge}</span>}</div>
        <div>{children ?? text(false)}</div>
      </Tag>
    )
  }
  return (
    <Tag onClick={onClick} className={`${base} p-3.5 bg-card flex flex-col justify-between`} style={style}>
      <div className="flex items-center justify-between [&>svg]:w-5 [&>svg]:h-5" style={{ color: c }}>{icon}{badge && <span className="text-caption1 opacity-60" style={{ color: 'inherit' }}>{badge}</span>}</div>
      <div>{children ?? text(false)}{progress != null && <div className="mt-2"><Meter value={Math.max(0, Math.min(1, asNum(progress)))} color={c} height={6} /></div>}</div>
    </Tag>
  )
}

// ── RouteMap ────────────────────────────────────────────────────────────────────────────────────────────────
// KIT-23: a drawn map — streets, a park, water, a route with its start and end, and where the runner or courier is
// now. The judge's most repeated complaint on tracking and run screens was a map shown as an empty grey box; no tile
// server can be called from a screen, so the kit draws one. The same `seed` draws the same streets.
function seeded(seed) {
  let h = 2166136261
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export function RouteMap({ height = 220, route = 'line', progress, pins = [], color, seed = 'route', className = '', children }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const W = 360, H = 240
  const r = seeded(seed)
  const streets = []
  for (let i = 0; i < 7; i++) { const y = 14 + i * 36 + r() * 12; streets.push(`M -10 ${y} L ${W + 10} ${y + (r() - 0.5) * 40}`) }
  for (let i = 0; i < 9; i++) { const x = 10 + i * 44 + r() * 14; streets.push(`M ${x} -10 L ${x + (r() - 0.5) * 50} ${H + 10}`) }
  const park = { x: 40 + r() * 150, y: 30 + r() * 90, w: 80 + r() * 50, h: 50 + r() * 30 }
  // The route: five points across the map (or round it), smoothed into one path.
  const pts = route === 'loop'
    ? [[0.25, 0.3], [0.62, 0.18], [0.82, 0.48], [0.6, 0.82], [0.26, 0.7]].map(([x, y]) => [x * W + (r() - 0.5) * 30, y * H + (r() - 0.5) * 24])
    : [[0.1, 0.78], [0.32, 0.62], [0.5, 0.66], [0.68, 0.4], [0.88, 0.22]].map(([x, y]) => [x * W + (r() - 0.5) * 24, y * H + (r() - 0.5) * 24])
  const ring = route === 'loop' ? [...pts, pts[0]] : pts
  // A loop is smoothed all the way round (midpoint to midpoint), so it has no straight seam where it closes.
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const loopPath = () => {
    const m0 = mid(pts[pts.length - 1], pts[0])
    return pts.reduce((d, p, i) => { const m = mid(p, pts[(i + 1) % pts.length]); return `${d} Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}` }, `M ${m0[0].toFixed(1)} ${m0[1].toFixed(1)}`) + ' Z'
  }
  const path = route === 'loop' ? loopPath() : ring.reduce((d, p, i, a) => {
    if (i === 0) return `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}`
    const q = a[i - 1], mx = (q[0] + p[0]) / 2, my = (q[1] + p[1]) / 2
    return `${d} Q ${q[0].toFixed(1)} ${q[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}${i === a.length - 1 ? ` L ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : ''}`
  }, '')
  // Where along the route the runner or courier is (0–1), on the straight segments between the points.
  let at = null
  if (progress != null) {
    const seg = ring.slice(1).map((p, i) => Math.hypot(p[0] - ring[i][0], p[1] - ring[i][1]))
    let left = Math.max(0, Math.min(1, asNum(progress))) * seg.reduce((a, b) => a + b, 0)
    for (let i = 0; i < seg.length; i++) {
      if (left <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, left / seg[i]) : 0; at = [ring[i][0] + (ring[i + 1][0] - ring[i][0]) * k, ring[i][1] + (ring[i + 1][1] - ring[i][1]) * k]; break }
      left -= seg[i]
    }
  }
  const start = route === 'loop' ? mid(pts[pts.length - 1], pts[0]) : ring[0], end = ring[ring.length - 1]
  const place = (pin, i) => (pin.kind === 'start' ? start : pin.kind === 'end' ? end : ring[Math.min(ring.length - 1, 1 + i)])
  return (
    <div className={`relative overflow-hidden rounded-[22px] ${className}`} style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-label="Map" role="img">
        <rect width={W} height={H} style={{ fill: 'var(--app-card-2, #eef0f3)' }} />
        <path d={`M ${W * 0.72} -10 C ${W * 0.8} ${H * 0.3}, ${W * 1.05} ${H * 0.45}, ${W + 10} ${H * 0.62} L ${W + 10} -10 Z`} fill="rgba(10,132,255,.16)" />
        <rect x={park.x} y={park.y} width={park.w} height={park.h} rx="14" fill="rgba(52,199,89,.18)" />
        {streets.map((d, i) => <path key={i} d={d} style={{ stroke: 'var(--app-card, #ffffff)' }} strokeWidth={i % 3 === 0 ? 9 : 5} fill="none" strokeLinecap="round" />)}
        <path d={path} stroke="white" strokeOpacity=".9" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path} style={{ stroke: c }} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={start[0]} cy={start[1]} r="7" fill="white" /><circle cx={start[0]} cy={start[1]} r="4.5" style={{ fill: c }} />
        {route !== 'loop' && <g transform={`translate(${end[0]} ${end[1]})`}><path d="M0 0 C -9 -10 -9 -22 0 -22 C 9 -22 9 -10 0 0 Z" style={{ fill: c }} stroke="white" strokeWidth="2" /><circle cy="-15" r="3.5" fill="white" /></g>}
      </svg>
      {at && (
        <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(at[0] / W) * 100}%`, top: `${(at[1] / H) * 100}%` }}>
          <span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ background: c, opacity: 0.35 }} />
          <span className="relative block w-4 h-4 rounded-full border-[3px] border-white shadow-md" style={{ background: c }} />
        </span>
      )}
      {pins.map((pin, i) => { const p = place(pin, i); return (
        <span key={i} className="absolute -translate-x-1/2 text-caption1 font-semibold px-2 py-0.5 rounded-full bg-card shadow-sm whitespace-nowrap max-w-[45%] truncate" style={{ left: `${Math.max(18, Math.min(82, (p[0] / W) * 100))}%`, top: `calc(${(p[1] / H) * 100}% + 10px)` }}>{pin.label}</span>
      ) })}
      {children && <div className="absolute inset-x-0 bottom-0 p-3">{children}</div>}
    </div>
  )
}

// KIT-24: the first wave of parts top apps are known by (Revolut, Airbnb, Spotify, Uber Eats, Duolingo) — a donut of
// categories, a bank card, an amount keypad, a photo header that folds into the navbar, a media player, a mini player
// above the tab bar, a menu with tabs that follow the scroll, and a podium. Each takes the forms a model writes
// (numbers as strings, colours as names) and keeps working on its own state when no handler is given.

// Segments with no colour are the accent in lighter steps — one hue, as top apps chart categories.
const palette = (i, c) => `color-mix(in oklab, ${c} ${Math.max(22, 100 - i * 20)}%, #ffffff)`
const money = (n, currency = '$') => `${n < 0 ? '−' : ''}${currency}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`

/** Categories as one ring — spending, time, macros. `segments: [{ label, value, color? }]`; `children` sit in the middle
 *  (the total); `legend` lists the segments under it with their share. */
export function Donut({ segments = [], size = 180, stroke = 22, color, legend = false, currency, children, delay = 0 }) {
  const base = color ? cssColor(color) : 'var(--color-primary)'
  const items = (Array.isArray(segments) ? segments : []).map((s, i) => ({ label: String(s?.label ?? s?.name ?? ''), value: Math.max(0, asNum(s?.value ?? s?.amount)), color: s?.color ? cssColor(s.color) : palette(i, base) }))
  const total = items.reduce((a, s) => a + s.value, 0) || 1
  const [on, setOn] = useState(STATIC)
  useEffect(() => { const t = setTimeout(() => setOn(true), 60 + delay); return () => clearTimeout(t) }, [delay])
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, gap = items.length > 1 ? Math.min(6, C * 0.012) : 0
  let at = 0
  return (
    <div className="flex flex-col items-center gap-4" data-od-kit="Donut">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={items.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,120,128,.14)" strokeWidth={stroke} />
          {items.map((s, i) => {
            const len = Math.max(0, (s.value / total) * C - gap)
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap={items.length > 1 ? 'butt' : 'round'} style={{ stroke: s.color, strokeDasharray: `${on ? len : 0} ${C}`, strokeDashoffset: -at, transition: 'stroke-dasharray 900ms cubic-bezier(.2,.8,.2,1)' }} />
            at += (s.value / total) * C
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">{children}</div>
      </div>
      {legend && items.length > 0 && (
        <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2.5">
          {items.map((s, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-subhead truncate flex-1">{s.label}</span>
              <span className="text-subhead tabular-nums opacity-60">{currency ? money(s.value, currency) : `${Math.round((s.value / total) * 100)}%`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** A payment card, drawn: chip, contactless mark, the number masked to its last four (a tap shows it), name, expiry,
 *  network. `color` (and `color2`) tint it; `frozen` frosts it. */
export function BankCard({ name = '', number = '', expiry = '', brand = 'visa', label, balance, color, color2, frozen = false, onClick, className = '' }) {
  const c = color ? cssColor(color) : '#1c1c1e'
  const digits = String(number).replace(/\D/g, '')
  const last4 = digits.slice(-4) || '0000'
  const [shown, setShown] = useState(false)
  const full = digits.length >= 12 ? digits.replace(/(\d{4})(?=\d)/g, '$1 ') : `•••• •••• •••• ${last4}`
  const ink = onColor(c)
  const tap = () => (onClick ? onClick() : digits.length >= 12 && setShown((v) => !v))
  return (
    <button type="button" onClick={tap} data-od-kit="BankCard" className={`relative w-full overflow-hidden rounded-[22px] p-5 text-left shadow-lg motion-safe:transition-transform motion-safe:duration-150 active:scale-[.98] ${className}`} style={{ aspectRatio: '1.586', background: gradient(c, color2), color: ink }}>
      <span className="absolute -right-16 -top-20 w-56 h-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,.22), transparent 70%)' }} />
      <span className="absolute -left-10 -bottom-24 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,.10), transparent 70%)' }} />
      <span className="relative flex h-full flex-col justify-between">
        <span className="flex items-start justify-between">
          <span>
            {label && <span className="block text-footnote font-semibold opacity-80">{label}</span>}
            {balance !== undefined && <span className="block text-title2 font-bold tabular-nums mt-0.5">{typeof balance === 'number' ? money(balance) : balance}</span>}
          </span>
          <Nfc className="w-6 h-6 opacity-80" strokeWidth={1.8} />
        </span>
        <span className="flex items-center gap-3">
          <svg width="40" height="30" viewBox="0 0 40 30" aria-hidden="true"><rect width="40" height="30" rx="6" fill="#e9c46a" /><path d="M0 10h13M0 20h13M27 10h13M27 20h13M13 0v30M27 0v30" stroke="#b8902f" strokeWidth="1.2" /></svg>
          <span className="text-headline tracking-[0.12em] tabular-nums">{shown ? full : `•••• ${last4}`}</span>
        </span>
        <span className="flex items-end justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-caption2 uppercase opacity-70">Card holder</span>
            <span className="block text-subhead font-semibold truncate">{name}</span>
          </span>
          {expiry && <span className="shrink-0"><span className="block text-caption2 uppercase opacity-70">Expires</span><span className="block text-subhead font-semibold tabular-nums">{expiry}</span></span>}
          <span className="shrink-0 text-title3 font-black italic tracking-tight">{String(brand).toLowerCase() === 'mastercard' ? <span className="flex -space-x-2"><span className="w-7 h-7 rounded-full bg-[#eb001b]" /><span className="w-7 h-7 rounded-full bg-[#f79e1b] opacity-90" /></span> : String(brand).toUpperCase()}</span>
        </span>
      </span>
      {frozen && <span className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-md text-headline text-black">❄︎ Frozen</span>}
    </button>
  )
}

/** Entering an amount, as Cash App and Revolut do: the figure large on top, a 3×4 keypad under it. `value` is a string
 *  ('42.5'); without `onChange` it keeps its own. */
export function AmountPad({ value, onChange, currency = '$', max = 100000, decimals = 2, note }) {
  const [own, setOwn] = useState('0')
  const v = value !== undefined ? String(value || '0') : own
  const set = (n) => (onChange ? onChange(n) : setOwn(n))
  const press = (k) => {
    if (k === 'del') return set(v.length > 1 ? v.slice(0, -1) : '0')
    if (k === '.') return decimals > 0 && !v.includes('.') && set(v + '.')
    if (v.includes('.') && v.split('.')[1].length >= decimals) return
    const next = v === '0' ? k : v + k
    if (Number(next) <= max) set(next)
  }
  const [whole, frac] = v.split('.')
  return (
    <div className="flex flex-col items-center" data-od-kit="AmountPad">
      <div className="py-6 text-center">
        <span className="font-bold tabular-nums tracking-tight" style={{ fontSize: v.length > 7 ? 48 : 64, lineHeight: 1 }}>
          <span className="opacity-50">{currency}</span>{Number(whole).toLocaleString('en-US')}{v.includes('.') && <span>.{frac}</span>}
        </span>
        {note && <div className="text-subhead opacity-60 mt-2">{note}</div>}
      </div>
      <div className="grid grid-cols-3 w-full max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', decimals > 0 ? '.' : '', '0', 'del'].map((k, i) => (
          <button key={i} type="button" disabled={!k} onClick={() => k && press(k)} aria-label={k === 'del' ? 'Delete' : k}
            className="h-16 flex items-center justify-center text-title1 font-medium rounded-2xl motion-safe:transition-colors active:bg-black/5 dark:active:bg-white/10 disabled:opacity-0">
            {k === 'del' ? <Delete className="w-6 h-6" /> : k}
          </button>
        ))}
      </div>
    </div>
  )
}

/** A detail screen's photo header that folds into the navbar as the page scrolls (Airbnb, Apple Music): the photo
 *  full-bleed with the title over it, then a bar with the title once it scrolls away. Put it first inside <Page> (no
 *  Navbar); `actions` are round buttons on the right (share, save). */
export function CollapsingHeader({ photo, q = photo ?? '', title = '', subtitle, height = 320, onBack, actions, children }) {
  const ref = useRef(null)
  const [y, setY] = useState(0)
  useEffect(() => {
    const page = ref.current?.closest('.k-page')
    if (!page) return
    const on = () => setY(page.scrollTop)
    page.addEventListener('scroll', on, { passive: true })
    return () => page.removeEventListener('scroll', on)
  }, [])
  const p = Math.min(1, Math.max(0, (y - height * 0.45) / (height * 0.35)))
  const round = 'w-10 h-10 rounded-full flex items-center justify-center motion-safe:transition-colors'
  const btnStyle = { background: p > 0.5 ? 'transparent' : 'rgba(0,0,0,.35)', color: p > 0.5 ? 'inherit' : '#fff', backdropFilter: p > 0.5 ? 'none' : 'blur(12px)' }
  return (
    <div ref={ref} className="relative" data-od-kit="CollapsingHeader" style={{ height }}>
      <div className="absolute inset-0 overflow-hidden">
        <Photo q={q} className="absolute inset-0 w-full h-full" style={{ transform: `translateY(${y * 0.35}px) scale(${1 + Math.max(0, -y) / 400})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white" style={{ opacity: 1 - p }}>
          <div className="text-large-title font-bold leading-tight">{title}</div>
          {subtitle && <div className="text-subhead opacity-85 mt-1">{subtitle}</div>}
          {children}
        </div>
      </div>
      <div className="fixed inset-x-0 top-0 z-30 pt-[var(--k-safe-area-top,0px)]" style={{ background: `color-mix(in oklab, var(--app-card, #fff) ${p * 92}%, transparent)`, backdropFilter: p > 0.05 ? 'blur(18px)' : 'none', borderBottom: p > 0.9 ? '0.5px solid rgba(120,120,128,.25)' : '0.5px solid transparent' }}>
        <div className="h-12 px-3 flex items-center gap-2">
          {onBack && <button type="button" aria-label="Back" onClick={onBack} className={round} style={btnStyle}><ChevronLeft className="w-6 h-6" /></button>}
          <div className="flex-1 text-center text-headline truncate" style={{ opacity: p }}>{title}</div>
          <div className="flex items-center gap-2">{(Array.isArray(actions) ? actions : actions ? [actions] : []).map((a, i) => <span key={i} className={round} style={btnStyle}>{a}</span>)}</div>
          {!actions && onBack && <span className="w-10" />}
        </div>
      </div>
    </div>
  )
}

const clock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`

/** A full player — artwork, title, a scrubber that moves while it plays, and the transport. `duration` and `position`
 *  in seconds; it plays on its own state when no `onToggle` is given. */
export function MediaPlayer({ photo, q = photo ?? '', title = '', artist = '', duration = 600, position = 0, playing: playingProp, onToggle, color, skip = 15 }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const total = Math.max(1, asNum(duration, 600))
  const [own, setOwn] = useState(false)
  const playing = playingProp ?? own
  const [at, setAt] = useState(asNum(position))
  useEffect(() => {
    if (!playing || STATIC) return
    const t = setInterval(() => setAt((a) => Math.min(total, a + 1)), 1000)
    return () => clearInterval(t)
  }, [playing, total])
  const toggle = () => (onToggle ? onToggle(!playing) : setOwn((p) => !p))
  return (
    <div className="flex flex-col items-center px-6" data-od-kit="MediaPlayer">
      <div className="relative w-full max-w-[300px] aspect-square">
        <Photo q={q} className="w-full h-full rounded-[28px] shadow-2xl motion-safe:transition-transform motion-safe:duration-500" style={{ transform: playing ? 'scale(1)' : 'scale(.92)' }} />
      </div>
      <div className="w-full mt-7">
        <div className="text-title2 font-bold truncate">{title}</div>
        <div className="text-body opacity-60 truncate">{artist}</div>
      </div>
      <div className="w-full mt-5">
        <input type="range" min={0} max={total} value={at} onChange={(e) => setAt(Number(e.target.value))} aria-label="Position"
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: c, background: `linear-gradient(to right, ${c} ${(at / total) * 100}%, rgba(120,120,128,.25) ${(at / total) * 100}%)` }} />
        <div className="flex justify-between text-caption1 tabular-nums opacity-60 mt-1.5"><span>{clock(at)}</span><span>−{clock(total - at)}</span></div>
      </div>
      <div className="flex items-center justify-center gap-10 mt-4">
        <button type="button" aria-label={`Back ${skip} seconds`} onClick={() => setAt((a) => Math.max(0, a - skip))} className="w-12 h-12 flex items-center justify-center active:scale-90 motion-safe:transition-transform"><SkipBack className="w-7 h-7" fill="currentColor" /></button>
        <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg active:scale-95 motion-safe:transition-transform" style={{ background: c, color: onColor(c) }}>
          {playing ? <Pause className="w-9 h-9" fill="currentColor" /> : <Play className="w-9 h-9 translate-x-0.5" fill="currentColor" />}
        </button>
        <button type="button" aria-label={`Forward ${skip} seconds`} onClick={() => setAt((a) => Math.min(total, a + skip))} className="w-12 h-12 flex items-center justify-center active:scale-90 motion-safe:transition-transform"><SkipForward className="w-7 h-7" fill="currentColor" /></button>
      </div>
    </div>
  )
}

/** A bar that stays above the tab bar while something runs across the app — what is playing, the order on its way, a
 *  workout in progress. `media` (or `q` for a photo), title, subtitle, a thin progress line; a play/pause button when
 *  `onToggle` is given, else `action`. Tapping it opens the full thing (`onClick`). */
export function MiniPlayer({ photo, q = photo, media, title = '', subtitle, progress, playing = false, onToggle, action, onClick, color }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  return (
    <div className="fixed inset-x-3 z-30" style={{ bottom: 'calc(var(--k-safe-area-bottom, 0px) + 84px)' }} data-od-kit="MiniPlayer">
      <div role="button" tabIndex={0} onClick={onClick} className="relative overflow-hidden flex items-center gap-3 p-2 pr-3 rounded-2xl shadow-xl border border-black/5 dark:border-white/10 motion-safe:transition-transform active:scale-[.99]" style={{ background: 'color-mix(in oklab, var(--app-card, #fff) 82%, transparent)', backdropFilter: 'blur(20px) saturate(1.6)' }}>
        <span className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: tint(c) }}>{media ?? (q ? <Photo q={q} className="w-full h-full" /> : null)}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-subhead font-semibold truncate">{title}</span>
          {subtitle && <span className="block text-footnote opacity-60 truncate">{subtitle}</span>}
        </span>
        {onToggle ? (
          <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={(e) => { e.stopPropagation(); onToggle(!playing) }} className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 motion-safe:transition-transform">
            {playing ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
          </button>
        ) : action ? <span onClick={(e) => e.stopPropagation()}>{action}</span> : <ChevronRight className="w-5 h-5 opacity-40" />}
        {progress !== undefined && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-full bg-black/10 dark:bg-white/15"><span className="block h-full rounded-full" style={{ width: `${Math.round(Math.min(1, Math.max(0, asNum(progress))) * 100)}%`, background: c }} /></span>}
      </div>
    </div>
  )
}

/** A long menu or catalogue in sections with a tab row that sticks under the navbar and follows the scroll (Uber Eats,
 *  Wolt): tap a tab to jump, scroll and the tab moves. `sections: [{ id, title, content }]` — content is the section's
 *  rows or cards. */
export function MenuSections({ sections = [], top }) {
  const list = (Array.isArray(sections) ? sections : []).map((s, i) => ({ id: String(s?.id ?? i), title: String(s?.title ?? s?.label ?? ''), content: s?.content ?? s?.children ?? null }))
  const [active, setActive] = useState(list[0]?.id)
  const [navH, setNavH] = useState(0)
  const bar = useRef(null)
  const refs = useRef({})
  useEffect(() => {
    const page = bar.current?.closest('.k-page')
    if (!page) return
    // The bar sticks under the page's navbar, not over it.
    const nav = page.querySelector('.k-navbar')
    if (nav) setNavH(nav.getBoundingClientRect().height)
    const on = () => {
      const edge = (bar.current?.getBoundingClientRect().bottom ?? 0) + 8
      let cur = list[0]?.id
      for (const s of list) { const el = refs.current[s.id]; if (el && el.getBoundingClientRect().top <= edge) cur = s.id }
      // At the end of the page the last sections cannot reach the bar; the last one is what you are looking at.
      if (page.scrollTop + page.clientHeight >= page.scrollHeight - 4) cur = list[list.length - 1]?.id
      setActive(cur)
    }
    page.addEventListener('scroll', on, { passive: true })
    return () => page.removeEventListener('scroll', on)
  }, [list.map((s) => s.id).join('|')])
  // Only the tab row scrolls to show the active tab (scrollIntoView moved the whole page sideways).
  useEffect(() => {
    const row = bar.current?.firstElementChild, tab = bar.current?.querySelector(`[data-tab="${CSS.escape(String(active))}"]`)
    if (row && tab) row.scrollTo({ left: tab.offsetLeft - row.clientWidth / 2 + tab.clientWidth / 2, behavior: 'smooth' })
  }, [active])
  const jump = (id) => {
    const page = bar.current?.closest('.k-page'), el = refs.current[id]
    if (!page || !el) return
    page.scrollTo({ top: page.scrollTop + el.getBoundingClientRect().top - (bar.current?.getBoundingClientRect().bottom ?? 0) - 4, behavior: 'smooth' })
    setActive(id)
  }
  return (
    <div data-od-kit="MenuSections">
      <div ref={bar} className="sticky z-20 bg-page/90 backdrop-blur-xl" style={{ top: top ?? navH }}>
        <div className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {list.map((s) => (
            <button key={s.id} type="button" data-tab={s.id} onClick={() => jump(s.id)} className="shrink-0 px-3.5 py-1.5 rounded-full text-subhead font-semibold motion-safe:transition-colors"
              style={active === s.id ? { background: 'var(--color-primary)', color: '#fff' } : { color: 'inherit', opacity: 0.7 }}>{s.title}</button>
          ))}
        </div>
      </div>
      {list.map((s) => (
        <section key={s.id} ref={(el) => (refs.current[s.id] = el)} className="pt-4">
          <div className="px-4 pb-2 text-title3 font-bold">{s.title}</div>
          {s.content}
        </section>
      ))}
    </div>
  )
}

/** The top three on steps of a podium — second, first, third — with their photos, a crown on the winner and their
 *  score. `people: [{ name, photo?, value, color? }]` in order; the rest of the board is the screen's own list. */
export function Podium({ people = [], unit = '', color }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const top = (Array.isArray(people) ? people : []).slice(0, 3).map((p, i) => ({ name: String(p?.name ?? ''), photo: p?.photo, value: p?.value ?? p?.score ?? p?.xp, color: p?.color, rank: i + 1 }))
  const order = [top[1], top[0], top[2]].filter(Boolean)
  const step = { 1: 120, 2: 88, 3: 68 }
  const medal = { 1: '#f5b301', 2: '#a9b4c2', 3: '#c98a52' }
  return (
    <div className="flex items-end justify-center gap-3 px-4 pt-6" data-od-kit="Podium">
      {order.map((p) => (
        <div key={p.rank} className="flex-1 max-w-[120px] flex flex-col items-center vs-rise" style={{ animationDelay: `${(3 - p.rank) * 90}ms` }}>
          <div className="relative mb-2">
            {p.rank === 1 && <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6" style={{ color: medal[1] }} fill={medal[1]} />}
            <span className="block rounded-full p-[3px]" style={{ background: medal[p.rank] }}><Avatar name={p.name} photo={p.photo} color={p.color ?? c} size={p.rank === 1 ? 72 : 56} /></span>
          </div>
          <div className="text-subhead font-semibold truncate max-w-full mt-1">{p.name.split(' ')[0]}</div>
          <div className="text-footnote tabular-nums opacity-60">{typeof p.value === 'number' ? p.value.toLocaleString('en-US') : p.value}{unit ? ` ${unit}` : ''}</div>
          <div className="w-full mt-2 rounded-t-2xl flex items-start justify-center pt-2 text-title2 font-black" style={{ height: step[p.rank], background: p.rank === 1 ? gradient(c) : tint(c, p.rank === 2 ? 22 : 14), color: p.rank === 1 ? onColor(c) : c }}>{p.rank}</div>
        </div>
      ))}
    </div>
  )
}

// KIT-25 (wave 2a): parts the judge kept asking for — a paywall's plan table, a size grid and colour swatches, a ticket
// with a real QR code, a live delivery card, a breathing timer and a social post. Same rules as the rest of the kit:
// strings for numbers pass, colours fall back to the accent, and each works on its own state without handlers.

// QR code (byte mode, error correction M, versions 1–6: up to 106 bytes), drawn as SVG — a real code a phone can scan.
const QR_TOTAL = [0, 26, 44, 70, 100, 134, 172], QR_ECC = [0, 10, 16, 26, 18, 24, 16], QR_BLOCKS = [0, 1, 1, 1, 2, 2, 4]
const QR_ALIGN = [0, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]]
const gfMul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x } return z }
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) { for (let j = 0; j < degree; j++) { r[j] = gfMul(r[j], root); if (j + 1 < degree) r[j] ^= r[j + 1] } root = gfMul(root, 2) }
  return r
}
function rsRemainder(data, div) {
  const res = div.map(() => 0)
  for (const b of data) { const f = b ^ res.shift(); res.push(0); div.forEach((c, i) => (res[i] ^= gfMul(c, f))) }
  return res
}
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(String(text ?? ''))]
  let ver = 1
  while (ver < 6 && 4 + 8 + bytes.length * 8 > (QR_TOTAL[ver] - QR_ECC[ver] * QR_BLOCKS[ver]) * 8) ver++
  const dataLen = QR_TOTAL[ver] - QR_ECC[ver] * QR_BLOCKS[ver]
  const data = bytes.slice(0, dataLen - 2)
  const bits = []
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1) }
  put(4, 4); put(data.length, 8); data.forEach((b) => put(b, 8))
  put(0, Math.min(4, dataLen * 8 - bits.length)); while (bits.length % 8) bits.push(0)
  const words = []; for (let i = 0; i < bits.length; i += 8) words.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  for (let pad = 0xec; words.length < dataLen; pad ^= 0xec ^ 0x11) words.push(pad)
  // Split into blocks, add each block's error correction, interleave.
  const nb = QR_BLOCKS[ver], ecc = QR_ECC[ver], raw = QR_TOTAL[ver], short = nb - (raw % nb), shortLen = Math.floor(raw / nb)
  const div = rsDivisor(ecc), blocks = []
  for (let i = 0, k = 0; i < nb; i++) { const d = words.slice(k, (k += shortLen - ecc + (i < short ? 0 : 1))); const e = rsRemainder(d, div); if (i < short) d.push(-1); blocks.push(d.concat(e)) }
  const out = []
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ecc || j >= short) out.push(b[i]) })
  // The grid: function patterns first (marked), then the data in the zigzag, then mask 0 and the format bits.
  const n = ver * 4 + 17
  const m = Array.from({ length: n }, () => new Array(n).fill(false)), fn = Array.from({ length: n }, () => new Array(n).fill(false))
  const set = (x, y, v) => { m[y][x] = v; fn[y][x] = true }
  for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0) }
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && y >= 0 && x < n && y < n) set(x, y, d !== 2 && d !== 4) } }
  finder(3, 3); finder(n - 4, 3); finder(3, n - 4)
  const al = QR_ALIGN[ver]
  for (const ay of al) for (const ax of al) { if ((ax === 6 && ay === 6) || (ax === 6 && ay === n - 7) || (ax === n - 7 && ay === 6)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1) }
  const format = (mask) => {
    const d = (0 << 3) | mask; let rem = d
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const b = ((d << 10) | rem) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1
    for (let i = 0; i <= 5; i++) set(8, i, bit(i))
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8))
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(i))
    set(8, n - 8, true)
  }
  format(0)
  let i = 0
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - v : v
      if (!fn[y][x] && i < out.length * 8) { m[y][x] = ((out[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++ }
    }
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fn[y][x] && (x + y) % 2 === 0) m[y][x] = !m[y][x]
  return m
}

/** A QR code a phone can scan (a ticket, a pass, a payment, a loyalty card). `value` is the text it carries. */
export function QRCode({ value = '', size = 160, color = '#000000', className = '' }) {
  const m = qrMatrix(value), n = m.length, q = 2
  let d = ''
  m.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x + q} ${y + q}h1v1h-1z` }))
  return (
    <svg data-od-kit="QRCode" className={className} width={size} height={size} viewBox={`0 0 ${n + q * 2} ${n + q * 2}`} shapeRendering="crispEdges" role="img" aria-label={`QR code: ${value}`}>
      <rect width={n + q * 2} height={n + q * 2} fill="#ffffff" />
      <path d={d} fill={color} />
    </svg>
  )
}

/** A paywall's plan table: features down, plans across, the recommended plan lit. `rows: [{ label, free, pro }]` —
 *  each cell `true` (✓), `false` (–) or short text ("3 a day"). */
export function PlanCompare({ rows = [], plans = ['Free', 'Pro'], highlight = 1, color }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const list = Array.isArray(rows) ? rows : []
  const cell = (v, on) => v === true ? <Check className="w-5 h-5 mx-auto" strokeWidth={2.6} style={{ color: on ? c : 'currentColor' }} /> : v === false || v == null ? <span className="block text-center opacity-30">–</span> : <span className="block text-center text-footnote font-semibold" style={on ? { color: c } : undefined}>{String(v)}</span>
  const keys = (r) => [r.free ?? r[plans[0]?.toLowerCase?.()], r.pro ?? r.premium ?? r[plans[1]?.toLowerCase?.()]]
  return (
    <div data-od-kit="PlanCompare" className="mx-4 rounded-card bg-card overflow-hidden relative">
      <div className="absolute top-1.5 bottom-1.5 rounded-2xl" style={{ right: `${16 + (plans.length - 1 - highlight) * 76 + 2}px`, width: 72, background: tint(c, 12), boxShadow: `inset 0 0 0 1.5px ${tint(c, 45)}` }} />
      <div className="relative flex items-center px-4 pt-4 pb-2">
        <span className="flex-1 text-footnote font-semibold opacity-50 uppercase tracking-wide">What you get</span>
        {plans.map((p, i) => <span key={p} className="w-[76px] text-center text-subhead font-bold" style={i === highlight ? { color: c } : { opacity: 0.6 }}>{p}</span>)}
      </div>
      {list.map((r, k) => (
        <div key={k} className="relative flex items-center px-4 py-3 border-t border-line">
          <span className="flex-1 text-subhead pr-2">{r.label ?? r.name}</span>
          {keys(r).slice(0, plans.length).map((v, i) => <span key={i} className="w-[76px]">{cell(v, i === highlight)}</span>)}
        </div>
      ))}
    </div>
  )
}

/** Sizes as a grid of tiles: the chosen one filled, sold-out ones struck through and not tappable.
 *  `sizes: ['7', '7.5', { label: '8', soldOut: true }, …]`. */
export function SizePicker({ sizes = [], value, onChange, columns = 4 }) {
  const list = (Array.isArray(sizes) ? sizes : []).map((s) => (typeof s === 'object' && s ? { label: String(s.label ?? s.size ?? ''), out: !!(s.soldOut ?? s.out) } : { label: String(s), out: false }))
  const [own, setOwn] = useState(value ?? list.find((s) => !s.out)?.label)
  const cur = value !== undefined ? value : own
  const pick = (l) => (onChange ? onChange(l) : setOwn(l))
  return (
    <div data-od-kit="SizePicker" className="grid gap-2 px-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {list.map((s) => {
        const on = String(cur) === s.label
        return (
          <button key={s.label} type="button" disabled={s.out} onClick={() => pick(s.label)} aria-pressed={on}
            className={`h-12 rounded-xl text-headline motion-safe:transition-colors ${s.out ? 'line-through opacity-35' : 'active:scale-95'}`}
            style={on ? { background: 'var(--color-primary)', color: '#fff' } : { background: 'var(--app-card, #fff)', boxShadow: 'inset 0 0 0 1px rgba(120,120,128,.28)' }}>{s.label}</button>
        )
      })}
    </div>
  )
}

/** Colour swatches with the chosen one ringed and its name beside the title. `colors: [{ name, color }]`. */
export function SwatchPicker({ colors = [], value, onChange, size = 36 }) {
  const list = (Array.isArray(colors) ? colors : []).map((c) => (typeof c === 'string' ? { name: c, color: cssColor(c) } : { name: String(c?.name ?? ''), color: cssColor(c?.color ?? c?.hex) }))
  const [own, setOwn] = useState(value ?? list[0]?.name)
  const cur = value !== undefined ? value : own
  return (
    <div data-od-kit="SwatchPicker" className="px-4">
      <div className="text-subhead mb-2"><span className="opacity-60">Colour · </span><span className="font-semibold">{cur}</span></div>
      <div className="flex flex-wrap gap-3">
        {list.map((c) => {
          const on = c.name === cur
          return <button key={c.name} type="button" aria-label={c.name} aria-pressed={on} onClick={() => (onChange ? onChange(c.name) : setOwn(c.name))} className="rounded-full p-[3px] motion-safe:transition-transform active:scale-90" style={{ boxShadow: on ? '0 0 0 2px var(--color-primary)' : 'none' }}><span className="block rounded-full" style={{ width: size, height: size, background: c.color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)' }} /></button>
        })}
      </div>
    </div>
  )
}

/** A ticket or boarding pass: a route (from → to) or a title on top, details in a grid, a perforated tear line and a
 *  QR code to scan. `from`/`to`: { code, city, time }; `rows`: [{ label, value }]; `code`: what the QR carries. */
export function Ticket({ title, subtitle, from, to, rows = [], code, color, kind = 'flight' }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const list = Array.isArray(rows) ? rows : []
  const end = (p, right) => p && <div className={right ? 'text-right' : ''}><div className="text-large-title font-bold tracking-tight leading-none">{p.code}</div><div className="text-footnote opacity-60 mt-1">{p.city}</div>{p.time && <div className="text-headline mt-1">{p.time}</div>}</div>
  return (
    <div data-od-kit="Ticket" className="mx-4 drop-shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
      <div className="rounded-t-[22px] bg-card p-5">
        <div className="flex items-center gap-2 text-footnote font-semibold uppercase tracking-wide" style={{ color: c }}>{subtitle ?? (kind === 'flight' ? 'Boarding pass' : 'Ticket')}</div>
        {from && to ? (
          <div className="flex items-center justify-between gap-3 mt-3">
            {end(from)}
            <div className="flex-1 flex items-center gap-1.5 opacity-50"><span className="flex-1 border-t-2 border-dashed border-current" /><Plane className="w-5 h-5" style={{ color: c }} /><span className="flex-1 border-t-2 border-dashed border-current" /></div>
            {end(to, true)}
          </div>
        ) : <div className="text-title2 font-bold mt-2">{title}</div>}
        {list.length > 0 && (
          <div className="grid grid-cols-3 gap-y-3 gap-x-2 mt-5">
            {list.slice(0, 6).map((r, i) => <div key={i}><div className="text-caption1 opacity-55 uppercase">{r.label}</div><div className="text-headline">{r.value}</div></div>)}
          </div>
        )}
      </div>
      <div className="relative h-6 bg-card">
        <span className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-page" /><span className="absolute -right-3 top-0 w-6 h-6 rounded-full bg-page" />
        <span className="absolute left-5 right-5 top-1/2 border-t-2 border-dashed border-line" />
      </div>
      <div className="rounded-b-[22px] bg-card pb-5 pt-1 flex flex-col items-center">
        <QRCode value={code ?? `${from?.code ?? title ?? 'TICKET'}-${to?.code ?? ''}`} size={148} />
        <div className="text-caption1 opacity-55 mt-2 tracking-[0.2em]">{String(code ?? '').slice(0, 24).toUpperCase()}</div>
      </div>
    </div>
  )
}

/** "Arriving in 12 min": the live state of a delivery or a ride — the minutes large, the steps as a progress line,
 *  the courier with call and message buttons. */
export function LiveETA({ minutes, status = 'On the way', progress = 0.6, courier, steps = ['Confirmed', 'Preparing', 'On the way', 'Delivered'], onCall, onMessage, color }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const p = Math.min(1, Math.max(0, asNum(progress, 0.6)))
  const person = courier && typeof courier === 'object' ? courier : courier ? { name: String(courier) } : null
  return (
    <div data-od-kit="LiveETA" className="mx-4 rounded-card bg-card p-4">
      <div className="flex items-end justify-between">
        <div><div className="text-footnote opacity-60">{status}</div><div className="text-figure font-bold leading-none mt-1">{asNum(minutes, 12)}<span className="text-title3 font-semibold opacity-60"> min</span></div></div>
        <span className="relative flex w-3 h-3 mb-2"><span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ background: c, opacity: 0.4 }} /><span className="relative w-3 h-3 rounded-full" style={{ background: c }} /></span>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden"><div className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700" style={{ width: `${p * 100}%`, background: c }} /></div>
      <div className="flex justify-between mt-2">{steps.map((s, i) => { const at = Math.round(p * (steps.length - 1)); return <span key={s} className="text-caption1" style={{ opacity: i <= at ? 1 : 0.4, fontWeight: i === at ? 700 : i < at ? 500 : 400, color: i === at ? c : undefined }}>{s}</span> })}</div>
      {person && (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-line">
          <Avatar name={person.name} photo={person.photo} size={44} />
          <div className="flex-1 min-w-0"><div className="text-headline truncate">{person.name}</div><div className="text-footnote opacity-60 truncate flex items-center gap-1"><Bike className="w-3.5 h-3.5" />{person.vehicle ?? 'Your courier'}</div></div>
          <button type="button" aria-label="Message" onClick={onMessage ?? (() => {})} className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90" style={{ background: tint(c, 14), color: c }}><MessageCircle className="w-5 h-5" /></button>
          <button type="button" aria-label="Call" onClick={onCall ?? (() => {})} className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90" style={{ background: c, color: onColor(c) }}><Phone className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  )
}

/** A breathing exercise: a circle that grows as you breathe in, holds, and shrinks as you breathe out, with the
 *  instruction in its middle. Starts and pauses on tap; `rounds` counts down. Seconds per phase. */
export function BreathTimer({ inhale = 4, hold = 4, exhale = 6, rounds = 6, color, size = 240 }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const phases = [['Breathe in', asNum(inhale, 4), 1], ['Hold', asNum(hold, 0), 1], ['Breathe out', asNum(exhale, 6), 0.55]].filter((x) => x[1] > 0)
  const [running, setRunning] = useState(false)
  const [k, setK] = useState(0)
  const [left, setLeft] = useState(asNum(rounds, 6))
  useEffect(() => {
    if (!running || STATIC) return
    const t = setTimeout(() => {
      const next = (k + 1) % phases.length
      if (next === 0) setLeft((l) => { if (l <= 1) { setRunning(false); return asNum(rounds, 6) } return l - 1 })
      setK(next)
    }, phases[k][1] * 1000)
    return () => clearTimeout(t)
  }, [running, k])
  const [label, secs, scale] = running ? phases[k] : ['Tap to begin', 0, 0.55]
  return (
    <div data-od-kit="BreathTimer" className="flex flex-col items-center">
      <button type="button" onClick={() => setRunning((r) => !r)} aria-label={running ? 'Pause' : 'Start'} className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="absolute inset-0 rounded-full" style={{ background: tint(c, 10) }} />
        <span className="absolute rounded-full" style={{ inset: 0, background: `radial-gradient(circle, ${tint(c, 55)}, ${tint(c, 22)})`, transform: `scale(${scale})`, transition: `transform ${secs || 0.6}s ease-in-out` }} />
        <span className="relative text-center"><span className="block text-title2 font-semibold">{label}</span>{running && <span className="block text-footnote opacity-60 mt-1">{secs}s</span>}</span>
      </button>
      <div className="text-subhead opacity-60 mt-5">{running ? `${left} ${left === 1 ? 'round' : 'rounds'} left` : `${phases.map((p) => p[1]).join(' · ')} seconds · ${asNum(rounds, 6)} rounds`}</div>
    </div>
  )
}

/** A post in a feed: the author and time, the photo (double-tap to like, with a heart that bursts), stats, the
 *  caption, and like / comment / share. `liked` and `likes` follow the store when `onLike` is given. */
export function FeedPost({ author, time, photo, text, likes = 0, comments = 0, liked, onLike, onComment, onShare, stats = [], color }) {
  const c = color ? cssColor(color) : '#ff2d55'
  const a = author && typeof author === 'object' ? author : { name: String(author ?? '') }
  const [own, setOwn] = useState(false)
  const [burst, setBurst] = useState(0)
  const on = liked ?? own
  const count = asNum(likes) + (liked === undefined && own ? 1 : 0)
  const like = (force) => { if (force && on) return setBurst((b) => b + 1); onLike ? onLike(!on) : setOwn((v) => !v); if (!on) setBurst((b) => b + 1) }
  return (
    <div data-od-kit="FeedPost" className="mx-4 rounded-card bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3"><Avatar name={a.name} photo={a.photo} size={38} /><div className="flex-1 min-w-0"><div className="text-headline truncate">{a.name}</div>{time && <div className="text-caption1 opacity-55">{time}</div>}</div></div>
      {photo && (
        <div className="relative" onDoubleClick={() => like(true)}>
          <Photo q={photo} className="w-full aspect-[4/3]" />
          {burst > 0 && <Heart key={burst} className="absolute left-1/2 top-1/2 w-20 h-20 -ml-10 -mt-10 text-white drop-shadow-lg pointer-events-none" fill="currentColor" style={{ animation: 'vs-heart 700ms ease-out forwards' }} />}
        </div>
      )}
      {Array.isArray(stats) && stats.length > 0 && <div className="grid gap-2 px-4 pt-3" style={{ gridTemplateColumns: `repeat(${Math.min(4, stats.length)}, minmax(0, 1fr))` }}>{stats.slice(0, 4).map((s, i) => <div key={i}><div className="text-caption1 opacity-55">{s.label}</div><div className="text-headline">{s.value}</div></div>)}</div>}
      {text && <div className="px-4 pt-3 text-subhead">{text}</div>}
      <div className="flex items-center gap-5 px-4 py-3">
        <button type="button" onClick={() => like(false)} aria-pressed={on} className="flex items-center gap-1.5 active:scale-90 motion-safe:transition-transform"><Heart className="w-6 h-6" style={{ color: on ? c : undefined }} fill={on ? c : 'none'} /><span className="text-subhead tabular-nums">{count.toLocaleString('en-US')}</span></button>
        <button type="button" onClick={onComment ?? (() => {})} className="flex items-center gap-1.5 active:scale-90"><MessageCircle className="w-6 h-6" /><span className="text-subhead tabular-nums">{asNum(comments).toLocaleString('en-US')}</span></button>
        <button type="button" onClick={onShare ?? (() => {})} aria-label="Share" className="ml-auto active:scale-90"><Share className="w-6 h-6" /></button>
      </div>
    </div>
  )
}

// KIT-26 (wave 2b): an award's moment, a mood check-in, a story opened full screen, the iOS wheel, and a map of prices.

/** The moment an award is won: the page dims, the medal spins in, confetti, the title and one line, Share and Done.
 *  `opened` shows it (state on the screen); `onClose` hides it. Mount it once; it draws nothing while closed. */
export function AchievementUnlock({ opened = false, emoji = '🏆', title = '', detail, color = '#f5b301', onClose, onShare }) {
  if (!opened) return null
  const c = cssColor(color)
  return (
    <div data-od-kit="AchievementUnlock" className="fixed inset-0 z-[90] flex items-center justify-center px-8" role="dialog" aria-label={title}>
      <div className="absolute inset-0 bg-black/55 vs-fade-in" onClick={onClose} />
      <Confetti run={!STATIC} />
      <div className="relative w-full max-w-xs rounded-[28px] bg-card px-6 pt-8 pb-5 text-center shadow-2xl" style={{ animation: STATIC ? 'none' : 'vs-unlock 520ms cubic-bezier(.2,.9,.3,1.3) both' }}>
        <div className="flex justify-center" style={{ animation: STATIC ? 'none' : 'vs-medal 900ms cubic-bezier(.2,.8,.2,1) both' }}><Medal emoji={emoji} color={c} size={96} /></div>
        <div className="text-footnote font-semibold uppercase tracking-wide mt-5" style={{ color: c }}>Achievement unlocked</div>
        <div className="text-title2 font-bold mt-1">{title}</div>
        {detail && <div className="text-subhead opacity-65 mt-1.5">{detail}</div>}
        <div className="flex gap-2 mt-6">
          {onShare && <button type="button" onClick={onShare} className="flex-1 h-12 rounded-full text-headline active:scale-95" style={{ background: tint(c, 16), color: c }}>Share</button>}
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-full text-headline active:scale-95" style={{ background: 'var(--color-primary)', color: '#fff' }}>Done</button>
        </div>
      </div>
    </div>
  )
}

const MOODS = [['😫', 'Awful'], ['😕', 'Low'], ['😐', 'Okay'], ['🙂', 'Good'], ['😄', 'Great']]
/** "How are you feeling?" — five faces, the chosen one grows and is named. `value` is 1–5 (or the label). */
export function MoodPicker({ value, onChange, moods = MOODS, color }) {
  const c = color ? cssColor(color) : 'var(--color-primary)'
  const list = (Array.isArray(moods) ? moods : MOODS).map((m) => (Array.isArray(m) ? m : [m?.emoji ?? '🙂', m?.label ?? '']))
  const idx = (v) => (typeof v === 'number' ? v - 1 : list.findIndex((m) => m[1] === v))
  const [own, setOwn] = useState(-1)
  const cur = value !== undefined ? idx(value) : own
  const pick = (i) => (onChange ? onChange(i + 1, list[i][1]) : setOwn(i))
  return (
    <div data-od-kit="MoodPicker" className="px-4">
      <div className="flex justify-between">
        {list.map(([e, l], i) => {
          const on = i === cur
          return (
            <button key={l} type="button" aria-label={l} aria-pressed={on} onClick={() => pick(i)} className="flex flex-col items-center gap-1.5 w-14 motion-safe:transition-transform active:scale-90">
              <span className="w-14 h-14 rounded-full flex items-center justify-center motion-safe:transition-all motion-safe:duration-300" style={{ fontSize: on ? 34 : 28, background: on ? tint(c, 22) : 'rgba(120,120,128,.12)', boxShadow: on ? `0 0 0 2px ${c}` : 'none', transform: on ? 'scale(1.1)' : 'none', filter: cur >= 0 && !on ? 'grayscale(.6)' : 'none', opacity: cur >= 0 && !on ? 0.6 : 1 }}>{e}</span>
              <span className="text-caption1" style={{ fontWeight: on ? 700 : 400, color: on ? c : undefined, opacity: on ? 1 : 0.6 }}>{l}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** A story opened full screen: progress segments that fill on their own, the author on top, tap the right half for the
 *  next and the left for the previous; closes after the last. `stories: [{ photo, author: { name, photo }, time, text }]`.
 *  Shown when `opened`; `onClose` hides it. */
export function StoryViewer({ opened = false, stories = [], start = 0, onClose, seconds = 5 }) {
  const list = Array.isArray(stories) ? stories : []
  const [k, setK] = useState(start)
  const [t0, setT0] = useState(0)
  useEffect(() => { if (opened) { setK(start); setT0((x) => x + 1) } }, [opened])
  useEffect(() => {
    if (!opened || STATIC) return
    const t = setTimeout(() => (k + 1 < list.length ? setK(k + 1) : onClose?.()), seconds * 1000)
    return () => clearTimeout(t)
  }, [opened, k, t0])
  if (!opened || !list.length) return null
  const s = list[Math.min(k, list.length - 1)] ?? {}
  const a = s.author && typeof s.author === 'object' ? s.author : { name: String(s.author ?? '') }
  const go = (d) => { const n = k + d; if (n < 0) return; n >= list.length ? onClose?.() : setK(n) }
  return (
    <div data-od-kit="StoryViewer" className="fixed inset-0 z-[90] bg-black text-white">
      <Photo key={k} q={s.photo ?? ''} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute inset-x-3 flex gap-1" style={{ top: 'calc(var(--k-safe-area-top, 0px) + 10px)' }}>
        {list.map((_, i) => (
          <span key={i} className="flex-1 h-[3px] rounded-full bg-white/35 overflow-hidden">
            <span key={`${k}-${t0}`} className="block h-full bg-white" style={{ width: i < k ? '100%' : i > k ? '0%' : STATIC ? '40%' : undefined, animation: i === k && !STATIC ? `vs-story ${seconds}s linear forwards` : 'none' }} />
          </span>
        ))}
      </div>
      <div className="absolute inset-x-3 flex items-center gap-2.5" style={{ top: 'calc(var(--k-safe-area-top, 0px) + 24px)' }}>
        <Avatar name={a.name} photo={a.photo} size={34} />
        <span className="text-subhead font-semibold">{a.name}</span>
        {s.time && <span className="text-subhead opacity-70">{s.time}</span>}
        <button type="button" aria-label="Close" onClick={onClose} className="ml-auto w-10 h-10 flex items-center justify-center"><X className="w-6 h-6" /></button>
      </div>
      <button type="button" aria-label="Previous" onClick={() => go(-1)} className="absolute left-0 top-24 bottom-24 w-1/3" />
      <button type="button" aria-label="Next" onClick={() => go(1)} className="absolute right-0 top-24 bottom-24 w-2/3" />
      {s.text && <div className="absolute inset-x-5 bottom-10 text-title3 font-semibold leading-snug pointer-events-none">{s.text}</div>}
    </div>
  )
}

const ROW = 40
function WheelColumn({ values, value, onChange, width }) {
  const ref = useRef(null)
  const i = Math.max(0, values.indexOf(String(value)))
  useEffect(() => { const el = ref.current; if (el && Math.round(el.scrollTop / ROW) !== i) el.scrollTop = i * ROW }, [i])
  const settle = useRef(null)
  const onScroll = () => {
    clearTimeout(settle.current)
    settle.current = setTimeout(() => { const n = Math.min(values.length - 1, Math.max(0, Math.round(ref.current.scrollTop / ROW))); if (values[n] !== String(value)) onChange(values[n]) }, 90)
  }
  return (
    <div ref={ref} onScroll={onScroll} className="relative overflow-y-auto snap-y snap-mandatory [scrollbar-width:none]" style={{ height: ROW * 5, width, maskImage: 'linear-gradient(transparent, #000 30%, #000 70%, transparent)', WebkitMaskImage: 'linear-gradient(transparent, #000 30%, #000 70%, transparent)' }}>
      <div style={{ height: ROW * 2 }} />
      {values.map((v, n) => (
        <button key={v} type="button" onClick={() => { ref.current.scrollTo({ top: n * ROW, behavior: 'smooth' }); onChange(v) }} className="snap-center w-full flex items-center justify-center text-title2 tabular-nums" style={{ height: ROW, fontWeight: n === i ? 600 : 400, opacity: n === i ? 1 : 0.45 }}>{v}</button>
      ))}
      <div style={{ height: ROW * 2 }} />
    </div>
  )
}
/** The iOS wheel: one or more columns that scroll and snap, the chosen row in a band across the middle (a reminder's
 *  time, a duration, an amount). `columns: [['1', … '12'], ['00', '15', '30', '45'], ['AM', 'PM']]`, `value` one per
 *  column; `onChange(values)`. */
export function WheelPicker({ columns = [], value, onChange }) {
  const cols = (Array.isArray(columns) ? columns : []).map((c) => (Array.isArray(c) ? c : Array.isArray(c?.values) ? c.values : []).map(String))
  const [own, setOwn] = useState(() => cols.map((c) => c[0]))
  const cur = Array.isArray(value) ? value.map(String) : own
  const set = (ci, v) => { const next = cols.map((c, j) => (j === ci ? v : cur[j] ?? c[0])); onChange ? onChange(next) : setOwn(next) }
  return (
    <div data-od-kit="WheelPicker" className="relative mx-4 rounded-card bg-card flex justify-center gap-2 px-3">
      <div className="absolute inset-x-3 rounded-xl pointer-events-none" style={{ top: ROW * 2, height: ROW, background: 'rgba(120,120,128,.14)' }} />
      {cols.map((c, ci) => <WheelColumn key={ci} values={c} value={cur[ci] ?? c[0]} onChange={(v) => set(ci, v)} width={cols.length > 2 ? 72 : 96} />)}
    </div>
  )
}

/** A map of places with their prices on the pins (stays, rentals, restaurants): tap a pin to choose it — it grows and
 *  turns dark — and the chosen place's card can sit at the bottom (`children`). `pins: [{ id, price, label? }]`. */
export function PriceMap({ pins = [], value, onSelect, height = 320, seed = 'prices', currency = '', children }) {
  const W = 360, H = 320, r = seeded(seed)
  const list = (Array.isArray(pins) ? pins : []).slice(0, 9).map((p, i) => ({ id: String(p?.id ?? i), price: p?.price ?? '', x: 12 + r() * 76, y: 12 + r() * 64 }))
  const streets = []
  for (let i = 0; i < 7; i++) { const y = 14 + i * 46 + r() * 14; streets.push(`M -10 ${y} L ${W + 10} ${y + (r() - 0.5) * 50}`) }
  for (let i = 0; i < 5; i++) { const x = 20 + i * 78 + r() * 20; streets.push(`M ${x} -10 L ${x + (r() - 0.5) * 60} ${H + 10}`) }
  const [own, setOwn] = useState(list[0]?.id)
  const cur = value !== undefined ? String(value) : own
  return (
    <div data-od-kit="PriceMap" className="relative overflow-hidden rounded-[22px]" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <rect width={W} height={H} style={{ fill: 'var(--app-card-2, #eef0f3)' }} />
        <path d={`M -10 ${H * 0.7} C ${W * 0.3} ${H * 0.62}, ${W * 0.5} ${H * 0.9}, ${W + 10} ${H * 0.8} L ${W + 10} ${H + 10} L -10 ${H + 10} Z`} fill="rgba(10,132,255,.16)" />
        <rect x={W * 0.58} y={H * 0.12} width={W * 0.24} height={H * 0.2} rx="14" fill="rgba(52,199,89,.18)" />
        {streets.map((d, i) => <path key={i} d={d} style={{ stroke: 'var(--app-card, #ffffff)' }} strokeWidth={i % 3 === 0 ? 9 : 5} fill="none" strokeLinecap="round" />)}
      </svg>
      {list.map((p) => {
        const on = p.id === cur
        return (
          <button key={p.id} type="button" onClick={() => (onSelect ? onSelect(p.id) : setOwn(p.id))} aria-pressed={on}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-footnote font-bold shadow-md motion-safe:transition-transform"
            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: on ? 3 : 2, transform: `translate(-50%, -50%) scale(${on ? 1.15 : 1})`, background: on ? 'var(--color-primary)' : 'var(--app-card, #fff)', color: on ? '#fff' : 'inherit' }}>{typeof p.price === 'number' ? `${currency}${p.price.toLocaleString('en-US')}` : p.price}</button>
        )
      })}
      {children && <div className="absolute inset-x-0 bottom-0 p-3 z-[4]">{children}</div>}
    </div>
  )
}
