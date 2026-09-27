import { useState } from 'react'
import { Page, Button, Block, List, ListItem, Checkbox, Link, Navbar, NavbarBackLink } from 'konsta/react'
import { Bell, HeartPulse, Footprints, Droplets, Sparkles } from 'lucide-react'
import { useNav } from '../nav.jsx'
import { Ring } from '../ui.jsx'
import { COLORS } from '../store.jsx'

const SLIDES = [
  {
    title: 'Small habits,\nbig changes',
    text: 'Build routines that stick with gentle reminders, streaks and a day that is easy to read at a glance.',
    art: (
      <div className="relative w-64 h-64 mx-auto">
        <div className="absolute inset-0 rounded-full blur-3xl opacity-60" style={{ background: `radial-gradient(${COLORS.mind}, transparent 70%)` }} />
        <div className="absolute inset-0 flex items-center justify-center vs-float">
          <Ring value={0.86} size={220} stroke={18} color={COLORS.habits}>
            <Ring value={0.64} size={168} stroke={18} color={COLORS.steps} delay={150}>
              <Ring value={0.78} size={116} stroke={18} color={COLORS.water} delay={300}>
                <span className="text-4xl">✨</span>
              </Ring>
            </Ring>
          </Ring>
        </div>
      </div>
    ),
  },
  {
    title: 'Every step\ncounts',
    text: 'Vita reads your steps from Health and turns them into a goal you can actually hit — 10,000 or your own.',
    art: (
      <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
        <div className="absolute inset-4 rounded-[48px] rotate-6" style={{ background: `color-mix(in oklab, ${COLORS.steps} 22%, transparent)` }} />
        <div className="absolute inset-4 rounded-[48px] -rotate-6 flex flex-col items-center justify-center vs-float" style={{ background: `linear-gradient(145deg, ${COLORS.steps}, #ff6b35)` }}>
          <Footprints className="w-16 h-16 text-white" />
          <div className="text-white text-4xl font-bold mt-2">7,843</div>
          <div className="text-white/80 text-sm">steps today</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Stay\nhydrated',
    text: 'One tap per glass. Vita nudges you when you fall behind and celebrates when you get there.',
    art: (
      <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full blur-3xl opacity-50" style={{ background: `radial-gradient(${COLORS.water}, transparent 70%)` }} />
        <div className="grid grid-cols-4 gap-3 vs-float">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="w-12 h-16 rounded-b-2xl rounded-t-md flex items-end overflow-hidden" style={{ background: `color-mix(in oklab, ${COLORS.water} 18%, transparent)` }}>
              <div className="w-full vs-rise" style={{ height: i < 6 ? '80%' : '0%', background: COLORS.water, animationDelay: `${i * 80}ms` }} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

export function Welcome({ slide: start = 0 }) {
  const nav = useNav()
  const [i, setI] = useState(start)
  const s = SLIDES[i]
  const last = i === SLIDES.length - 1
  return (
    <Page className="flex flex-col">
      <div className="flex justify-end px-4 pt-14">
        {!last && <Link onClick={() => nav.push('signup')}>Skip</Link>}
      </div>
      <div key={i} className="flex-1 flex flex-col justify-center vs-rise">
        {s.art}
        <Block className="text-center !mt-10">
          <h1 className="text-[34px] leading-[1.1] font-bold tracking-tight whitespace-pre-line">{s.title}</h1>
          <p className="mt-4 text-[17px] opacity-60 leading-snug">{s.text}</p>
        </Block>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {SLIDES.map((_, d) => (
          <span key={d} className="h-2 rounded-full transition-all duration-300" style={{ width: d === i ? 22 : 8, background: d === i ? 'var(--color-primary)' : 'rgba(120,120,128,.3)' }} />
        ))}
      </div>
      <Block className="!mb-12">
        <Button large rounded onClick={() => (last ? nav.push('signup') : setI(i + 1))}>{last ? 'Get started' : 'Continue'}</Button>
        <div className="text-center mt-4 text-[15px]">
          <span className="opacity-60">Already have an account? </span>
          <Link onClick={() => nav.push('login')}>Log in</Link>
        </div>
      </Block>
    </Page>
  )
}

const GOALS = [
  ['Move more', '🏃', COLORS.steps], ['Drink water', '💧', COLORS.water], ['Sleep better', '😴', COLORS.sleep],
  ['Be mindful', '🧘', COLORS.mind], ['Read daily', '📖', COLORS.pink], ['Eat healthy', '🥗', COLORS.habits],
]

export function Goals() {
  const nav = useNav()
  const [picked, setPicked] = useState(['Move more', 'Drink water', 'Be mindful'])
  const toggle = (g) => setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]))
  return (
    <Page className="pb-32">
      <Navbar transparent left={<NavbarBackLink showText={false} onClick={nav.pop} />} title={<span className="text-sm opacity-50">Step 1 of 2</span>} />
      <Block className="!mt-2">
        <h1 className="text-[30px] font-bold tracking-tight leading-tight">What do you want to work on?</h1>
        <p className="opacity-60 mt-2">Pick a few. We will set up habits and goals for you — you can change them any time.</p>
      </Block>
      <div className="grid grid-cols-2 gap-3 px-4">
        {GOALS.map(([g, e, c], i) => {
          const on = picked.includes(g)
          return (
            <button key={g} onClick={() => toggle(g)} className="vs-rise text-left rounded-3xl p-4 transition-all active:scale-95" style={{ animationDelay: `${i * 60}ms`, background: on ? `color-mix(in oklab, ${c} 18%, transparent)` : 'rgba(120,120,128,.1)', boxShadow: on ? `inset 0 0 0 2px ${c}` : 'none' }}>
              <div className="text-4xl">{e}</div>
              <div className="font-semibold mt-6 flex items-center justify-between">
                {g}
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs transition-all" style={{ background: on ? c : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px rgba(120,120,128,.35)' }}>{on ? '✓' : ''}</span>
              </div>
            </button>
          )
        })}
      </div>
      <Block className="fixed left-0 right-0 bottom-8 !m-0 px-4">
        <Button large rounded disabled={!picked.length} onClick={() => nav.push('permissions')}>Continue · {picked.length} selected</Button>
      </Block>
    </Page>
  )
}

export function Permissions() {
  const nav = useNav()
  const [health, setHealth] = useState(true)
  const [notif, setNotif] = useState(true)
  return (
    <Page className="pb-32">
      <Navbar transparent left={<NavbarBackLink showText={false} onClick={nav.pop} />} title={<span className="text-sm opacity-50">Step 2 of 2</span>} />
      <Block className="!mt-2 text-center">
        <div className="mx-auto w-20 h-20 rounded-[24px] flex items-center justify-center vs-float" style={{ background: 'linear-gradient(145deg, var(--color-primary), #bf5af2)' }}>
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-[28px] font-bold tracking-tight mt-6">Let Vita help</h1>
        <p className="opacity-60 mt-2">Two permissions make the app work on its own. Both can be turned off later in Settings.</p>
      </Block>
      <List strong inset>
        <ListItem label title="Apple Health" text="Read steps and distance automatically" media={<HeartPulse className="w-7 h-7 text-[#ff375f]" />} after={<Checkbox checked={health} onChange={() => setHealth(!health)} />} />
        <ListItem label title="Notifications" text="Reminders, streaks and your daily summary" media={<Bell className="w-7 h-7 text-[#ff9f0a]" />} after={<Checkbox checked={notif} onChange={() => setNotif(!notif)} />} />
      </List>
      <Block className="flex gap-6 justify-center opacity-60 text-sm">
        <span className="flex items-center gap-1"><Footprints className="w-4 h-4" /> Steps</span>
        <span className="flex items-center gap-1"><Droplets className="w-4 h-4" /> Water</span>
        <span className="flex items-center gap-1"><Bell className="w-4 h-4" /> Reminders</span>
      </Block>
      <Block className="fixed left-0 right-0 bottom-8 !m-0 px-4">
        <Button large rounded onClick={() => nav.reset('today')}>Start my day</Button>
        <div className="text-center mt-3"><Link onClick={() => nav.reset('today')}>Not now</Link></div>
      </Block>
    </Page>
  )
}
