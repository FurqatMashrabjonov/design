import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Stepper, Button, Badge } from 'konsta/react'
import { Clock, MapPin, Ticket, CreditCard, Bike, ShoppingBag } from 'lucide-react'
import { useNav, AppTabbar, Hero, Photo, Tile, tint } from '@od/kit'

const C = {"pizza":"#7b61ff","burgers":"#ff3d7f","asian":"#00a8e8","vegan":"#58cc02","dessert":"#ff9f1c","drinks":"#ff6b35"}

const ITEMS = [
  { id: 'diavola', name: 'Pizza Diavola', options: 'Large 34cm · Burrata', price: 18.4, qty: 1, photo: 'spicy salami pizza', cat: 'pizza' },
  { id: 'margherita', name: 'Margherita', options: 'Medium 30cm', price: 10.5, qty: 1, photo: 'margherita pizza basil', cat: 'pizza' },
  { id: 'tiramisu', name: 'Tiramisu', options: 'Dolci', price: 6.5, qty: 1, photo: 'tiramisu in glass', cat: 'dessert' },
  { id: 'pellegrino', name: 'San Pellegrino 0.5l', options: 'Drinks', price: 3.2, qty: 2, photo: 'sparkling water bottle', cat: 'drinks' },
]
const DELIVERY = 1.99
const SERVICE = 0.99
const PROMO = 5

const eur = (n) => `€${n.toFixed(2)}`

export default function Screen() {
  const nav = useNav()
  const [qty, setQty] = useState(() => Object.fromEntries(ITEMS.map((i) => [i.id, i.qty])))
  const change = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(1, Math.min(9, q[id] + d)) }))

  const count = ITEMS.reduce((s, i) => s + qty[i.id], 0)
  const subtotal = ITEMS.reduce((s, i) => s + i.price * qty[i.id], 0)
  const total = subtotal + DELIVERY + SERVICE - PROMO

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Basket" subtitle={`${count} items · Pizzeria Ruffiano`} />

      <div className="px-4 pt-2 vs-rise">
        <Hero as="button" color={C.pizza} to={C.burgers} className="w-full text-left rounded-card p-4" onClick={() => nav.push('restaurant')}>
          <div className="flex items-center gap-3">
            <Photo q="pizza oven warm restaurant" className="w-16 h-16 rounded-2xl shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-title3 truncate">Pizzeria Ruffiano</div>
              <div className="flex items-center gap-1 text-subhead opacity-80 truncate">
                <MapPin className="w-4 h-4 shrink-0" /> Oderberger Str. 21 · 3rd floor
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-subhead font-semibold">
              <Clock className="w-4 h-4" /> 25 min
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-subhead font-semibold">
              <Bike className="w-4 h-4" /> {eur(DELIVERY)} delivery
            </span>
          </div>
        </Hero>
      </div>

      <BlockTitle>Your order</BlockTitle>
      <List strong inset dividers>
        {ITEMS.map((it, i) => (
          <ListItem
            key={it.id}
            className="vs-rise"
            style={{ animationDelay: `${i * 60}ms` }}
            media={<Photo q={it.photo} className="w-14 h-14 rounded-2xl" />}
            title={<span className="text-headline truncate block max-w-[130px]">{it.name}</span>}
            subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{it.options}</span>}
            text={<span className="text-subhead font-semibold" style={{ color: C[it.cat] }}>{eur(it.price * qty[it.id])}</span>}
            after={
              <Stepper
                small
                rounded
                value={qty[it.id]}
                onMinus={() => change(it.id, -1)}
                onPlus={() => change(it.id, 1)}
              />
            }
          />
        ))}
      </List>

      <BlockTitle>Promo</BlockTitle>
      <List strong inset>
        <ListItem
          media={<Tile color={C.vegan} tinted size={36}><Ticket className="w-5 h-5" style={{ color: C.vegan }} /></Tile>}
          title={<span className="text-headline">BERLIN5</span>}
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">€5 off · 2 of 3 orders left</span>}
          after={
            <span className="rounded-full px-3 py-1 text-subhead font-semibold" style={{ background: tint(C.vegan, 18) }}>
              −{eur(PROMO)}
            </span>
          }
        />
      </List>

      <BlockTitle>Summary</BlockTitle>
      <List strong inset>
        <ListItem title={<span className="text-body">Subtotal</span>} after={<span className="text-body">{eur(subtotal)}</span>} />
        <ListItem title={<span className="text-body">Delivery</span>} after={<span className="text-body">{eur(DELIVERY)}</span>} />
        <ListItem title={<span className="text-body">Service fee</span>} after={<span className="text-body">{eur(SERVICE)}</span>} />
        <ListItem
          title={<span className="text-body">Discount <Badge small className="ml-1">BERLIN5</Badge></span>}
          after={<span className="text-body font-semibold text-green-700 dark:text-green-400">−{eur(PROMO)}</span>}
        />
        <ListItem
          title={<span className="text-title3">Total</span>}
          after={<span className="text-title3 text-black dark:text-white">{eur(total)}</span>}
        />
        <ListItem
          media={<Tile color="#1a1f71" size={30}><CreditCard className="w-4 h-4 text-white" /></Tile>}
          title={<span className="text-subhead">Visa •• 4417</span>}
          after={<span className="text-footnote text-black/55 dark:text-white/55">Default</span>}
        />
      </List>

      <Block className="!mt-2">
        <Button large rounded className="gap-2" onClick={() => nav.push('order-tracking')}>
          <ShoppingBag className="w-5 h-5" /> Checkout · {eur(total)}
        </Button>
        <p className="mt-3 text-center text-footnote text-black/55 dark:text-white/55">
          Arrives in about 25 min at Oderberger Str. 21, ring 'Hoffmann'
        </p>
      </Block>

      <AppTabbar active="basket" />
    </Page>
  )
}
