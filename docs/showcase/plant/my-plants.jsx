import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, Link, Chip } from 'konsta/react'
import { Plus, Droplets, Sun, Wind, AlertCircle } from 'lucide-react'
import { useNav, AppTabbar, Photo, Tile, tint } from '@od/kit'

const C = {"water":"#8a7bb0","mist":"#d0845a","fertilize":"#6f9e80","rotate":"#9b7bb8","repot":"#5f8fc0"}
const RED = '#d9534f'

const ROOMS = [
  { id: 'Living room', light: 'South window · bright indirect', humidity: '48%', count: 3 },
  { id: 'Bedroom', light: 'East window · medium light', humidity: '55%', count: 3 },
  { id: 'Balcony', light: 'Full sun · outdoor', humidity: 'Outdoor', count: 1 },
]

const PLANTS = [
  { id: 'monty', name: 'Monty', species: 'Monstera deliciosa', emoji: '🌿', room: 'Living room', due: 'Today', overdue: false, needs: true, photo: 'monstera in white pot' },
  { id: 'coin', name: 'Coin', species: 'Pilea peperomioides', emoji: '🪴', room: 'Living room', due: 'Overdue 1 day', overdue: true, needs: true, photo: 'pilea pancake plant' },
  { id: 'basil', name: 'Basil', species: 'Sweet basil', emoji: '🌿', room: 'Balcony', due: 'Tomorrow', overdue: false, needs: false, photo: 'basil pot on balcony' },
  { id: 'stripes', name: 'Stripes', species: 'Calathea orbifolia', emoji: '🍃', room: 'Bedroom', due: 'In 2 days', overdue: false, needs: false, photo: 'calathea striped leaves' },
  { id: 'goldie', name: 'Goldie', species: 'Golden pothos', emoji: '🌱', room: 'Bedroom', due: 'In 2 days', overdue: false, needs: false, photo: 'trailing golden pothos' },
  { id: 'figgy', name: 'Figgy', species: 'Fiddle leaf fig', emoji: '🌳', room: 'Living room', due: 'In 4 days', overdue: false, needs: false, photo: 'fiddle leaf fig tree' },
  { id: 'sly', name: 'Sly', species: 'Snake plant', emoji: '🌵', room: 'Bedroom', due: 'In 9 days', overdue: false, needs: false, photo: 'snake plant ceramic pot' },
]

const FILTERS = ['All', 'Living room', 'Bedroom', 'Balcony']

export default function Screen() {
  const nav = useNav()
  const [room, setRoom] = useState('All')
  const shown = room === 'All' ? PLANTS : PLANTS.filter((p) => p.room === room)
  const thirsty = PLANTS.filter((p) => p.needs).length
  const roomInfo = ROOMS.find((r) => r.id === room)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="My plants"
        right={<Link iconOnly onClick={() => nav.push('add-plant')}><Plus className="w-6 h-6" /></Link>} />

      <Block className="!mt-1 !mb-3 text-subhead opacity-60">
        {PLANTS.length} plants · {thirsty} need water
      </Block>

      <div className="flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => {
          const on = room === f
          const count = f === 'All' ? PLANTS.length : ROOMS.find((r) => r.id === f).count
          return (
            <Chip key={f} onClick={() => setRoom(f)}
              className={`shrink-0 !h-9 !px-4 cursor-pointer ${on ? '!bg-primary !text-white' : '!bg-card'}`}>
              {f} <span className="ml-1.5 opacity-60">{count}</span>
            </Chip>
          )
        })}
      </div>

      {roomInfo ? (
        <div className="mx-4 mt-4 bg-card rounded-card p-4 flex items-center gap-4 vs-rise">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-subhead">
              <Tile tinted color={C.mist} size={28}><Sun className="w-4 h-4" style={{ color: C.mist }} /></Tile>
              <span className="truncate">{roomInfo.light}</span>
            </div>
            <div className="flex items-center gap-2 text-subhead">
              <Tile tinted color={C.repot} size={28}><Wind className="w-4 h-4" style={{ color: C.repot }} /></Tile>
              <span>Humidity {roomInfo.humidity}</span>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => nav.reset('today')}
          className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-card p-4 flex items-center gap-3 text-left vs-rise active:scale-[.98] transition"
          style={{ background: tint(C.water, 14) }}>
          <Tile color={C.water} size={40}><Droplets className="w-5 h-5 text-white" /></Tile>
          <div className="flex-1 min-w-0">
            <div className="text-headline">Monty and Coin are thirsty</div>
            <div className="text-footnote text-black/55 dark:text-white/55">Water them today to keep your 12-day streak</div>
          </div>
        </button>
      )}

      <BlockTitle className="!mt-6 !mb-2">{room === 'All' ? 'All plants' : room}</BlockTitle>
      <div className="grid grid-cols-2 gap-3 px-4">
        {shown.map((p, i) => (
          <button key={p.id} onClick={() => nav.push('plant-detail', { id: p.id })}
            className="bg-card rounded-card overflow-hidden text-left vs-rise active:scale-[.97] transition"
            style={{ animationDelay: `${i * 60}ms` }}>
            <Photo q={p.photo} className="w-full h-40">
              <div className="absolute top-2 left-2">
                <Tile tinted color={C.fertilize} size={30}>{p.emoji}</Tile>
              </div>
            </Photo>
            <div className="p-3">
              <div className="text-headline truncate">{p.name}</div>
              <div className="text-footnote truncate text-black/55 dark:text-white/55">{p.species}</div>
              <DueBadge due={p.due} overdue={p.overdue} />
            </div>
          </button>
        ))}
      </div>

      <Block className="text-center text-footnote opacity-50 !mt-6">
        Reminders arrive at 8:00 AM · Brooklyn apartment
      </Block>

      <AppTabbar active="plants" />
    </Page>
  )
}

function DueBadge({ due, overdue }) {
  const color = overdue ? RED : C.water
  return (
    <span className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption1 font-semibold"
      style={{ background: tint(color, 16), color }}>
      {overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Droplets className="w-3.5 h-3.5" />}
      {overdue ? 'Overdue' : due}
    </span>
  )
}
