import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton, Button, Link, Sheet, Range, Toast } from 'konsta/react'
import { Flame, MapPin, Timer, Share, Settings2, GlassWater, CupSoda, Coffee } from 'lucide-react'
import { useNav, Ring, CountUp, Bars, Area, WaterGlass } from '@od/kit'

const COLORS = { steps: '#ff9f0a', water: '#0a84ff', habits: '#30d158', sleep: '#5e5ce6', mind: '#bf5af2', pink: '#ff375f' }
const ACCENTS = [
  ['Indigo', '#5e5ce6'], ['Blue', '#0a84ff'], ['Green', '#30d158'], ['Orange', '#ff9f0a'], ['Pink', '#ff375f'], ['Purple', '#bf5af2'],
]
const state = {
  user: { name: 'Aziza Karimova', email: 'aziza@vita.app', city: 'Tashkent', joined: 'March 2026', avatarColor: '#ff9f0a' },
  settings: { dark: false, accent: '#5e5ce6', reminders: true, dailySummary: true, streakAlerts: true, sound: false, units: 'metric', weekStart: 'Monday' },
  steps: { today: 7843, goal: 10000, week: [6210, 9120, 10432, 5480, 11206, 8120, 7843], distance: 5.8, kcal: 312, minutes: 64 },
  water: { ml: 1500, goal: 2500, log: [['07:40', 250], ['09:15', 500], ['12:30', 250], ['15:05', 500]] },
  habits: [
    { id: 'meditate', name: 'Meditate', emoji: '🧘', color: COLORS.mind, goal: '10 min', total: 1, done: 1, streak: 41, best: 41, part: 'Morning', week: [1, 1, 1, 1, 1, 1, 1] },
    { id: 'run', name: 'Morning run', emoji: '🏃', color: COLORS.pink, goal: '5 km', total: 1, done: 1, streak: 23, best: 31, part: 'Morning', week: [1, 1, 0, 1, 1, 1, 1] },
    { id: 'vitamins', name: 'Vitamins', emoji: '💊', color: COLORS.steps, goal: '1 time', total: 1, done: 0, streak: 12, best: 20, part: 'Morning', week: [1, 1, 1, 0, 1, 1, 0] },
    { id: 'read', name: 'Read', emoji: '📖', color: COLORS.sleep, goal: '20 pages', total: 20, done: 12, streak: 8, best: 19, part: 'Evening', week: [1, 0, 1, 1, 1, 0, 0] },
    { id: 'journal', name: 'Journal', emoji: '✍️', color: COLORS.water, goal: '1 entry', total: 1, done: 0, streak: 3, best: 14, part: 'Evening', week: [0, 1, 1, 0, 0, 1, 0] },
    { id: 'nosugar', name: 'No sugar', emoji: '🍭', color: COLORS.habits, goal: 'all day', total: 1, done: 0, streak: 5, best: 9, part: 'Anytime', week: [1, 1, 1, 1, 1, 0, 0] },
  ],
  inbox: [
    { id: 1, icon: '🔥', title: '41-day streak!', text: 'Meditate is your longest streak yet. Keep it going.', time: '8m' },
    { id: 2, icon: '💧', title: 'Time for water', text: 'You are 1,000 ml away from today’s goal.', time: '1h' },
    { id: 3, icon: '🏅', title: 'New award: Early Bird', text: 'Five morning runs before 7 AM this month.', time: 'Yesterday' },
    { id: 4, icon: '📈', title: 'Weekly summary is ready', text: 'You completed 86% of your habits — up 9% from last week.', time: 'Mon' },
  ],
  premium: false,
}
const fmt = (n) => n.toLocaleString('en-US')
const TODAY = 'Sunday, September 27'
const dispatch = () => {}

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export default function Steps() {
  const nav = useNav()
  const s = state.steps
  const [range, setRange] = useState('Week')
  const month = Array.from({ length: 30 }, (_, i) => 5200 + ((i * 1733) % 6400))
  return (
    <Page className="pb-10">
      <Navbar transparent title="Steps" left={<NavbarBackLink showText={false} onClick={nav.pop} />} right={<Link iconOnly><Share className="w-5 h-5" /></Link>} />
      <Block className="flex flex-col items-center !mt-4">
        <Ring value={s.today / s.goal} size={220} stroke={22} color={COLORS.steps}>
          <div className="text-center">
            <div className="text-[44px] font-bold tracking-tight leading-none"><CountUp to={s.today} /></div>
            <div className="opacity-60 mt-1">of {fmt(s.goal)} steps</div>
          </div>
        </Ring>
      </Block>
      <div className="grid grid-cols-3 gap-3 px-4">
        {[[MapPin, `${s.distance} km`, 'Distance'], [Flame, `${s.kcal}`, 'kcal'], [Timer, `${s.minutes}`, 'Active min']].map(([I, v, k], i) => (
          <div key={k} className="rounded-2xl p-3 bg-white dark:bg-[#1c1c1e] vs-rise" style={{ animationDelay: `${i * 70}ms` }}>
            <I className="w-5 h-5" style={{ color: COLORS.steps }} />
            <div className="text-xl font-bold mt-2">{v}</div>
            <div className="text-xs opacity-60">{k}</div>
          </div>
        ))}
      </div>
      <Block className="!mt-6 !mb-3">
        <Segmented strong rounded>
          {['Day', 'Week', 'Month'].map((r) => <SegmentedButton key={r} rounded active={range === r} onClick={() => setRange(r)}>{r}</SegmentedButton>)}
        </Segmented>
      </Block>
      <Block strong inset className="!py-5">
        <div className="flex items-baseline justify-between mb-4">
          <div><div className="text-xs opacity-60">Daily average</div><div className="text-2xl font-bold">{range === 'Month' ? '8,190' : '8,344'}</div></div>
          <div className="text-sm font-semibold" style={{ color: COLORS.habits }}>▲ 12% vs last {range.toLowerCase()}</div>
        </div>
        {range === 'Month' ? <Area values={month} color={COLORS.steps} /> : range === 'Day' ? <Bars values={[0, 0, 320, 1800, 900, 1200, 600, 2400, 623]} color={COLORS.steps} labels={['6', '8', '10', '12', '14', '16', '18', '20', 'now']} /> : <Bars values={s.week} goal={s.goal} color={COLORS.steps} labels={WEEK} />}
      </Block>
      <BlockTitle>Highlights</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Best day this month" after="14,208" media={<span className="text-2xl">🏆</span>} />
        <ListItem title="Goal reached" after="12 of 27 days" media={<span className="text-2xl">🎯</span>} />
        <ListItem title="Longest walk" after="6.4 km · Sep 19" media={<span className="text-2xl">🥾</span>} />
      </List>
    </Page>
  )
}
