import { useState } from 'react'
import { Page, Button, Block, Link } from 'konsta/react'
import { Footprints, Minus, Plus, Flag, CalendarDays, Timer } from 'lucide-react'
import { useNav, Hero, Glow, Dots, Ring, Tile, tint } from '@od/kit'

const C = {"easyRun":"#3b82f6","tempo":"#10b981","intervals":"#f59e0b","longRun":"#8b5cf6","rest":"#ef4444"}

const DAYS = [
  { id: 'Mon', type: 'rest' },
  { id: 'Tue', type: 'easyRun', emoji: '🟢', label: 'Easy' },
  { id: 'Wed', type: 'rest' },
  { id: 'Thu', type: 'tempo', emoji: '🔥', label: 'Tempo' },
  { id: 'Fri', type: 'rest' },
  { id: 'Sat', type: 'easyRun', emoji: '🟢', label: 'Easy' },
  { id: 'Sun', type: 'longRun', emoji: '🏃', label: 'Long' },
]

const RACE_KM = 21.1

function fmtTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}:${String(m).padStart(2, '0')}:00`
}

function fmtPace(min) {
  const sec = Math.round((min * 60) / RACE_KM)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}/km`
}

function RunnerArt() {
  return (
    <div className="relative w-72 h-64 mx-auto flex items-center justify-center">
      <Glow color={C.tempo} size={280} opacity={0.35} />
      <div className="absolute inset-x-8 inset-y-4 rounded-[40px] rotate-6" style={{ background: tint(C.longRun, 22) }} />
      <Hero color={C.tempo} to={C.easyRun} className="absolute inset-x-8 inset-y-4 rounded-[40px] -rotate-3 flex flex-col items-center justify-center vs-float">
        <span className="text-6xl">🏃‍♀️</span>
        <div className="text-figure mt-3">21.1 km</div>
        <div className="text-subhead opacity-80">your first half</div>
      </Hero>
      <div className="absolute -right-1 bottom-2 bg-card rounded-2xl shadow-lg px-3 py-2 flex items-center gap-2 vs-float" style={{ animationDelay: '400ms' }}>
        <Ring value={0.58} size={36} stroke={5} color={C.tempo}>
          <span className="text-caption2 font-semibold">58%</span>
        </Ring>
        <div>
          <div className="text-caption1 font-semibold">Week 3</div>
          <div className="text-caption2 text-black/55 dark:text-white/55">Base block</div>
        </div>
      </div>
    </div>
  )
}

function RaceArt({ goal, setGoal }) {
  return (
    <div className="px-4 w-full max-w-sm mx-auto relative">
      <Hero color={C.longRun} to={C.easyRun} className="rounded-[28px] p-5 vs-float">
        <div className="flex items-center gap-2 text-subhead opacity-80">
          <Flag className="w-4 h-4" /> Your race
        </div>
        <div className="text-title2 mt-1 truncate">Lisbon Half Marathon</div>
        <div className="flex items-center gap-4 mt-3 text-subhead">
          <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> Sun 14 Mar 2027</span>
          <span className="opacity-80">21.1 km</span>
        </div>
        <div className="text-footnote opacity-80 mt-1">164 days to go 🇵🇹</div>
      </Hero>
      <div className="bg-card rounded-card mt-3 p-4 vs-rise" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-2 text-footnote text-black/55 dark:text-white/55">
          <Timer className="w-4 h-4" /> Goal time
        </div>
        <div className="flex items-center justify-between mt-2">
          <button
            className="w-11 h-11 rounded-full flex items-center justify-center active:opacity-60"
            style={{ background: tint(C.longRun) }}
            onClick={() => setGoal(Math.max(100, goal - 5))}
            aria-label="Faster goal"
          >
            <Minus className="w-5 h-5" style={{ color: C.longRun }} />
          </button>
          <div className="text-center">
            <div className="text-title1 tabular-nums">{fmtTime(goal)}</div>
            <div className="text-footnote font-semibold" style={{ color: C.longRun }}>{fmtPace(goal)} goal pace</div>
          </div>
          <button
            className="w-11 h-11 rounded-full flex items-center justify-center active:opacity-60"
            style={{ background: tint(C.longRun) }}
            onClick={() => setGoal(Math.min(180, goal + 5))}
            aria-label="Slower goal"
          >
            <Plus className="w-5 h-5" style={{ color: C.longRun }} />
          </button>
        </div>
      </div>
    </div>
  )
}

