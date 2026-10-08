import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Link, Block, List, ListItem, Actions, ActionsGroup, ActionsLabel, ActionsButton, Dialog, DialogButton, Toast } from 'konsta/react'
import { Ellipsis, Share, Heart, Footprints, Clock, Flame, Mountain, Activity, Gauge } from 'lucide-react'
import { useNav, RouteMap, Tile, Confetti } from '@od/kit'

// EXM-01: one session (a run, a ride, a workout, a meditation), built the way the sport apps build theirs: the day and
// the title, one big figure with its unit, six stats in a grid, the route on a drawn map, the splits as a table with a
// bar per split, the gear used, and the social line (kudos, a photo). "…" opens the actions: share, edit, delete.
const RUN = { title: 'Evening run', when: 'Tuesday, 7 October · 18:40', km: 5.92, pace: "5′27″", time: '32:10', kcal: 412, climb: 48, bpm: 156, cadence: 172 }
const SPLITS = [['1', "5′41″"], ['2', "5′30″"], ['3', "5′22″"], ['4', "5′18″"], ['5', "5′25″"], ['0.92', "5′35″"]]
const sec = (p) => { const [m, s] = p.replace('″', '').split('′').map(Number); return m * 60 + s }
const fastest = Math.min(...SPLITS.map(([, p]) => sec(p)))

export default function Screen() {
  const nav = useNav()
  const [menu, setMenu] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [kudos, setKudos] = useState(12)
  const [mine, setMine] = useState(false)
  const [party, setParty] = useState(false)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const STATS = [[RUN.pace, 'Avg pace /km', Gauge], [RUN.time, 'Time', Clock], [RUN.kcal, 'Calories', Flame], [`${RUN.climb} m`, 'Elevation', Mountain], [RUN.bpm, 'Avg heart rate', Activity], [RUN.cadence, 'Cadence', Footprints]]
  return (
    <Page className="pb-12">
      <Navbar transparent title="" left={<NavbarBackLink onClick={() => nav.pop()} />} right={<><Link iconOnly onClick={() => say('Shared')} aria-label="Share"><Share className="w-6 h-6" /></Link><Link iconOnly onClick={() => setMenu(true)} aria-label="More"><Ellipsis className="w-6 h-6" /></Link></>} />

      <Block className="!mt-0 !mb-4 vs-rise">
        <div className="text-footnote opacity-60">{RUN.when}</div>
        <h1 className="text-title1">{RUN.title}</h1>
        <div className="mt-3 text-figure tabular-nums">{RUN.km.toFixed(2)}<span className="ml-1 text-title3 font-normal opacity-60">km</span></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {STATS.map(([v, l, I]) => (
            <div key={l}><div className="text-headline tabular-nums">{v}</div><div className="flex items-center gap-1 text-caption1 opacity-60"><I className="w-3 h-3" />{l}</div></div>
          ))}
        </div>
      </Block>

      <div className="mx-4 overflow-hidden rounded-[22px]">
        <RouteMap height={220} route="loop" pins={[{ label: 'Start', kind: 'start' }, { label: 'Finish', kind: 'end' }]} />
      </div>

      <h2 className="mx-4 mt-6 mb-2 text-title3">Splits</h2>
      <div className="mx-4 rounded-[22px] bg-card p-4">
        <div className="mb-2 flex text-caption1 opacity-60"><span className="w-10">km</span><span className="w-14">Pace</span><span className="flex-1" /></div>
        {SPLITS.map(([k, p]) => (
          <div key={k} className="flex items-center py-1.5 text-subhead tabular-nums">
            <span className="w-10">{k}</span><span className="w-14">{p}</span>
            <span className="flex-1"><span className="block h-2.5 rounded-full bg-primary" style={{ width: `${Math.round((fastest / sec(p)) * 100)}%`, opacity: sec(p) === fastest ? 1 : 0.55 }} /></span>
          </div>
        ))}
      </div>

      <List strong inset dividers className="!mt-6">
        <ListItem title="Shoes" after="Pegasus 41 · 312 km" link linkProps={{ onClick: () => nav.push('gear') }} media={<Tile tinted color="#ff9f0a" size={32}><Footprints className="w-4 h-4" /></Tile>} />
        <ListItem title="Heart rate zones" after="Zone 3 · 18 min" link linkProps={{ onClick: () => nav.push('zones') }} media={<Tile tinted color="#ff375f" size={32}><Activity className="w-4 h-4" /></Tile>} />
      </List>

      <Block className="flex items-center justify-between">
        <span className="text-subhead opacity-60">{kudos} kudos</span>
        <button onClick={() => { setMine(!mine); setKudos(kudos + (mine ? -1 : 1)); if (!mine) { setParty(true); setTimeout(() => setParty(false), 1500) } }} className={`flex min-h-11 items-center gap-2 rounded-full px-5 text-subhead font-semibold ${mine ? 'bg-primary text-white' : 'bg-card'}`}><Heart className="w-4 h-4" fill={mine ? 'currentColor' : 'none'} />{mine ? 'Kudos given' : 'Give kudos'}</button>
      </Block>

      <Actions opened={menu} onBackdropClick={() => setMenu(false)}>
        <ActionsGroup>
          <ActionsLabel>{RUN.title}</ActionsLabel>
          <ActionsButton bold onClick={() => { setMenu(false); nav.push('edit-session') }}>Edit</ActionsButton>
          <ActionsButton onClick={() => { setMenu(false); say('Saved to Photos') }}>Save as image</ActionsButton>
          <ActionsButton className="!text-red-500" onClick={() => { setMenu(false); setAskDelete(true) }}>Delete</ActionsButton>
        </ActionsGroup>
        <ActionsGroup><ActionsButton onClick={() => setMenu(false)}>Cancel</ActionsButton></ActionsGroup>
      </Actions>
      <Dialog opened={askDelete} onBackdropClick={() => setAskDelete(false)} title="Delete this run?" content="It will be removed from your totals and awards."
        buttons={<><DialogButton onClick={() => setAskDelete(false)}>Keep</DialogButton><DialogButton strong className="!text-red-500" onClick={() => { setAskDelete(false); nav.pop() }}>Delete</DialogButton></>} />
      <Confetti run={party} />
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
    </Page>
  )
}
