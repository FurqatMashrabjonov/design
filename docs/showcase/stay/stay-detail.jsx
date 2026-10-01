import { useState } from 'react'
import { Page, Button, Toast } from 'konsta/react'
import { ChevronLeft, Share, Heart, Star, Waves, Trees, Wine, Wifi, ChefHat, Car, MapPin, BedDouble, Users, CalendarCheck, Award } from 'lucide-react'
import { useNav, Photo, Avatar, Dots, Tile, tint } from '@od/kit'

const C = {"cabins":"#a16207","villas":"#047857","treehouses":"#6b21a8","chalets":"#be185d","beachHouses":"#0e7490"}

const STAY = {
  name: 'Villa Cipresso',
  place: 'Val d’Orcia, Tuscany, Italy',
  kind: 'Villa',
  emoji: '🏡',
  color: C.villas,
  price: 340,
  rating: 4.92,
  reviews: 126,
  host: 'Marco',
  hostYears: 4,
  bedrooms: 3,
  guests: 6,
  photos: ['stone villa cypress hills', 'infinity pool tuscany', 'rustic villa living room', 'olive grove sunset'],
}

const AMENITIES = [
  { label: 'Infinity pool', icon: Waves },
  { label: 'Olive grove', icon: Trees },
  { label: 'Wine cellar', icon: Wine },
  { label: 'Wi-Fi', icon: Wifi },
  { label: 'Outdoor kitchen', icon: ChefHat },
  { label: 'Free parking', icon: Car },
]

const REVIEWS = [
  { name: 'Sophie', date: 'Sep 2026', stars: 5, text: 'Sunsets over the cypresses were unreal, Marco left us his own olive oil.', color: '#c2410c' },
  { name: 'James', date: 'Aug 2026', stars: 5, text: 'The pool and the silence. Perfect family week.', color: '#1d4ed8' },
  { name: 'Lucía', date: 'Aug 2026', stars: 4, text: 'Gorgeous house; the road up is gravel, so drive slowly.', color: '#7c3aed' },
]

const GLASS = 'w-10 h-10 rounded-full bg-black/35 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition'

