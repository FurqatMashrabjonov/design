import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Link, Button, Toggle, Segmented, SegmentedButton, Actions, ActionsGroup, ActionsButton, ActionsLabel } from 'konsta/react'
import { Target, Bell, Repeat, Pencil } from 'lucide-react'
import { useNav, Ring, Heatmap, Bars, Tile } from '@od/kit'

const C = { run: '#ff375f' }
const HABIT = { name: 'Morning run', emoji: '🏃', color: C.run, streak: 23, best: 31, rate: 86, goal: '5 km', time: '07:00' }
// 12 weeks, oldest first, 0 = missed; derived from the streak so the grid ends on the current run.
const HEAT = Array.from({ length: 84 }, (_, i) => (i >= 84 - HABIT.streak ? 0.6 + ((i * 7) % 5) / 10 : (i * 37) % 11 > 3 ? 0.35 + ((i * 13) % 4) / 8 : 0))
const WEEK = [4.8, 5.2, 0, 5.0, 6.1, 5.4, 5.0]

export default function Screen() {
  const nav = useNav()
  const [done, setDone] = useState(true)
  const [remind, setRemind] = useState(true)
  const [range, setRange] = useState('Week')
  const [menu, setMenu] = useState(false)
  return (
    <Page className="pb-10">
      <Navbar title={HABIT.name} left={<NavbarBackLink showText={false} onClick={nav.pop} />} right={<Link onClick={() => setMenu(true)}>Edit</Link>} />
      <Block className="flex flex-col items-center !mt-6 vs-rise">
        <Ring value={done ? 1 : 0.35} size={170} stroke={16} color={HABIT.color}>
          <div className="text-center">
            <div className="text-5xl">{HABIT.emoji}</div>
            <div className="text-sm font-semibold mt-1" style={{ color: HABIT.color }}>{done ? '1/1 today' : '0/1 today'}</div>
          </div>
        </Ring>
        <Button rounded large className="!w-56 mt-5" style={{ background: done ? 'rgba(120,120,128,.25)' : HABIT.color }} onClick={() => setDone(!done)}>{done ? 'Done for today ✓' : 'Mark as done'}</Button>
      </Block>

      <div className="grid grid-cols-3 gap-3 px-4 mt-2">
        {[['Streak', HABIT.streak, 'days'], ['Best', HABIT.best, 'days'], ['Rate', HABIT.rate, '%']].map(([k, v, u], n) => (
          <div key={k} className="rounded-card p-3 text-center bg-card vs-rise" style={{ animationDelay: `${n * 60}ms` }}>
            <div className="text-xs opacity-60">{k}</div>
            <div className="text-2xl font-bold" style={{ color: HABIT.color }}>{v}<span className="text-xs opacity-60 font-medium"> {u}</span></div>
          </div>
        ))}
      </div>

      <BlockTitle>Last 12 weeks</BlockTitle>
      <Block strong inset className="!py-4">
        <Heatmap values={HEAT} color={HABIT.color} labels={['Jul', 'Aug', 'Sep']} />
      </Block>

      <Block className="!my-4">
        <Segmented strong rounded>
          {['Week', 'Month'].map((r) => <SegmentedButton key={r} rounded active={range === r} onClick={() => setRange(r)}>{r}</SegmentedButton>)}
        </Segmented>
      </Block>
      <Block strong inset>
        <div className="flex items-baseline justify-between mb-3"><span className="text-sm opacity-60">Distance</span><span className="text-sm font-semibold text-green-500">▲ 12% vs last week</span></div>
        <Bars values={WEEK} color={HABIT.color} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} height={110} />
      </Block>

      <BlockTitle>Details</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Goal" after={HABIT.goal} media={<Tile color={HABIT.color}><Target className="w-4 h-4" /></Tile>} />
        <ListItem title="Repeat" after="Every day" media={<Tile color="#5e5ce6"><Repeat className="w-4 h-4" /></Tile>} />
        <ListItem title="Reminder" after={<Toggle checked={remind} onChange={() => setRemind(!remind)} />} media={<Tile color="#ff9f0a"><Bell className="w-4 h-4" /></Tile>} />
      </List>

      <Actions opened={menu} onBackdropClick={() => setMenu(false)}>
        <ActionsGroup>
          <ActionsLabel>{HABIT.name}</ActionsLabel>
          <ActionsButton onClick={() => { setMenu(false); nav.push('edit-habit') }}><span className="flex items-center gap-2 justify-center"><Pencil className="w-4 h-4" /> Edit habit</span></ActionsButton>
          <ActionsButton onClick={() => setMenu(false)} className="!text-red-500">Delete habit</ActionsButton>
        </ActionsGroup>
        <ActionsGroup><ActionsButton bold onClick={() => setMenu(false)}>Cancel</ActionsButton></ActionsGroup>
      </Actions>
    </Page>
  )
}
