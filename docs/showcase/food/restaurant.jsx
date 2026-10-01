import { useState } from 'react'
import { Page, Block, BlockTitle, List, ListItem, Chip, Toast, Button } from 'konsta/react'
import { ChevronLeft, Heart, Star, Clock, Bike, ShoppingBag, Plus, ShoppingBasket, Share2 } from 'lucide-react'
import { useNav, Photo, Tile, Hero, tint } from '@od/kit'

const C = {"pizza":"#7b61ff","burgers":"#ff3d7f","asian":"#00a8e8","vegan":"#58cc02","dessert":"#ff9f1c","drinks":"#ff6b35"}

const R = { name: 'Pizzeria Ruffiano', cuisine: 'Neapolitan pizza', address: 'Kastanienallee 54', rating: 4.8, reviews: '1.2k', eta: '20–30 min', fee: '€1.99', min: '€12', cover: 'pizza oven warm restaurant' }

const MENU = [
  { id: 'margherita', section: 'Pizza', name: 'Margherita', desc: 'San Marzano, fior di latte, basil', price: 10.5, photo: 'margherita pizza basil', cat: 'pizza', emoji: '🍕' },
  { id: 'diavola', section: 'Pizza', name: 'Pizza Diavola', desc: "Spicy salami, 'nduja, fior di latte", price: 12.9, photo: 'spicy salami pizza', cat: 'pizza', emoji: '🌶️' },
  { id: 'formaggi', section: 'Pizza', name: 'Quattro Formaggi', desc: 'Four Italian cheeses, white base', price: 13.5, photo: 'four cheese pizza', cat: 'pizza', emoji: '🧀' },
  { id: 'tartufo', section: 'Pizza', name: 'Funghi e Tartufo', desc: 'Mushrooms, truffle cream, thyme', price: 14.9, photo: 'truffle mushroom pizza', cat: 'pizza', emoji: '🍄' },
  { id: 'burrata', section: 'Antipasti', name: 'Burrata e Pomodori', desc: 'Creamy burrata, heirloom tomatoes', price: 9.8, photo: 'burrata tomato salad', cat: 'vegan', emoji: '🍅' },
  { id: 'arancini', section: 'Antipasti', name: 'Arancini (3)', desc: 'Golden fried risotto balls', price: 7.2, photo: 'golden arancini rice balls', cat: 'pizza', emoji: '🍙' },
  { id: 'tiramisu', section: 'Dolci', name: 'Tiramisu', desc: 'Mascarpone, espresso, cocoa', price: 6.5, photo: 'tiramisu in glass', cat: 'dessert', emoji: '☕' },
  { id: 'cannoli', section: 'Dolci', name: 'Cannoli (2)', desc: 'Ricotta cream, Sicilian pistachio', price: 5.9, photo: 'sicilian cannoli pistachio', cat: 'dessert', emoji: '🥮' },
  { id: 'pellegrino', section: 'Drinks', name: 'San Pellegrino 0.5l', desc: 'Sparkling mineral water', price: 3.2, photo: 'sparkling water bottle', cat: 'drinks', emoji: '💧' },
  { id: 'chinotto', section: 'Drinks', name: 'Chinotto', desc: 'Bittersweet Italian citrus soda', price: 3.5, photo: 'italian soda bottle', cat: 'drinks', emoji: '🍊' },
]
const POPULAR = ['diavola', 'margherita']
const SECTIONS = ['Popular', 'Pizza', 'Antipasti', 'Dolci', 'Drinks']
const eur = (n) => '€' + n.toFixed(2)