function WeekArt({ days, toggle }) {
  const runs = DAYS.filter((d) => days[d.id])
  return (
    <div className="px-4 w-full max-w-sm mx-auto">
      <div className="bg-card rounded-card p-4 vs-rise">
        <div className="flex items-center justify-between">
          <div className="text-headline">Base week 3</div>
          <div className="text-footnote text-black/55 dark:text-white/55">28 Sep – 4 Oct</div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 mt-4">
          {DAYS.map((d) => {
            const runnable = !!d.label
            const on = !!days[d.id]
            const color = runnable ? C[d.type] : C.rest
            return (
              <button
                key={d.id}
                disabled={!runnable}
                onClick={() => toggle(d.id)}
                className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 ${on ? 'vs-bounce' : ''}`}
                style={{ background: on ? color : runnable ? tint(color, 10) : 'transparent' }}
              >
                <span className={`text-caption2 font-semibold ${on ? 'text-white' : 'text-black/55 dark:text-white/55'}`}>{d.id}</span>
                <span className="text-base leading-none">{on ? d.emoji : runnable ? '＋' : '😴'}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="bg-card rounded-card mt-3 divide-y divide-line vs-rise" style={{ animationDelay: '120ms' }}>
        {runs.length === 0 && (
          <div className="p-4 text-subhead text-black/55 dark:text-white/55 text-center">Pick at least one run day</div>
        )}
        {runs.slice(0, 4).map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 border-line">
            <Tile color={C[d.type]} tinted size={30}><span className="text-sm">{d.emoji}</span></Tile>
            <div className="flex-1 text-subhead font-semibold truncate">{d.label} run</div>
            <div className="text-footnote font-semibold" style={{ color: C[d.type] }}>{d.id}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SLIDES = [
  { title: 'Your first half,\ncoached', text: 'From base miles to the finish line — one plan, one run, one split at a time.' },
  { title: 'Pick your race\nand goal', text: 'We build every pace around the time you want to see on the clock.' },
  { title: 'A plan that fits\nyour week', text: 'Choose the days you can run. Rest days are part of the plan too.' },
]

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const [goal, setGoal] = useState(125)
  const [days, setDays] = useState({ Tue: true, Thu: true, Sat: true, Sun: true })
  const last = i === SLIDES.length - 1
  const s = SLIDES[i]
  const toggle = (id) => setDays((d) => ({ ...d, [id]: !d[id] }))

  return (
    <Page className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-14 h-24">
        <div className="flex items-center gap-2">
          <Tile color={C.tempo} size={28}><Footprints className="w-4 h-4 text-white" /></Tile>
          <span className="text-headline">Stride Half</span>
        </div>
        {!last && <Link onClick={() => setI(SLIDES.length - 1)}>Skip</Link>}
      </div>

      <div key={i} className="flex-1 flex flex-col justify-center vs-rise">
        {i === 0 && <RunnerArt />}
        {i === 1 && <RaceArt goal={goal} setGoal={setGoal} />}
        {i === 2 && <WeekArt days={days} toggle={toggle} />}
        <Block className="text-center !mt-8">
          <h1 className="text-large-title whitespace-pre-line">{s.title}</h1>
          <p className="mt-3 text-body opacity-60">{s.text}</p>
        </Block>
      </div>

      <div className="mb-6"><Dots count={SLIDES.length} active={i} /></div>
      <Block className="!mb-12">
        <Button large rounded onClick={() => (last ? nav.reset('today') : setI(i + 1))}>
          {last ? 'Build My Plan' : 'Continue'}
        </Button>
        <div className="text-center mt-4 text-subhead">
          <span className="opacity-60">Already have an account? </span>
          <Link onClick={() => nav.reset('today')}>Log in</Link>
        </div>
      </Block>
    </Page>
  )
}
