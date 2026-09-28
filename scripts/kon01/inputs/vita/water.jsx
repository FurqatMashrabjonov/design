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
export default function Water() {
  const nav = useNav()
  const w = state.water
  const [sheet, setSheet] = useState(false)
  const [goal, setGoal] = useState(w.goal)
  const [toast, setToast] = useState('')
  const add = (ml) => {
    dispatch({ type: 'addWater', ml })
    if (w.ml < w.goal && w.ml + ml >= w.goal) setToast('Goal reached! 🎉 Nicely done.')
    else setToast(`+${ml} ml logged`)
    setTimeout(() => setToast(''), 1600)
  }
  const cups = [[GlassWater, 250, 'Glass'], [CupSoda, 500, 'Bottle'], [Coffee, 150, 'Cup']]
  return (
    <Page className="pb-10">
      <Navbar transparent title="Water" left={<NavbarBackLink showText={false} onClick={nav.pop} />} right={<Link iconOnly onClick={() => setSheet(true)}><Settings2 className="w-5 h-5" /></Link>} />
      <Block className="text-center !mt-2">
        <div className="text-[44px] font-bold tracking-tight" style={{ color: COLORS.water }}><CountUp to={w.ml} /> <span className="text-xl opacity-60 text-black dark:text-white">ml</span></div>
        <div className="opacity-60">{w.ml >= w.goal ? 'Goal reached — keep sipping' : `${fmt(w.goal - w.ml)} ml to your ${fmt(w.goal)} ml goal`}</div>
      </Block>
      <WaterGlass value={w.ml / w.goal} color={COLORS.water} />
      <div className="grid grid-cols-3 gap-3 px-4 mt-8">
        {cups.map(([I, ml, k]) => (
          <button key={ml} onClick={() => add(ml)} className="rounded-2xl py-3 flex flex-col items-center gap-1 active:scale-95 transition bg-white dark:bg-[#1c1c1e]">
            <I className="w-6 h-6" style={{ color: COLORS.water }} />
            <span className="font-semibold">+{ml}</span>
            <span className="text-xs opacity-50">{k}</span>
          </button>
        ))}
      </div>
      <BlockTitle className="flex justify-between"><span>Today’s log</span>{w.log.length > 0 && <Link className="!text-[15px] !font-normal" onClick={() => dispatch({ type: 'addWater', ml: -w.log.at(-1)[1] })}>Undo last</Link>}</BlockTitle>
      <List strong inset dividers>
        {[...w.log].reverse().map(([t, ml], i) => <ListItem key={i + t} title={`${ml} ml`} after={t} media={<GlassWater className="w-5 h-5" style={{ color: COLORS.water }} />} />)}
      </List>
      <Sheet className="pb-safe" opened={sheet} onBackdropClick={() => setSheet(false)}>
        <Block className="!mt-6">
          <div className="text-center font-semibold text-lg">Daily goal</div>
          <div className="text-center text-4xl font-bold mt-3" style={{ color: COLORS.water }}>{fmt(goal)} ml</div>
          <div className="text-center text-sm opacity-60">Recommended for you: 2,400 ml</div>
          <div className="mt-6"><Range min={1000} max={4000} step={100} value={goal} onChange={(e) => setGoal(Number(e.target.value))} /></div>
          <Button large rounded className="mt-6" onClick={() => setSheet(false)}>Save</Button>
        </Block>
      </Sheet>
      <Toast position="center" opened={!!toast}>{toast}</Toast>
    </Page>
  )
}
