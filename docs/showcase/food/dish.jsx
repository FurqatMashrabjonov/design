import { useState } from 'react'
import { Page, Block, BlockTitle, List, ListItem, Radio, Checkbox, Stepper, Button, Chip } from 'konsta/react'
import { X, Heart, Flame, Clock, Star, Store } from 'lucide-react'
import { useNav, Photo, Tile, tint } from '@od/kit'

const C = {"pizza":"#7b61ff","burgers":"#ff3d7f","asian":"#00a8e8","vegan":"#58cc02","dessert":"#ff9f1c","drinks":"#ff6b35"}

const DISH = {
  name: 'Pizza Diavola',
  desc: "Spicy salami, 'nduja and fior di latte on a slow-proved Neapolitan base, blistered in the wood oven.",
  base: 12.9,
  photo: 'spicy salami pizza',
  restaurant: 'Pizzeria Ruffiano',
  rating: '4.8',
  eta: '20–30 min',
}
const SIZES = [
  { id: 'medium', name: 'Medium', note: '30cm', add: 0 },
  { id: 'large', name: 'Large', note: '34cm', add: 2.5 },
]
const EXTRAS = [
  { id: 'burrata', name: 'Burrata', emoji: '🧀', add: 3.0, color: C.vegan },
  { id: 'nduja', name: "Extra 'nduja", emoji: '🌶️', add: 1.8, color: C.burgers },
  { id: 'basil', name: 'Basil oil', emoji: '🌿', add: 0.8, color: C.vegan },
]
const PAIRS = [
  { name: 'Tiramisu', price: 6.5, photo: 'tiramisu in glass', color: C.dessert },
  { name: 'San Pellegrino 0.5l', price: 3.2, photo: 'sparkling water bottle', color: C.drinks },
  { name: 'Arancini (3)', price: 7.2, photo: 'golden arancini rice balls', color: C.pizza },
]

const eur = (n) => `€${n.toFixed(2)}`

export default function Screen() {
  const nav = useNav()
  const [size, setSize] = useState('large')
  const [extras, setExtras] = useState(['burrata'])
  const [qty, setQty] = useState(1)
  const [fav, setFav] = useState(true)

  const toggleExtra = (id) => setExtras((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))
  const unit = DISH.base + SIZES.find((s) => s.id === size).add + EXTRAS.filter((e) => extras.includes(e.id)).reduce((a, e) => a + e.add, 0)
  const total = unit * qty

  return (
    <Page className="pb-40">
      <Photo q={DISH.photo} className="w-full h-[46vh] min-h-[320px] relative" alt={DISH.name}>
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute top-0 inset-x-0 flex justify-between px-4 pt-12">
          <button aria-label="Close" onClick={nav.pop} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
            <X className="w-6 h-6" />
          </button>
          <button aria-label="Favourite" onClick={() => setFav(!fav)} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
            <Heart className={`w-6 h-6 ${fav ? 'vs-bounce' : ''}`} fill={fav ? C.burgers : 'none'} stroke={fav ? C.burgers : 'currentColor'} />
          </button>
        </div>
      </Photo>

      <div className="relative -mt-8 mx-4 rounded-card bg-card p-5 shadow-lg vs-rise">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-title1 truncate">{DISH.name}</h1>
          <Tile color={C.pizza} tinted size={40}><span className="text-2xl">🍕</span></Tile>
        </div>
        <p className="text-body text-black/60 dark:text-white/60 mt-2">{DISH.desc}</p>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-title2" style={{ color: C.pizza }}>{eur(DISH.base)}</span>
          <span className="text-footnote text-black/55 dark:text-white/55">base price · Medium</span>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Chip className="!text-footnote" style={{ background: tint(C.burgers) }} media={<Flame className="w-4 h-4" style={{ color: C.burgers }} />}>Spicy</Chip>
          <Chip className="!text-footnote" style={{ background: tint(C.dessert) }} media={<Star className="w-4 h-4" style={{ color: C.dessert }} />}>{DISH.rating}</Chip>
          <Chip className="!text-footnote" style={{ background: tint(C.asian) }} media={<Clock className="w-4 h-4" style={{ color: C.asian }} />}>{DISH.eta}</Chip>
        </div>
      </div>

      <BlockTitle className="!flex !items-center !justify-between">
        <span>Size</span>
        <span className="text-caption1 font-semibold px-2 py-0.5 rounded-full" style={{ background: tint(C.pizza), color: C.pizza }}>Required</span>
      </BlockTitle>
      <List strong inset dividers>
        {SIZES.map((s) => (
          <ListItem
            key={s.id}
            label
            title={<span className="text-headline">{s.name}</span>}
            subtitle={s.note}
            after={<span className="text-body font-semibold" style={{ color: s.add ? C.pizza : undefined }}>{s.add ? `+${eur(s.add)}` : 'Included'}</span>}
            media={<Radio name="size" value={s.id} checked={size === s.id} onChange={() => setSize(s.id)} />}
          />
        ))}
      </List>

      <BlockTitle className="!flex !items-center !justify-between">
        <span>Extras</span>
        <span className="text-caption1 text-black/55 dark:text-white/55">Optional · {extras.length} selected</span>
      </BlockTitle>
      <List strong inset dividers>
        {EXTRAS.map((e) => {
          const on = extras.includes(e.id)
          return (
            <ListItem
              key={e.id}
              label
              title={<span className="text-headline">{e.name}</span>}
              media={
                <div className="flex items-center gap-3">
                  <Checkbox checked={on} onChange={() => toggleExtra(e.id)} className={on ? 'vs-bounce' : ''} />
                  <Tile color={e.color} tinted size={36}><span className="text-lg">{e.emoji}</span></Tile>
                </div>
              }
              after={<span className="text-body font-semibold" style={{ color: on ? C.pizza : undefined }}>+{eur(e.add)}</span>}
            />
          )
        })}
      </List>

      <BlockTitle className="!mb-2">Goes well with</BlockTitle>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {PAIRS.map((p, i) => (
          <button key={p.name} onClick={nav.pop} className="shrink-0 w-36 rounded-card bg-card overflow-hidden text-left vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <Photo q={p.photo} className="w-full h-24" alt={p.name} />
            <div className="p-3">
              <div className="text-subhead font-semibold truncate">{p.name}</div>
              <div className="text-footnote font-semibold mt-0.5" style={{ color: p.color }}>{eur(p.price)}</div>
            </div>
          </button>
        ))}
      </div>

      <List strong inset className="!mt-6">
        <ListItem
          link
          onClick={nav.pop}
          title={DISH.restaurant}
          subtitle="Neapolitan pizza · Kastanienallee 54"
          media={<Tile color={C.pizza}><Store className="w-4 h-4" /></Tile>}
        />
      </List>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-card border-t border-line px-4 pt-3 pb-8 flex items-center gap-3">
        <Stepper
          rounded
          raised
          value={qty}
          onMinus={() => setQty(Math.max(1, qty - 1))}
          onPlus={() => setQty(Math.min(9, qty + 1))}
        />
        <Button large rounded className="flex-1 !text-body font-semibold" onClick={nav.pop}>
          Add to basket · {eur(total)}
        </Button>
      </div>
    </Page>
  )
}
