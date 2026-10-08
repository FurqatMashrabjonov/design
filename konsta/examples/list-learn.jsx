import { useState } from 'react'
import { Page, Navbar, Searchbar, Block, List, ListItem, Sheet, Button, Toggle, Toast } from 'konsta/react'
import { SlidersHorizontal, Bookmark, Clock, PenTool, Palette, Camera, Film, Music, Code } from 'lucide-react'
import { useNav, AppTabbar, Photo } from '@od/kit'

// EXM-01: a browse / search list (courses, lessons, books, episodes), built the way the course apps build theirs: the
// search bar at the top, the topics as a two-column grid of coloured tiles with an icon, a count line with the
// filter button, then the results as rows — a thumbnail, the title on two lines, the author, minutes · lessons · a
// level — with a bookmark that flips. Filters are a sheet (level, length) that changes the count.
const TOPICS = [['Illustration', PenTool, '#ff9f0a'], ['Design', Palette, '#5e5ce6'], ['Photography', Camera, '#30d158'], ['Film', Film, '#ff375f'], ['Music', Music, '#bf5af2'], ['Code', Code, '#0a84ff']]
const RESULTS = [
  { id: 'r1', title: 'Getting started with Procreate: brushes, layers, colour', by: 'Lisa Bardot', mins: 55, lessons: 12, level: 'Beginner', photo: 'ipad digital painting desk' },
  { id: 'r2', title: 'Animation for beginners in Procreate Dreams', by: 'Brooke Glaser', mins: 92, lessons: 18, level: 'Beginner', photo: 'animation frames sketch desk' },
  { id: 'r3', title: 'Character design: from shapes to personality', by: 'Gustavo Rosa', mins: 48, lessons: 9, level: 'Intermediate', photo: 'sketchbook drawing hands pencils' },
  { id: 'r4', title: 'Watercolour botanicals, loose and bright', by: 'Peggy Dean', mins: 61, lessons: 11, level: 'All levels', photo: 'watercolor painting flowers brush' },
]

export default function Screen() {
  const nav = useNav()
  const [q, setQ] = useState('')
  const [saved, setSaved] = useState(['r2'])
  const [filters, setFilters] = useState(false)
  const [short, setShort] = useState(false)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const rows = RESULTS.filter((r) => (!short || r.mins <= 60) && (!q || r.title.toLowerCase().includes(q.toLowerCase())))
  const save = (r) => { const on = !saved.includes(r.id); setSaved(on ? [...saved, r.id] : saved.filter((x) => x !== r.id)); say(on ? 'Saved' : 'Removed') }
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Browse"
        subnavbar={<Searchbar placeholder="What do you want to learn today?" value={q} onInput={(e) => setQ(e.target.value)} onClear={() => setQ('')} disableButton />} />

      {!q && (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          {TOPICS.map(([name, I, color]) => (
            <button key={name} onClick={() => nav.push('topic', { id: name.toLowerCase() })} className="flex min-h-16 items-center gap-3 rounded-2xl px-4 text-left text-headline text-white" style={{ background: color }}><I className="w-5 h-5" />{name}</button>
          ))}
        </div>
      )}

      <div className="mx-4 mt-6 mb-2 flex items-center justify-between">
        <span className="text-subhead"><b>{rows.length * 54}</b> classes{q ? ` for “${q}”` : ' in Illustration'}</span>
        <button onClick={() => setFilters(true)} className="-my-2 flex min-h-11 items-center gap-1.5 text-subhead font-medium text-primary"><SlidersHorizontal className="w-4 h-4" />Filters{short ? ' · 1' : ''}</button>
      </div>
      <List strong inset dividers>
        {rows.map((r) => (
          <ListItem key={r.id} link chevron={false} linkProps={{ onClick: () => nav.push('course', { id: r.id }) }}
            media={<Photo q={r.photo} className="h-16 w-24 rounded-xl" />}
            title={<span className="text-headline line-clamp-2">{r.title}</span>}
            subtitle={<span className="block text-footnote opacity-60">{r.by}<br /><span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{r.mins} min · {r.lessons} lessons · {r.level}</span></span>}
            after={<button aria-label="Save" onClick={(e) => { e.stopPropagation(); save(r) }} className="grid size-11 place-items-center"><Bookmark className="w-5 h-5" fill={saved.includes(r.id) ? 'currentColor' : 'none'} /></button>} />
        ))}
        {rows.length === 0 && <ListItem title="No classes match" subtitle="Try another word or clear the filters." />}
      </List>

      <Sheet opened={filters} onBackdropClick={() => setFilters(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Filters</h3>
        <List strong inset>
          <ListItem title="Level" after="Any" link linkProps={{ onClick: () => say('Beginner · Intermediate · Advanced') }} />
          <ListItem title="Under an hour" after={<Toggle checked={short} onChange={() => setShort(!short)} />} />
        </List>
        <Block><Button large rounded onClick={() => setFilters(false)}>Show {rows.length * 54} classes</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="browse" />
    </Page>
  )
}
