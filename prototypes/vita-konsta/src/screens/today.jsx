import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Card, Link, Checkbox, Badge } from 'konsta/react'
import { Bell, Footprints, Droplets, Plus, ChevronRight, Flame } from 'lucide-react'
import { useNav, AppTabbar } from '../nav.jsx'
import { useStore, COLORS, TODAY, fmt } from '../store.jsx'
import { Ring, CountUp, Avatar, Confetti } from '../ui.jsx'

export function Today() {
  const nav = useNav()
  const { state, dispatch } = useStore()
  const { steps, water, habits, user, inbox } = state
  const [party, setParty] = useState(false)
  const done = habits.filter((h) => h.done >= h.total).length
  const toggle = (h) => {
    const willFinishAll = h.done < h.total && done === habits.length - 1
    dispatch({ type: 'toggleHabit', id: h.id })
    if (willFinishAll) {
      setParty(true)
      setTimeout(() => setParty(false), 1800)
    }
  }
  const morning = new Date(2026, 8, 27, 9).getHours() < 12
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Today" subtitle={TODAY}
        left={<Link iconOnly onClick={() => nav.push('profile')}><Avatar name={user.name} color={user.avatarColor} size={32} /></Link>}
        right={<Link iconOnly onClick={() => nav.push('inbox')} className="relative"><Bell className="w-6 h-6" />{inbox.length > 0 && <Badge className="absolute -top-1 -right-1" colors={{ bg: 'bg-red-500' }}>{inbox.length}</Badge>}</Link>} />

      <Block className="!mt-1 !mb-2 text-[15px] opacity-70">{morning ? 'Good morning' : 'Good evening'}, {user.name.split(' ')[0]}. You are {Math.round(((done / habits.length) * 100))}% through today.</Block>

      <Card raised className="!mx-4 !rounded-[28px]">
        <div className="flex items-center gap-5">
          <Ring value={steps.today / steps.goal} size={128} stroke={14} color={COLORS.steps}>
            <Ring value={water.ml / water.goal} size={96} stroke={14} color={COLORS.water} delay={120}>
              <Ring value={done / habits.length} size={64} stroke={14} color={COLORS.habits} delay={240} />
            </Ring>
          </Ring>
          <div className="flex-1 space-y-2.5">
            <Metric color={COLORS.steps} label="Steps" value={<CountUp to={steps.today} />} goal={fmt(steps.goal)} />
            <Metric color={COLORS.water} label="Water" value={<><CountUp to={water.ml} /> ml</>} goal={`${fmt(water.goal)}`} />
            <Metric color={COLORS.habits} label="Habits" value={`${done} of ${habits.length}`} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        <button onClick={() => nav.push('steps')} className="rounded-[24px] p-4 text-left text-white active:scale-[.97] transition vs-rise" style={{ background: `linear-gradient(150deg, ${COLORS.steps}, #ff6b35)` }}>
          <Footprints className="w-7 h-7" />
          <div className="text-[28px] font-bold mt-5 leading-none"><CountUp to={steps.today} /></div>
          <div className="text-white/80 text-sm mt-1">{fmt(steps.goal - steps.today)} to go</div>
        </button>
        <button onClick={() => nav.push('water')} className="rounded-[24px] p-4 text-left text-white active:scale-[.97] transition vs-rise" style={{ background: `linear-gradient(150deg, ${COLORS.water}, #5ac8fa)`, animationDelay: '80ms' }}>
          <Droplets className="w-7 h-7" />
          <div className="text-[28px] font-bold mt-5 leading-none">{(water.ml / 1000).toFixed(1)} L</div>
          <div className="text-white/80 text-sm mt-1">of {(water.goal / 1000).toFixed(1)} L</div>
        </button>
      </div>

      <BlockTitle className="!mt-8 flex items-center justify-between">
        <span>Habits</span>
        <Link onClick={() => nav.reset('habits', {}, 'none')} className="!text-[15px] !font-normal">See all</Link>
      </BlockTitle>
      <List strong inset dividers>
        {habits.slice(0, 5).map((h) => {
          const ok = h.done >= h.total
          return (
            <ListItem key={h.id} label title={<span className={ok ? 'opacity-50 line-through decoration-2' : ''}>{h.name}</span>}
              subtitle={<span className="flex items-center gap-1 text-[13px]" style={{ color: h.color }}><Flame className="w-3.5 h-3.5" />{h.streak} day streak</span>}
              media={<span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${ok ? 'vs-bounce' : ''}`} key={String(ok)} style={{ background: `color-mix(in oklab, ${h.color} 16%, transparent)` }}>{h.emoji}</span>}
              after={<Checkbox checked={ok} onChange={() => toggle(h)} />} />
          )
        })}
        <ListItem link title={<span className="text-primary">New habit</span>} media={<span className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10 text-primary"><Plus className="w-5 h-5" /></span>} linkProps={{ onClick: () => nav.push('addHabit') }} />
      </List>

      <Card className="!mx-4 !rounded-[24px]" raised>
        <button onClick={() => nav.push('premium')} className="w-full flex items-center gap-3 text-left">
          <span className="text-3xl">👑</span>
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
      <div className="text-[19px] font-bold leading-tight" style={{ color }}>{value}{goal && <span className="text-xs font-medium opacity-60"> / {goal}</span>}</div>
    </div>
  )
}
