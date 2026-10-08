import { useState } from 'react'
import { Page, Sheet, Block, Button, Toast } from 'konsta/react'
import { ChevronLeft, Share, Heart, Star, DoorOpen, Sparkles, CalendarCheck, Wifi, Flame, ChefHat, Car, ChevronRight } from 'lucide-react'
import { useNav, Photo, Avatar, Carousel } from '@od/kit'

// EXM-01: a photo-led detail (a stay, a car, a restaurant, a product), built the way the marketplaces build theirs: the
// photos open the page edge to edge with round back / share / save buttons and a counter; then the name and one line
// of facts, the host, three highlights, a short description with "Show more", what it offers, reviews as cards — and a
// bar pinned to the bottom with the price, the dates and the one action. Reserve opens a sheet that confirms it.
const PLACE = {
  name: 'Cove Cottage', where: 'Carmel-by-the-Sea, California', rating: 4.96, reviews: 211, price: 238, dates: '17–19 Oct',
  photo: 'stone cottage garden sea', photoCount: 12,
  host: { name: 'Ines', years: 6, photo: 'portrait smiling woman short grey hair' },
}
const HIGHLIGHTS = [
  { icon: DoorOpen, title: 'Self check-in', text: 'Use the keypad at the door.' },
  { icon: Sparkles, title: 'Sparkling clean', text: '14 recent guests said so.' },
  { icon: CalendarCheck, title: 'Free cancellation before 15 Oct', text: 'Get a full refund.' },
]
const OFFERS = [[Wifi, 'Fast wifi · 120 Mbps'], [Flame, 'Fireplace'], [ChefHat, 'Full kitchen'], [Car, 'Free parking on premises']]
const REVIEWS = [
  { who: 'Daniel', when: 'September 2026', text: 'The garden at sunrise is worth the trip alone. Spotless and quiet.', photo: 'portrait man beard smiling' },
  { who: 'Aiko', when: 'August 2026', text: 'Ines left fresh bread and tips for the coast walk. We will be back.', photo: 'portrait smiling young woman' },
]

export default function Screen() {
  const nav = useNav()
  const [saved, setSaved] = useState(false)
  const [more, setMore] = useState(false)
  const [reserve, setReserve] = useState(false)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const round = 'grid size-10 place-items-center rounded-full bg-white/90 text-black shadow-sm'
  return (
    <Page className="pb-32">
      <div className="relative">
        <Photo q={PLACE.photo} className="h-[330px] w-full" />
        <div className="absolute inset-x-0 top-0 flex justify-between px-4 pt-[max(12px,var(--k-safe-area-top))]">
          <button aria-label="Back" onClick={() => nav.pop()} className={round}><ChevronLeft className="w-5 h-5" /></button>
          <span className="flex gap-2">
            <button aria-label="Share" onClick={() => say('Link copied')} className={round}><Share className="w-4 h-4" /></button>
            <button aria-label="Save" onClick={() => { setSaved(!saved); say(saved ? 'Removed from saved' : 'Saved') }} className={round}><Heart className="w-4 h-4" fill={saved ? '#ff385c' : 'none'} color={saved ? '#ff385c' : 'currentColor'} /></button>
          </span>
        </div>
        <span className="absolute bottom-9 right-4 rounded-md bg-black/60 px-2 py-0.5 text-caption1 font-semibold text-white">1 / {PLACE.photoCount}</span>
      </div>

      <div className="-mt-5 relative rounded-t-[24px] bg-page px-4 pt-6">
        <h1 className="text-title1">{PLACE.name}</h1>
        <div className="mt-1 text-subhead opacity-70">{PLACE.where}</div>
        <button onClick={() => nav.push('reviews')} className="mt-2 flex min-h-11 items-center gap-1 text-subhead font-medium"><Star className="w-4 h-4" fill="currentColor" />{PLACE.rating} · <span className="underline">{PLACE.reviews} reviews</span></button>

        <button onClick={() => nav.push('host')} className="mt-3 flex w-full items-center gap-3 border-y border-line py-4 text-left">
          <Avatar name={PLACE.host.name} photo={PLACE.host.photo} size={48} />
          <span className="flex-1"><span className="block text-headline">Hosted by {PLACE.host.name}</span><span className="block text-footnote opacity-60">Superhost · {PLACE.host.years} years hosting</span></span>
          <ChevronRight className="w-5 h-5 opacity-40" />
        </button>

        <div className="space-y-4 py-5">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="flex gap-4"><h.icon className="mt-0.5 w-6 h-6 shrink-0" /><span><span className="block text-headline">{h.title}</span><span className="block text-subhead opacity-60">{h.text}</span></span></div>
          ))}
        </div>

        <p className={`border-t border-line pt-5 text-body ${more ? '' : 'line-clamp-3'}`}>A stone cottage two streets from the sand, with a walled garden, a reading nook by the fire and a kitchen stocked for slow breakfasts. Mornings are quiet; the coast path starts at the end of the lane and the town's bakeries are a ten-minute walk.</p>
        <button onClick={() => setMore(!more)} className="mt-1 min-h-11 text-subhead font-semibold underline">{more ? 'Show less' : 'Show more'}</button>

        <h2 className="mt-4 border-t border-line pt-5 text-title3">What this place offers</h2>
        <div className="mt-3 space-y-3">{OFFERS.map(([I, t]) => <div key={t} className="flex items-center gap-4 text-body"><I className="w-6 h-6" />{t}</div>)}</div>

        <h2 className="mt-6 border-t border-line pt-5 text-title3 flex items-center gap-1.5"><Star className="w-5 h-5" fill="currentColor" />{PLACE.rating} · {PLACE.reviews} reviews</h2>
      </div>
      <div className="mt-3">
        <Carousel items={REVIEWS} itemWidth="82%" renderItem={(r) => (
          <div className="h-full rounded-[18px] border border-line bg-card p-4">
            <p className="text-subhead line-clamp-4">“{r.text}”</p>
            <div className="mt-3 flex items-center gap-2"><Avatar name={r.who} photo={r.photo} size={32} /><span><span className="block text-footnote font-semibold">{r.who}</span><span className="block text-caption1 opacity-60">{r.when}</span></span></div>
          </div>
        )} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-line bg-card px-4 pt-3 pb-[max(12px,var(--k-safe-area-bottom))]">
        <button onClick={() => nav.push('dates')} className="min-h-11 text-left"><span className="block text-headline">${PLACE.price} <span className="font-normal">night</span></span><span className="block text-footnote underline">{PLACE.dates}</span></button>
        <Button large rounded inline className="!px-8" onClick={() => setReserve(true)}>Reserve</Button>
      </div>

      <Sheet opened={reserve} onBackdropClick={() => setReserve(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Confirm and pay</h3>
        <Block className="space-y-2 text-body">
          <div className="flex justify-between"><span>${PLACE.price} × 2 nights</span><span className="tabular-nums">${PLACE.price * 2}</span></div>
          <div className="flex justify-between"><span>Cleaning fee</span><span className="tabular-nums">$45</span></div>
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span className="tabular-nums">${PLACE.price * 2 + 45}</span></div>
        </Block>
        <Block><Button large rounded onClick={() => { setReserve(false); nav.push('confirmation') }}>Reserve for {PLACE.dates}</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-28"><div className="shrink">{toast}</div></Toast>
    </Page>
  )
}
