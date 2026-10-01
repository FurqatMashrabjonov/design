import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Card, Link, Button, Chip } from 'konsta/react'
import { Play, Flag, Lightbulb, Gauge, Timer, Settings } from 'lucide-react'
import { useNav, AppTabbar, Ring, CountUp, Avatar, Tile, Meter, tint } from '@od/kit'

const C = {"easyRun":"#3b82f6","tempo":"#10b981","intervals":"#f59e0b","longRun":"#8b5cf6","rest":"#ef4444"}

const WEEK = { runs: 1, runsGoal: 4, km: 5, kmGoal: 25 }
const DAYS = [
  { d: 'Tue', date: '29 Sep', color: C.easyRun, done: true, today: false },
  { d: 'Thu', date: '1 Oct', color: C.tempo, done: false, today: true },
  { d: 'Sat', date: '3 Oct', color: C.easyRun, done: false, today: false },
  { d: 'Sun', date: '4 Oct', color: C.longRun, done: false, today: false },
]
const COMING = [
  { id: 'sat', title: 'Easy Run · 4 km', day: 'Sat 3 Oct', pace: '~6:40/km', emoji: '🟢', color: C.easyRun },
  { id: 'sun', title: 'Long Run · 10 km', day: 'Sun 4 Oct', pace: '~6:45/km', emoji: '🏃', color: C.longRun },
]
const PHASES = [
  { label: 'Warm-up', km: '1 km', w: 1 },
  { label: 'Tempo', km: '4 km', w: 4 },
  { label: 'Cool-down', km: '1 km', w: 1 },
]

export default function Screen() {
  const nav = useNav()
  const [tipOpen, setTipOpen] = useState(false)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Today" subtitle="Thursday, 1 October"
        right={<Link iconOnly onClick={() => nav.reset('profile')}><Avatar name="Maya Ferreira" color={C.tempo} size={32} /></Link>} />

      <div className="px-4 mt-1 mb-4 flex items-center justify-between gap-3">
        <div className="text-title3 truncate">Bom dia, Maya</div>
        <Chip className="shrink-0" media={<Flag className="w-4 h-4 text-primary" />}
          onClick={() => nav.reset('plan')}>164 days to Lisbon Half</Chip>
      </div>

      <div className="mx-4 bg-card rounded-card p-5 vs-rise">
        <div className="flex items-center gap-5">
          <Ring value={WEEK.km / WEEK.kmGoal} size={150} stroke={14} color={C.tempo}>
            <div className="text-center">
              <div className="text-figure leading-none"><CountUp to={WEEK.km} /></div>
              <div className="text-footnote text-black/55 dark:text-white/55">of {WEEK.kmGoal} km</div>
            </div>
          </Ring>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="text-caption1 text-black/55 dark:text-white/55">Base week 3 · 28 Sep–4 Oct</div>
              <div className="text-title3 mt-0.5">{WEEK.runs} of {WEEK.runsGoal} runs</div>
            </div>
            <div>
              <div className="flex justify-between text-caption1 text-black/55 dark:text-white/55 mb-1"><span>Distance</span><span>20 km left</span></div>
              <Meter value={WEEK.km / WEEK.kmGoal} color={C.tempo} />
            </div>
            <div className="text-footnote text-black/55 dark:text-white/55">🔥 9-run streak</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-line">
          {DAYS.map((x) => (
            <div key={x.d} className="flex flex-col items-center gap-1.5">
              <span className="text-caption1 font-semibold" style={x.today ? { color: x.color } : undefined}>{x.d}</span>
              <span className="w-3.5 h-3.5 rounded-full"
                style={x.done ? { background: x.color } : x.today ? { background: x.color, boxShadow: `0 0 0 4px ${tint(x.color, 25)}` } : { border: `2px solid ${x.color}` }} />
              <span className="text-caption2 text-black/55 dark:text-white/55">{x.date}</span>
            </div>
          ))}
        </div>
      </div>

      <BlockTitle className="!mt-7 !mb-2">Today's workout</BlockTitle>
      <div className="mx-4 bg-card rounded-card p-5 vs-rise" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-3">
          <Tile tinted color={C.tempo} size={48}><span className="text-2xl">🔥</span></Tile>
          <div className="flex-1 min-w-0">
            <div className="text-headline truncate">Tempo Run · 6 km</div>
            <div className="text-subhead" style={{ color: C.tempo }}>Thu 1 Oct · Today</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-card-2 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-caption1 text-black/55 dark:text-white/55"><Gauge className="w-4 h-4" />Target pace</div>
            <div className="text-title3 mt-1" style={{ color: C.tempo }}>5:45<span className="text-footnote text-black/55 dark:text-white/55"> /km</span></div>
          </div>
          <div className="bg-card-2 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-caption1 text-black/55 dark:text-white/55"><Timer className="w-4 h-4" />Est. time</div>
            <div className="text-title3 mt-1">~35<span className="text-footnote text-black/55 dark:text-white/55"> min</span></div>
          </div>
        </div>

        <div className="flex gap-1 mt-4">
          {PHASES.map((p) => (
            <div key={p.label} style={{ flex: p.w }} className="min-w-0">
              <div className="h-2 rounded-full" style={{ background: p.label === 'Tempo' ? C.tempo : tint(C.tempo, 35) }} />
              <div className="text-caption2 mt-1.5 truncate text-black/55 dark:text-white/55">{p.label} · {p.km}</div>
            </div>
          ))}
        </div>
        <div className="text-footnote text-black/55 dark:text-white/55 mt-3">
          Ease in for 1 km, hold 5:45/km for 4 km, then jog 1 km to cool down.
        </div>

        <Button large rounded className="mt-5" onClick={() => nav.push('live-run')}>
          <Play className="w-5 h-5 mr-2 fill-current" />Start run
        </Button>
      </div>

      <BlockTitle className="!mt-7">Coming up</BlockTitle>
      <List strong inset dividers>
        {COMING.map((r) => (
          <ListItem key={r.id} link onClick={() => nav.reset('plan')}
            title={r.title}
            subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{r.day}</span>}
            media={<Tile tinted color={r.color} size={40}>{r.emoji}</Tile>}
            after={<span className="text-subhead font-semibold" style={{ color: r.color }}>{r.pace}</span>} />
        ))}
      </List>

      <Card className="!mx-4 !rounded-[24px] vs-rise" style={{ animationDelay: '160ms' }}>
        <button onClick={() => setTipOpen(!tipOpen)} className="w-full flex items-start gap-3 text-left">
          <span className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center text-primary bg-primary/10">
            <Lightbulb className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-headline">Coach Ana's tip</div>
            <div className="text-subhead text-black/55 dark:text-white/55 mt-0.5">
              Tempo should feel "comfortably hard" — you can speak a few words, not full sentences.
              {tipOpen && ' If km 2 feels too fast, back off 5 seconds. Steady beats heroic on race day.'}
            </div>
            <div className="text-footnote text-primary mt-1.5">{tipOpen ? 'Show less' : 'Read more'}</div>
          </div>
        </button>
      </Card>

      <AppTabbar active="today" />
    </Page>
  )
}
