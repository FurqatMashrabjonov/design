import { useState } from 'react'
import { Page, Block, BlockTitle, List, ListItem, Button, Checkbox, Stepper, Link, Toast } from 'konsta/react'
import { ChevronLeft, Bookmark, Clock, ChefHat, Flame, Star, Timer, ShoppingBasket, CalendarPlus, Play } from 'lucide-react'
import { useNav, Photo, Avatar, tint } from '@od/kit'

const C = {"breakfast":"#047857","lunch":"#6b21a8","dinner":"#be185d","produce":"#0e7490","dairy":"#111111","pantry":"#b91c1c"}

const RECIPE = {
  title: 'Miso Butter Salmon with Bok Choy',
  emoji: '🐟',
  author: 'Hana Mori',
  time: '25 min',
  difficulty: 'Easy',
  kcal: 520,
  rating: 4.8,
  ratings: '2.1k',
  photo: 'glazed salmon bok choy',
}

const BASE = 2
const INGREDIENTS = [
  { q: 2, u: '', name: 'salmon fillets', g: 300, have: true },
  { q: 2, u: 'tbsp', name: 'white miso', have: true },
  { q: 2, u: 'tbsp', name: 'unsalted butter' },
  { q: 1, u: 'tbsp', name: 'mirin' },
  { q: 1, u: 'tsp', name: 'soy sauce' },
  { q: 2, u: 'heads', name: 'baby bok choy, halved' },
  { q: 1, u: '', name: 'garlic clove, grated' },
  { q: 1, u: 'cup', name: 'jasmine rice' },
  { q: 1, u: '', name: 'scallion, sliced' },
  { q: 1, u: 'tsp', name: 'sesame seeds' },
]

const STEPS = [
  { text: 'Rinse the rice and cook it in 1¼ cups water for 15 minutes, until tender and the water is absorbed.', timer: '15:00' },
  { text: 'Heat the oven to 220°C / 425°F and line a baking tray with parchment.' },
  { text: 'Mash the miso, softened butter, mirin and garlic into a paste and spread it over the salmon. Roast the salmon and bok choy for 8 minutes.', timer: '8:00' },
  { text: 'Switch to broil for 2 minutes, until the glaze caramelises at the edges.', timer: '2:00' },
  { text: 'Drizzle the bok choy with soy sauce while it is still hot.' },
  { text: 'Serve over the rice and finish with scallion and sesame seeds.' },
]

const FRACS = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']]
function fmt(n) {
  const whole = Math.floor(n + 0.001)
  const rest = n - whole
  if (rest < 0.05) return String(whole)
  const best = FRACS.reduce((a, b) => (Math.abs(b[0] - rest) < Math.abs(a[0] - rest) ? b : a))
  return (whole ? whole : '') + best[1]
}

