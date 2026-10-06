// KIT-20: the building blocks top apps share and Konsta does not have — a week strip, a month calendar, a step
// timeline, a carousel, empty and loading states, pull to refresh, an accordion, swipe actions, ratings, an avatar
// stack, story rings and a code input. Hand-written and reviewed in a gallery (gallery/*.jsx) before they joined the
// kit; plain React + Tailwind on the style's tokens, so the export can copy this file as it is.
import { useEffect, useRef, useState } from 'react'
import { Button, Glass, List, ListItem, Preloader } from 'konsta/react'
import { ArrowDown, ChevronLeft, ChevronRight, Check, MapPin, Star, Plus } from 'lucide-react'
import { Dots, Photo, Avatar, Meter, tint, gradient, onColor, cssColor } from './ui.jsx'

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
