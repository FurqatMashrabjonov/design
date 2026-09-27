import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton, Button, Link, Sheet, Range, Toast } from 'konsta/react'
import { Flame, MapPin, Timer, Share, Settings2, GlassWater, CupSoda, Coffee } from 'lucide-react'
import { useNav } from '../nav.jsx'
import { useStore, COLORS, fmt } from '../store.jsx'
import { Ring, CountUp, Bars, Area, WaterGlass } from '../ui.jsx'

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function Steps() {
  const nav = useNav()
  const { state } = useStore()
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

export function Water() {
  const nav = useNav()
  const { state, dispatch } = useStore()
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
