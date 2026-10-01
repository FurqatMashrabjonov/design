import { useState } from 'react'
import { Page, Navbar, Searchbar, BlockTitle, Chip, Block } from 'konsta/react'
import { Play, Clock, Heart } from 'lucide-react'
import { useNav, AppTabbar, Photo, tint } from '@od/kit'

const C = {"sleep":"#c99a3e","anxiety":"#c07580","focus":"#5f9e94","breathing":"#8a7bb0","stories":"#d0845a"}

const CATS = [
  { id: 'sleep', name: 'Sleep' },
  { id: 'anxiety', name: 'Anxiety' },
  { id: 'focus', name: 'Focus' },
  { id: 'breathing', name: 'Breathing' },
]

const SESSIONS = [
  { id: 'soften', title: 'Soften the Worry', min: 12, guide: 'Elena Ward', emoji: '🍃', cat: 'anxiety', photo: 'misty green forest path', featured: true },
  { id: 'box', title: 'Box Breathing', min: 5, guide: 'Jonah Okafor', emoji: '🫁', cat: 'breathing', photo: 'calm ocean horizon', fav: true },
  { id: 'deep', title: 'Deep Work Primer', min: 15, guide: 'Priya Nair', emoji: '🎯', cat: 'focus', photo: 'tidy desk morning light' },
  { id: 'falling', title: 'Falling Asleep Gently', min: 20, guide: 'Elena Ward', emoji: '🌙', cat: 'sleep', photo: 'moonlit bedroom window', fav: true },
  { id: 'panic', title: 'Panic Pause', min: 3, guide: 'Jonah Okafor', emoji: '🌊', cat: 'anxiety', photo: 'waves on smooth stones' },
  { id: '478', title: '4-7-8 Wind Down', min: 8, guide: 'Jonah Okafor', emoji: '💨', cat: 'breathing', photo: 'candle in dark room' },
  { id: 'single', title: 'Single-Task Focus', min: 10, guide: 'Priya Nair', emoji: '☕', cat: 'focus', photo: 'steaming tea cup' },
  { id: 'rain', title: 'Rain on the Roof', min: 25, guide: 'Elena Ward', emoji: '🌧️', cat: 'sleep', photo: 'rain on window glass' },
]

function SessionCard({ s, i, onOpen }) {
  const color = C[s.cat]
  return (
    <button
      onClick={onOpen}
      className="vs-rise text-left bg-card rounded-card overflow-hidden active:opacity-80"
      style={{ animationDelay: `${i * 60}ms` }}
    >
      <Photo q={s.photo} className="w-full h-28">
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-caption1 text-white">
          <Clock className="w-3 h-3" />{s.min} min
        </div>
        {s.fav && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/45 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
        )}
      </Photo>
      <div className="p-3">
        <div className="text-headline truncate">{s.title}</div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-footnote text-black/55 dark:text-white/55 truncate">{s.guide}</span>
          <span className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm" style={{ background: tint(color, 20) }}>
            {s.emoji}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function Screen() {
  const nav = useNav()
  const [cat, setCat] = useState('anxiety')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const match = (s) => !q || s.title.toLowerCase().includes(q) || s.guide.toLowerCase().includes(q)
  const featured = SESSIONS.find((s) => s.cat === cat && s.featured) || SESSIONS.find((s) => s.cat === cat)
  const inCat = SESSIONS.filter((s) => s.cat === cat && s.id !== featured.id && match(s))
  const others = SESSIONS.filter((s) => s.cat !== cat && match(s))
  const catName = CATS.find((c) => c.id === cat).name
  const open = (s) => nav.push('player', { id: s.id })

  return (
    <Page className="pb-32">
      <Navbar
        large
        transparent
        title="Library"
        subnavbar={
          <Searchbar
            placeholder="Search sessions or guides"
            value={query}
            clearButton
            onInput={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
          />
        }
      />

      <div className="flex gap-2 overflow-x-auto px-4 pt-2 pb-1">
        {CATS.map((c) => {
          const on = c.id === cat
          return (
            <Chip
              key={c.id}
              onClick={() => setCat(c.id)}
              className="shrink-0 cursor-pointer !h-9 !px-3.5"
              style={{ background: on ? tint(C[c.id], 30) : tint(C[c.id], 12) }}
              media={<span className="w-2.5 h-2.5 rounded-full" style={{ background: C[c.id] }} />}
            >
              <span className={on ? 'font-semibold' : ''}>{c.name}</span>
            </Chip>
          )
        })}
      </div>

      {featured && match(featured) && (
        <div className="px-4 mt-5">
          <button onClick={() => open(featured)} className="vs-rise block w-full text-left active:opacity-90">
            <Photo q={featured.photo} className="w-full h-52 rounded-card overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-caption1 font-semibold text-white">
                Featured · {catName}
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between gap-3">
                <div className="min-w-0 text-white">
                  <div className="text-title2 truncate">{featured.title}</div>
                  <div className="text-subhead opacity-85">{featured.guide} · {featured.min} min</div>
                </div>
                <span className="w-12 h-12 shrink-0 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-5 h-5 ml-0.5" style={{ color: C[cat] }} fill={C[cat]} />
                </span>
              </div>
            </Photo>
          </button>
        </div>
      )}

      {inCat.length > 0 && (
        <>
          <BlockTitle className="!mb-2">More for {catName.toLowerCase()}</BlockTitle>
          <div className="grid grid-cols-2 gap-3 px-4">
            {inCat.map((s, i) => <SessionCard key={s.id} s={s} i={i} onOpen={() => open(s)} />)}
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <BlockTitle className="!mb-2">All sessions</BlockTitle>
          <div className="grid grid-cols-2 gap-3 px-4">
            {others.map((s, i) => <SessionCard key={s.id} s={s} i={i + inCat.length} onOpen={() => open(s)} />)}
          </div>
        </>
      )}

      {!inCat.length && !others.length && !(featured && match(featured)) && (
        <Block className="text-center">
          <div className="text-5xl">🍃</div>
          <div className="text-headline mt-3">Nothing found</div>
          <div className="text-subhead text-black/55 dark:text-white/55 mt-1">Try another word, or breathe and browse.</div>
        </Block>
      )}

      <AppTabbar active="library" />
    </Page>
  )
}
