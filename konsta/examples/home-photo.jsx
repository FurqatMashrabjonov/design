import { useState } from 'react'
import { Page, Sheet, Block, List, ListItem, Toggle, Button, Toast } from 'konsta/react'
import { Search, SlidersHorizontal, Heart, Star, Map, Waves, Mountain, Building2, Trees, Tent } from 'lucide-react'
import { useNav, AppTabbar, Photo } from '@od/kit'

// EXM-01: a photo-led home (stays, food, homes, shopping), built the way the big marketplaces build theirs: no
// large title — the search is the header; a row of category tabs with icons; then a feed of large photos with the
// facts UNDER the photo (name and rating, place, dates, price with its unit), a heart on each photo, and one
// floating pill for the map. One filter sheet answers the filter button; saving answers with a toast.
const PLACES = [
  { id: 'kelp', name: 'Big Sur, California', host: 'Cliffside cabin · Hosted by Ines', dates: '17–19 Oct', price: 286, rating: 4.97, photo: 'modern cabin ocean cliff sunset' },
  { id: 'larch', name: 'Val Gardena, Italy', host: 'Alpine loft · Hosted by Marco', dates: '24–26 Oct', price: 198, rating: 4.92, photo: 'wooden chalet alpine meadow' },
  { id: 'patio', name: 'Lisbon, Portugal', host: 'Tiled courtyard flat · Hosted by Rita', dates: '31 Oct – 2 Nov', price: 154, rating: 4.89, photo: 'tiled courtyard apartment lisbon' },
]
const KINDS = [
  { id: 'coast', label: 'Coast', icon: Waves },
  { id: 'mountain', label: 'Mountains', icon: Mountain },
  { id: 'city', label: 'Cities', icon: Building2 },
  { id: 'forest', label: 'Forest', icon: Trees },
  { id: 'camp', label: 'Camping', icon: Tent },
]

export default function Screen() {
  const nav = useNav()
  const [kind, setKind] = useState('coast')
  const [saved, setSaved] = useState(['larch'])
  const [filters, setFilters] = useState(false)
  const [instant, setInstant] = useState(true)
  const [toast, setToast] = useState(null)
  const save = (p) => {
    const on = !saved.includes(p.id)
    setSaved(on ? [...saved, p.id] : saved.filter((x) => x !== p.id))
    setToast(on ? `Saved ${p.name}` : `Removed ${p.name}`)
    setTimeout(() => setToast(null), 2000)
  }
  return (
    <Page className="pb-48">
      <div className="sticky top-0 z-20 bg-page/90 pt-[max(12px,var(--k-safe-area-top))] backdrop-blur-xl">
        <div className="mx-4 flex items-center gap-2">
          <button onClick={() => nav.push('search')} className="flex min-h-14 flex-1 items-center gap-3 rounded-full bg-card px-5 text-left shadow-[0_2px_12px_rgba(0,0,0,.08)]">
            <Search className="w-5 h-5" />
            <span className="min-w-0">
              <span className="block text-subhead font-semibold">Where to?</span>
              <span className="block truncate text-footnote opacity-60">Anywhere · Any week · Add guests</span>
            </span>
          </button>
          <button aria-label="Filters" onClick={() => setFilters(true)} className="grid size-12 place-items-center rounded-full border border-line bg-card"><SlidersHorizontal className="w-5 h-5" /></button>
        </div>
        <div className="mt-3 flex gap-6 overflow-x-auto border-b border-line px-5">
          {KINDS.map((k) => (
            <button key={k.id} onClick={() => setKind(k.id)} className={`flex min-h-14 shrink-0 flex-col items-center justify-center gap-1 border-b-2 text-caption1 font-medium ${kind === k.id ? 'border-current' : 'border-transparent opacity-55'}`}>
              <k.icon className="w-6 h-6" />{k.label}
            </button>
          ))}
        </div>
      </div>

      {PLACES.map((p, i) => (
        <div key={p.id} className="mx-4 mt-6 vs-rise" style={{ animationDelay: `${i * 70}ms` }}>
          <button onClick={() => nav.push('place', { id: p.id })} className="relative block w-full">
            <Photo q={p.photo} className="aspect-square w-full rounded-[20px]" />
            <span role="button" aria-label="Save" onClick={(e) => { e.stopPropagation(); save(p) }} className="absolute right-2 top-2 grid size-11 place-items-center text-white drop-shadow">
              <Heart className="w-7 h-7" fill={saved.includes(p.id) ? '#ff385c' : 'rgba(0,0,0,.35)'} />
            </span>
          </button>
          <button onClick={() => nav.push('place', { id: p.id })} className="mt-3 block w-full text-left">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-headline">{p.name}</span>
              <span className="flex shrink-0 items-center gap-1 text-subhead"><Star className="w-3.5 h-3.5" fill="currentColor" />{p.rating}</span>
            </span>
            <span className="block text-subhead opacity-60">{p.host}</span>
            <span className="block text-subhead opacity-60">{p.dates}</span>
            <span className="mt-1 block text-subhead"><b>${p.price}</b> night</span>
          </button>
        </div>
      ))}

      <button onClick={() => nav.push('map')} className="fixed bottom-28 left-1/2 z-30 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#222] px-5 text-subhead font-semibold text-white shadow-lg">
        Map <Map className="w-4 h-4" />
      </button>

      <Sheet opened={filters} onBackdropClick={() => setFilters(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Filters</h3>
        <List strong inset>
          <ListItem title="Instant book" after={<Toggle checked={instant} onChange={() => setInstant(!instant)} />} />
          <ListItem title="Price per night" after="Up to $300" />
        </List>
        <Block><Button large rounded onClick={() => setFilters(false)}>Show {PLACES.length * 104} stays</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-40"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="discover" />
    </Page>
  )
}
