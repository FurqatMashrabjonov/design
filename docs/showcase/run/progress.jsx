import { Page, Navbar, BlockTitle, List, ListItem, Block } from 'konsta/react'
import { Mountain, CalendarDays, TrendingDown, TrendingUp, Target } from 'lucide-react'
import { useNav, AppTabbar, Bars, Meter, Tile, CountUp, tint } from '@od/kit'

const C = {"easyRun":"#3b82f6","tempo":"#10b981","intervals":"#f59e0b","longRun":"#8b5cf6","rest":"#ef4444"}

const WEEKS = [14, 16, 15, 18, 17, 20, 23, 5]
const WEEK_LABELS = ['11', '18', '25', '1', '8', '14', '21', '28']

const PACE = [
  { m: 'Jun', s: 412, label: '6:52' },
  { m: 'Jul', s: 401, label: '6:41' },
  { m: 'Aug', s: 390, label: '6:30' },
  { m: 'Sep', s: 378, label: '6:18' },
]
const GOAL_PACE = 355

const TYPES = {
  tempo: { name: 'Tempo Run', emoji: '🔥', color: C.tempo },
  easyRun: { name: 'Easy Run', emoji: '🟢', color: C.easyRun },
  longRun: { name: 'Long Run', emoji: '🏃', color: C.longRun },
  intervals: { name: 'Intervals', emoji: '⚡', color: C.intervals },
}

const RUNS = [
  { id: 'r1', date: 'Thu 1 Oct', type: 'tempo', km: '6.02', pace: '5:46' },
  { id: 'r2', date: 'Tue 29 Sep', type: 'easyRun', km: '5', pace: '6:37' },
  { id: 'r3', date: 'Sun 27 Sep', type: 'longRun', km: '12.4', pace: '6:42' },
  { id: 'r4', date: 'Sat 26 Sep', type: 'easyRun', km: '4', pace: '6:35' },
  { id: 'r5', date: 'Thu 24 Sep', type: 'intervals', km: '5.5', pace: '6:05' },
]

function PaceChart() {
  const W = 320, H = 130, top = 12, bottom = 22, left = 8, right = 8
  const min = 345, max = 420
  const y = (s) => top + ((max - s) / (max - min)) * (H - top - bottom)
  const x = (i) => left + (i / (PACE.length - 1)) * (W - left - right)
  const pts = PACE.map((p, i) => `${x(i)},${y(p.s)}`).join(' ')
  const area = `${x(0)},${H - bottom} ${pts} ${x(PACE.length - 1)},${H - bottom}`
  const gy = y(GOAL_PACE)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-primary">
      <defs>
        <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#paceFill)" />
      <line x1={left} x2={W - right} y1={gy} y2={gy} stroke={C.tempo} strokeWidth="1.5" strokeDasharray="5 4" />
      <text x={W - right} y={gy - 5} textAnchor="end" fontSize="10" fontWeight="600" fill={C.tempo}>Goal 5:55</text>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {PACE.map((p, i) => (
        <g key={p.m}>
          <circle cx={x(i)} cy={y(p.s)} r={i === PACE.length - 1 ? 5 : 3.5} fill="currentColor" />
          <text x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === PACE.length - 1 ? 'end' : 'middle'}
            fontSize="10" fill="currentColor" className="text-black/50 dark:text-white/50">{p.m}</text>
        </g>
      ))}
    </svg>
  )
}

