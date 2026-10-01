import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, Segmented, SegmentedButton } from 'konsta/react'
import { Check, ChevronDown, Play, Flag, Mountain, TrendingDown, Calendar } from 'lucide-react'
import { useNav, AppTabbar, Ring, Meter, tint } from '@od/kit'

const C = {"easyRun":"#3b82f6","tempo":"#10b981","intervals":"#f59e0b","longRun":"#8b5cf6","rest":"#ef4444"}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const range = (start, i) => {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7)
  const b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6)
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS[a.getMonth()]}–${b.getDate()} ${MONTHS[b.getMonth()]}`
}

const TYPES = {
  easyRun: { label: 'Easy', emoji: '🟢' },
  tempo: { label: 'Tempo', emoji: '🔥' },
  intervals: { label: 'Intervals', emoji: '⚡' },
  longRun: { label: 'Long', emoji: '🏃' },
  rest: { label: 'Rest', emoji: '😴' },
}

const BASE_START = new Date(2026, 8, 14)
const RACE_START = new Date(2026, 10, 23)

const BASE = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1
  const w = { n, dates: range(BASE_START, i), status: n < 3 ? 'done' : n === 3 ? 'current' : 'upcoming' }
  if (n === 1) return { ...w, km: 20, doneKm: 20, note: 'All 4 runs done', runs: [] }
  if (n === 2) return { ...w, km: 23, doneKm: 23, note: 'All 4 runs done', runs: [] }
  if (n === 3) return {
    ...w, km: 25, doneKm: 5, note: '1 of 4 runs · 5 of 25 km',
    runs: [
      { day: 'Tue 29 Sep', type: 'easyRun', km: '5 km', detail: '33:05 · 6:37/km', state: 'done' },
      { day: 'Thu 1 Oct', type: 'tempo', km: '6 km', detail: 'Target 5:45/km · 1 + 4 + 1 km', state: 'today' },
      { day: 'Sat 3 Oct', type: 'easyRun', km: '4 km', detail: '~6:40/km', state: 'upcoming' },
      { day: 'Sun 4 Oct', type: 'longRun', km: '10 km', detail: '~6:45/km', state: 'upcoming' },
    ],
  }
  if (n === 4) return {
    ...w, km: 26, doneKm: 0, note: 'Speed work arrives',
    runs: [{ day: 'This week', type: 'intervals', km: '6×400 m', detail: 'First interval session', state: 'upcoming' }],
  }
  return { ...w, km: null, doneKm: 0, note: 'Builds on week ' + (n - 1), runs: [] }
})

const RACE = Array.from({ length: 16 }, (_, i) => {
  const n = i + 1
  const phase = n === 13 ? 'Peak' : n === 16 ? 'Race week' : n >= 15 ? 'Taper' : 'Build'
  const runs = n === 13
    ? [{ day: 'Long run', type: 'longRun', km: '19 km', detail: 'Longest run of the plan', state: 'upcoming' }]
    : n === 16
      ? [{ day: 'Sun 14 Mar', type: 'race', km: '21.1 km', detail: 'Lisbon Half · goal 2:05:00', state: 'upcoming' }]
      : []
  return { n, dates: range(RACE_START, i), status: 'upcoming', phase, runs, km: null, doneKm: 0 }
})

function RunChip({ run, onOpen }) {
  const isRace = run.type === 'race'
  const color = isRace ? C.longRun : C[run.type]
  const t = isRace ? { label: 'Race', emoji: '🏁' } : TYPES[run.type]
  const today = run.state === 'today'
  return (
    <button
      onClick={today ? onOpen : undefined}
      className={`w-full min-h-11 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${today ? 'ring-2 ring-primary' : ''}`}
      style={{ background: tint(color, today ? 20 : 12) }}
    >
      <span className="text-xl leading-none">{t.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-subhead font-semibold">{t.label} · {run.km}</span>
          {today && <span className="text-caption2 font-bold uppercase tracking-wide text-primary">Today</span>}
        </div>
        <div className="text-footnote text-black/55 dark:text-white/55 truncate">{run.day} · {run.detail}</div>
      </div>
      {run.state === 'done' && (
        <span className="w-7 h-7 rounded-full flex items-center justify-center vs-bounce" style={{ background: color }}>
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </span>
      )}
      {today && (
        <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white" />
        </span>
      )}
      {run.state === 'upcoming' && <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: color }} />}
    </button>
  )
}

function WeekCard({ w, open, onToggle, onOpenRun, i, race }) {
  const progress = w.status === 'done' ? 1 : w.km ? w.doneKm / w.km : 0
  const sub = race ? w.phase : w.km ? `${w.km} km` : 'Upcoming'
  return (
    <div className="mx-4 mb-3 bg-card rounded-card overflow-hidden vs-rise" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 min-h-16 text-left">
        <Ring value={progress} size={40} stroke={4} color={w.status === 'done' ? C.tempo : undefined}>
          {w.status === 'done'
            ? <Check className="w-4 h-4" style={{ color: C.tempo }} strokeWidth={3} />
            : <span className="text-footnote font-bold">{w.n}</span>}
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-headline">Week {w.n}</span>
            {w.status === 'current' && (
              <span className="text-caption2 font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary text-white">Now</span>
            )}
            {race && w.phase === 'Peak' && <Mountain className="w-4 h-4" style={{ color: C.longRun }} />}
            {race && w.phase === 'Taper' && <TrendingDown className="w-4 h-4" style={{ color: C.easyRun }} />}
            {race && w.n === 16 && <Flag className="w-4 h-4" style={{ color: C.rest }} />}
          </div>
          <div className="text-footnote text-black/55 dark:text-white/55 truncate">{w.dates} · {sub}</div>
        </div>
        <ChevronDown className={`w-5 h-5 opacity-40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {w.status === 'current' && <Meter value={progress} height={6} />}
          {w.runs.map((r, j) => <RunChip key={j} run={r} onOpen={onOpenRun} />)}
          {!race && w.status === 'done' && (
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((k) => (
                <span key={k} className="flex-1 h-9 rounded-xl flex items-center justify-center" style={{ background: tint(C.tempo, 14) }}>
                  <Check className="w-4 h-4" style={{ color: C.tempo }} strokeWidth={3} />
                </span>
              ))}
            </div>
          )}
          {w.status === 'current' && (
            <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: tint(C.rest, 10) }}>
              <span className="text-xl leading-none">😴</span>
              <span className="text-footnote text-black/55 dark:text-white/55">Rest · Mon, Wed, Fri</span>
            </div>
          )}
          <p className="text-footnote text-black/55 dark:text-white/55 pt-1">
            {race
              ? w.n === 13 ? 'Peak week — your 19 km long run.' : w.n >= 15 ? 'Taper — less volume, fresh legs for race day.' : 'Sessions unlock as you finish the base block.'
              : w.note}
          </p>
        </div>
      )}
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [seg, setSeg] = useState('base')
  const [open, setOpen] = useState({ 'base-3': true, 'race-13': true })
  const weeks = seg === 'base' ? BASE : RACE
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Training Plan" subtitle="Lisbon Half · 14 Mar 2027 · Goal 2:05:00" />

      <div className="mx-4 mt-2 bg-card rounded-card p-4 vs-rise">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-footnote text-black/55 dark:text-white/55">Base block</div>
            <div className="text-title2">Week 3 <span className="text-black/40 dark:text-white/40 font-semibold">of 10</span></div>
          </div>
          <div className="text-right">
            <div className="text-title3 text-primary">164</div>
            <div className="text-caption1 text-black/55 dark:text-white/55">days to race</div>
          </div>
        </div>
        <div className="mt-3"><Meter value={0.25} height={8} /></div>
        <div className="mt-2 flex justify-between text-caption1 text-black/55 dark:text-white/55">
          <span>14 Sep</span><span>22 Nov</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: 'This week', value: '5', unit: 'of 25 km', color: C.easyRun },
            { label: 'Runs', value: '1', unit: 'of 4', color: C.tempo },
            { label: 'Goal pace', value: '5:55', unit: 'per km', color: C.longRun },
          ].map((s) => (
            <div key={s.label} className="bg-card-2 rounded-2xl px-3 py-2.5">
              <div className="text-caption1 text-black/55 dark:text-white/55">{s.label}</div>
              <div className="text-title3" style={{ color: s.color }}>{s.value}</div>
              <div className="text-caption2 text-black/55 dark:text-white/55">{s.unit}</div>
            </div>
          ))}
        </div>
      </div>

      <Block className="!my-4">
        <Segmented strong rounded>
          <SegmentedButton rounded active={seg === 'base'} onClick={() => setSeg('base')}>Base</SegmentedButton>
          <SegmentedButton rounded active={seg === 'race'} onClick={() => setSeg('race')}>Race (16 wks)</SegmentedButton>
        </Segmented>
      </Block>

      <div className="flex gap-2 overflow-x-auto px-4 pb-1">
        {Object.entries(TYPES).map(([k, t]) => (
          <span key={k} className="shrink-0 flex items-center gap-1.5 rounded-full px-3 h-8 text-footnote font-medium" style={{ background: tint(C[k], 14) }}>
            <span className="w-2 h-2 rounded-full" style={{ background: C[k] }} />{t.label}
          </span>
        ))}
      </div>

      <BlockTitle className="!mb-2">{seg === 'base' ? 'Base · 14 Sep–22 Nov' : 'Race · 23 Nov–14 Mar'}</BlockTitle>
      {weeks.map((w, i) => {
        const k = `${seg}-${w.n}`
        return (
          <WeekCard key={k} w={w} i={i} race={seg === 'race'} open={!!open[k]}
            onToggle={() => toggle(k)} onOpenRun={() => nav.push('live-run')} />
        )
      })}

      <Block className="flex items-center gap-2 text-footnote opacity-60">
        <Calendar className="w-4 h-4" /> {seg === 'base' ? 'Race plan starts Mon 23 Nov.' : 'Peak 19 km in week 13, taper weeks 15–16.'}
      </Block>

      <AppTabbar active="plan" />
    </Page>
  )
}
