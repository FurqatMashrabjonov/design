import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, ListInput, Sheet, Button, Toast } from 'konsta/react'
import { Plus, Heart, Star, Lock, Globe } from 'lucide-react'
import { useNav, AppTabbar, Photo, tint } from '@od/kit'

const C = {"cabins":"#a16207","villas":"#047857","treehouses":"#6b21a8","chalets":"#be185d","beachHouses":"#0e7490"}

const STAYS = [
  { id: 'reine', name: "Reine Fisherman's Rorbu", place: 'Lofoten, Norway', type: 'Cabin', emoji: '🛖', color: C.cabins, price: 210, rating: 4.96, photo: 'red cabin fjord mountains' },
  { id: 'cipresso', name: 'Villa Cipresso', place: 'Val d’Orcia, Tuscany', type: 'Villa', emoji: '🏡', color: C.villas, price: 340, rating: 4.92, photo: 'stone villa cypress hills' },
  { id: 'canopy', name: 'Canopy Nest Treehouse', place: 'Ubud, Bali', type: 'Treehouse', emoji: '🌴', color: C.treehouses, price: 165, rating: 4.98, photo: 'bamboo treehouse jungle' },
  { id: 'edelweiss', name: 'Chalet Edelweiss', place: 'Zermatt, Swiss Alps', type: 'Chalet', emoji: '🏔️', color: C.chalets, price: 480, rating: 4.94, photo: 'wooden chalet snowy peaks' },
  { id: 'amed', name: 'Amed Driftwood House', place: 'Amed, Bali', type: 'Beach house', emoji: '🌊', color: C.beachHouses, price: 190, rating: 4.89, photo: 'beach house ocean sunset' },
  { id: 'lyngen', name: 'Lyngen Glass Igloo Cabin', place: 'Northern Norway', type: 'Cabin', emoji: '❄️', color: C.cabins, price: 295, rating: 4.97, photo: 'glass cabin northern lights' },
]
const byId = (id) => STAYS.find((s) => s.id === id)

const LISTS = [
  { id: 'recent', name: 'Recently viewed', count: 6, stays: ['cipresso', 'canopy', 'edelweiss', 'reine', 'amed', 'lyngen'] },
  { id: 'nordic', name: 'Nordic Escapes', count: 4, stays: ['reine', 'lyngen'] },
  { id: 'bali', name: 'Bali Someday', count: 3, stays: ['canopy', 'amed'] },
  { id: 'ski', name: "Ski Week '27", count: 2, stays: ['edelweiss'] },
]
const HEARTED = ['cipresso', 'canopy', 'edelweiss', 'reine']

