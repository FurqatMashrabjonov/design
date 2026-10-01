import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Button, Toast, Link } from 'konsta/react'
import { Sun, Droplets, Droplet, Thermometer, Stethoscope, MapPin, Check, StickyNote, Sprout, Share } from 'lucide-react'
import { useNav, Photo, Tile, Meter, tint } from '@od/kit'

const C = {"water":"#8a7bb0","mist":"#d0845a","fertilize":"#6f9e80","rotate":"#9b7bb8","repot":"#5f8fc0"}

const PLANT = {
  name: 'Monty', species: 'Monstera deliciosa', emoji: '🌿', room: 'Living room',
  photo: 'monstera in white pot', every: 7, last: 'Sep 24', next: 'Today',
}

const NEEDS = [
  { k: 'Light', v: 'Bright indirect', icon: Sun, color: C.mist },
  { k: 'Humidity', v: '60%', icon: Droplets, color: C.repot },
  { k: 'Water', v: 'Every 7 days', icon: Droplet, color: C.water },
  { k: 'Temp', v: '18–27°C', icon: Thermometer, color: C.fertilize },
]

// Week of Mon Sep 28 – Sun Oct 4; today is Thu Oct 1
const WEEK = [
  { d: 'M', n: 28, dots: ['mist'] },
  { d: 'T', n: 29, dots: [] },
  { d: 'W', n: 30, dots: [] },
  { d: 'T', n: 1, dots: ['water'], today: true },
  { d: 'F', n: 2, dots: ['mist'] },
  { d: 'S', n: 3, dots: [] },
  { d: 'S', n: 4, dots: [] },
]

const GROWTH = [
  { m: 'Jun 12', q: 'small monstera seedling', note: '3 leaves' },
  { m: 'Jul 15', q: 'young monstera plant', note: '' },
  { m: 'Aug 20', q: 'monstera leaves pot', note: '' },
  { m: 'Sep 18', q: 'monstera split leaf', note: '' },
  { m: 'Today', q: 'monstera in white pot', note: '6 leaves' },
]

const NOTES = [
  { t: 'New leaf unfurling, keep away from radiator', icon: Sprout, color: C.fertilize, when: 'Oct 1' },
  { t: 'Fertilized Sep 15', icon: StickyNote, color: C.fertilize, when: 'Sep 15' },
]

