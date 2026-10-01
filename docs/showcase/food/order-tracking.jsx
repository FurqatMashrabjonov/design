import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Link } from 'konsta/react'
import { Phone, MessageCircle, Bike, Home, Check, ChevronDown, Star, LifeBuoy, Receipt, Clock } from 'lucide-react'
import { useNav, Tile, Photo, CountUp, tint } from '@od/kit'

const C = {"pizza":"#7b61ff","burgers":"#ff3d7f","asian":"#00a8e8","vegan":"#58cc02","dessert":"#ff9f1c","drinks":"#ff6b35"}

const ORDER = { id: 'RB-4821', total: '€39.78', items: 5, pay: 'Visa •• 4417', placed: '19:17', eta: '19:42', left: 12 }
const STEPS = [
  { name: 'Order accepted', time: '19:18', note: 'Pizzeria Ruffiano confirmed your order', done: true },
  { name: 'Preparing', time: '19:20', note: 'Fresh from the wood-fired oven', done: true },
  { name: 'Picked up', time: '19:34', note: 'Malik collected your bag', done: true },
  { name: 'On the way', time: 'Now', note: 'Cycling down Kastanienallee', current: true },
  { name: 'Delivered', time: '~19:42', note: 'Oderberger Str. 21, 3rd floor' },
]
const COURIER = { name: 'Malik Yilmaz', rating: '4.9', vehicle: 'e-bike', deliveries: '1,240', photo: 'smiling courier with bike' }
const ITEMS = [
  { name: 'Pizza Diavola', note: 'Large · Burrata', qty: 1, price: '€18.40', emoji: '🍕', color: C.pizza },
  { name: 'Margherita', note: 'Medium 30cm', qty: 1, price: '€10.50', emoji: '🍕', color: C.pizza },
  { name: 'Tiramisu', note: 'In a glass', qty: 1, price: '€6.50', emoji: '🍰', color: C.dessert },
  { name: 'San Pellegrino 0.5l', note: 'Sparkling', qty: 2, price: '€6.40', emoji: '🧋', color: C.drinks },
]
const TOTALS = [['Subtotal', '€41.80'], ['Delivery', '€1.99'], ['Service fee', '€0.99'], ['BERLIN5', '−€5.00']]

// map geometry (viewBox 360 × 320)
const W = 360, H = 320
const REST = [55, 270], HOME = [300, 150], BIKE = [185, 190]
const DONE_PATH = 'M55 270 L55 230 L140 230 L140 190 L185 190'
const LEFT_PATH = 'M185 190 L230 190 L230 150 L300 150'
const pos = ([x, y]) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })

export default function Screen() {
  const nav = useNav()
  const [open, setOpen] = useState(false)

  return (
    <Page className="pb-10">
      <Navbar title="Order on its way" left={<NavbarBackLink showText={false} onClick={nav.pop} />} right={<Link onClick={() => {}}>Help</Link>} />

      {/* Map */}
      <div className="relative mx-4 mt-3 h-80 rounded-card overflow-hidden bg-card-2 vs-rise">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <rect x="250" y="210" width="90" height="80" rx="18" fill={tint(C.vegan, 22)} />
          <rect x="20" y="110" width="80" height="60" rx="16" fill={tint(C.vegan, 18)} />
          <path d="M0 300 Q120 280 200 310 T360 295" stroke={tint(C.asian, 40)} strokeWidth="14" fill="none" />
          <g className="text-black/10 dark:text-white/10" stroke="currentColor" strokeWidth="10" strokeLinecap="round">
            <line x1="0" y1="230" x2="360" y2="230" />
            <line x1="0" y1="190" x2="360" y2="190" />
            <line x1="0" y1="150" x2="360" y2="150" />
            <line x1="55" y1="100" x2="55" y2="320" />
            <line x1="140" y1="100" x2="140" y2="320" />
            <line x1="230" y1="100" x2="230" y2="320" />
            <line x1="310" y1="100" x2="310" y2="200" />
            <line x1="0" y1="120" x2="360" y2="320" strokeWidth="6" />
          </g>
          <path d={LEFT_PATH} stroke={C.pizza} strokeOpacity="0.5" strokeWidth="5" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
          <path d={DONE_PATH} stroke={C.pizza} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>

        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pos(REST)}>
          <div className="rounded-full p-1 bg-card shadow-lg"><Tile color={C.pizza} tinted size={32}><span className="text-lg">🍕</span></Tile></div>
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pos(HOME)}>
          <div className="w-10 h-10 rounded-full bg-card shadow-lg flex items-center justify-center">
            <Home className="w-5 h-5" style={{ color: C.vegan }} />
          </div>
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pos(BIKE)}>
          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: tint(C.pizza, 45) }} />
          <div className="relative w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-xl border-4 border-white vs-float">
            <Bike className="w-6 h-6" />
          </div>
        </div>

        {/* ETA figure */}
        <div className="absolute top-3 left-3 right-3 rounded-card bg-card/95 shadow-lg p-4 flex items-end justify-between">
          <div>
            <div className="text-footnote text-black/55 dark:text-white/55 font-medium">Arriving</div>
            <div className="text-figure">{ORDER.eta}</div>
          </div>
          <div className="text-right">
            <div className="text-title2 text-primary"><CountUp to={ORDER.left} /> min</div>
            <div className="text-caption1 text-black/55 dark:text-white/55">placed {ORDER.placed}</div>
          </div>
        </div>
      </div>

      {/* Step tracker */}
      <BlockTitle>Progress</BlockTitle>
      <Block strong inset className="!py-4">
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1
          return (
            <div key={s.name} className="flex gap-3 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex flex-col items-center">
                {s.done ? (
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center"><Check className="w-4 h-4" /></div>
                ) : s.current ? (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: tint(C.pizza, 25) }}>
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-line" />
                )}
                {!last && <div className={`w-0.5 flex-1 min-h-[22px] my-1 ${s.done ? 'bg-primary' : 'bg-black/10 dark:bg-white/15'}`} />}
              </div>
              <div className={`flex-1 min-w-0 ${last ? '' : 'pb-4'} ${s.current ? 'rounded-2xl -mt-1 px-3 py-2' : ''}`} style={s.current ? { background: tint(C.pizza, 12) } : undefined}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-headline truncate ${!s.done && !s.current ? 'opacity-50' : ''}`}>{s.name}</span>
                  <span className={`text-footnote shrink-0 ${s.current ? 'text-primary font-semibold' : 'text-black/55 dark:text-white/55'}`}>{s.time}</span>
                </div>
                <div className="text-subhead text-black/55 dark:text-white/55 truncate">{s.note}</div>
              </div>
            </div>
          )
        })}
      </Block>

      {/* Courier */}
      <BlockTitle className="!mb-2">Your courier</BlockTitle>
      <div className="mx-4 rounded-card bg-card p-4 flex items-center gap-3 vs-rise" style={{ animationDelay: '120ms' }}>
        <Photo q={COURIER.photo} className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-headline truncate">{COURIER.name}</div>
          <div className="text-subhead text-black/55 dark:text-white/55 flex items-center gap-1">
            <Star className="w-4 h-4 fill-current shrink-0" style={{ color: C.dessert }} />
            <span className="font-semibold text-black dark:text-white">{COURIER.rating}</span>
            <span className="truncate">· {COURIER.vehicle}</span>
          </div>
          <div className="text-footnote text-black/55 dark:text-white/55 truncate">{COURIER.deliveries} deliveries</div>
        </div>
        <button className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-primary" style={{ background: tint(C.pizza, 18) }} aria-label="Message courier">
          <MessageCircle className="w-5 h-5" />
        </button>
        <button className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white shadow-md" style={{ background: C.vegan }} aria-label="Call courier">
          <Phone className="w-5 h-5" />
        </button>
      </div>

      {/* Order summary */}
      <BlockTitle>Order summary</BlockTitle>
      <List strong inset dividers>
        <ListItem
          title={`Order #${ORDER.id}`}
          subtitle={`${ORDER.items} items · ${ORDER.pay}`}
          media={<Tile color={C.pizza}><Receipt className="w-4 h-4" /></Tile>}
          after={
            <span className="flex items-center gap-1">
              <span className="text-headline" style={{ color: C.pizza }}>{ORDER.total}</span>
              <ChevronDown className={`w-5 h-5 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
          }
          onClick={() => setOpen(!open)}
          className="cursor-pointer"
        />
        {open && ITEMS.map((it) => (
          <ListItem
            key={it.name}
            title={<span className="truncate">{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</span>}
            subtitle={it.note}
            media={<Tile color={it.color} tinted size={36}><span className="text-lg">{it.emoji}</span></Tile>}
            after={it.price}
          />
        ))}
        {open && TOTALS.map(([k, v]) => (
          <ListItem key={k} title={<span className="text-subhead">{k}</span>} after={<span style={k === 'BERLIN5' ? { color: C.vegan } : undefined}>{v}</span>} />
        ))}
        {open && <ListItem title={<span className="font-semibold">Total</span>} after={<span className="text-headline">{ORDER.total}</span>} />}
      </List>

      <List strong inset dividers>
        <ListItem title="Deliver to" after="Oderberger Str. 21" media={<Tile color={C.vegan}><Home className="w-4 h-4" /></Tile>} />
        <ListItem title="Estimated arrival" after={ORDER.eta} media={<Tile color={C.dessert}><Clock className="w-4 h-4" /></Tile>} />
        <ListItem link title="Get help with this order" media={<Tile color={C.asian}><LifeBuoy className="w-4 h-4" /></Tile>} onClick={() => nav.reset('orders')} />
      </List>
    </Page>
  )
}
