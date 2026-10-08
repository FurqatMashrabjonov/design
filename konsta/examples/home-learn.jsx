import { useState } from 'react'
import { Page, Navbar, Link, Block, List, ListItem, Toast } from 'konsta/react'
import { Search, Bell, Play, Flame, Bookmark } from 'lucide-react'
import { useNav, AppTabbar, Photo, Avatar, Ring, Carousel, Meter } from '@od/kit'

// EXM-01: a learning home (courses, languages, books, podcasts), built the way the course apps build theirs: a greeting
// with the streak and the daily goal as a ring, one "continue where you left off" card with a play button and the
// lesson's progress, a row of recommended courses as photo cards (title, author, minutes · lessons), a saved list,
// and the bookmark on each card that flips. Everything opens the course or the player.
const COURSES = [
  { id: 'c1', title: 'Always Drawing: a daily sketchbook habit', by: 'Mike Lowery', mins: 38, lessons: 10, photo: 'sketchbook drawing hands pencils', done: 4 },
  { id: 'c2', title: 'Intro to Procreate: paint on the iPad', by: 'Peggy Dean', mins: 72, lessons: 14, photo: 'ipad digital painting desk' },
  { id: 'c3', title: 'Film photography: shoot, scan, print', by: 'Isa Breanna', mins: 55, lessons: 9, photo: 'film camera on wooden desk' },
  { id: 'c4', title: 'Notion for creative teams', by: 'Ali Abdaal', mins: 41, lessons: 7, photo: 'laptop desk notes coffee' },
]

export default function Screen() {
  const nav = useNav()
  const [saved, setSaved] = useState(['c3'])
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const save = (c) => { const on = !saved.includes(c.id); setSaved(on ? [...saved, c.id] : saved.filter((x) => x !== c.id)); say(on ? 'Saved to your classes' : 'Removed') }
  const current = COURSES[0]
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Welcome back, Sarah"
        left={<Link iconOnly onClick={() => nav.reset('profile')}><Avatar name="Sarah John" photo="portrait smiling young woman" size={32} /></Link>}
        right={<><Link iconOnly onClick={() => nav.push('search')} aria-label="Search"><Search className="w-6 h-6" /></Link><Link iconOnly onClick={() => nav.push('notifications')} aria-label="Notifications"><Bell className="w-6 h-6" /></Link></>} />

      <div className="mx-4 mt-1 flex items-center gap-4 rounded-[22px] bg-card p-4 vs-rise">
        <Ring value={12 / 20} size={72} stroke={8}><span className="text-headline tabular-nums">12</span></Ring>
        <div className="flex-1"><div className="text-headline">12 of 20 min today</div><div className="text-subhead opacity-60">8 more to keep the goal</div></div>
        <span className="flex items-center gap-1 rounded-full bg-page px-3 py-1.5 text-subhead font-semibold"><Flame className="w-4 h-4 text-orange-500" />9</span>
      </div>

      <h2 className="mx-4 mt-6 mb-2 text-title3">Continue</h2>
      <button onClick={() => nav.push('lesson', { id: current.id, n: current.done + 1 })} className="mx-4 block w-[calc(100%-2rem)] overflow-hidden rounded-[22px] bg-card text-left">
        <div className="relative"><Photo q={current.photo} className="h-44 w-full" /><span className="absolute inset-0 grid place-items-center"><span className="grid size-14 place-items-center rounded-full bg-white/90 text-black shadow"><Play className="w-6 h-6" fill="currentColor" /></span></span></div>
        <div className="p-4">
          <div className="text-headline">{current.title}</div>
          <div className="mt-0.5 text-footnote opacity-60">Lesson {current.done + 1} of {current.lessons} · {current.by}</div>
          <div className="mt-3"><Meter value={current.done / current.lessons} /></div>
        </div>
      </button>

      <div className="mx-4 mt-7 mb-3 flex items-end justify-between"><h2 className="text-title3">Recommended for you</h2><button onClick={() => nav.reset('browse')} className="-my-3 min-h-11 px-1 text-subhead text-primary">See all</button></div>
      <Carousel items={COURSES.slice(1)} itemWidth="68%" renderItem={(c) => (
        <div className="relative">
          <button onClick={() => nav.push('course', { id: c.id })} className="block w-full text-left">
            <Photo q={c.photo} className="h-36 w-full rounded-[18px]" />
            <div className="mt-2 text-headline line-clamp-2">{c.title}</div>
            <div className="text-footnote opacity-60">{c.by} · {c.mins} min · {c.lessons} lessons</div>
          </button>
          <span role="button" aria-label="Save" onClick={() => save(c)} className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-black/35 text-white"><Bookmark className="w-4 h-4" fill={saved.includes(c.id) ? 'currentColor' : 'none'} /></span>
        </div>
      )} />

      <h2 className="mx-4 mt-7 mb-2 text-title3">Saved classes</h2>
      <List strong inset dividers>
        {COURSES.filter((c) => saved.includes(c.id)).map((c) => (
          <ListItem key={c.id} link linkProps={{ onClick: () => nav.push('course', { id: c.id }) }} media={<Photo q={c.photo} className="size-14 rounded-xl" />} title={c.title} subtitle={`${c.by} · ${c.mins} min`} />
        ))}
        {saved.length === 0 && <ListItem title="Nothing saved yet" subtitle="Tap the bookmark on a class." />}
      </List>

      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="home" />
    </Page>
  )
}