export default function Screen() {
  const nav = useNav()
  const [watered, setWatered] = useState(false)
  const [toast, setToast] = useState(false)

  const markWatered = () => {
    if (watered) return
    setWatered(true)
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }

  return (
    <Page className="pb-40">
      <Navbar
        title={PLANT.name}
        left={<NavbarBackLink showText={false} onClick={nav.pop} />}
        right={<Link iconOnly><Share className="w-6 h-6" /></Link>}
      />

      <div className="px-4 pt-3 vs-rise">
        <Photo q={PLANT.photo} className="w-full h-72 rounded-card overflow-hidden relative">
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent text-white">
            <div className="text-large-title truncate">{PLANT.name}</div>
            <div className="text-body italic opacity-90 truncate">{PLANT.species}</div>
            <div className="flex items-center gap-1 text-footnote opacity-80 mt-1">
              <MapPin className="w-4 h-4" /> {PLANT.room} · south window
            </div>
          </div>
        </Photo>
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 mt-4">
        {NEEDS.map((n, i) => {
          const I = n.icon
          return (
            <div key={n.k} className="bg-card rounded-card p-3 flex flex-col items-center text-center vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: tint(n.color, 20), color: n.color }}>
                <I className="w-5 h-5" />
              </div>
              <div className="text-caption2 text-black/55 dark:text-white/55 mt-2">{n.k}</div>
              <div className="text-caption1 font-semibold leading-tight mt-0.5">{n.v}</div>
            </div>
          )
        })}
      </div>

      <BlockTitle className="!mb-2">Watering</BlockTitle>
      <div className="mx-4 bg-card rounded-card p-4 vs-rise" style={{ animationDelay: '120ms' }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-3" style={{ background: tint(C.water, 12) }}>
            <div className="text-caption1 text-black/55 dark:text-white/55">Last watered</div>
            <div className="text-title3" style={{ color: C.water }}>{watered ? 'Today' : PLANT.last}</div>
          </div>
          <div className="rounded-2xl p-3" style={{ background: tint(C.water, 12) }}>
            <div className="text-caption1 text-black/55 dark:text-white/55">Next watering</div>
            <div className="text-title3" style={{ color: C.water }}>{watered ? 'Thu Oct 8' : PLANT.next}</div>
          </div>
        </div>
        <div className="mt-3">
          <Meter value={watered ? 0.02 : 1} color={C.water} />
          <div className="text-caption1 text-black/55 dark:text-white/55 mt-1">
            {watered ? '7 days until thirsty' : '7 of 7 days since watering'}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mt-4">
          {WEEK.map((w, i) => (
            <div
              key={i}
              className={`flex flex-col items-center py-2 rounded-2xl ${w.today ? '' : ''}`}
              style={w.today ? { background: tint(C.water, 18) } : undefined}
            >
              <span className="text-caption2 text-black/55 dark:text-white/55">{w.d}</span>
              <span className={`text-subhead ${w.today ? 'font-bold' : ''}`}>{w.n}</span>
              <div className="flex gap-0.5 h-2 mt-1">
                {w.dots.map((d) => (
                  <span key={d} className={`w-1.5 h-1.5 rounded-full ${d === 'water' && watered ? 'vs-bounce' : ''}`} style={{ background: C[d] }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-caption1 text-black/55 dark:text-white/55">
          {[['water', 'Water'], ['mist', 'Mist'], ['fertilize', 'Feed Oct 15']].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: C[k] }} />{l}
            </span>
          ))}
        </div>
      </div>

      <BlockTitle className="!mb-2">Growth</BlockTitle>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {GROWTH.map((g, i) => (
          <div key={g.m} className="shrink-0 w-28 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <Photo q={g.q} className="w-28 h-36 rounded-2xl" />
            <div className={`text-subhead mt-1.5 ${g.m === 'Today' ? 'font-semibold' : ''}`} style={g.m === 'Today' ? { color: C.fertilize } : undefined}>{g.m}</div>
            <div className="text-caption1 text-black/55 dark:text-white/55 h-4">{g.note}</div>
          </div>
        ))}
      </div>
      <Block className="!mt-2 !mb-0">
        <span className="text-footnote text-black/55 dark:text-white/55">From 3 to 6 leaves since June — a new fenestrated leaf this week.</span>
      </Block>

      <BlockTitle>Care notes</BlockTitle>
      <List strong inset dividers>
        {NOTES.map((n) => {
          const I = n.icon
          return (
            <ListItem
              key={n.t}
              title={<span className="text-body whitespace-normal">{n.t}</span>}
              footer={n.when}
              media={<Tile color={n.color} tinted><I className="w-4 h-4" style={{ color: n.color }} /></Tile>}
            />
          )
        })}
      </List>

      <List strong inset>
        <ListItem
          link
          title="Something wrong?"
          subtitle="Check symptoms with Plant doctor"
          media={<Tile color={C.mist}><Stethoscope className="w-4 h-4" /></Tile>}
          onClick={() => nav.push('plant-doctor')}
        />
      </List>

      <div className="fixed bottom-0 inset-x-0 px-4 pt-3 pb-8 bg-page/90 backdrop-blur z-20">
        <Button
          large
          rounded
          onClick={markWatered}
          style={{ background: watered ? tint(C.water, 22) : C.water, color: watered ? C.water : '#fff' }}
        >
          <span className="flex items-center gap-2">
            {watered ? <Check className="w-5 h-5 vs-bounce" /> : <Droplet className="w-5 h-5" />}
            {watered ? 'Watered today' : 'Mark as watered'}
          </span>
        </Button>
      </div>

      <Toast opened={toast} position="center">
        <span>Monty watered · next on Thu Oct 8</span>
      </Toast>
    </Page>
  )
}
