import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, ListInput, Link, Segmented, SegmentedButton, Stepper, Toggle, Button, Actions, ActionsGroup, ActionsButton, ActionsLabel, Searchbar, Dialog, DialogButton } from 'konsta/react'
import { Plus, Flame, Bell, Clock, Repeat, Target, Pencil } from 'lucide-react'
import { useNav, AppTabbar } from '../nav.jsx'
import { useStore, COLORS } from '../store.jsx'
import { Ring } from '../ui.jsx'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function Habits() {
  const nav = useNav()
  const { state, dispatch } = useStore()
  const [part, setPart] = useState('All')
  const [q, setQ] = useState('')
  const list = state.habits.filter((h) => (part === 'All' || h.part === part) && h.name.toLowerCase().includes(q.toLowerCase()))
  const groups = ['Morning', 'Evening', 'Anytime'].map((p) => [p, list.filter((h) => h.part === p)]).filter(([, hs]) => hs.length)
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Habits" right={<Link iconOnly onClick={() => nav.push('addHabit')}><Plus className="w-6 h-6" /></Link>}
        subnavbar={<Searchbar placeholder="Search habits" value={q} onInput={(e) => setQ(e.target.value)} onClear={() => setQ('')} disableButton={false} />} />
      <Block className="!my-3">
        <Segmented strong rounded>
          {['All', 'Morning', 'Evening', 'Anytime'].map((p) => <SegmentedButton key={p} rounded active={part === p} onClick={() => setPart(p)}>{p}</SegmentedButton>)}
        </Segmented>
      </Block>
      {groups.map(([p, hs]) => (
        <div key={p}>
          <BlockTitle>{p}</BlockTitle>
          <List strong inset dividers>
            {hs.map((h) => (
              <ListItem key={h.id} link linkProps={{ onClick: () => nav.push('habit', { id: h.id }) }} title={h.name}
                subtitle={<span className="text-[13px] opacity-70">{h.goal} · every day</span>}
                media={<Ring value={h.done / h.total} size={42} stroke={4} color={h.color}><span className="text-lg">{h.emoji}</span></Ring>}
                after={<span className="flex items-center gap-1 font-semibold" style={{ color: h.color }}><Flame className="w-4 h-4" />{h.streak}</span>} />
            ))}
          </List>
        </div>
      ))}
      {!groups.length && <Block className="text-center opacity-50 !mt-16">No habits match “{q}”.</Block>}
      <AppTabbar active="habits" />
    </Page>
  )
}

export function Habit({ id }) {
  const nav = useNav()
  const { state, dispatch } = useStore()
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

export function AddHabit() {
  const nav = useNav()
  const { dispatch } = useStore()
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
