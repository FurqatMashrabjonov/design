import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, Segmented, SegmentedButton } from 'konsta/react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { AppTabbar } from '@od/kit'

// ── date helpers (local time, no library) ────────────────────────────────────
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7)) // Monday first
const sameDay = (a, b) => !!a && !!b && ymd(a) === ymd(b)
const dayOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
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
function WeekStrip({ value, onChange, today = new Date(), marks = [] }) {
  const [start, setStart] = useState(() => startOfWeek(value))
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const marked = new Set(marks)
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
function MonthCalendar({ mode = 'single', value, onChange, month = new Date(), min, today = new Date(), marks = [] }) {
  const [shown, setShown] = useState(() => new Date(month.getFullYear(), month.getMonth(), 1))
  const first = startOfWeek(shown)
  const last = new Date(shown.getFullYear(), shown.getMonth() + 1, 0)
  const weeks = Math.ceil(((last - first) / 864e5 + 1) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i))
  const marked = new Set(marks)
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

// ── Timeline ─────────────────────────────────────────────────────────────────
// steps: [{ title, time, detail?, status: 'done' | 'current' | 'upcoming' }]
function Timeline({ steps }) {
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
const TODAY = new Date(2026, 9, 5) // Mon 5 Oct 2026
const WORKOUTS = ['2026-10-05', '2026-10-07', '2026-10-08', '2026-10-10', '2026-09-30', '2026-10-13']
const EVENTS = ['2026-10-09', '2026-10-14', '2026-10-17', '2026-10-22', '2026-10-23', '2026-10-30', '2026-11-04']
const ORDER = [
  { title: 'Order placed', time: 'Oct 3, 9:12 AM', status: 'done' },
  { title: 'Packed', time: 'Oct 3, 4:40 PM', detail: 'Brooklyn warehouse', status: 'done' },
  { title: 'Shipped', time: 'Oct 4, 8:05 AM', detail: 'UPS · 1Z 999 AA1 0123 4567', status: 'done' },
  { title: 'Out for delivery', time: '7:30 AM', detail: 'Arriving today between 12 and 2 PM', status: 'current' },
  { title: 'Delivered', time: 'Expected today', status: 'upcoming' },
]

function Section({ title, about, children }) {
  return <>
    <BlockTitle className="!mb-1">{title}</BlockTitle>
    <Block className="!mt-0">
      <p className="text-footnote opacity-60">{about}</p>
      <div className="mt-3 bg-card rounded-card p-4 shadow-sm">{children}</div>
    </Block>
  </>
}

export default function Screen() {
  const [day, setDay] = useState(addDays(TODAY, 2))
  const [mode, setMode] = useState('range')
  const [single, setSingle] = useState(addDays(TODAY, 4))
  const [range, setRange] = useState({ start: addDays(TODAY, 12), end: addDays(TODAY, 16) })
  return (
    <Page className="pb-32">
      <Navbar large title="Dates" />

      <Section title="WeekStrip" about="Seven days at a glance. Tap a day; dots mark days with a workout.">
        <WeekStrip value={day} onChange={setDay} today={TODAY} marks={WORKOUTS} />
      </Section>

      <Section title="MonthCalendar" about="Pick one day or a stay. Past days are disabled; dots mark events.">
        <Segmented strong rounded className="mb-4">
          <SegmentedButton strong rounded active={mode === 'single'} onClick={() => setMode('single')}>Single day</SegmentedButton>
          <SegmentedButton strong rounded active={mode === 'range'} onClick={() => setMode('range')}>Date range</SegmentedButton>
        </Segmented>
        {mode === 'range'
          ? <MonthCalendar key="range" mode="range" value={range} onChange={setRange} month={TODAY} min={TODAY} today={TODAY} marks={EVENTS} />
          : <MonthCalendar key="single" value={single} onChange={setSingle} month={TODAY} min={TODAY} today={TODAY} marks={EVENTS} />}
      </Section>

      <Section title="Timeline" about="Order tracking: done, the step in progress, and what comes next.">
        <Timeline steps={ORDER} />
      </Section>

      <AppTabbar active="dates" />
    </Page>
  )
}
