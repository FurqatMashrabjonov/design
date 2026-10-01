import { useState } from 'react'
import { Page, Button, Link } from 'konsta/react'
import { Star, MapPin } from 'lucide-react'
import { useNav, Photo, Dots } from '@od/kit'

const C = {"cabins":"#a16207","villas":"#047857","treehouses":"#6b21a8","chalets":"#be185d","beachHouses":"#0e7490"}

const SLIDES = [
  {
    photo: 'red cabin fjord mountains',
    kicker: 'Cabins · Lofoten',
    title: 'Stay somewhere\nunforgettable',
    text: 'Cabins, villas, treehouses and chalets in the places you keep dreaming about.',
    stay: { emoji: '🛖', name: "Reine Fisherman's Rorbu", place: 'Lofoten, Norway', price: '€210', rating: '4.96', color: C.cabins },
  },
  {
    photo: 'stone villa cypress hills',
    kicker: 'Villas · Tuscany',
    title: 'Handpicked by\npeople who travel',
    text: 'Every stay is visited and chosen for its setting, its host and the way it makes you feel.',
    stay: { emoji: '🏡', name: 'Villa Cipresso', place: "Val d'Orcia, Italy", price: '€340', rating: '4.92', color: C.villas },
  },
  {
    photo: 'bamboo treehouse jungle',
    kicker: 'Treehouses · Bali',
    title: 'Save places,\nplan together',
    text: 'Heart the stays you love, gather them into wishlists and book when the dates line up.',
    stay: { emoji: '🌴', name: 'Canopy Nest Treehouse', place: 'Ubud, Bali', price: '€165', rating: '4.98', color: C.treehouses },
  },
]

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const s = SLIDES[i]
  const last = i === SLIDES.length - 1

  return (
    <Page className="relative overflow-hidden">
      <div key={i} className="absolute inset-0 vs-rise">
        <Photo q={s.photo} alt={s.stay.name} className="absolute inset-0 w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/0 to-black/0" />
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/60 to-black/0" />
        </Photo>
      </div>

      <div className="relative z-10 flex flex-col min-h-full">
        <div className="flex items-center justify-between px-4 pt-14 h-24">
          <span className="text-headline text-white tracking-wide">Hideaway</span>
          {!last && (
            <Link className="text-white" onClick={() => nav.reset('explore')}>
              Skip
            </Link>
          )}
        </div>

        <div className="flex-1" />

        <div key={`card-${i}`} className="px-4 vs-rise" style={{ animationDelay: '120ms' }}>
          <div className="vs-float inline-flex items-center gap-3 rounded-2xl bg-black/35 backdrop-blur-md px-3 py-2.5 max-w-full">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: s.stay.color }}
            >
              {s.stay.emoji}
            </div>
            <div className="min-w-0 text-white">
              <div className="text-subhead font-semibold truncate">{s.stay.name}</div>
              <div className="text-caption1 opacity-75 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{s.stay.place}</span>
                <span className="mx-1">·</span>
                <Star className="w-3 h-3 fill-current" />
                <span>{s.stay.rating}</span>
                <span className="mx-1">·</span>
                <span>{s.stay.price}/night</span>
              </div>
            </div>
          </div>
        </div>

        <div key={`text-${i}`} className="px-4 mt-8 text-white vs-rise" style={{ animationDelay: '200ms' }}>
          <div className="text-footnote uppercase tracking-widest opacity-70">{s.kicker}</div>
          <h1 className="text-large-title whitespace-pre-line mt-2 leading-tight">{s.title}</h1>
          <p className="mt-3 text-body opacity-75">{s.text}</p>
        </div>

        <div className="mt-8 mb-6">
          <Dots count={SLIDES.length} active={i} />
        </div>

        <div className="px-4 pb-12">
          <Button large rounded onClick={() => (last ? nav.reset('explore') : setI(i + 1))}>
            {last ? 'Start exploring' : 'Continue'}
          </Button>
          <div className="text-center mt-4 text-footnote text-white/60">
            Stays from Lofoten to Bali
          </div>
        </div>
      </div>
    </Page>
  )
}
