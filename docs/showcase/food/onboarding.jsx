import { useState, useRef } from 'react'
import { Page, Button, Block, Link } from 'konsta/react'
import { MapPin, Star, Bike, Clock } from 'lucide-react'
import { useNav, Photo, Glow, Dots, Hero, Tile, Meter, tint } from '@od/kit'

const C = {"pizza":"#7b61ff","burgers":"#ff3d7f","asian":"#00a8e8","vegan":"#58cc02","dessert":"#ff9f1c","drinks":"#ff6b35"}

const SLIDES = [
  {
    title: 'Your Kiez,\ndelivered',
    text: 'The best plates from around the corner, at your door in about 25 minutes.',
    art: (
      <div className="relative w-72 h-72 mx-auto">
        <Glow color={C.drinks} size={300} />
        <div className="absolute inset-x-6 top-2 bottom-10 rounded-[32px] rotate-6" style={{ background: tint(C.drinks, 26) }} />
        <Photo q="friends sharing pizza table" className="absolute inset-x-6 top-2 bottom-10 rounded-[32px] -rotate-3 overflow-hidden shadow-xl" />
        <Hero color={C.drinks} to={C.burgers} className="absolute left-0 bottom-2 !p-3 rounded-[20px] flex items-center gap-2 shadow-lg vs-float">
          <MapPin className="w-5 h-5" />
          <div>
            <div className="text-footnote font-semibold">Oderberger Str. 21</div>
            <div className="text-caption1 opacity-80">Prenzlauer Berg · 25 min</div>
          </div>
        </Hero>
      </div>
    ),
  },
  {
    title: 'Local kitchens,\nnot chains',
    text: 'Neapolitan ovens, smash burgers and vegan bowls from family-run spots across Berlin.',
    art: (
      <div className="relative w-72 h-72 mx-auto">
        <Glow color={C.pizza} size={300} />
        <Photo q="chef plating dish kitchen" className="absolute inset-x-6 top-2 bottom-12 rounded-[32px] rotate-3 overflow-hidden shadow-xl" />
        <div className="absolute right-0 bottom-0 w-52 bg-card rounded-[20px] p-3 shadow-lg vs-float flex items-center gap-3">
          <Tile color={C.pizza} tinted size={40}><span className="text-xl">🍕</span></Tile>
          <div className="min-w-0">
            <div className="text-subhead font-semibold truncate">Pizzeria Ruffiano</div>
            <div className="text-caption1 text-black/55 dark:text-white/55 flex items-center gap-1">
              <Star className="w-3 h-3" style={{ color: C.dessert, fill: C.dessert }} /> 4.8 · Kastanienallee
            </div>
          </div>
        </div>
        <div className="absolute left-0 top-8 flex flex-col gap-2 vs-float" style={{ animationDelay: '400ms' }}>
          {[['🍔', C.burgers], ['🍜', C.asian], ['🥗', C.vegan]].map(([e, c]) => (
            <div key={e} className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-md bg-card">
              <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ background: tint(c, 22) }}>{e}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Track every\nbite live',
    text: 'Watch your courier ride over on the map, minute by minute, until the doorbell rings.',
    art: (
      <div className="relative w-72 h-72 mx-auto">
        <Glow color={C.asian} size={300} />
        <div className="absolute inset-x-6 top-2 bottom-12 rounded-[32px] -rotate-6" style={{ background: tint(C.asian, 26) }} />
        <Photo q="courier cycling berlin street" className="absolute inset-x-6 top-2 bottom-12 rounded-[32px] rotate-2 overflow-hidden shadow-xl" />
        <Hero color={C.asian} to={C.pizza} className="absolute inset-x-2 bottom-0 !p-3 rounded-[20px] shadow-lg vs-float">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5" />
            <div className="text-footnote font-semibold flex-1">Malik is on the way</div>
            <div className="text-footnote font-semibold flex items-center gap-1"><Clock className="w-4 h-4" />12 min</div>
          </div>
          <div className="mt-2"><Meter value={0.75} color="#ffffff" height={6} /></div>
        </Hero>
      </div>
    ),
  },
]

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const startX = useRef(null)
  const s = SLIDES[i]
  const last = i === SLIDES.length - 1

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (startX.current == null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (dx < -40 && i < SLIDES.length - 1) setI(i + 1)
    if (dx > 40 && i > 0) setI(i - 1)
    startX.current = null
  }

  return (
    <Page className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-14 h-24">
        <div className="text-headline font-bold">
          <span>Kiez</span><span style={{ color: C.drinks }}>bite</span>
        </div>
        {!last && <Link onClick={() => nav.reset('home')}>Skip</Link>}
      </div>

      <div
        key={i}
        className="flex-1 flex flex-col justify-center vs-rise"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {s.art}
        <Block className="text-center !mt-10">
          <h1 className="text-large-title whitespace-pre-line">{s.title}</h1>
          <p className="mt-4 text-body opacity-60">{s.text}</p>
        </Block>
      </div>

      <div className="mb-6"><Dots count={SLIDES.length} active={i} /></div>

      <Block className="!mb-12">
        <Button large rounded onClick={() => (last ? nav.reset('home') : setI(i + 1))}>
          {last ? 'Set delivery address' : 'Continue'}
        </Button>
        <div className="text-center mt-4 text-subhead">
          <span className="opacity-60">Already ordered with us? </span>
          <Link onClick={() => nav.reset('home')}>Log in</Link>
        </div>
      </Block>
    </Page>
  )
}