export default function Screen() {
  const nav = useNav()
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Progress" subtitle="9-run streak · 164 days to race day" />

      <BlockTitle className="!mb-2">Weekly distance</BlockTitle>
      <div className="mx-4 bg-card rounded-card p-4 vs-rise">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-footnote text-black/55 dark:text-white/55">Last full week · 21–27 Sep</div>
            <div className="flex items-baseline gap-1">
              <span className="text-figure"><CountUp to={23} /></span>
              <span className="text-title3 text-black/55 dark:text-white/55">km</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-subhead font-semibold shrink-0" style={{ color: C.tempo }}>
            <TrendingUp className="w-4 h-4" /> +15%
          </div>
        </div>
        <div className="mt-3">
          <Bars values={WEEKS} labels={WEEK_LABELS} goal={25} height={130} highlight={7} />
        </div>
        <div className="mt-4 pt-3 border-t border-line">
          <div className="flex justify-between text-subhead mb-2">
            <span className="font-semibold">This week, in progress</span>
            <span className="text-black/55 dark:text-white/55">5 of 25 km</span>
          </div>
          <Meter value={5 / 25} />
          <div className="text-caption1 text-black/55 dark:text-white/55 mt-2">Weeks starting 11 Aug – 28 Sep · dashed line is this week's target</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        <button onClick={() => nav.push('run-summary')} className="bg-card rounded-card p-4 text-left vs-rise" style={{ animationDelay: '60ms' }}>
          <Tile color={C.longRun} tinted size={34}><Mountain className="w-5 h-5" style={{ color: C.longRun }} /></Tile>
          <div className="text-footnote text-black/55 dark:text-white/55 mt-3">Longest run</div>
          <div className="text-title1">12.4 <span className="text-subhead text-black/55 dark:text-white/55">km</span></div>
          <div className="text-footnote text-black/55 dark:text-white/55 truncate">Sun 27 Sep · 1:23:10</div>
        </button>
        <div className="bg-card rounded-card p-4 vs-rise" style={{ animationDelay: '120ms' }}>
          <Tile color={C.easyRun} tinted size={34}><CalendarDays className="w-5 h-5" style={{ color: C.easyRun }} /></Tile>
          <div className="text-footnote text-black/55 dark:text-white/55 mt-3">Total this year</div>
          <div className="text-title1"><CountUp to={412} /> <span className="text-subhead text-black/55 dark:text-white/55">km</span></div>
          <div className="text-footnote text-black/55 dark:text-white/55 truncate">Since 1 Jan 2026</div>
        </div>
      </div>

      <BlockTitle className="!mb-2">Average pace</BlockTitle>
      <div className="mx-4 bg-card rounded-card p-4 vs-rise" style={{ animationDelay: '180ms' }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-footnote text-black/55 dark:text-white/55">September</div>
            <div className="flex items-baseline gap-1">
              <span className="text-title1">6:18</span>
              <span className="text-subhead text-black/55 dark:text-white/55">/km</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-subhead font-semibold shrink-0" style={{ color: C.tempo }}>
            <TrendingDown className="w-4 h-4" /> 34 s faster since Jun
          </div>
        </div>
        <div className="mt-3"><PaceChart /></div>
        <div className="flex items-center gap-2 mt-2 rounded-2xl px-3 py-2" style={{ background: tint(C.tempo, 12) }}>
          <Target className="w-4 h-4 shrink-0" style={{ color: C.tempo }} />
          <span className="text-footnote">23 s/km to go to your 5:55 race pace</span>
        </div>
      </div>

      <BlockTitle>Recent runs</BlockTitle>
      <List strong inset dividers>
        {RUNS.map((r) => {
          const t = TYPES[r.type]
          return (
            <ListItem key={r.id} link
              linkProps={{ onClick: () => nav.push('run-summary', { id: r.id }) }}
              title={t.name}
              subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{r.date} · {r.pace}/km</span>}
              media={<Tile color={t.color} tinted size={40}><span className="text-xl">{t.emoji}</span></Tile>}
              after={<span className="text-headline" style={{ color: t.color }}>{r.km} km</span>} />
          )
        })}
      </List>
      <Block className="flex items-center gap-2 text-footnote text-black/55 dark:text-white/55">
        <span className="w-2 h-2 rounded-full" style={{ background: C.tempo }} />
        New best: fastest 5K 28:41, down from 29:30.
      </Block>

      <AppTabbar active="progress" />
    </Page>
  )
}
