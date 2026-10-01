import { Page, Navbar, Block, BlockTitle } from 'konsta/react'
import { Flame, Trophy, Moon, Leaf, Target, Wind, Play, Clock } from 'lucide-react'
import { useNav, AppTabbar, Bars, CountUp, Tile, Photo, Meter, tint } from '@od/kit'

const C = {"sleep":"#c99a3e","anxiety":"#c07580","focus":"#5f9e94","breathing":"#8a7bb0","stories":"#d0845a"}

const WEEK = [14, 10, 22, 12, 0, 0, 0]
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MOODS = [
  { emoji: '😣', name: 'Awful' },
  { emoji: '😔', name: 'Low' },
  { emoji: '😐', name: 'Okay' },
  { emoji: '🙂', name: 'Good' },
  { emoji: '😌', name: 'Calm' },
]
const TREND = [1, 2, 3, 2, 3, 4, 2]
const TREND_DAYS = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']
const CATEGORIES = [
  { id: 'sleep', name: 'Sleep', min: 26, icon: Moon },
  { id: 'anxiety', name: 'Anxiety', min: 16, icon: Leaf },
  { id: 'breathing', name: 'Breathing', min: 10, icon: Wind },
  { id: 'focus', name: 'Focus', min: 6, icon: Target },
]

function MoodChart() {
  const x0 = 44, x1 = 306, top = 14, step = 26
  const xs = TREND.map((_, i) => x0 + (i * (x1 - x0)) / (TREND.length - 1))
  const ys = TREND.map((m) => top + (4 - m) * step)
  const line = xs.map((x, i) => `${i ? 'L' : 'M'}${x},${ys[i]}`).join(' ')
  const area = `${line} L${x1},${top + 4 * step} L${x0},${top + 4 * step} Z`
  return (
    <svg viewBox="0 0 320 150" className="w-full h-auto text-primary">
      {MOODS.map((m, i) => {
        const y = top + (4 - i) * step
        return (
          <g key={m.name}>
            <line x1={x0} x2={x1} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 4" />
            <text x="16" y={y + 6} fontSize="16" textAnchor="middle">{m.emoji}</text>
          </g>
        )
      })}
      <path d={area} fill="currentColor" fillOpacity="0.08" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 6 : 3.5} fill="currentColor"
          stroke="var(--color-card, transparent)" strokeWidth={i === xs.length - 1 ? 3 : 0} />
      ))}
      {TREND_DAYS.map((d, i) => (
        <text key={i} x={xs[i]} y="144" fontSize="11" textAnchor="middle" fill="currentColor"
          className="text-black/50 dark:text-white/50" style={{ fill: 'currentColor', opacity: i === 6 ? 1 : 0.55, fontWeight: i === 6 ? 700 : 400 }}>
          {d}
        </text>
      ))}
    </svg>
  )
}

export default function Screen() {
  const nav = useNav()
  const maxCat = Math.max(...CATEGORIES.map((c) => c.min))

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Your Progress" subtitle="47 sessions · 612 minutes since August" />

      <div className="mx-4 mt-2 bg-card rounded-card p-5 vs-rise">
        <div className="text-subhead text-black/55 dark:text-white/55">This week</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-figure text-primary"><CountUp to={58} /></span>
          <span className="text-title3 text-black/55 dark:text-white/55">min</span>
        </div>
        <div className="text-footnote text-black/55 dark:text-white/55 mt-1">12 minutes so far today · Thursday</div>
        <div className="mt-5">
          <Bars values={WEEK} labels={WEEK_LABELS} highlight={3} height={130} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        {[
          { label: 'Current streak', value: 6, icon: Flame, color: C.stories, note: 'Keep it glowing' },
          { label: 'Longest streak', value: 14, icon: Trophy, color: C.sleep, note: 'Your best run' },
        ].map((t, i) => (
          <div key={t.label} className="bg-card rounded-card p-4 vs-rise" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: tint(t.color, 20) }}>
              <t.icon className="w-5 h-5" style={{ color: t.color }} />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-title1" style={{ color: t.color }}>{t.value}</span>
              <span className="text-subhead text-black/55 dark:text-white/55">days</span>
            </div>
            <div className="text-headline mt-0.5">{t.label}</div>
            <div className="text-footnote text-black/55 dark:text-white/55">{t.note}</div>
          </div>
        ))}
      </div>

      <BlockTitle className="!mb-2">Mood, last 7 days</BlockTitle>
      <div className="mx-4 bg-card rounded-card p-4 vs-rise" style={{ animationDelay: '180ms' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-headline">From Low to Calm</div>
            <div className="text-footnote text-black/55 dark:text-white/55">Today you checked in feeling Okay</div>
          </div>
          <span className="text-3xl">😐</span>
        </div>
        <MoodChart />
      </div>

      <BlockTitle className="!mb-2">By category</BlockTitle>
      <div className="mx-4 bg-card rounded-card px-4 py-2 vs-rise" style={{ animationDelay: '240ms' }}>
        {CATEGORIES.map((c, i) => (
          <div key={c.id} className={`flex items-center gap-3 py-3 ${i ? 'border-t border-line' : ''}`}>
            <Tile color={C[c.id]} tinted size={36}>
              <c.icon className="w-5 h-5" style={{ color: C[c.id] }} />
            </Tile>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <span className="text-headline truncate">{c.name}</span>
                <span className="text-subhead font-semibold" style={{ color: C[c.id] }}>{c.min} min</span>
              </div>
              <div className="mt-2">
                <Meter value={c.min / maxCat} color={C[c.id]} height={8} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <BlockTitle className="!mb-2">Pick up where you left off</BlockTitle>
      <button
        onClick={() => nav.push('player')}
        className="mx-4 w-[calc(100%-2rem)] text-left bg-card rounded-card overflow-hidden flex items-center gap-3 p-3 active:opacity-80 vs-rise"
        style={{ animationDelay: '300ms' }}
      >
        <Photo q="soft linen bed morning" className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-headline truncate">Body Scan for Rest</div>
          <div className="text-footnote text-black/55 dark:text-white/55 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> 4 of 12 min · Elena Ward
          </div>
          <div className="mt-2"><Meter value={4 / 12} color={C.sleep} height={6} /></div>
        </div>
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: tint(C.sleep, 22) }}>
          <Play className="w-5 h-5" style={{ color: C.sleep }} fill="currentColor" />
        </div>
      </button>

      <Block className="text-footnote text-center text-black/55 dark:text-white/55">
        Three quiet days left this week. Even five minutes counts.
      </Block>

      <AppTabbar active="stats" />
    </Page>
  )
}
