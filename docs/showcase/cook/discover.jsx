import { useState } from 'react'
import { Page, Navbar, Searchbar, BlockTitle, Link, Chip } from 'konsta/react'
import { Clock, Flame, Star, ChevronRight, Bookmark } from 'lucide-react'
import { useNav, AppTabbar, Photo, Tile, tint } from '@od/kit'

const C = {"breakfast":"#047857","lunch":"#6b21a8","dinner":"#be185d","produce":"#0e7490","dairy":"#111111","pantry":"#b91c1c"}

const FRIDGE = [
  { id: 'salmon', emoji: '🐟', label: 'Salmon' },
  { id: 'spinach', emoji: '🥬', label: 'Spinach' },
  { id: 'eggs', emoji: '🥚', label: 'Eggs' },
  { id: 'chickpeas', emoji: '🫘', label: 'Chickpeas' },
  { id: 'feta', emoji: '🧀', label: 'Feta' },
  { id: 'lemon', emoji: '🍋', label: 'Lemon' },
]

const R = {
  salmon: { name: 'Miso Butter Salmon with Bok Choy', emoji: '🐟', meal: 'dinner', time: 25, diff: 'Easy', kcal: 520, rating: 4.8, photo: 'glazed salmon bok choy', uses: ['salmon'] },
  stew: { name: 'Lemony Chickpea & Spinach Stew', emoji: '🫘', meal: 'dinner', time: 30, diff: 'Easy', kcal: 430, rating: 4.7, photo: 'chickpea spinach stew bowl', uses: ['chickpeas', 'spinach', 'lemon'] },
  tacos: { name: 'Shrimp Tacos with Lime Slaw', emoji: '🌮', meal: 'dinner', time: 20, diff: 'Easy', kcal: 480, rating: 4.6, photo: 'shrimp tacos lime slaw', uses: [] },
  gnocchi: { name: 'Crispy Gnocchi with Burst Tomatoes', emoji: '🍅', meal: 'dinner', time: 20, diff: 'Easy', kcal: 560, rating: 4.9, photo: 'crispy gnocchi cherry tomatoes', uses: [] },
  cod: { name: 'Harissa Roasted Cod & Couscous', emoji: '🐠', meal: 'dinner', time: 35, diff: 'Medium', kcal: 510, rating: 4.7, photo: 'roasted cod couscous plate', uses: ['lemon'] },
  bowl: { name: 'Greek Salad Grain Bowl with Feta', emoji: '🥗', meal: 'lunch', time: 15, diff: 'Easy', kcal: 450, rating: 4.6, photo: 'greek grain bowl feta', uses: ['feta', 'lemon'] },
  tuna: { name: 'Tuna White Bean Salad', emoji: '🥫', meal: 'lunch', time: 10, diff: 'Easy', kcal: 390, rating: 4.5, photo: 'tuna white bean salad', uses: ['lemon'] },
  muffins: { name: 'Spinach Feta Egg Muffins', emoji: '🥚', meal: 'breakfast', time: 25, diff: 'Easy', kcal: 210, rating: 4.6, photo: 'spinach egg muffins', uses: ['spinach', 'feta', 'eggs'] },
  oats: { name: 'Overnight Oats with Berries', emoji: '🫐', meal: 'breakfast', time: 5, diff: 'Easy', kcal: 340, rating: 4.7, photo: 'overnight oats berries jar', uses: [] },
  shakshuka: { name: 'Shakshuka with Feta', emoji: '🍳', meal: 'breakfast', time: 25, diff: 'Easy', kcal: 380, rating: 4.9, photo: 'shakshuka skillet feta', uses: ['eggs', 'feta'] },
  avo: { name: 'Avocado Toast with Chili Egg', emoji: '🥑', meal: 'breakfast', time: 10, diff: 'Easy', kcal: 360, rating: 4.5, photo: 'avocado toast fried egg', uses: ['eggs', 'lemon'] },
}

const COLLECTIONS = [
  { title: 'Dinner in 20 Minutes', note: 'Quick, bright weeknight plates', ids: ['tacos', 'gnocchi', 'avo', 'tuna'] },
  { title: 'Healthy & Bright', note: 'Fresh, light and full of colour', ids: ['stew', 'bowl', 'cod', 'oats'] },
]

const MEAL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

