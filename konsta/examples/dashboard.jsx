import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Card, Link, Checkbox, Badge } from 'konsta/react'
import { Bell, Footprints, Droplets, Plus, ChevronRight, Flame } from 'lucide-react'
import { useNav, AppTabbar, Rings, CountUp, Avatar, Tile, Confetti, Hero, tint } from '@od/kit'

const C = { steps: '#ff9f0a', water: '#0a84ff', habits: '#30d158', mind: '#bf5af2', pink: '#ff375f' }
const STEPS = { today: 7843, goal: 10000 }
const WATER = { ml: 1500, goal: 2500 }
const HABITS = [
  { id: 'meditate', name: 'Meditate', emoji: '🧘', color: C.mind, streak: 41, done: true },
  { id: 'run', name: 'Morning run', emoji: '🏃', color: C.pink, streak: 23, done: true },
  { id: 'vitamins', name: 'Vitamins', emoji: '💊', color: C.steps, streak: 12, done: false },
  { id: 'read', name: 'Read', emoji: '📖', color: C.water, streak: 8, done: false },
]

export default function Screen() {
  const nav = useNav()
  const [done, setDone] = useState(HABITS.filter((h) => h.done).map((h) => h.id))
  const [party, setParty] = useState(false)
  const toggle = (id) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id]
    setDone(next)
    if (next.length === HABITS.length) { setParty(true); setTimeout(() => setParty(false), 1800) }
  }
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Today" subtitle="Saturday, 27 September"
        left={<Link iconOnly onClick={() => nav.push('profile')}><Avatar name="Aziza Karimova" color={C.steps} size={32} /></Link>}
        right={<Link iconOnly onClick={() => nav.push('inbox')} className="relative"><Bell className="w-6 h-6" /><Badge className="absolute -top-1 -right-1" colors={{ bg: 'bg-red-500' }}>4</Badge></Link>} />

      <Block className="!mt-1 !mb-2 text-subhead opacity-70">Good morning, Aziza. You are {Math.round((done.length / HABITS.length) * 100)}% through today.</Block>

      <Card raised className="!mx-4 !rounded-[28px] vs-rise">
        <div className="flex items-center gap-5">
          <Rings size={128} stroke={13} rings={[{ value: STEPS.today / STEPS.goal, color: C.steps }, { value: WATER.ml / WATER.goal, color: C.water }, { value: done.length / HABITS.length, color: C.habits }]} />
          <div className="flex-1 space-y-2.5">
            <Metric color={C.steps} label="Steps" value={<CountUp to={STEPS.today} />} goal="10,000" />
            <Metric color={C.water} label="Water" value={<><CountUp to={WATER.ml} /> ml</>} goal="2,500" />
            <Metric color={C.habits} label="Habits" value={`${done.length} of ${HABITS.length}`} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        <Hero as="button" color={C.steps} to="#ff6b35" onClick={() => nav.push('steps')} className="active:scale-[.97] transition vs-rise">
          <Footprints className="w-7 h-7" />
          <div className="text-title1 mt-5 leading-none"><CountUp to={STEPS.today} /></div>
          <div className="text-subhead opacity-80 mt-1">2,157 to go</div>
        </Hero>
        <Hero as="button" color={C.water} to="#5ac8fa" onClick={() => nav.push('water')} className="active:scale-[.97] transition vs-rise" style={{ animationDelay: '80ms' }}>
          <Droplets className="w-7 h-7" />
          <div className="text-title1 mt-5 leading-none">1.5 L</div>
          <div className="text-subhead opacity-80 mt-1">of 2.5 L</div>
        </Hero>
      </div>

      <BlockTitle className="!mt-8 flex items-center justify-between">
        <span>Habits</span>
        <Link onClick={() => nav.reset('habits')} className="!text-[15px] !font-normal">See all</Link>
      </BlockTitle>
      <List strong inset dividers>
        {HABITS.map((h) => {
          const ok = done.includes(h.id)
          return (
            <ListItem key={h.id} title={<span className={ok ? 'opacity-50 line-through decoration-2' : ''}>{h.name}</span>}
              subtitle={<span className="flex items-center gap-1 text-footnote" style={{ color: h.color }}><Flame className="w-3.5 h-3.5" />{h.streak} day streak</span>}
              media={<Tile tinted color={h.color} size={40}>{h.emoji}</Tile>}
              after={<Checkbox checked={ok} onChange={() => toggle(h.id)} />} />
          )
        })}
        <ListItem link title={<span className="text-primary">New habit</span>} media={<span className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary"><Plus className="w-5 h-5" /></span>} linkProps={{ onClick: () => nav.push('add-habit') }} />
      </List>

      <Card raised className="!mx-4 !rounded-[24px]">
        <button onClick={() => nav.push('premium')} className="w-full flex items-center gap-3 text-left">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: tint(C.mind) }}>👑</span>
          <div className="flex-1">
            <div className="font-semibold">Vita Premium</div>
            <div className="text-sm opacity-60">Unlimited habits, insights and widgets.</div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-40" />
        </button>
      </Card>
      <Confetti run={party} />
      <AppTabbar active="today" />
    </Page>
  )
}

function Metric({ color, label, value, goal }) {
  return (
    <div>
      <div className="text-xs font-medium opacity-60 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: color }} />{label}</div>
      <div className="text-title3 font-bold leading-tight" style={{ color }}>{value}{goal && <span className="text-xs font-medium opacity-60"> / {goal}</span>}</div>
    </div>
  )
}
