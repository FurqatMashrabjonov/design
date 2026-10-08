import { useState } from 'react'
import { Page, Navbar, Link, Segmented, SegmentedButton, Block, List, ListItem, Checkbox, Actions, ActionsGroup, ActionsLabel, ActionsButton, Toast } from 'konsta/react'
import { Search, Plus, Ellipsis, Star, FileText, Folder, CheckSquare } from 'lucide-react'
import { useNav, AppTabbar, Photo, AvatarStack, Tile } from '@od/kit'

// EXM-01: a work list (projects, notes, pages, tasks, documents), built the way the workspace apps build theirs: a
// search in the header and a plus, a segment Recent · Favourites · All, the projects as cards with a cover, a title,
// when it was touched and who is in it, then the loose items as rows with an icon per kind and "…" for each —
// which opens the row's actions (favourite, rename, delete). Star flips in place.
const C = { work: '#5e5ce6', personal: '#30d158' }
const PROJECTS = [
  { id: 'p1', name: 'Onboarding redesign', when: 'Edited 20 min ago', photo: 'abstract gradient waves purple', people: [{ name: 'Omar', photo: 'portrait young man beard smiling' }, { name: 'Mina', photo: 'portrait smiling woman short hair' }], star: true },
  { id: 'p2', name: 'Q4 launch plan', when: 'Edited yesterday', photo: 'abstract paper shapes pastel', people: [{ name: 'Theo', photo: 'portrait man glasses outdoors' }, { name: 'Sara', photo: 'portrait woman long dark hair' }, { name: 'Liam', photo: 'portrait man curly hair street' }], star: false },
]
const ITEMS = [
  { id: 'n1', kind: 'note', title: 'Interview notes · Daniela', meta: 'Note · today', icon: FileText, color: C.work },
  { id: 'n2', kind: 'task', title: 'Ship pricing page copy', meta: 'Task · due Fri', icon: CheckSquare, color: C.work },
  { id: 'n3', kind: 'folder', title: 'Brand assets', meta: 'Folder · 24 files', icon: Folder, color: C.personal },
  { id: 'n4', kind: 'note', title: 'Weekly review', meta: 'Note · Mon', icon: FileText, color: C.work },
]

export default function Screen() {
  const nav = useNav()
  const [tab, setTab] = useState('recent')
  const [stars, setStars] = useState(PROJECTS.filter((p) => p.star).map((p) => p.id))
  const [menu, setMenu] = useState(null)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const star = (id) => { const on = !stars.includes(id); setStars(on ? [...stars, id] : stars.filter((x) => x !== id)); say(on ? 'Added to favourites' : 'Removed from favourites') }
  const projects = tab === 'favourites' ? PROJECTS.filter((p) => stars.includes(p.id)) : PROJECTS
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Projects" subtitle={`${PROJECTS.length} projects · ${ITEMS.length} items`}
        right={<><Link iconOnly onClick={() => nav.push('search')} aria-label="Search"><Search className="w-6 h-6" /></Link><Link iconOnly onClick={() => nav.push('new-project')} aria-label="New"><Plus className="w-6 h-6" /></Link></>} />

      <Block className="!my-3">
        <Segmented strong rounded>
          {['recent', 'favourites', 'all'].map((k) => <SegmentedButton key={k} active={tab === k} onClick={() => setTab(k)}>{k[0].toUpperCase() + k.slice(1)}</SegmentedButton>)}
        </Segmented>
      </Block>

      <div className="mx-4 space-y-3">
        {projects.length === 0 && <div className="rounded-[22px] bg-card p-6 text-center text-subhead opacity-60">No favourites yet — tap the star on a project.</div>}
        {projects.map((p, i) => (
          <div key={p.id} className="overflow-hidden rounded-[22px] bg-card vs-rise" style={{ animationDelay: `${i * 70}ms` }}>
            <button onClick={() => nav.push('project', { id: p.id })} className="block w-full text-left"><Photo q={p.photo} className="h-32 w-full" /></button>
            <div className="flex items-center gap-3 p-3">
              <button onClick={() => nav.push('project', { id: p.id })} className="min-w-0 flex-1 text-left"><span className="block truncate text-headline">{p.name}</span><span className="block text-footnote opacity-60">{p.when}</span></button>
              <AvatarStack people={p.people} size={26} />
              <button aria-label="Favourite" onClick={() => star(p.id)} className="grid size-11 place-items-center"><Star className="w-5 h-5" fill={stars.includes(p.id) ? '#ff9f0a' : 'none'} color={stars.includes(p.id) ? '#ff9f0a' : 'currentColor'} /></button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mx-4 mt-7 mb-2 text-title3">Recent items</h2>
      <List strong inset dividers>
        {ITEMS.map((it) => (
          <ListItem key={it.id} link chevron={false} linkProps={{ onClick: () => nav.push(it.kind, { id: it.id }) }}
            media={<Tile tinted color={it.color} size={36}><it.icon className="w-4 h-4" /></Tile>} title={it.title} subtitle={it.meta}
            after={<button aria-label="More" onClick={(e) => { e.stopPropagation(); setMenu(it) }} className="grid size-11 place-items-center opacity-55"><Ellipsis className="w-5 h-5" /></button>} />
        ))}
      </List>

      <Actions opened={!!menu} onBackdropClick={() => setMenu(null)}>
        <ActionsGroup>
          <ActionsLabel>{menu?.title}</ActionsLabel>
          <ActionsButton onClick={() => { setMenu(null); say('Added to favourites') }}>Add to favourites</ActionsButton>
          <ActionsButton onClick={() => { setMenu(null); nav.push('rename', { id: menu?.id }) }}>Rename</ActionsButton>
          <ActionsButton className="!text-red-500" onClick={() => { setMenu(null); say('Moved to trash') }}>Delete</ActionsButton>
        </ActionsGroup>
        <ActionsGroup><ActionsButton onClick={() => setMenu(null)}>Cancel</ActionsButton></ActionsGroup>
      </Actions>
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="projects" />
    </Page>
  )
}
