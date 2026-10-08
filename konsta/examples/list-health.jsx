import { useState } from 'react'
import { Page, Navbar, Link, Segmented, SegmentedButton, Block, List, ListItem, Sheet, Button, Toast } from 'konsta/react'
import { Plus, Footprints, Bike, Dumbbell, Waves, Flame, Clock, TrendingUp } from 'lucide-react'
import { useNav, AppTabbar, Bars, Tile, Medal, CountUp } from '@od/kit'

// EXM-01: an activity history (runs, workouts, sessions, meals), built the way the sport apps build theirs: a segment
// for the span (Week · Month · Year), one big figure for it with three small stats under it, the bars by day, the
// awards earned in the span as a strip, then the recent sessions grouped by week — each row an activity icon, the
// name, the day and time, the distance or minutes on the right. "+" logs a session by hand in a sheet.
const C = { run: '#ff9f0a', ride: '#0a84ff', lift: '#bf5af2', swim: '#30d158' }
const SPANS = { week: { km: 24.6, runs: 4, min: 162, bars: [5.2, 0, 6.1, 0, 7.4, 0, 5.9], labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] }, month: { km: 98.3, runs: 15, min: 640, bars: [22, 26, 24.6, 25.7], labels: ['W1', 'W2', 'W3', 'W4'] }, year: { km: 812, runs: 131, min: 5410, bars: [60, 72, 85, 90, 88, 95, 80, 76, 84, 82, 0, 0], labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] } }
const WEEKS = [
  { week: 'This week', items: [
    { id: 'a1', name: 'Evening run', when: 'Tue, 7 Oct · 18:40', value: '5.9 km', sub: '32:10 · 5′27″/km', icon: Footprints, color: C.run },
    { id: 'a2', name: 'Upper body', when: 'Mon, 6 Oct · 07:15', value: '42 min', sub: '18 sets · 214 kcal', icon: Dumbbell, color: C.lift },
  ] },
  { week: 'Last week', items: [
    { id: 'a3', name: 'Long ride', when: 'Sun, 5 Oct · 09:00', value: '38.2 km', sub: '1:41:05 · 22.7 km/h', icon: Bike, color: C.ride },
    { id: 'a4', name: 'Pool', when: 'Fri, 3 Oct · 06:50', value: '1,200 m', sub: '28:30 · 2′22″/100m', icon: Waves, color: C.swim },
    { id: 'a5', name: 'Morning run', when: 'Wed, 1 Oct · 06:30', value: '6.1 km', sub: '33:48 · 5′32″/km', icon: Footprints, color: C.run },
  ] },
]

export default function Screen() {
  const nav = useNav()
  const [span, setSpan] = useState('week')
  const [log, setLog] = useState(false)
  const [toast, setToast] = useState(null)
  const s = SPANS[span]
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Activity" right={<Link iconOnly onClick={() => setLog(true)} aria-label="Log a session"><Plus className="w-6 h-6" /></Link>} />

      <Block className="!my-3">
        <Segmented strong rounded>
          {['week', 'month', 'year'].map((k) => <SegmentedButton key={k} active={span === k} onClick={() => setSpan(k)}>{k[0].toUpperCase() + k.slice(1)}</SegmentedButton>)}
        </Segmented>
      </Block>

      <div className="mx-4 rounded-[22px] bg-card p-4 vs-rise">
        <div className="text-figure tabular-nums"><CountUp to={Math.round(s.km)} />{span === 'week' ? '.6' : ''}<span className="ml-1 text-title3 font-normal opacity-60">km</span></div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[[s.runs, 'Sessions', TrendingUp], [`${Math.floor(s.min / 60)}h ${s.min % 60}m`, 'Time', Clock], [`${Math.round(s.km * 62)}`, 'kcal', Flame]].map(([v, l, I]) => (
            <div key={l} className="rounded-2xl bg-page py-2"><div className="text-headline tabular-nums">{v}</div><div className="flex items-center justify-center gap-1 text-caption1 opacity-60"><I className="w-3 h-3" />{l}</div></div>
          ))}
        </div>
        <div className="mt-4"><Bars values={s.bars} labels={s.labels} height={72} color={C.run} /></div>
      </div>

      <div className="mx-4 mt-6 mb-2 flex items-baseline justify-between"><h2 className="text-title3">Earned this {span}</h2><button onClick={() => nav.push('awards')} className="-my-3 min-h-11 px-1 text-subhead text-primary">All awards</button></div>
      <div className="flex gap-4 overflow-x-auto px-4 pb-1">
        {[['🏅', 'Fastest 5K', C.run], ['🔥', '7-day streak', C.lift], ['🌊', 'First swim', C.swim], ['🚴', '100 km', C.ride]].map(([e, l, c], i) => (
          <button key={l} onClick={() => nav.push('award', { id: l })} className="flex w-20 shrink-0 flex-col items-center gap-1.5"><Medal emoji={e} color={c} size={56} locked={i === 3} /><span className="text-caption1 text-center leading-tight">{l}</span></button>
        ))}
      </div>

      {WEEKS.map((w) => (
        <div key={w.week}>
          <h2 className="mx-4 mt-6 mb-2 text-headline">{w.week}</h2>
          <List strong inset dividers>
            {w.items.map((a) => (
              <ListItem key={a.id} link linkProps={{ onClick: () => nav.push('session', { id: a.id }) }}
                media={<Tile tinted color={a.color} size={40}><a.icon className="w-5 h-5" /></Tile>}
                title={a.name} subtitle={a.when}
                after={<span className="text-right"><span className="block text-headline tabular-nums">{a.value}</span><span className="block text-caption1 opacity-60">{a.sub}</span></span>} />
            ))}
          </List>
        </div>
      ))}

      <Sheet opened={log} onBackdropClick={() => setLog(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Log a session</h3>
        <List strong inset>
          <ListItem title="Activity" after="Run" link linkProps={{ onClick: () => {} }} />
          <ListItem title="Distance" after="5.0 km" link linkProps={{ onClick: () => {} }} />
          <ListItem title="Time" after="28:00" link linkProps={{ onClick: () => {} }} />
        </List>
        <Block><Button large rounded onClick={() => { setLog(false); setToast('Run logged'); setTimeout(() => setToast(null), 2000) }}>Save</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="activity" />
    </Page>
  )
}
