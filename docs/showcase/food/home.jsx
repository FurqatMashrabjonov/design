import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, Searchbar, Chip, Link, Toast, Button } from 'konsta/react'
import { MapPin, ChevronDown, Heart, Star, Clock, Bike, Ticket, Copy } from 'lucide-react'
import { useNav, AppTabbar, Photo, Hero, Tile, tint } from '@od/kit'

const C = {"pizza":"#7b61ff","burgers":"#ff3d7f","asian":"#00a8e8","vegan":"#58cc02","dessert":"#ff9f1c","drinks":"#ff6b35"}

const CUISINES = [
  { id: 'pizza', name: 'Pizza', emoji: '🍕' },
  { id: 'burgers', name: 'Burgers', emoji: '🍔' },
  { id: 'asian', name: 'Asian', emoji: '🍜' },
  { id: 'vegan', name: 'Vegan', emoji: '🥗' },
  { id: 'dessert', name: 'Dessert', emoji: '🍰' },
  { id: 'drinks', name: 'Drinks', emoji: '🧋' },
]

const RESTAURANTS = [
  { id: 'ruffiano', name: 'Pizzeria Ruffiano', cuisine: 'Neapolitan pizza', rating: '4.8', reviews: '1.2k', time: '20–30 min', fee: '€1.99 fee', cat: 'pizza', emoji: '🍕', photo: 'wood fired margherita pizza' },
  { id: 'burgerwerk', name: 'Kreuzberg Burger Werk', cuisine: 'Smash burgers', rating: '4.7', reviews: '980', time: '25–35 min', fee: '€2.49 fee', cat: 'burgers', emoji: '🍔', photo: 'juicy smash burger fries' },
  { id: 'saigon', name: 'Saigon Kitchen', cuisine: 'Vietnamese', rating: '4.6', reviews: '740', time: '15–25 min', fee: 'Free delivery', cat: 'asian', emoji: '🍜', photo: 'steaming pho noodle bowl' },
  { id: 'gabel', name: 'Grüne Gabel', cuisine: 'Vegan bowls', rating: '4.9', reviews: '510', time: '20–30 min', fee: '€0.99 fee', cat: 'vegan', emoji: '🥗', photo: 'colorful vegan buddha bowl' },
  { id: 'suss', name: 'Kaffeehaus Süß', cuisine: 'Cakes & coffee', rating: '4.8', reviews: '430', time: '15–20 min', fee: '€1.49 fee', cat: 'dessert', emoji: '🍰', photo: 'cheesecake slice coffee cup' },
]

