import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Button, Toast } from 'konsta/react'
import { Bike, Clock, ChevronRight, RotateCcw, Ticket, Star } from 'lucide-react'
import { useNav, AppTabbar, Hero, Photo, tint, CountUp } from '@od/kit'

const C = {"pizza":"#7b61ff","burgers":"#ff3d7f","asian":"#00a8e8","vegan":"#58cc02","dessert":"#ff9f1c","drinks":"#ff6b35"}

const ACTIVE = {
  id: 'RB-4821',
  restaurant: 'Pizzeria Ruffiano',
  photo: 'wood fired margherita pizza',
  eta: '19:42',
  left: 12,
  total: '€39.78',
  items: 5,
  courier: { name: 'Malik Yilmaz', rating: 4.9, photo: 'smiling courier with bike' },
  steps: ['Accepted', 'Preparing', 'Picked up', 'On the way', 'Delivered'],
  current: 3,
}

const PAST = [
  { id: 'burger-werk', name: 'Kreuzberg Burger Werk', date: 'Yesterday, 30 Sep', items: 2, total: '€24.60', cat: 'burgers', emoji: '🍔', photo: 'juicy smash burger fries' },
  { id: 'saigon', name: 'Saigon Kitchen', date: 'Sat 26 Sep', items: 3, total: '€31.40', cat: 'asian', emoji: '🍜', photo: 'steaming pho noodle bowl' },
  { id: 'gruene-gabel', name: 'Grüne Gabel', date: 'Tue 22 Sep', items: 2, total: '€19.80', cat: 'vegan', emoji: '🥗', photo: 'colorful vegan buddha bowl' },
  { id: 'kaffeehaus', name: 'Kaffeehaus Süß', date: 'Sun 20 Sep', items: 3, total: '€14.90', cat: 'dessert', emoji: '🍰', photo: 'cheesecake slice coffee cup' },
]

export default function Screen() {
  const nav = useNav()
  const [toast, setToast] = useState(null)

  const reorder = (e, o) => {
    e.stopPropagation()
    setToast(o.name)
    setTimeout(() => setToast(null), 2600)
  }

  const progress = (ACTIVE.current + 0.5) / ACTIVE.steps.length

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Orders" subtitle="1 on its way · 34 orders so far" />

      <BlockTitle className="!mb-2">Active</BlockTitle>
      <div className="px-4 vs-rise">
        <Hero as="button" onClick={() => nav.push('order-tracking')} className="w-full text-left rounded-card p-4">
          <div className="flex items-center gap-3">
            <Photo q={ACTIVE.photo} className="w-14 h-14 rounded-2xl shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-caption1 opacity-80">#{ACTIVE.id} · {ACTIVE.items} items · {ACTIVE.total}</div>
              <div className="text-headline truncate">{ACTIVE.restaurant}</div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-80 shrink-0" />
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <div className="text-subhead opacity-80">Arriving</div>
              <div className="text-figure">{ACTIVE.eta}</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-black/15">
              <Clock className="w-4 h-4" />
              <span className="text-subhead font-semibold"><CountUp to={ACTIVE.left} /> min left</span>
            </div>
          </div>

          <div className="mt-4 h-2.5 rounded-full bg-black/15 overflow-hidden">
            <div className="h-full rounded-full bg-current transition-all duration-700" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-caption2">
            {ACTIVE.steps.map((s, i) => (
              <span key={s} className={i === ACTIVE.current ? 'font-bold' : i < ACTIVE.current ? 'opacity-80' : 'opacity-50'}>{s}</span>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-black/10 p-2.5">
            <Photo q={ACTIVE.courier.photo} className="w-10 h-10 rounded-full shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-subhead font-semibold truncate">{ACTIVE.courier.name}</div>
              <div className="text-caption1 opacity-80 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {ACTIVE.courier.rating} · on an e-bike
              </div>
            </div>
            <Bike className="w-6 h-6 opacity-90" />
          </div>
        </Hero>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {[
          { label: 'Orders', value: '34', unit: 'since joining' },
          { label: 'Saved', value: '€62', unit: 'with Kiezbite' },
          { label: 'Member', value: 'Gold', unit: 'Kiez Gold' },
        ].map((s, i) => (
          <div key={s.label} className="bg-card rounded-card p-3 vs-rise" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <div className="text-caption1 text-black/55 dark:text-white/55">{s.label}</div>
            <div className="text-title2 text-primary">{s.value}</div>
            <div className="text-caption2 text-black/55 dark:text-white/55 truncate">{s.unit}</div>
          </div>
        ))}
      </div>

      <BlockTitle>Past orders</BlockTitle>
      <List strong inset dividers>
        {PAST.map((o, i) => (
          <ListItem
            key={o.id}
            className="vs-rise cursor-pointer"
            style={{ animationDelay: `${(i + 4) * 60}ms` }}
            onClick={() => nav.push('restaurant', { id: o.id })}
            media={
              <div className="relative">
                <Photo q={o.photo} className="w-14 h-14 rounded-2xl" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-caption1 bg-card"
                  style={{ boxShadow: `0 0 0 2px ${tint(C[o.cat], 40)}` }}>{o.emoji}</span>
              </div>
            }
            title={<span className="text-headline truncate block max-w-[150px]">{o.name}</span>}
            subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{o.date}</span>}
            text={
              <span className="text-footnote">
                <span className="text-black/55 dark:text-white/55">{o.items} items · </span>
                <span className="font-semibold" style={{ color: C[o.cat] }}>{o.total}</span>
              </span>
            }
            after={
              <button
                onClick={(e) => reorder(e, o)}
                className="flex items-center gap-1 rounded-full px-3 h-9 text-subhead font-semibold text-primary active:scale-95 transition"
                style={{ background: tint(C[o.cat], 18) }}
              >
                <RotateCcw className="w-4 h-4" /> Reorder
              </button>
            }
          />
        ))}
      </List>

      <Block className="flex items-center gap-2 text-footnote text-black/55 dark:text-white/55">
        <Ticket className="w-4 h-4 text-primary" /> BERLIN5 saves you €5 on 2 more orders.
      </Block>

      <Toast
        opened={!!toast}
        button={<Button clear small inline onClick={() => { setToast(null); nav.reset('basket') }}>View</Button>}
      >
        <span className="text-subhead">{toast} added to your basket</span>
      </Toast>

      <AppTabbar active="orders" />
    </Page>
  )
}
