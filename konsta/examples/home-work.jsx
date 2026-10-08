import { useState } from 'react'
import { Page, Navbar, Link, Block, List, ListItem, Checkbox, Sheet, ListInput, Button, Toast } from 'konsta/react'
import { Search, Plus, Video, MapPin, Inbox } from 'lucide-react'
import { useNav, AppTabbar, WeekStrip, Tile, AvatarStack, Meter } from '@od/kit'

// EXM-01: a work home (today, tasks, notes, a calendar), built the way the calendar-and-todo apps build theirs: the day
// as the title with a week strip under it, the next thing up as one card with a join button, the day as a timeline —
// a time on the left, the event as a block with its people — then the to-dos with checkboxes that strike through,
// and a quick-add sheet from the plus. Done counts move the small meter at the top.
const C = { work: '#5e5ce6', personal: '#30d158', focus: '#ff9f0a' }
const EVENTS = [
  { id: 'e1', at: '09:30', end: '10:00', title: 'Design sync', where: 'Google Meet', color: C.work, people: [{ name: 'Omar', photo: 'portrait young man beard smiling' }, { name: 'Mina', photo: 'portrait smiling woman short hair' }, { name: 'Theo', photo: 'portrait man glasses outdoors' }], video: true },
  { id: 'e2', at: '11:00', end: '12:30', title: 'Deep work · onboarding flow', where: 'Focus block', color: C.focus, people: [] },
  { id: 'e3', at: '15:00', end: '15:45', title: 'Dentist', where: 'Rua Garrett 12', color: C.personal, people: [] },
]
const TODOS = [
  { id: 't1', text: 'Reply to Sara about the launch date', tag: 'Work', color: C.work },
  { id: 't2', text: 'Review onboarding copy', tag: 'Work', color: C.work },
  { id: 't3', text: 'Book train for Friday', tag: 'Personal', color: C.personal },
  { id: 't4', text: 'Send invoice #42', tag: 'Work', color: C.work, done: true },
]

export default function Screen() {
  const nav = useNav()
  const [day, setDay] = useState(new Date(2026, 9, 8))
  const [done, setDone] = useState(TODOS.filter((t) => t.done).map((t) => t.id))
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const toggle = (id) => setDone(done.includes(id) ? done.filter((x) => x !== id) : [...done, id])
  const next = EVENTS[0]
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Today" subtitle={day.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
        right={<><Link iconOnly onClick={() => nav.push('search')} aria-label="Search"><Search className="w-6 h-6" /></Link><Link iconOnly onClick={() => nav.push('inbox')} aria-label="Inbox"><Inbox className="w-6 h-6" /></Link></>} />

      <Block strong inset className="!mt-1 !mb-4"><WeekStrip value={day} onChange={setDay} today={new Date(2026, 9, 8)} marks={['2026-10-06', '2026-10-08', '2026-10-09']} /></Block>

      <div className="mx-4 rounded-[22px] p-4 text-white vs-rise" style={{ background: next.color }}>
        <div className="text-footnote opacity-80">Up next · in 25 min</div>
        <div className="mt-0.5 text-title3">{next.title}</div>
        <div className="mt-1 flex items-center gap-1 text-subhead opacity-85"><Video className="w-4 h-4" />{next.where} · {next.at}–{next.end}</div>
        <div className="mt-3 flex items-center justify-between"><AvatarStack people={next.people} size={28} ring={next.color} /><Button rounded inline className="!bg-white !px-5 !text-black" onClick={() => say('Joining Design sync…')}>Join</Button></div>
      </div>

      <h2 className="mx-4 mt-6 mb-2 text-title3">Schedule</h2>
      <div className="mx-4 space-y-2">
        {EVENTS.map((e) => (
          <button key={e.id} onClick={() => nav.push('event', { id: e.id })} className="flex w-full items-stretch gap-3 text-left">
            <span className="w-12 shrink-0 pt-3 text-footnote tabular-nums opacity-60">{e.at}</span>
            <span className="flex-1 rounded-2xl bg-card p-3" style={{ borderLeft: `4px solid ${e.color}` }}>
              <span className="block text-headline">{e.title}</span>
              <span className="mt-0.5 flex items-center gap-1 text-footnote opacity-60">{e.video ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}{e.where} · {e.at}–{e.end}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mx-4 mt-7 mb-2 flex items-end justify-between"><h2 className="text-title3">To do</h2><span className="text-footnote tabular-nums opacity-60">{done.length} of {TODOS.length}</span></div>
      <div className="mx-4 mb-2"><Meter value={done.length / TODOS.length} /></div>
      <List strong inset dividers>
        {TODOS.map((t) => (
          <ListItem key={t.id} label title={<span className={done.includes(t.id) ? 'line-through opacity-50' : ''}>{t.text}</span>} subtitle={t.tag}
            media={<Checkbox checked={done.includes(t.id)} onChange={() => toggle(t.id)} />}
            after={<Tile tinted color={t.color} size={10}> </Tile>} />
        ))}
      </List>

      <button aria-label="Add" onClick={() => setAdding(true)} className="fixed bottom-28 right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg active:scale-95 transition"><Plus className="w-6 h-6" /></button>

      <Sheet opened={adding} onBackdropClick={() => setAdding(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">New</h3>
        <List strong inset>
          <ListInput label="What" type="text" placeholder="Task or event" value={text} onInput={(e) => setText(e.target.value)} />
          <ListItem title="When" after="Today, 16:00" link linkProps={{ onClick: () => say('Pick a time') }} />
          <ListItem title="List" after="Work" link linkProps={{ onClick: () => say('Pick a list') }} />
        </List>
        <Block><Button large rounded disabled={!text.trim()} onClick={() => { setAdding(false); setText(''); say('Added to today') }}>Add</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="today" />
    </Page>
  )
}
