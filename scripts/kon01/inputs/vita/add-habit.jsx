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
const EMOJI = ['💪', '🧘', '📖', '🏃', '💧', '🥗', '😴', '✍️', '🎸', '🌿', '🧹', '💊']
const PALETTE = [COLORS.pink, COLORS.steps, COLORS.habits, COLORS.water, COLORS.sleep, COLORS.mind]
export default function AddHabit() {
  const nav = useNav()
  const [emoji, setEmoji] = useState('🎸')
  const [color, setColor] = useState(COLORS.sleep)
  const [name, setName] = useState('Practice guitar')
  const [days, setDays] = useState([1, 1, 1, 1, 1, 0, 0])
  const [part, setPart] = useState('Evening')
  const save = () => {
    dispatch({ type: 'addHabit', habit: { id: `h${Date.now()}`, name: name || 'New habit', emoji, color, goal: '20 min', part } })
    nav.pop()
  }
  return (
    <Page className="pb-10">
      <Navbar title="New habit" left={<Link onClick={nav.pop}>Cancel</Link>} right={<Link onClick={save}><b>Add</b></Link>} />
      <Block className="flex flex-col items-center !mt-6">
        <div className="w-24 h-24 rounded-[30px] flex items-center justify-center text-5xl vs-bounce" key={emoji + color} style={{ background: `color-mix(in oklab, ${color} 20%, transparent)`, boxShadow: `inset 0 0 0 3px ${color}` }}>{emoji}</div>
      </Block>
      <List strong inset>
        <ListInput label="Name" type="text" value={name} onInput={(e) => setName(e.target.value)} placeholder="e.g. Practice guitar" media={<Pencil className="w-5 h-5 opacity-50" />} clearButton onClear={() => setName('')} />
      </List>
      <BlockTitle>Icon</BlockTitle>
      <Block strong inset className="!py-3">
        <div className="grid grid-cols-6 gap-2">
          {EMOJI.map((e) => <button key={e} onClick={() => setEmoji(e)} className="h-11 rounded-xl text-2xl transition" style={{ background: e === emoji ? `color-mix(in oklab, ${color} 22%, transparent)` : 'transparent' }}>{e}</button>)}
        </div>
      </Block>
      <BlockTitle>Color</BlockTitle>
      <Block strong inset className="!py-4">
        <div className="flex justify-between">
          {PALETTE.map((c) => <button key={c} onClick={() => setColor(c)} className="w-10 h-10 rounded-full transition" style={{ background: c, boxShadow: c === color ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none' }} />)}
        </div>
      </Block>
      <BlockTitle>Repeat</BlockTitle>
      <Block strong inset className="!py-4">
        <div className="flex justify-between">
          {DAYS.map((d, i) => (
            <button key={i} onClick={() => setDays(days.map((x, j) => (j === i ? 1 - x : x)))} className="w-10 h-10 rounded-full font-semibold text-sm transition" style={{ background: days[i] ? color : 'rgba(120,120,128,.14)', color: days[i] ? 'white' : 'inherit' }}>{d}</button>
          ))}
        </div>
      </Block>
      <BlockTitle>Time of day</BlockTitle>
      <Block>
        <Segmented strong rounded>
          {['Morning', 'Evening', 'Anytime'].map((p) => <SegmentedButton key={p} rounded active={part === p} onClick={() => setPart(p)}>{p}</SegmentedButton>)}
        </Segmented>
      </Block>
      <Block><Button large rounded onClick={save} style={{ background: color }}>Add habit</Button></Block>
    </Page>
  )
}
