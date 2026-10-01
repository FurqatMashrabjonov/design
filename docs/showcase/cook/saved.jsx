import { useState } from 'react'
import { Page, Navbar, Chip, Block } from 'konsta/react'
import { Bookmark, Clock, Flame, ChefHat } from 'lucide-react'
import { useNav, AppTabbar, Photo } from '@od/kit'

const C = {"breakfast":"#047857","lunch":"#6b21a8","dinner":"#be185d","produce":"#0e7490","dairy":"#111111","pantry":"#b91c1c"}

const SAVED = [
  { id: 'miso-salmon', name: 'Miso Butter Salmon with Bok Choy', emoji: '🐟', meal: 'dinner', time: 25, kcal: 520, cooked: 3, veg: false, photo: 'glazed salmon bok choy' },
  { id: 'crispy-gnocchi', name: 'Crispy Gnocchi with Burst Tomatoes', emoji: '🍅', meal: 'dinner', time: 20, kcal: 560, cooked: 2, veg: true, photo: 'crispy gnocchi cherry tomatoes' },
  { id: 'shakshuka', name: 'Shakshuka with Feta', emoji: '🍳', meal: 'breakfast', time: 25, kcal: 380, cooked: 0, veg: true, photo: 'shakshuka skillet feta' },
  { id: 'mushroom-risotto', name: 'Mushroom Risotto with Peas', emoji: '🍄', meal: 'dinner', time: 45, kcal: 590, cooked: 0, veg: true, photo: 'creamy mushroom risotto' },
  { id: 'chickpea-stew', name: 'Lemony Chickpea & Spinach Stew', emoji: '🫘', meal: 'dinner', time: 30, kcal: 430, cooked: 4, veg: true, photo: 'chickpea spinach stew bowl' },
  { id: 'shrimp-tacos', name: 'Shrimp Tacos with Lime Slaw', emoji: '🌮', meal: 'dinner', time: 20, kcal: 480, cooked: 0, veg: false, photo: 'shrimp tacos lime slaw' },
  { id: 'harissa-cod', name: 'Harissa Roasted Cod & Couscous', emoji: '🐠', meal: 'dinner', time: 35, kcal: 510, cooked: 0, veg: false, photo: 'roasted cod couscous plate' },
  { id: 'overnight-oats', name: 'Overnight Oats with Berries', emoji: '🫐', meal: 'breakfast', time: 5, kcal: 340, cooked: 0, veg: true, photo: 'overnight oats berries jar' },
]

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'dinner', label: 'Dinner', test: (r) => r.meal === 'dinner' },
  { id: 'breakfast', label: 'Breakfast', test: (r) => r.meal === 'breakfast' },
  { id: 'quick', label: 'Under 30 min', test: (r) => r.time < 30 },
  { id: 'veg', label: 'Vegetarian', test: (r) => r.veg },
]

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

export default function Screen() {
  const nav = useNav()
  const [filter, setFilter] = useState('all')
  const active = FILTERS.find((f) => f.id === filter)
  const recipes = SAVED.filter(active.test)
  const cookedTotal = SAVED.reduce((s, r) => s + r.cooked, 0)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Saved" subtitle="24 saved · 42 cooked" />

      <div className="flex gap-2 overflow-x-auto px-4 pt-1 pb-3">
        {FILTERS.map((f) => {
          const on = f.id === filter
          return (
            <Chip
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 min-h-[36px] px-1 cursor-pointer ${on ? 'bg-primary text-white' : 'bg-card-2'}`}
            >
              <span className="text-subhead font-medium whitespace-nowrap">{f.label}</span>
            </Chip>
          )
        })}
      </div>

      <div className="px-4 pb-2 flex items-baseline justify-between border-b border-line">
        <span className="text-footnote text-black/55 dark:text-white/55">
          {active.id === 'all' ? 'Recently saved' : active.label}
        </span>
        <span className="text-footnote text-black/55 dark:text-white/55">
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
        </span>
      </div>

      {recipes.length === 0 ? (
        <Block className="text-center">
          <div className="text-5xl mb-2">🥕</div>
          <div className="text-headline">Nothing saved here yet</div>
          <div className="text-subhead text-black/55 dark:text-white/55">Bookmark recipes from Discover to find them again.</div>
        </Block>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {recipes.map((r, i) => (
            <button
              key={r.id}
              onClick={() => nav.push('recipe', { id: r.id })}
              className="vs-rise text-left active:opacity-80 transition-opacity"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Photo q={r.photo} alt={r.name} className="w-full h-60 rounded-3xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                  {r.cooked > 0 ? (
                    <span className="flex items-center gap-1 rounded-full bg-black/45 backdrop-blur px-2 py-1 text-caption2 font-semibold text-white">
                      <ChefHat className="w-3 h-3" /> Cooked {r.cooked}×
                    </span>
                  ) : <span />}
                  <span className="w-8 h-8 rounded-full bg-black/35 backdrop-blur flex items-center justify-center">
                    <Bookmark className="w-4 h-4 text-white" fill="currentColor" />
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-headline text-white leading-tight line-clamp-2">{r.name}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-caption1 text-white/85">
                    <Clock className="w-3 h-3" /> {r.time} min
                    <span className="opacity-60">·</span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: C[r.meal] }} />
                    {MEAL_LABEL[r.meal]}
                  </div>
                </div>
              </Photo>
              <div className="px-1 pt-2 text-caption1 text-black/55 dark:text-white/55 flex items-center gap-1">
                <span>{r.emoji}</span> {r.kcal} kcal per serving
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mx-4 mt-6 pt-4 border-t border-line flex items-center gap-2 text-footnote text-black/55 dark:text-white/55">
        <Flame className="w-4 h-4" style={{ color: C.dinner }} />
        You've cooked from your saved recipes {cookedTotal} times. Showing 8 of 24.
      </div>

      <AppTabbar active="saved" />
    </Page>
  )
}
