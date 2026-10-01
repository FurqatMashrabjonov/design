import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Toggle, Button, Sheet, Radio } from 'konsta/react'
import { Bell, Ruler, Plane, LifeBuoy, Sun, Droplets, Plus, Flame, Sprout, CheckCircle2, ChevronRight } from 'lucide-react'
import { useNav, AppTabbar, Avatar, Photo, Tile, tint, CountUp } from '@od/kit'

const C = {"water":"#8a7bb0","mist":"#d0845a","fertilize":"#6f9e80","rotate":"#9b7bb8","repot":"#5f8fc0"}

const ROOMS = [
  { id: 'living', name: 'Living room', window: 'South window', light: 'Bright indirect', humidity: 48, plants: 3, photo: 'bright living room plants' },
  { id: 'bedroom', name: 'Bedroom', window: 'East window', light: 'Medium light', humidity: 55, plants: 3, photo: 'cozy bedroom houseplants' },
  { id: 'balcony', name: 'Balcony', window: 'Outdoor', light: 'Full sun', humidity: null, plants: 1, photo: 'city balcony herbs' },
]

const STATS = [
  { label: 'Plants', value: 7, unit: 'in 3 rooms', color: C.fertilize, Icon: Sprout },
  { label: 'Streak', value: 12, unit: 'days', color: C.mist, Icon: Flame },
  { label: 'Tasks', value: 148, unit: 'done', color: C.water, Icon: CheckCircle2 },
]

export default function Screen() {
  const nav = useNav()
  const [vacation, setVacation] = useState(false)
  const [units, setUnits] = useState('Metric')
  const [unitsOpen, setUnitsOpen] = useState(false)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile" />

      <div className="flex items-center gap-4 px-4 pt-2 pb-5 vs-rise">
        <Avatar name="Lena Park" color={C.fertilize} size={68} />
        <div className="min-w-0">
          <div className="text-title2 truncate">Lena Park</div>
          <div className="text-subhead text-black/55 dark:text-white/55 truncate">Plant parent · Level 4</div>
          <div className="text-footnote text-black/55 dark:text-white/55 truncate">Brooklyn apartment</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4">
        {STATS.map((s, i) => (
          <div key={s.label} className="bg-card rounded-card p-3 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: tint(s.color) }}>
              <s.Icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="text-caption1 text-black/55 dark:text-white/55">{s.label}</div>
            <div className="text-title2" style={{ color: s.color }}><CountUp to={s.value} /></div>
            <div className="text-caption2 text-black/55 dark:text-white/55 truncate">{s.unit}</div>
          </div>
        ))}
      </div>

      <BlockTitle className="!mb-2">Rooms</BlockTitle>
      <div className="flex flex-col gap-3 px-4">
        {ROOMS.map((r, i) => (
          <button key={r.id} onClick={() => nav.push('my-plants', { room: r.id })}
            className="bg-card rounded-card overflow-hidden text-left vs-rise" style={{ animationDelay: `${180 + i * 60}ms` }}>
            <Photo q={r.photo} className="w-full h-32">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <div className="flex-1 min-w-0">
                  <div className="text-title3 text-white truncate">{r.name}</div>
                  <div className="text-footnote text-white/80">{r.window}</div>
                </div>
              </div>
            </Photo>
            <div className="flex items-center gap-2 p-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-footnote flex items-center gap-1" style={{ background: tint(C.fertilize) }}>
                <Sprout className="w-3.5 h-3.5" style={{ color: C.fertilize }} /> {r.plants} {r.plants === 1 ? 'plant' : 'plants'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-footnote flex items-center gap-1" style={{ background: tint(C.mist) }}>
                <Sun className="w-3.5 h-3.5" style={{ color: C.mist }} /> {r.light}
              </span>
              {r.humidity && (
                <span className="px-2.5 py-1 rounded-full text-footnote flex items-center gap-1" style={{ background: tint(C.repot) }}>
                  <Droplets className="w-3.5 h-3.5" style={{ color: C.repot }} /> {r.humidity}%
                </span>
              )}
              <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
            </div>
          </button>
        ))}
      </div>
      <Block className="!mt-3">
        <Button tonal rounded className="gap-2">
          <Plus className="w-5 h-5" /> Add room
        </Button>
      </Block>

      <BlockTitle>Settings</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Reminder time" after={<span className="text-subhead text-black/55 dark:text-white/55">8:00 AM</span>}
          media={<Tile color={C.water}><Bell className="w-4 h-4 text-white" /></Tile>} />
        <ListItem link title="Units" onClick={() => setUnitsOpen(true)}
          after={<span className="text-subhead text-black/55 dark:text-white/55">{units === 'Metric' ? '°C · cm' : '°F · in'}</span>}
          media={<Tile color={C.repot}><Ruler className="w-4 h-4 text-white" /></Tile>} />
        <ListItem title="Vacation mode"
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{vacation ? 'Reminders paused' : 'Pause reminders while away'}</span>}
          media={<Tile color={C.mist}><Plane className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={vacation} onChange={() => setVacation(!vacation)} />} />
        <ListItem link title="Help & support"
          media={<Tile color={C.fertilize}><LifeBuoy className="w-4 h-4 text-white" /></Tile>} />
      </List>
      <Block className="text-center text-footnote text-black/55 dark:text-white/55">Leaflet · caring since Level 1 🌿</Block>

      <Sheet opened={unitsOpen} onBackdropClick={() => setUnitsOpen(false)} className="pb-8">
        <BlockTitle>Units</BlockTitle>
        <List strong inset>
          {['Metric', 'Imperial'].map((u) => (
            <ListItem key={u} label title={u}
              subtitle={<span className="text-footnote opacity-60">{u === 'Metric' ? 'Celsius, centimetres' : 'Fahrenheit, inches'}</span>}
              after={<Radio checked={units === u} onChange={() => { setUnits(u); setUnitsOpen(false) }} />} />
          ))}
        </List>
      </Sheet>

      <AppTabbar active="profile" />
    </Page>
  )
}