export default function Screen() {
  const nav = useNav()
  const [slide, setSlide] = useState(0)
  const [saved, setSaved] = useState(true)
  const [shared, setShared] = useState(false)

  const share = () => {
    setShared(true)
    setTimeout(() => setShared(false), 1800)
  }

  return (
    <Page className="pb-40">
      {/* Gallery */}
      <div className="relative">
        <div
          className="flex overflow-x-auto snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {STAY.photos.map((q) => (
            <Photo key={q} q={q} alt={STAY.name} className="w-full h-80 shrink-0 snap-center" />
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <div className="absolute top-12 inset-x-4 flex items-center justify-between">
          <button aria-label="Back" className={GLASS} onClick={nav.pop}><ChevronLeft className="w-6 h-6" /></button>
          <div className="flex gap-2">
            <button aria-label="Share" className={GLASS} onClick={share}><Share className="w-5 h-5" /></button>
            <button aria-label="Save" className={GLASS} onClick={() => setSaved(!saved)}>
              <Heart className={`w-5 h-5 ${saved ? 'vs-bounce' : ''}`} fill={saved ? '#ff385c' : 'none'} color={saved ? '#ff385c' : 'white'} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
          <Dots count={STAY.photos.length} active={slide} />
        </div>
        <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-full bg-black/45 text-white text-caption1 font-semibold">
          {slide + 1} / {STAY.photos.length}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-5 pb-5 vs-rise">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-footnote font-semibold" style={{ background: tint(STAY.color), color: STAY.color }}>
          <span>{STAY.emoji}</span>{STAY.kind}
        </div>
        <h1 className="text-title1 mt-3 leading-tight">{STAY.name}</h1>
        <div className="flex items-center gap-1 mt-1.5 text-subhead text-black/60 dark:text-white/60">
          <MapPin className="w-4 h-4 shrink-0" /><span className="truncate">{STAY.place}</span>
        </div>
        <div className="flex items-center gap-4 mt-3 text-subhead">
          <span className="flex items-center gap-1 font-semibold"><Star className="w-4 h-4" fill="currentColor" />{STAY.rating}</span>
          <span className="text-black/55 dark:text-white/55">{STAY.reviews} reviews</span>
          <span className="flex items-center gap-1 text-black/55 dark:text-white/55"><BedDouble className="w-4 h-4" />{STAY.bedrooms}</span>
          <span className="flex items-center gap-1 text-black/55 dark:text-white/55"><Users className="w-4 h-4" />{STAY.guests}</span>
        </div>
      </div>

      {/* Host */}
      <div className="mx-4 py-4 border-t border-line flex items-center gap-3 vs-rise" style={{ animationDelay: '60ms' }}>
        <div className="relative">
          <Avatar name={STAY.host} color={STAY.color} size={48} />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white ring-2 ring-[var(--tw-ring-offset-color,transparent)]" style={{ background: '#ff385c' }}>
            <Award className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-headline truncate">Hosted by {STAY.host}</div>
          <div className="text-footnote text-black/55 dark:text-white/55">Superhost · {STAY.hostYears} years hosting</div>
        </div>
      </div>

      <div className="mx-4 py-4 border-t border-line flex items-center gap-3">
        <Tile color={STAY.color} size={36}><CalendarCheck className="w-5 h-5" /></Tile>
        <div>
          <div className="text-headline">Free cancellation</div>
          <div className="text-footnote text-black/55 dark:text-white/55">Until Nov 6 for a full refund</div>
        </div>
      </div>

      {/* Amenities */}
      <div className="mx-4 pt-5 pb-2 border-t border-line">
        <h2 className="text-title2">What this place offers</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 mt-4">
          {AMENITIES.map(({ label, icon: Icon }, i) => (
            <div key={label} className="flex items-center gap-3 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: tint(STAY.color, 12), color: STAY.color }}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-subhead truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="mx-4 mt-5 pt-5 border-t border-line">
        <h2 className="text-title2">Where you’ll be</h2>
        <p className="text-footnote text-black/55 dark:text-white/55 mt-1">Val d’Orcia, Tuscany · 8 min to Pienza</p>
        <Photo q="tuscany countryside aerial" className="w-full h-44 rounded-card mt-3 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-16 h-16 rounded-full" style={{ background: tint(STAY.color, 35) }} />
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg" style={{ background: STAY.color }}>{STAY.emoji}</div>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/55 text-white text-caption1 font-semibold">8 min to Pienza</div>
        </Photo>
      </div>

      {/* Reviews */}
      <div className="mx-4 mt-6 pt-5 border-t border-line flex items-end gap-3">
        <span className="text-figure">{STAY.rating}</span>
        <div className="pb-1.5">
          <div className="flex gap-0.5" style={{ color: '#f59e0b' }}>
            {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="w-4 h-4" fill="currentColor" />)}
          </div>
          <div className="text-footnote text-black/55 dark:text-white/55 mt-0.5">{STAY.reviews} reviews</div>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 mt-4 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
        {REVIEWS.map((r, i) => (
          <div key={r.name} className="w-72 shrink-0 snap-start rounded-card bg-card p-4 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3">
              <Avatar name={r.name} color={r.color} size={40} />
              <div className="min-w-0">
                <div className="text-headline truncate">{r.name}</div>
                <div className="text-caption1 text-black/55 dark:text-white/55">{r.date}</div>
              </div>
              <div className="ml-auto flex items-center gap-0.5 text-footnote font-semibold">
                <Star className="w-3.5 h-3.5" fill="#f59e0b" color="#f59e0b" />{r.stars}
              </div>
            </div>
            <p className="text-subhead mt-3 leading-snug">“{r.text}”</p>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-card border-t border-line px-4 pt-3 pb-8 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-headline">€{STAY.price} <span className="text-subhead font-normal text-black/55 dark:text-white/55">night</span></div>
          <button className="text-footnote font-semibold underline underline-offset-2 min-h-[28px]" onClick={() => nav.push('date-guests')}>
            Nov 13–17 · 3 guests
          </button>
        </div>
        <Button large rounded inline className="!px-8" onClick={() => nav.push('checkout')}>Reserve</Button>
      </div>

      <Toast opened={shared} position="center">Link copied</Toast>
    </Page>
  )
}
