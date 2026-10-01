import { useState } from 'react'
import { Page, Navbar, BlockTitle } from 'konsta/react'
import { Search, Heart, Star, SlidersHorizontal } from 'lucide-react'
import { useNav, AppTabbar, Photo, Dots, tint } from '@od/kit'

const C = {"cabins":"#a16207","villas":"#047857","treehouses":"#6b21a8","chalets":"#be185d","beachHouses":"#0e7490"}

const CATEGORIES = [
  { id: 'cabins', name: 'Cabins', emoji: '🛖' },
  { id: 'villas', name: 'Villas', emoji: '🏡' },
  { id: 'treehouses', name: 'Treehouses', emoji: '🌴' },
  { id: 'chalets', name: 'Chalets', emoji: '🏔️' },
  { id: 'beachHouses', name: 'Beach houses', emoji: '🌊' },
]

const STAYS = [
  { id: 'reine', name: "Reine Fisherman's Rorbu", place: 'Lofoten, Norway', kind: 'Cabin', emoji: '🛖', cat: 'cabins', price: 210, rating: 4.96, reviews: 184, host: 'Ingrid · Superhost', beds: '2 bedrooms · 4 guests', photos: ['red cabin fjord mountains', 'cabin wood stove', 'wooden sauna interior'] },
  { id: 'cipresso', name: 'Villa Cipresso', place: 'Val d\u2019Orcia, Tuscany, Italy', kind: 'Villa', emoji: '🏡', cat: 'villas', price: 340, rating: 4.92, reviews: 126, host: 'Marco · Superhost', beds: '3 bedrooms · 6 guests', photos: ['stone villa cypress hills', 'infinity pool tuscany', 'olive grove sunset'] },
  { id: 'canopy', name: 'Canopy Nest Treehouse', place: 'Ubud, Bali, Indonesia', kind: 'Treehouse', emoji: '🌴', cat: 'treehouses', price: 165, rating: 4.98, reviews: 302, host: 'Wayan · Superhost', beds: '1 bedroom · 2 guests', photos: ['bamboo treehouse jungle', 'jungle plunge pool', 'outdoor yoga deck'] },
  { id: 'edelweiss', name: 'Chalet Edelweiss', place: 'Zermatt, Swiss Alps', kind: 'Chalet', emoji: '🏔️', cat: 'chalets', price: 480, rating: 4.94, reviews: 98, host: 'Anna', beds: '4 bedrooms · 8 guests', photos: ['wooden chalet snowy peaks', 'chalet fireplace living', 'hot tub mountains'] },
  { id: 'amed', name: 'Amed Driftwood House', place: 'Amed, Bali, Indonesia', kind: 'Beach house', emoji: '🌊', cat: 'beachHouses', price: 190, rating: 4.89, reviews: 71, beds: 'Steps from the sea', photos: ['beach house ocean sunset', 'driftwood beach bedroom', 'black sand beach'] },
  { id: 'lyngen', name: 'Lyngen Glass Igloo Cabin', place: 'Northern Norway', kind: 'Cabin', emoji: '❄️', cat: 'cabins', price: 295, rating: 4.97, reviews: 63, beds: 'Under the aurora', photos: ['glass cabin northern lights', 'snowy arctic fjord', 'cosy cabin bed'] },
]

const HEARTED = ['cipresso', 'canopy', 'edelweiss', 'reine']

export default function Screen() {
  const nav = useNav()
  const [cat, setCat] = useState('cabins')
  const [saved, setSaved] = useState(HEARTED)
  const toggleSave = (id) => setSaved(saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id])

  const featured = STAYS.filter((s) => s.cat === cat)
  const rest = STAYS.filter((s) => s.cat !== cat)
  const active = CATEGORIES.find((c) => c.id === cat)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Explore"
        subnavbar={<SearchPill onWhen={() => nav.push('date-guests')} />} />

      <div className="flex gap-6 overflow-x-auto px-4 mt-2 border-b border-line [scrollbar-width:none]">
        {CATEGORIES.map((c) => {
          const on = c.id === cat
          return (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`shrink-0 flex flex-col items-center gap-1 pt-1 pb-2.5 min-h-[44px] border-b-2 transition ${on ? '' : 'border-transparent opacity-55'}`}
              style={on ? { borderColor: C[c.id] } : undefined}>
              <span className={`text-2xl ${on ? 'vs-bounce' : ''}`}>{c.emoji}</span>
              <span className="text-caption1 font-semibold whitespace-nowrap" style={on ? { color: C[c.id] } : undefined}>{c.name}</span>
            </button>
          )
        })}
      </div>

      <div className="px-4 pt-5 pb-1 flex items-baseline justify-between">
        <div className="text-footnote text-black/55 dark:text-white/55">{featured.length} {active.name.toLowerCase()} · prices per night in EUR</div>
      </div>

      <div className="space-y-8 mt-3">
        {featured.map((s, i) => (
          <StayCard key={s.id} stay={s} i={i} saved={saved.includes(s.id)} onSave={() => toggleSave(s.id)} onOpen={() => nav.push('stay-detail', { id: s.id })} />
        ))}
      </div>

      <BlockTitle large className="!mt-10 !mb-2">More remarkable places</BlockTitle>
      <div className="space-y-8">
        {rest.map((s, i) => (
          <StayCard key={s.id} stay={s} i={i + featured.length} saved={saved.includes(s.id)} onSave={() => toggleSave(s.id)} onOpen={() => nav.push('stay-detail', { id: s.id })} />
        ))}
      </div>

      <AppTabbar active="explore" />
    </Page>
  )
}