export default function Screen() {
  const nav = useNav()
  const [fav, setFav] = useState(true)
  const [section, setSection] = useState('Popular')
  const [qty, setQty] = useState({ diavola: 1, margherita: 1, tiramisu: 1, pellegrino: 2 })
  const [total, setTotal] = useState(41.8)
  const [toast, setToast] = useState('')
  const count = Object.values(qty).reduce((a, b) => a + b, 0)

  const add = (d) => {
    setQty({ ...qty, [d.id]: (qty[d.id] || 0) + 1 })
    setTotal(Math.round((total + d.price) * 100) / 100)
    setToast(d.name)
    setTimeout(() => setToast(''), 1600)
  }
  const jump = (s) => {
    setSection(s)
    const el = document.getElementById('sec-' + s)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const AddButton = ({ d }) => (
    <button
      aria-label={`Add ${d.name}`}
      onClick={(e) => { e.stopPropagation(); add(d) }}
      className="relative w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
    >
      <Plus className="w-5 h-5" />
      {qty[d.id] ? (
        <span key={qty[d.id]} className="vs-bounce absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-card text-primary text-caption2 font-bold flex items-center justify-center shadow">{qty[d.id]}</span>
      ) : null}
    </button>
  )

  return (
    <Page className="pb-40">
      {/* Cover */}
      <Photo q={R.cover} className="w-full h-72 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
        <div className="absolute top-0 inset-x-0 flex justify-between px-4 pt-12">
          <button aria-label="Back" onClick={nav.pop} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button aria-label="Share" className="w-11 h-11 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </button>
            <button aria-label="Favourite" onClick={() => setFav(!fav)} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center">
              <Heart key={String(fav)} className={`w-5 h-5 ${fav ? 'vs-bounce' : ''}`} fill={fav ? C.burgers : 'none'} color={fav ? C.burgers : 'white'} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 px-4 pb-5 text-white">
          <div className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-caption1 font-semibold mb-2" style={{ background: C.pizza }}>🍕 {R.cuisine}</div>
          <div className="text-title1 truncate">{R.name}</div>
          <div className="flex items-center gap-1 text-subhead opacity-90 mt-1">
            <Star className="w-4 h-4" fill="#ffd60a" color="#ffd60a" />
            <span className="font-semibold">{R.rating}</span>
            <span className="opacity-80">({R.reviews}) · {R.address}</span>
          </div>
        </div>
      </Photo>

      {/* Info strip */}
      <div className="grid grid-cols-3 gap-3 px-4 -mt-3 relative z-10">
        {[
          [Clock, R.eta, 'Delivery', C.asian],
          [Bike, R.fee, 'Fee', C.drinks],
          [ShoppingBag, R.min, 'Minimum', C.vegan],
        ].map(([I, v, k, col], i) => (
          <div key={k} className="rounded-card bg-card p-3 shadow-sm vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: tint(col, 20), color: col }}>
              <I className="w-4 h-4" />
            </div>
            <div className="text-headline truncate">{v}</div>
            <div className="text-caption1 text-black/55 dark:text-white/55">{k}</div>
          </div>
        ))}
      </div>

      {/* Sticky sections */}
      <div className="sticky top-0 z-20 bg-page py-3 mt-3">
        <div className="flex gap-2 overflow-x-auto px-4">
          {SECTIONS.map((s) => (
            <Chip
              key={s}
              onClick={() => jump(s)}
              className={`shrink-0 whitespace-nowrap cursor-pointer !h-9 !px-4 ${section === s ? '!bg-primary !text-white font-semibold' : ''}`}
            >
              {s}
            </Chip>
          ))}
        </div>
      </div>

      {/* Popular */}
      <div id="sec-Popular" className="scroll-mt-16">
        <BlockTitle className="!mb-2">Popular 🔥</BlockTitle>
        <div className="grid grid-cols-2 gap-3 px-4">
          {POPULAR.map((id, i) => {
            const d = MENU.find((m) => m.id === id)
            return (
              <div key={id} onClick={() => nav.push('dish', { id })} className="rounded-card bg-card overflow-hidden vs-rise cursor-pointer" style={{ animationDelay: `${i * 60}ms` }}>
                <Photo q={d.photo} className="w-full h-32 relative">
                  <div className="absolute top-2 left-2 text-caption2 font-semibold rounded-full px-2 py-0.5 bg-black/50 text-white">#{i + 1} most ordered</div>
                </Photo>
                <div className="p-3">
                  <div className="text-headline truncate">{d.name}</div>
                  <div className="text-footnote text-black/55 dark:text-white/55 truncate">{d.desc}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-headline" style={{ color: C[d.cat] }}>{eur(d.price)}</span>
                    <AddButton d={d} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Promo */}
      <div className="px-4 mt-4">
        <Hero color={C.dessert} className="rounded-card p-4 flex items-center gap-3">
          <div className="text-4xl">🎟️</div>
          <div className="min-w-0">
            <div className="text-headline">BERLIN5 · €5 off</div>
            <div className="text-subhead opacity-80">2 of 3 orders left — applied at checkout</div>
          </div>
        </Hero>
      </div>

      {['Pizza', 'Antipasti', 'Dolci', 'Drinks'].map((s) => (
        <div key={s} id={'sec-' + s} className="scroll-mt-16">
          <BlockTitle>{s}</BlockTitle>
          <List strong inset dividers>
            {MENU.filter((m) => m.section === s).map((d) => (
              <ListItem
                key={d.id}
                onClick={() => nav.push('dish', { id: d.id })}
                className="cursor-pointer"
                media={<Photo q={d.photo} className="w-16 h-16 rounded-2xl" />}
                title={<span className="text-headline">{d.name}</span>}
                text={
                  <span className="block">
                    <span className="block text-footnote text-black/55 dark:text-white/55 truncate">{d.desc}</span>
                    <span className="flex items-center gap-2 mt-1">
                      <span className="text-subhead font-semibold" style={{ color: C[d.cat] }}>{eur(d.price)}</span>
                      <span className="text-caption2 rounded-full px-2 py-0.5" style={{ background: tint(C[d.cat]) }}>{d.emoji}</span>
                    </span>
                  </span>
                }
                after={<AddButton d={d} />}
              />
            ))}
          </List>
        </div>
      ))}

      <Block className="text-center text-footnote text-black/55 dark:text-white/55">
        Prices include VAT · Allergens on each dish
      </Block>

      {/* Basket bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-8 pt-3 bg-gradient-to-t from-black/10 to-transparent">
        <Button large rounded onClick={() => nav.push('basket')} className="!h-14 shadow-lg">
          <span className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-2">
              <span key={count} className="vs-bounce w-8 h-8 rounded-full bg-white/25 flex items-center justify-center">
                <ShoppingBasket className="w-4 h-4" />
              </span>
              View basket · {count} items
            </span>
            <span className="font-bold">{eur(total)}</span>
          </span>
        </Button>
      </div>

      <Toast opened={!!toast} position="center">
        <span className="flex items-center gap-2">
          <Tile color={C.vegan} size={24}><Plus className="w-3 h-3" /></Tile>
          {toast} added
        </span>
      </Toast>
    </Page>
  )
}