export default function Screen() {
  const nav = useNav()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(['salmon', 'spinach'])
  const [saved, setSaved] = useState(true)

  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])
  const open = (key) => nav.push('recipe', { id: key })

  const q = query.trim().toLowerCase()
  const suggestions = Object.entries(R)
    .map(([key, r]) => ({ key, ...r, match: r.uses.filter((u) => picked.includes(u)).length }))
    .filter((r) => (picked.length ? r.match > 0 : true) && (!q || r.name.toLowerCase().includes(q)))
    .sort((a, b) => b.match - a.match || b.rating - a.rating)
    .slice(0, 3)

  const f = R.salmon

  return (
    <Page className="pb-32 overflow-x-hidden">
      <Navbar large transparent title="Good evening, Maya" subtitle="Thursday, October 1"
        subnavbar={<Searchbar placeholder="Recipes, ingredients, cuisines" value={query} clearButton
          onInput={(e) => setQuery(e.target.value)} onClear={() => setQuery('')} />} />

      {/* Fridge */}
      <div className="px-4 mt-3 flex items-baseline justify-between">
        <div className="text-headline">What's in your fridge</div>
        <div className="text-footnote text-black/55 dark:text-white/55">{picked.length} selected</div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 no-scrollbar">
        {FRIDGE.map((i) => {
          const on = picked.includes(i.id)
          return (
            <Chip key={i.id} onClick={() => toggle(i.id)}
              className={`shrink-0 !h-9 cursor-pointer ${on ? 'vs-bounce !text-primary font-semibold' : ''}`}
              style={on ? { background: tint(C.produce, 18) } : undefined}
              media={<span className="text-base">{i.emoji}</span>}>
              {i.label}
            </Chip>
          )
        })}
      </div>

      {/* Hero: featured */}
      <button onClick={() => open('salmon')} className="block w-full px-4 mt-5 text-left active:scale-[.98] transition vs-rise">
        <Photo q={f.photo} className="w-full h-[420px] rounded-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-caption1 font-semibold uppercase tracking-wider text-white" style={{ background: C.dinner }}>
            Featured · Dinner
          </div>
          <span role="button" onClick={(e) => { e.stopPropagation(); setSaved(!saved) }}
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/35 backdrop-blur flex items-center justify-center text-white">
            <Bookmark className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} />
          </span>
          <div className="absolute bottom-0 inset-x-0 p-5 text-white">
            <div className="text-footnote opacity-80">by Hana Mori · ★ 4.8 (2.1k)</div>
            <div className="text-title1 leading-tight mt-1">{f.name}</div>
            <div className="flex items-center gap-4 mt-3 text-subhead opacity-90">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{f.time} min</span>
              <span className="flex items-center gap-1.5"><Flame className="w-4 h-4" />{f.kcal} kcal</span>
              <span>{f.diff}</span>
            </div>
          </div>
        </Photo>
      </button>

      {/* Suggestions from fridge */}
      <BlockTitle className="!mt-8 !mb-2">From your fridge</BlockTitle>
      <div className="px-4">
        {suggestions.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-5xl">🧺</div>
            <div className="text-subhead text-black/55 dark:text-white/55 mt-2">No matches — try another ingredient.</div>
          </div>
        ) : suggestions.map((r, i) => (
          <button key={r.key} onClick={() => open(r.key)}
            className={`w-full flex items-center gap-3 py-3 text-left vs-rise ${i ? 'border-t border-line' : ''}`}
            style={{ animationDelay: `${i * 60}ms` }}>
            <Photo q={r.photo} className="w-16 h-16 rounded-2xl shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-caption1 font-semibold uppercase tracking-wider" style={{ color: C[r.meal] }}>{MEAL[r.meal]}</div>
              <div className="text-headline truncate">{r.name}</div>
              <div className="text-footnote text-black/55 dark:text-white/55">
                {r.time} min · {r.kcal} kcal{r.match ? ` · uses ${r.match} of yours` : ''}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-30 shrink-0" />
          </button>
        ))}
      </div>

      {/* Collections */}
      {COLLECTIONS.map((col, ci) => (
        <section key={col.title} className="mt-8 pt-6 border-t border-line mx-0">
          <div className="px-4 flex items-end justify-between">
            <div>
              <div className="text-title2">{col.title}</div>
              <div className="text-footnote text-black/55 dark:text-white/55 mt-0.5">{col.note}</div>
            </div>
            <Link onClick={() => nav.reset('saved')} className="text-subhead">See all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pt-4 pb-1 snap-x">
            {col.ids.map((id, i) => {
              const r = R[id]
              return (
                <button key={id} onClick={() => open(id)}
                  className="shrink-0 w-44 text-left snap-start active:scale-[.97] transition vs-rise"
                  style={{ animationDelay: `${(ci * 4 + i) * 60}ms` }}>
                  <Photo q={r.photo} className="w-44 h-56 rounded-card overflow-hidden relative">
                    <div className="absolute top-2.5 left-2.5">
                      <Tile tinted color={C[r.meal]} size={32}>{r.emoji}</Tile>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur text-caption1 text-white flex items-center gap-1">
                      <Star className="w-3 h-3" fill="currentColor" />{r.rating}
                    </div>
                  </Photo>
                  <div className="text-caption1 font-semibold uppercase tracking-wider mt-2" style={{ color: C[r.meal] }}>{MEAL[r.meal]}</div>
                  <div className="text-subhead font-semibold leading-snug line-clamp-2">{r.name}</div>
                  <div className="text-footnote text-black/55 dark:text-white/55 mt-0.5">{r.time} min · {r.kcal} kcal</div>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <div className="[&_a]:!min-w-0 [&_a]:!px-0.5 [&_span]:!text-caption2 [&_span]:!tracking-tight [&_span]:!whitespace-nowrap">
        <AppTabbar active="discover" />
      </div>
    </Page>
  )
}