function SearchPill({ onWhen }) {
  return (
    <div className="w-full flex items-center gap-2 py-1">
      <div className="flex-1 flex items-stretch rounded-full bg-card border border-line shadow-lg shadow-black/5 overflow-hidden">
        <button className="flex items-center gap-2 pl-4 pr-3 min-h-[48px] text-left flex-[1.2] min-w-0">
          <Search className="w-4 h-4 shrink-0" />
          <span className="min-w-0">
            <span className="block text-caption2 font-semibold uppercase tracking-wide opacity-60">Where</span>
            <span className="block text-footnote font-semibold truncate">Anywhere</span>
          </span>
        </button>
        <button onClick={onWhen} className="px-3 min-h-[48px] text-left border-l border-line flex-1 min-w-0">
          <span className="block text-caption2 font-semibold uppercase tracking-wide opacity-60">When</span>
          <span className="block text-footnote font-semibold truncate">Any week</span>
        </button>
        <button onClick={onWhen} className="px-3 min-h-[48px] text-left border-l border-line flex-1 min-w-0">
          <span className="block text-caption2 font-semibold uppercase tracking-wide opacity-60">Who</span>
          <span className="block text-footnote font-semibold truncate">Add guests</span>
        </button>
      </div>
      <button onClick={onWhen} aria-label="Filters" className="w-11 h-11 shrink-0 rounded-full bg-card border border-line flex items-center justify-center">
        <SlidersHorizontal className="w-5 h-5" />
      </button>
    </div>
  )
}

function StayCard({ stay, i, saved, onSave, onOpen }) {
  const [slide, setSlide] = useState(0)
  const onScroll = (e) => {
    const el = e.currentTarget
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== slide) setSlide(idx)
  }
  const color = C[stay.cat]
  return (
    <div className="px-4 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
      <div className="relative">
        <div onScroll={onScroll} onClick={onOpen}
          className="flex overflow-x-auto snap-x snap-mandatory rounded-[24px] [scrollbar-width:none] cursor-pointer">
          {stay.photos.map((q) => (
            <Photo key={q} q={q} alt={stay.name} className="w-full h-80 shrink-0 snap-center" />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-[24px] bg-gradient-to-t from-black/50" />
        <span className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-caption1 font-semibold bg-card/90 flex items-center gap-1">
          <span>{stay.emoji}</span><span style={{ color }}>{stay.kind}</span>
        </span>
        <button onClick={onSave} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center">
          <Heart className={`w-7 h-7 drop-shadow ${saved ? 'vs-bounce' : ''}`}
            style={{ color: saved ? '#ff385c' : '#ffffff', fill: saved ? '#ff385c' : 'rgba(0,0,0,0.25)' }} strokeWidth={2} />
        </button>
        <div className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center">
          <Dots count={stay.photos.length} active={slide} />
        </div>
      </div>

      <button onClick={onOpen} className="w-full text-left mt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-headline truncate">{stay.name}</div>
            <div className="text-subhead text-black/55 dark:text-white/55 truncate">{stay.place}</div>
          </div>
          <div className="flex items-center gap-1 text-subhead font-semibold shrink-0 pt-0.5">
            <Star className="w-4 h-4" style={{ color, fill: color }} />
            {stay.rating.toFixed(2)}
            <span className="font-normal text-black/55 dark:text-white/55">({stay.reviews})</span>
          </div>
        </div>
        <div className="text-footnote text-black/55 dark:text-white/55 mt-0.5 truncate">
          {stay.host ? `Hosted by ${stay.host} · ` : ''}{stay.beds}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-body"><span className="font-bold">€{stay.price}</span> night</span>
          <span className="text-caption1 font-semibold rounded-full px-2 py-0.5" style={{ background: tint(color, 14) }}>Free cancellation</span>
        </div>
      </button>
    </div>
  )
}