export default function Screen() {
  const nav = useNav()
  const [saved, setSaved] = useState(true)
  const [servings, setServings] = useState(BASE)
  const [checked, setChecked] = useState(INGREDIENTS.map((i) => !!i.have))
  const [toast, setToast] = useState(false)

  const scale = servings / BASE
  const toggle = (i) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
  const missing = checked.filter((v) => !v).length

  const stats = [
    { icon: Clock, label: 'Time', value: RECIPE.time },
    { icon: ChefHat, label: 'Level', value: RECIPE.difficulty },
    { icon: Flame, label: 'Calories', value: `${RECIPE.kcal}`, unit: 'kcal', color: C.dinner },
    { icon: Star, label: 'Rating', value: `★${RECIPE.rating}`, color: '#b45309' },
  ]

  return (
    <Page className="pb-40">
      <Photo q={RECIPE.photo} className="w-full h-[420px] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/30" />
        <div className="absolute top-12 left-4 right-4 flex justify-between">
          <button aria-label="Back" onClick={nav.pop} className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button aria-label="Save recipe" onClick={() => setSaved(!saved)} className={`w-11 h-11 rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center ${saved ? 'vs-bounce' : ''}`}>
            <Bookmark className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-white">
          <span className="text-caption1 font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: C.dinner }}>Dinner</span>
          <span className="text-caption1 font-semibold uppercase tracking-widest opacity-90">Featured this week</span>
        </div>
      </Photo>

      <div className="px-4 pt-5 vs-rise">
        <h1 className="text-title1 leading-tight">{RECIPE.title}</h1>
        <div className="flex items-center gap-2 mt-3">
          <Avatar name={RECIPE.author} color={C.dinner} size={32} />
          <div className="text-subhead">
            By <span className="font-semibold">{RECIPE.author}</span>
            <span className="text-black/55 dark:text-white/55"> · {RECIPE.ratings} ratings</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 mx-4 mt-5 border-y border-line divide-x divide-line">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="py-3 flex flex-col items-center text-center vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <Icon className="w-4 h-4 text-black/55 dark:text-white/55" />
              <div className="text-headline mt-1 truncate max-w-full" style={s.color ? { color: s.color } : undefined}>
                {s.value}{s.unit && <span className="text-caption2 font-medium opacity-70"> {s.unit}</span>}
              </div>
              <div className="text-caption2 text-black/55 dark:text-white/55">{s.label}</div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-4 mt-6">
        <div>
          <div className="text-title3">Ingredients</div>
          <div className="text-footnote text-black/55 dark:text-white/55">{missing} of {INGREDIENTS.length} still to buy</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-subhead text-black/55 dark:text-white/55">Serves {servings}</span>
          <Stepper
            small
            rounded
            value={servings}
            onMinus={() => setServings((s) => Math.max(1, s - 1))}
            onPlus={() => setServings((s) => Math.min(8, s + 1))}
          />
        </div>
      </div>

      <List strong inset dividers className="!mt-3">
        {INGREDIENTS.map((ing, i) => (
          <ListItem
            key={ing.name}
            label
            title={<span className={checked[i] ? 'opacity-50 line-through' : ''}>{ing.name}</span>}
            media={<Checkbox checked={checked[i]} onChange={() => toggle(i)} />}
            after={
              <span className="text-subhead font-semibold" style={{ color: checked[i] ? undefined : C.dinner }}>
                {fmt(ing.q * scale)}{ing.u ? ` ${ing.u}` : ''}{ing.g ? ` · ${Math.round(ing.g * scale)} g` : ''}
              </span>
            }
          />
        ))}
        <ListItem
          link
          title={<span className="text-primary font-semibold">Add {missing} items to shopping list</span>}
          media={<div className="w-7 h-7 rounded-full flex items-center justify-center text-primary" style={{ background: tint(C.produce) }}><ShoppingBasket className="w-4 h-4" style={{ color: C.produce }} /></div>}
          onClick={() => { setToast(true); setTimeout(() => nav.reset('list'), 700) }}
        />
      </List>

      <BlockTitle className="!text-title3 !normal-case !mb-2">Method</BlockTitle>
      <div className="px-4">
        {STEPS.map((s, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-line last:border-b-0 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-subhead font-bold" style={{ background: tint(C.dinner, 14), color: C.dinner }}>
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-body leading-relaxed">{s.text}</p>
              {s.timer && (
                <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-footnote font-semibold" style={{ background: tint(C.dinner, 12), color: C.dinner }}>
                  <Timer className="w-3.5 h-3.5" /> {s.timer}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Block className="!mt-4">
        <p className="text-footnote text-black/55 dark:text-white/55">
          {RECIPE.emoji} Pescatarian · Tree-nut free · No cilantro — fits your preferences. {Math.round(RECIPE.kcal / 1900 * 100)}% of your 1,900 kcal day.
        </p>
      </Block>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-page border-t border-line px-4 pt-3 pb-8 flex items-center gap-3">
        <Button tonal rounded large className="!w-auto !px-4 shrink-0" onClick={() => nav.reset('plan')}>
          <CalendarPlus className="w-5 h-5 mr-1.5" /> Add to plan
        </Button>
        <Button large rounded className="flex-1" onClick={() => nav.push('cooking-mode')}>
          <Play className="w-5 h-5 mr-1.5" fill="currentColor" /> Start cooking
        </Button>
      </div>

      <Toast opened={toast} position="center">
        {missing} items added to your shopping list
      </Toast>
    </Page>
  )
}
