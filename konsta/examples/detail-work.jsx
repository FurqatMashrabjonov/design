import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Link, Block, List, ListItem, Checkbox, Toggle, Sheet, Dialog, DialogButton, Button, Toast } from 'konsta/react'
import { Ellipsis, Calendar, Clock, MapPin, Users, AlignLeft, Repeat, Bell, Trash2, Plus } from 'lucide-react'
import { useNav, Avatar, Tile } from '@od/kit'

// EXM-01: a work detail (an event, a task, a note, a page), built the way the calendar-and-todo apps build theirs:
// the title large at the top with its list as a small coloured tag, the facts as rows with an icon each — date,
// time, place, people (portraits, plus one), description — then the subtasks as checkboxes with a count, and the
// settings a person changes (reminder, repeat) as rows that answer; the destructive one last, in red, behind a dialog.
const C = { work: '#5e5ce6' }
const EVENT = { title: 'Design sync', list: 'Work', date: 'Wednesday, 8 October', time: '09:30 – 10:00', where: 'Google Meet', notes: 'Walk through the new onboarding flow, decide on the quiz step, assign the empty states.', people: [{ name: 'Omar Haddad', photo: 'portrait young man beard smiling' }, { name: 'Mina Reyes', photo: 'portrait smiling woman short hair' }, { name: 'Theo Lindqvist', photo: 'portrait man glasses outdoors' }] }
const SUBTASKS = [{ id: 's1', text: 'Share the Figma link', done: true }, { id: 's2', text: 'Bring the quiz variants', done: false }, { id: 's3', text: 'Note the open questions', done: false }]

export default function Screen() {
  const nav = useNav()
  const [done, setDone] = useState(SUBTASKS.filter((s) => s.done).map((s) => s.id))
  const [remind, setRemind] = useState(true)
  const [repeat, setRepeat] = useState(false)
  const [people, setPeople] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const toggle = (id) => setDone(done.includes(id) ? done.filter((x) => x !== id) : [...done, id])
  return (
    <Page className="pb-12">
      <Navbar transparent title="" left={<NavbarBackLink onClick={() => nav.pop()} />} right={<Link iconOnly onClick={() => say('More options')} aria-label="More"><Ellipsis className="w-6 h-6" /></Link>} />

      <Block className="!mt-0 vs-rise">
        <span className="inline-block rounded-full px-2.5 py-0.5 text-caption1 font-semibold" style={{ background: `${C.work}22`, color: C.work }}>{EVENT.list}</span>
        <h1 className="mt-2 text-title1">{EVENT.title}</h1>
      </Block>

      <List strong inset dividers>
        <ListItem title="Date" after={EVENT.date} link linkProps={{ onClick: () => say('Pick a date') }} media={<Tile tinted color={C.work} size={32}><Calendar className="w-4 h-4" /></Tile>} />
        <ListItem title="Time" after={EVENT.time} link linkProps={{ onClick: () => say('Pick a time') }} media={<Tile tinted color={C.work} size={32}><Clock className="w-4 h-4" /></Tile>} />
        <ListItem title="Where" after={EVENT.where} link linkProps={{ onClick: () => say('Opens Google Meet') }} media={<Tile tinted color="#30d158" size={32}><MapPin className="w-4 h-4" /></Tile>} />
        <ListItem title="People" link linkProps={{ onClick: () => setPeople(true) }} media={<Tile tinted color="#ff9f0a" size={32}><Users className="w-4 h-4" /></Tile>}
          after={<span className="flex -space-x-2">{EVENT.people.map((p) => <Avatar key={p.name} name={p.name} photo={p.photo} size={28} />)}</span>} />
      </List>

      <Block className="!mb-2 flex items-start gap-3 text-body"><AlignLeft className="mt-1 w-5 h-5 shrink-0 opacity-50" /><p>{EVENT.notes}</p></Block>

      <div className="mx-4 mt-4 mb-2 flex items-baseline justify-between"><h2 className="text-headline">Checklist</h2><span className="text-footnote tabular-nums opacity-60">{done.length} of {SUBTASKS.length}</span></div>
      <List strong inset dividers>
        {SUBTASKS.map((s) => <ListItem key={s.id} label title={<span className={done.includes(s.id) ? 'line-through opacity-50' : ''}>{s.text}</span>} media={<Checkbox checked={done.includes(s.id)} onChange={() => toggle(s.id)} />} />)}
        <ListItem title={<span className="text-primary">Add a step</span>} media={<Plus className="w-5 h-5 text-primary" />} link chevron={false} linkProps={{ onClick: () => say('New step') }} />
      </List>

      <List strong inset dividers className="!mt-6">
        <ListItem title="Reminder" after={<Toggle checked={remind} onChange={() => setRemind(!remind)} />} media={<Tile tinted color="#ff375f" size={32}><Bell className="w-4 h-4" /></Tile>} subtitle={remind ? '10 minutes before' : 'Off'} />
        <ListItem title="Repeat" after={<Toggle checked={repeat} onChange={() => setRepeat(!repeat)} />} media={<Tile tinted color="#bf5af2" size={32}><Repeat className="w-4 h-4" /></Tile>} subtitle={repeat ? 'Every week' : 'Never'} />
      </List>
      <List strong inset className="!mt-4">
        <ListItem title={<span className="text-red-500">Delete event</span>} media={<Trash2 className="w-5 h-5 text-red-500" />} link chevron={false} linkProps={{ onClick: () => setAskDelete(true) }} />
      </List>

      <Sheet opened={people} onBackdropClick={() => setPeople(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">People</h3>
        <List strong inset>{EVENT.people.map((p) => <ListItem key={p.name} title={p.name} after="Accepted" media={<Avatar name={p.name} photo={p.photo} size={36} />} />)}</List>
        <Block><Button large rounded onClick={() => { setPeople(false); nav.push('invite') }}>Invite someone</Button></Block>
      </Sheet>
      <Dialog opened={askDelete} onBackdropClick={() => setAskDelete(false)} title="Delete this event?" content="Everyone invited will be told."
        buttons={<><DialogButton onClick={() => setAskDelete(false)}>Keep</DialogButton><DialogButton strong className="!text-red-500" onClick={() => { setAskDelete(false); nav.pop() }}>Delete</DialogButton></>} />
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
    </Page>
  )
}
