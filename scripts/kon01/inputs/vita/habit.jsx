import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, ListInput, Link, Segmented, SegmentedButton, Stepper, Toggle, Button, Actions, ActionsGroup, ActionsButton, ActionsLabel, Searchbar, Dialog, DialogButton } from 'konsta/react'
import { Plus, Flame, Bell, Clock, Repeat, Target, Pencil } from 'lucide-react'
import { useNav, AppTabbar, Ring } from '@od/kit'

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

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export default function Habit({ id }) {
  const nav = useNav()
  const h = state.habits.find((x) => x.id === id) ?? state.habits[0]
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [remind, setRemind] = useState(true)
  const heat = Array.from({ length: 84 }, (_, i) => ((i * 37 + h.streak) % 11 > 2 ? ((i * 13) % 4) / 3 + 0.25 : 0))
  return (
    <Page className="pb-10">
      <Navbar title={h.name} left={<NavbarBackLink showText={false} onClick={nav.pop} />} right={<Link onClick={() => setMenu(true)}>Edit</Link>} />
      <Block className="flex flex-col items-center !mt-6">
        <Ring value={h.done / h.total} size={170} stroke={16} color={h.color}>
          <div className="text-center">
            <div className="text-5xl">{h.emoji}</div>
            <div className="text-sm font-semibold mt-1" style={{ color: h.color }}>{h.done}/{h.total} today</div>
          </div>
        </Ring>
        {h.total > 1 ? (
          <Stepper className="mt-5" value={h.done} rounded raised large onPlus={() => dispatch({ type: 'stepHabit', id: h.id, by: 1 })} onMinus={() => dispatch({ type: 'stepHabit', id: h.id, by: -1 })} />
        ) : (
          <Button rounded large className="!w-56 mt-5" style={{ background: h.done >= h.total ? 'rgba(120,120,128,.25)' : h.color }} onClick={() => dispatch({ type: 'toggleHabit', id: h.id })}>{h.done >= h.total ? 'Done for today ✓' : 'Mark as done'}</Button>
        )}
      </Block>
      <div className="grid grid-cols-3 gap-3 px-4 mt-2">
        {[['Streak', `${h.streak}`, 'days'], ['Best', `${h.best}`, 'days'], ['Rate', '86', '%']].map(([k, v, u]) => (
          <div key={k} className="rounded-2xl p-3 text-center bg-white dark:bg-[#1c1c1e]">
            <div className="text-xs opacity-60">{k}</div>
            <div className="text-2xl font-bold" style={{ color: h.color }}>{v}<span className="text-xs opacity-60 font-medium"> {u}</span></div>
          </div>
        ))}
      </div>
      <BlockTitle>Last 12 weeks</BlockTitle>
      <Block strong inset className="!py-4">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 justify-between">
          {heat.map((v, i) => <span key={i} className="w-[18px] h-[18px] rounded-[5px]" style={{ background: v ? `color-mix(in oklab, ${h.color} ${Math.round(v * 100)}%, transparent)` : 'rgba(120,120,128,.14)' }} />)}
        </div>
        <div className="flex justify-between text-xs opacity-50 mt-3"><span>Jul</span><span>Aug</span><span>Sep</span></div>
      </Block>
      <BlockTitle>Details</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Goal" after={h.goal} media={<Target className="w-6 h-6" style={{ color: h.color }} />} />
        <ListItem title="Repeat" after="Every day" media={<Repeat className="w-6 h-6" style={{ color: h.color }} />} />
        <ListItem title="Time of day" after={h.part} media={<Clock className="w-6 h-6" style={{ color: h.color }} />} />
        <ListItem label title="Reminder" media={<Bell className="w-6 h-6" style={{ color: h.color }} />} after={<Toggle checked={remind} onChange={() => setRemind(!remind)} />} />
      </List>
      <Actions opened={menu} onBackdropClick={() => setMenu(false)}>
        <ActionsGroup>
          <ActionsLabel>{h.emoji} {h.name}</ActionsLabel>
          <ActionsButton onClick={() => { setMenu(false); nav.push('addHabit', { edit: h.id }) }}>Edit habit</ActionsButton>
          <ActionsButton onClick={() => setMenu(false)}>Pause for a week</ActionsButton>
          <ActionsButton onClick={() => { setMenu(false); setConfirm(true) }}><span className="text-red-500">Delete habit</span></ActionsButton>
        </ActionsGroup>
        <ActionsGroup><ActionsButton bold onClick={() => setMenu(false)}>Cancel</ActionsButton></ActionsGroup>
      </Actions>
      <Dialog opened={confirm} onBackdropClick={() => setConfirm(false)} title={`Delete “${h.name}”?`} content={`Your ${h.streak}-day streak and its history will be removed. This cannot be undone.`}
        buttons={<><DialogButton onClick={() => setConfirm(false)}>Cancel</DialogButton><DialogButton strong onClick={() => { setConfirm(false); dispatch({ type: 'deleteHabit', id: h.id }); nav.pop() }}><span className="text-red-500">Delete</span></DialogButton></>} />
    </Page>
  )
}
const EMOJI = ['💪', '🧘', '📖', '🏃', '💧', '🥗', '😴', '✍️', '🎸', '🌿', '🧹', '💊']
const PALETTE = [COLORS.pink, COLORS.steps, COLORS.habits, COLORS.water, COLORS.sleep, COLORS.mind]
