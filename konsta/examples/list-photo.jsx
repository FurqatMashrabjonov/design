import { useState } from 'react'
import { Page, Sheet, Block, List, ListItem, Toggle, Button, Toast } from 'konsta/react'
import { ChevronLeft, SlidersHorizontal, Heart, Star, Map, BadgeCheck } from 'lucide-react'
import { useNav, AppTabbar, Photo } from '@od/kit'

// EXM-01: a photo-led results list (stays, cars, restaurants, products), built the way the marketplaces build theirs:
// the header is the search itself — back, where · when · who, a filter button — then sort and filter chips, a count
// line that says what the list is, and large photo cards with the facts under the photo: name and rating, place,
// one badge, the price with its unit (a struck old price when there is a deal). A floating pill opens the map.
const RESULTS = [
  { id: 'cove', name: 'Cove Cottage', place: 'Carmel-by-the-Sea · 1.2 km', rating: 4.96, reviews: 211, price: 238, was: 270, badge: 'Guest favourite', photo: 'stone cottage garden sea' },
  { id: 'pine', name: 'Pine Ridge Cabin', place: 'Big Sur · 8 km', rating: 4.91, reviews: 98, price: 182, badge: 'Free cancellation', photo: 'cabin pine forest deck' },
  { id: 'loft', name: 'Harbor Loft', place: 'Monterey · 3.4 km', rating: 4.85, reviews: 154, price: 164, photo: 'bright loft harbor view' },
]
const CHIPS = ['Sort', 'Price', 'Instant book', 'Pets allowed']

export default function Screen() {
  const nav = useNav()
  const [saved, setSaved] = useState(['pine'])
  const [chips, setChips] = useState(['Instant book'])
  const [filters, setFilters] = useState(false)
  const [pool, setPool] = useState(false)
  const [toast, setToast] = useState(null)
  const flip = (c) => (c === 'Sort' ? setFilters(true) : setChips(chips.includes(c) ? chips.filter((x) => x !== c) : [...chips, c]))
  const save = (r) => {
    const on = !saved.includes(r.id)
    setSaved(on ? [...saved, r.id] : saved.filter((x) => x !== r.id))
    setToast(on ? `Saved ${r.name}` : `Removed ${r.name}`)
    setTimeout(() => setToast(null), 2000)
  }
  return (
    <Page className="pb-48">
      <div className="sticky top-0 z-20 bg-page/90 pt-[max(12px,var(--k-safe-area-top))] pb-3 backdrop-blur-xl">
        <div className="mx-4 flex items-center gap-2">
          <button aria-label="Back" onClick={() => nav.pop()} className="grid size-11 place-items-center rounded-full"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={() => nav.push('search')} className="flex min-h-12 flex-1 flex-col justify-center rounded-full bg-card px-5 text-left shadow-[0_2px_12px_rgba(0,0,0,.08)]">
            <span className="text-subhead font-semibold">Monterey Bay</span>
            <span className="text-footnote opacity-60">17–19 Oct · 2 guests</span>
          </button>
          <button aria-label="Filters" onClick={() => setFilters(true)} className="grid size-11 place-items-center rounded-full border border-line bg-card"><SlidersHorizontal className="w-5 h-5" /></button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto px-4">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => flip(c)} className={`min-h-9 shrink-0 rounded-full border px-4 text-footnote font-medium ${chips.includes(c) ? 'border-transparent bg-primary text-white' : 'border-line bg-card'}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-2 text-subhead"><b>{RESULTS.length * 46} stays</b><span className="opacity-60"> · prices include all fees</span></div>

      {RESULTS.map((r, i) => (
        <div key={r.id} className="mx-4 mt-5 vs-rise" style={{ animationDelay: `${i * 70}ms` }}>
          <button onClick={() => nav.push('place', { id: r.id })} className="relative block w-full">
            <Photo q={r.photo} className="aspect-[4/3] w-full rounded-[20px]" />
            {r.badge && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-footnote font-semibold text-black shadow-sm">{r.badge}</span>}
            <span role="button" aria-label="Save" onClick={(e) => { e.stopPropagation(); save(r) }} className="absolute right-2 top-2 grid size-11 place-items-center text-white drop-shadow">
              <Heart className="w-7 h-7" fill={saved.includes(r.id) ? '#ff385c' : 'rgba(0,0,0,.35)'} />
            </span>
          </button>
          <button onClick={() => nav.push('place', { id: r.id })} className="mt-3 block w-full text-left">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-headline">{r.name}</span>
              <span className="flex shrink-0 items-center gap-1 text-subhead"><Star className="w-3.5 h-3.5" fill="currentColor" />{r.rating}<span className="opacity-55">({r.reviews})</span></span>
            </span>
            <span className="block text-subhead opacity-60">{r.place}</span>
            <span className="mt-1 flex items-baseline gap-1.5 text-subhead">
              {r.was && <span className="line-through opacity-50">${r.was}</span>}<b>${r.price}</b> night
              {r.was && <span className="ml-1 flex items-center gap-0.5 text-footnote text-green-700 dark:text-green-400"><BadgeCheck className="w-3.5 h-3.5" />Save ${r.was - r.price}</span>}
            </span>
          </button>
        </div>
      ))}

      <button onClick={() => nav.push('map')} className="fixed bottom-28 left-1/2 z-30 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#222] px-5 text-subhead font-semibold text-white shadow-lg">
        Map <Map className="w-4 h-4" />
      </button>

      <Sheet opened={filters} onBackdropClick={() => setFilters(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Sort and filter</h3>
        <List strong inset>
          <ListItem title="Sort by" after="Recommended" />
          <ListItem title="Pool" after={<Toggle checked={pool} onChange={() => setPool(!pool)} />} />
        </List>
        <Block><Button large rounded onClick={() => setFilters(false)}>Show {RESULTS.length * 46} stays</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-40"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="discover" />
    </Page>
  )
}