function Mosaic({ ids }) {
  const p = ids.map((id) => byId(id).photo)
  if (p.length === 1) return <Photo q={p[0]} className="w-full h-full" />
  if (p.length === 2) return (
    <div className="grid grid-cols-2 gap-0.5 w-full h-full">
      <Photo q={p[0]} className="w-full h-full" />
      <Photo q={p[1]} className="w-full h-full" />
    </div>
  )
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-0.5 w-full h-full">
      <Photo q={p[0]} className="col-span-2 row-span-2 w-full h-full" />
      <Photo q={p[1]} className="w-full h-full" />
      <Photo q={p[2]} className="w-full h-full" />
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [selected, setSelected] = useState('recent')
  const [hearted, setHearted] = useState(HEARTED)
  const [sheet, setSheet] = useState(false)
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [toast, setToast] = useState(false)

  const list = LISTS.find((l) => l.id === selected)
  const shown = list.stays.map(byId)

  const toggleHeart = (e, id) => {
    e.stopPropagation()
    setHearted((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))
  }

  const create = () => {
    setSheet(false)
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Wishlists" subtitle={`${LISTS.length} lists · ${hearted.length} hearted stays`}
        right={<Link iconOnly onClick={() => setSheet(true)}><Plus className="w-6 h-6" /></Link>} />

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 pt-2">
        {LISTS.map((l, i) => {
          const active = selected === l.id
          return (
            <button key={l.id} onClick={() => setSelected(l.id)}
              className="vs-rise text-left min-w-0" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`aspect-square w-full rounded-[22px] overflow-hidden transition ${active ? 'ring-2 ring-primary ring-offset-2 ring-offset-page' : ''}`}>
                <Mosaic ids={l.stays.slice(0, 3)} />
              </div>
              <div className="mt-2 text-headline truncate">{l.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {l.stays.slice(0, 3).map((id) => (
                  <span key={id} className="w-2 h-2 rounded-full" style={{ background: byId(id).color }} />
                ))}
                <span className="text-footnote text-black/55 dark:text-white/55">{l.count} saved</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mx-4 mt-7 border-t border-line" />

      <BlockTitle large className="!mt-5">{list.name}</BlockTitle>
      <List strong inset dividers>
        {shown.map((s) => {
          const on = hearted.includes(s.id)
          return (
            <ListItem key={s.id} link chevron={false}
              linkProps={{ onClick: () => nav.push('stay-detail', { id: s.id }) }}
              media={<Photo q={s.photo} className="w-14 h-14 rounded-2xl" />}
              title={<span className="text-headline truncate block max-w-[170px]">{s.name}</span>}
              subtitle={
                <span className="text-footnote">
                  <span className="font-semibold" style={{ color: s.color }}>{s.emoji} {s.type}</span>
                  <span className="text-black/55 dark:text-white/55"> · {s.place}</span>
                </span>
              }
              text={
                <span className="flex items-center gap-1 text-footnote text-black/55 dark:text-white/55">
                  <Star className="w-3 h-3 fill-current" /> {s.rating.toFixed(2)} · <span className="font-semibold text-black dark:text-white">€{s.price}</span> night
                </span>
              }
              after={
                <button onClick={(e) => toggleHeart(e, s.id)}
                  className={`w-11 h-11 -mr-2 flex items-center justify-center rounded-full ${on ? 'vs-bounce' : ''}`}
                  style={on ? { background: tint('#e11d48', 12) } : undefined}>
                  <Heart className={`w-5 h-5 ${on ? 'text-rose-600 fill-rose-600' : 'text-black/40 dark:text-white/40'}`} />
                </button>
              }
            />
          )
        })}
      </List>
      {list.count > shown.length && (
        <Block className="!mt-2 text-footnote text-black/55 dark:text-white/55">
          {list.count - shown.length} more saved in this list
        </Block>
      )}

      <Sheet opened={sheet} onBackdropClick={() => setSheet(false)} className="pb-8">
        <div className="px-4 pt-5">
          <div className="text-title2">New wishlist</div>
          <div className="text-subhead text-black/55 dark:text-white/55 mt-1">Collect stays for a trip you're dreaming about.</div>
        </div>
        <List strong inset>
          <ListInput label="Name" type="text" placeholder="e.g. Tuscany with family" value={name}
            onChange={(e) => setName(e.target.value)} clearButton={!!name} onClear={() => setName('')} />
          <ListItem title="Visibility"
            media={isPrivate ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            after={
              <div className="flex gap-1">
                <button onClick={() => setIsPrivate(true)} className={`px-3 h-9 rounded-full text-subhead ${isPrivate ? 'bg-primary text-white' : 'bg-card-2'}`}>Private</button>
                <button onClick={() => setIsPrivate(false)} className={`px-3 h-9 rounded-full text-subhead ${!isPrivate ? 'bg-primary text-white' : 'bg-card-2'}`}>Shared</button>
              </div>
            } />
        </List>
        <Block className="!mb-0">
          <Button large rounded disabled={!name.trim()} onClick={create}>Create wishlist</Button>
        </Block>
      </Sheet>

      <Toast opened={toast} position="center">“{name || 'New list'}” created</Toast>

      <AppTabbar active="wishlists" />
    </Page>
  )
}