export default function Screen() {
  const nav = useNav()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState(null)
  const [favs, setFavs] = useState(['ruffiano', 'gabel', 'saigon'])
  const [copied, setCopied] = useState(false)

  const toggleFav = (id) => setFavs(favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id])
  const copyCode = () => { setCopied(true); setTimeout(() => setCopied(false), 1800) }

  const q = query.trim().toLowerCase()
  const shown = RESTAURANTS.filter((r) =>
    (!cat || r.cat === cat) &&
    (!q || r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || r.cat.includes(q)))

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Hungry, Lena?" />

      <div className="px-4 mt-1">
        <button
          onClick={() => nav.push('profile')}
          className="inline-flex items-center gap-2 h-11 pl-2 pr-4 rounded-full bg-card shadow-sm active:scale-[.97] transition max-w-full"
        >
          <span className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/15 text-primary shrink-0">
            <MapPin className="w-4 h-4" />
          </span>
          <span className="text-subhead font-semibold truncate">Oderberger Str. 21</span>
          <span className="text-footnote text-black/55 dark:text-white/55 truncate">Home</span>
          <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
        </button>
      </div>

      <div className="mt-2">
        <Searchbar
          placeholder="Restaurants, dishes, cuisines"
          value={query}
          clearButton
          onInput={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
        {CUISINES.map((c) => {
          const on = cat === c.id
          return (
            <Chip
              key={c.id}
              onClick={() => setCat(on ? null : c.id)}
              className={`!h-10 !px-3 shrink-0 font-semibold transition ${on ? 'vs-bounce' : ''}`}
              style={{ background: on ? C[c.id] : tint(C[c.id], 14), color: on ? '#fff' : undefined }}
              media={<span className="text-lg leading-none">{c.emoji}</span>}
            >
              {c.name}
            </Chip>
          )
        })}
      </div>

      <div className="px-4 mt-3">
        <Hero color={C.pizza} to={C.burgers} className="!rounded-card !p-5 relative overflow-hidden vs-rise">
          <div className="absolute -right-3 -top-2 text-7xl opacity-90 rotate-12 vs-float">🎟️</div>
          <div className="flex items-center gap-1.5 text-caption1 font-semibold uppercase tracking-wide opacity-85">
            <Ticket className="w-4 h-4" /> Welcome treat
          </div>
          <div className="text-title2 mt-2 leading-tight pr-16">€5 off your first 3 orders</div>
          <div className="text-subhead opacity-80 mt-1">2 of 3 left this month</div>
          <button
            onClick={copyCode}
            className="mt-4 inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/25 font-bold tracking-wider active:scale-[.97] transition"
          >
            BERLIN5 <Copy className="w-4 h-4" />
          </button>
        </Hero>
      </div>

      <BlockTitle className="!mt-8 flex items-center justify-between !mb-2">
        <span>Popular near you</span>
        <Link onClick={() => { setCat(null); setQuery('') }} className="!text-[15px] !font-normal">See all</Link>
      </BlockTitle>

      <div className="px-4 space-y-4">
        {shown.map((r, i) => {
          const fav = favs.includes(r.id)
          return (
            <div
              key={r.id}
              role="button"
              onClick={() => nav.push('restaurant', { id: r.id })}
              className="bg-card rounded-card overflow-hidden shadow-sm active:scale-[.98] transition vs-rise cursor-pointer"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Photo q={r.photo} className="w-full h-48 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFav(r.id) }}
                  className={`absolute top-3 right-3 w-11 h-11 rounded-full bg-black/35 backdrop-blur flex items-center justify-center ${fav ? 'vs-bounce' : ''}`}
                  aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
                >
                  <Heart className="w-5 h-5" style={{ color: fav ? C.burgers : '#fff', fill: fav ? C.burgers : 'transparent' }} />
                </button>
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-white/90 text-black text-footnote font-semibold">
                  <Clock className="w-3.5 h-3.5" /> {r.time}
                </span>
              </Photo>
              <div className="p-4 flex items-center gap-3">
                <Tile tinted color={C[r.cat]} size={44}>{r.emoji}</Tile>
                <div className="flex-1 min-w-0">
                  <div className="text-headline truncate">{r.name}</div>
                  <div className="text-subhead text-black/55 dark:text-white/55 truncate">{r.cuisine}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-subhead font-bold" style={{ color: C.dessert }}>
                    <Star className="w-4 h-4" style={{ fill: C.dessert }} /> {r.rating}
                  </div>
                  <div className="text-caption1 text-black/55 dark:text-white/55">({r.reviews})</div>
                </div>
              </div>
              <div className="px-4 pb-4 -mt-1 flex items-center gap-2 text-footnote">
                <span
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full font-semibold"
                  style={{ background: tint(r.fee === 'Free delivery' ? C.vegan : C[r.cat], 14) }}
                >
                  <Bike className="w-3.5 h-3.5" /> {r.fee}
                </span>
                {fav && <span className="text-black/55 dark:text-white/55">In your favourites</span>}
              </div>
            </div>
          )
        })}

        {shown.length === 0 && (
          <Block strong inset className="!mx-0 text-center !rounded-card">
            <div className="text-5xl">🥡</div>
            <div className="text-headline mt-3">Nothing in your Kiez yet</div>
            <div className="text-subhead text-black/55 dark:text-white/55 mt-1">Try another cuisine or search term.</div>
            <Button tonal rounded inline className="mt-4" onClick={() => { setCat(null); setQuery('') }}>Show all</Button>
          </Block>
        )}
      </div>

      <Toast opened={copied} position="center">Code BERLIN5 copied — €5 off at checkout</Toast>
      <AppTabbar active="home" />
    </Page>
  )
}
