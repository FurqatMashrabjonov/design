import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Checkbox, Toast, Button } from 'konsta/react'
import { Droplet, SprayCan, RotateCw, Sprout, Flame, CalendarDays, Sun } from 'lucide-react'
import { useNav, AppTabbar, Ring, Hero, Photo, Tile, tint, Confetti, CountUp } from '@od/kit'

const C = {"water":"#8a7bb0","mist":"#d0845a","fertilize":"#6f9e80","rotate":"#9b7bb8","repot":"#5f8fc0"}

const ICONS = { water: Droplet, mist: SprayCan, rotate: RotateCw, fertilize: Sprout }
const VERB = { water: 'Water', mist: 'Mist', rotate: 'Rotate', fertilize: 'Fertilize' }

const TASKS = [
  { id: 't1', room: 'Living room', kind: 'water', plant: 'Monty', species: 'Monstera', photo: 'monstera in white pot', done: false },
  { id: 't2', room: 'Living room', kind: 'rotate', plant: 'Figgy', species: 'Fiddle leaf fig', photo: 'fiddle leaf fig tree', done: true, at: '8:12 AM' },
  { id: 't3', room: 'Living room', kind: 'water', plant: 'Coin', species: 'Pilea', photo: 'pilea pancake plant', done: false, overdue: true },
  { id: 't4', room: 'Bedroom', kind: 'mist', plant: 'Stripes', species: 'Calathea', photo: 'calathea striped leaves', done: true, at: '8:05 AM' },
  { id: 't5', room: 'Balcony', kind: 'fertilize', plant: 'Basil', species: 'Sweet basil', photo: 'basil pot on balcony', done: false },
]
const ROOMS = [
  { name: 'Living room', note: 'South window · 48% humidity' },
  { name: 'Bedroom', note: 'East window · 55% humidity' },
  { name: 'Balcony', note: 'Full sun · outdoor' },
]
const COMING = [
  { day: 'Fri', date: 'Oct 2', label: 'Tomorrow', items: [{ kind: 'water', plant: 'Basil', emoji: '🌿' }, { kind: 'mist', plant: 'Stripes', emoji: '🍃' }] },
  { day: 'Sat', date: 'Oct 3', label: 'Saturday', items: [{ kind: 'water', plant: 'Stripes', emoji: '🍃' }, { kind: 'water', plant: 'Goldie', emoji: '🌱' }] },
]

export default function Screen() {
  const nav = useNav()
  const [done, setDone] = useState(() => Object.fromEntries(TASKS.map((t) => [t.id, t.done])))
  const [toast, setToast] = useState(false)
  const count = Object.values(done).filter(Boolean).length
  const total = TASKS.length
  const all = count === total

  const toggle = (id) => {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    if (Object.values(next).every(Boolean)) {
      setToast(true)
      setTimeout(() => setToast(false), 2500)
    }
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Today" />
      <Confetti run={all} />

      <div className="px-4 pt-1 vs-rise">
        <Hero color={C.fertilize} to="#9cc3a4" className="rounded-[28px] p-5">
          <div className="flex items-center gap-5">
            <Ring value={count / total} size={116} stroke={11} color="#ffffff">
              <div className="text-center leading-none">
                <div className="text-title1"><CountUp to={count} /><span className="text-title3 opacity-70">/{total}</span></div>
                <div className="text-caption1 opacity-80 mt-1">tasks</div>
              </div>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="text-subhead opacity-80">Thursday, Oct 1</div>
              <div className="text-title3 mt-1">{all ? 'Everyone’s cared for' : `${total - count} plants need you`}</div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1.5 text-footnote font-semibold">
                <Flame className="w-4 h-4" /> 12-day streak
              </div>
            </div>
          </div>
        </Hero>
      </div>

      {ROOMS.map((room, ri) => {
        const tasks = TASKS.filter((t) => t.room === room.name)
        const left = tasks.filter((t) => !done[t.id]).length
        return (
          <div key={room.name} className="vs-rise" style={{ animationDelay: `${(ri + 1) * 60}ms` }}>
            <BlockTitle className="flex items-baseline justify-between">
              <span>{room.name}</span>
              <span className="text-footnote font-normal text-black/55 dark:text-white/55">
                {left === 0 ? 'All done' : `${left} left`}
              </span>
            </BlockTitle>
            <List strong inset dividers>
              {tasks.map((t) => {
                const Icon = ICONS[t.kind]
                const isDone = done[t.id]
                return (
                  <ListItem
                    key={t.id}
                    link
                    linkProps={{ onClick: () => nav.push('plant-detail', { plant: t.plant }) }}
                    media={
                      <div className="flex items-center gap-3">
                        <span onClick={(e) => e.stopPropagation()} className={`flex items-center justify-center w-8 h-11 ${isDone ? 'vs-bounce' : ''}`}>
                          <Checkbox checked={isDone} onChange={() => toggle(t.id)} />
                        </span>
                        <Photo q={t.photo} className={`w-14 h-14 rounded-2xl ${isDone ? 'opacity-50' : ''}`} />
                      </div>
                    }
                    title={
                      <span className={`flex items-center gap-1.5 text-headline ${isDone ? 'opacity-50 line-through' : ''}`}>
                        <Icon className="w-4 h-4 shrink-0" style={{ color: C[t.kind] }} />
                        <span className="truncate">{VERB[t.kind]} {t.plant}</span>
                      </span>
                    }
                    subtitle={
                      <span className="text-footnote text-black/55 dark:text-white/55">
                        {t.species}{isDone && t.at ? ` · done ${t.at}` : ''}
                      </span>
                    }
                    after={
                      t.overdue && !isDone ? (
                        <span className="text-caption1 font-semibold rounded-full px-2 py-1" style={{ background: tint(C.mist, 20), color: C.mist }}>
                          1 day late
                        </span>
                      ) : null
                    }
                  />
                )
              })}
            </List>
            <div className="px-8 -mt-2 mb-1 text-caption1 text-black/55 dark:text-white/55">{room.note}</div>
          </div>
        )
      })}

      <BlockTitle>Coming up this week</BlockTitle>
      <List strong inset dividers>
        {COMING.map((d) => (
          <ListItem
            key={d.date}
            media={
              <div className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center bg-card-2">
                <span className="text-caption2 uppercase text-black/55 dark:text-white/55">{d.day}</span>
                <span className="text-headline leading-none">{d.date.split(' ')[1]}</span>
              </div>
            }
            title={<span className="text-headline">{d.label}</span>}
            subtitle={
              <div className="flex flex-wrap gap-1.5 mt-1">
                {d.items.map((it, i) => {
                  const Icon = ICONS[it.kind]
                  return (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption1" style={{ background: tint(C[it.kind]) }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: C[it.kind] }} />
                      {VERB[it.kind]} {it.plant}
                    </span>
                  )
                })}
              </div>
            }
          />
        ))}
        <ListItem
          media={<Tile color={C.water} tinted size={44}><CalendarDays className="w-5 h-5" style={{ color: C.water }} /></Tile>}
          title={<span className="text-headline">Mon, Oct 5</span>}
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">Water Figgy</span>}
        />
      </List>

      <Block className="flex items-center gap-2 text-footnote text-black/55 dark:text-white/55">
        <Sun className="w-4 h-4" /> Reminders arrive daily at 8:00 AM.
      </Block>

      <Toast opened={toast} button={<Button clear small inline onClick={() => setToast(false)}>OK</Button>}>
        🌿 All 5 tasks done — streak kept!
      </Toast>

      <AppTabbar active="today" />
    </Page>
  )
}
