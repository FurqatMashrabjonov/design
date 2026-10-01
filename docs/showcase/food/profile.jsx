import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Toggle, Dialog, DialogButton, Actions, ActionsGroup, ActionsLabel, ActionsButton, Toast, Button } from 'konsta/react'
import { Home, Briefcase, CreditCard, Wallet, Ticket, Bell, Tag, LifeBuoy, LogOut, Star, Clock, Crown, ShoppingBag, PiggyBank, Plus } from 'lucide-react'
import { useNav, AppTabbar, Hero, Photo, Tile, Meter, CountUp, tint } from '@od/kit'

const C = {"pizza":"#7b61ff","burgers":"#ff3d7f","asian":"#00a8e8","vegan":"#58cc02","dessert":"#ff9f1c","drinks":"#ff6b35"}

const USER = { name: 'Lena Hoffmann', email: 'lena.hoffmann@mail.de', phone: '+49 151 2384 6610', photo: 'smiling woman curly hair', tier: 'Kiez Gold', orders: 34, saved: 62 }

const ADDRESSES = [
  { id: 'home', label: 'Home', line: 'Oderberger Str. 21, 10435 Berlin', note: 'Prenzlauer Berg · 3rd floor, ring “Hoffmann”', icon: Home, color: C.vegan },
  { id: 'work', label: 'Work', line: 'Torstraße 140, 10119 Berlin', note: 'Mitte', icon: Briefcase, color: C.asian },
]

const PAYMENTS = [
  { id: 'visa', label: 'Visa •• 4417', note: 'Default', icon: CreditCard, color: C.pizza },
  { id: 'paypal', label: 'PayPal', note: 'lena.hoffmann@mail.de', icon: Wallet, color: C.asian },
]

const FAVOURITES = [
  { id: 'ruffiano', name: 'Pizzeria Ruffiano', emoji: '🍕', rating: '4.8', time: '20–30 min', photo: 'wood fired margherita pizza', color: C.pizza },
  { id: 'gruene-gabel', name: 'Grüne Gabel', emoji: '🥗', rating: '4.9', time: '20–30 min', photo: 'colorful vegan buddha bowl', color: C.vegan },
  { id: 'saigon', name: 'Saigon Kitchen', emoji: '🍜', rating: '4.6', time: '15–25 min', photo: 'steaming pho noodle bowl', color: C.asian },
]

const muted = 'text-black/55 dark:text-white/55'

export default function Screen() {
  const nav = useNav()
  const [orderUpdates, setOrderUpdates] = useState(true)
  const [offers, setOffers] = useState(true)
  const [defaultPay, setDefaultPay] = useState('visa')
  const [helpOpen, setHelpOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile" />

      {/* Header */}
      <div className="px-4 pt-2 flex items-center gap-4 vs-rise">
        <div className="relative shrink-0">
          <Photo q={USER.photo} alt={USER.name} className="w-20 h-20 rounded-full" />
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card flex items-center justify-center text-lg shadow">👑</span>
        </div>
        <div className="min-w-0">
          <div className="text-title2 truncate">{USER.name}</div>
          <div className={`text-subhead truncate ${muted}`}>{USER.email}</div>
          <div className={`text-footnote truncate ${muted}`}>{USER.phone}</div>
        </div>
      </div>

      {/* Stats hero */}
      <div className="px-4 mt-5 vs-rise" style={{ animationDelay: '60ms' }}>
        <Hero color={C.pizza} to={C.burgers} className="rounded-card p-5">
          <div className="flex items-center gap-2 text-subhead font-semibold opacity-90">
            <Crown className="w-5 h-5" /> {USER.tier} member
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <button onClick={() => nav.reset('orders')} className="text-left rounded-2xl bg-white/15 p-3 active:bg-white/25 min-h-[44px]">
              <ShoppingBag className="w-5 h-5 opacity-90" />
              <div className="text-title1 mt-1 leading-none"><CountUp to={USER.orders} /></div>
              <div className="text-caption1 opacity-80 mt-1">Orders ›</div>
            </button>
            <div className="rounded-2xl bg-white/15 p-3">
              <PiggyBank className="w-5 h-5 opacity-90" />
              <div className="text-title1 mt-1 leading-none">€<CountUp to={USER.saved} /></div>
              <div className="text-caption1 opacity-80 mt-1">Saved</div>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <Star className="w-5 h-5 opacity-90" />
              <div className="text-title1 mt-1 leading-none">Gold</div>
              <div className="text-caption1 opacity-80 mt-1">Tier</div>
            </div>
          </div>
          <div className="text-footnote opacity-85 mt-4">Free delivery perks on every 5th order this month 🎉</div>
        </Hero>
      </div>

      {/* Favourites */}
      <BlockTitle className="!mb-2">Favourite restaurants</BlockTitle>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {FAVOURITES.map((f, i) => (
          <button key={f.id} onClick={() => nav.push('restaurant', { id: f.id })}
            className="shrink-0 w-40 text-left vs-rise" style={{ animationDelay: `${120 + i * 60}ms` }}>
            <Photo q={f.photo} alt={f.name} className="w-40 h-28 rounded-card">
              <div className="absolute inset-0 rounded-card bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-base bg-white/90">{f.emoji}</span>
              <div className="absolute bottom-2 left-3 right-3 text-white">
                <div className="text-subhead font-semibold truncate">{f.name}</div>
                <div className="text-caption1 opacity-90 flex items-center gap-1">
                  <Star className="w-3 h-3" fill="currentColor" /> {f.rating} · {f.time}
                </div>
              </div>
            </Photo>
          </button>
        ))}
      </div>

      {/* Addresses */}
      <BlockTitle>Saved addresses</BlockTitle>
      <List strong inset dividers>
        {ADDRESSES.map((a) => {
          const Icon = a.icon
          return (
            <ListItem key={a.id} link onClick={() => flash(`${a.label} address selected`)}
              media={<Tile color={a.color} size={36}><Icon className="w-5 h-5 text-white" /></Tile>}
              title={a.label}
              subtitle={<span className="truncate block">{a.line}</span>}
              text={<span className={`text-footnote ${muted}`}>{a.note}</span>} />
          )
        })}
        <ListItem link onClick={() => flash('Add address coming soon')}
          media={<Tile color={C.drinks} size={36} tinted><Plus className="w-5 h-5" style={{ color: C.drinks }} /></Tile>}
          title={<span className="text-primary font-semibold">Add address</span>} />
      </List>

      {/* Payment */}
      <BlockTitle>Payment</BlockTitle>
      <List strong inset dividers>
        {PAYMENTS.map((p) => {
          const Icon = p.icon
          const isDefault = defaultPay === p.id
          return (
            <ListItem key={p.id} onClick={() => setDefaultPay(p.id)}
              media={<Tile color={p.color} size={36}><Icon className="w-5 h-5 text-white" /></Tile>}
              title={p.label}
              subtitle={<span className={`text-footnote ${muted}`}>{p.id === 'paypal' ? p.note : 'Expires 08/28'}</span>}
              after={isDefault
                ? <span className="text-footnote font-semibold px-2.5 py-1 rounded-full vs-bounce" style={{ background: tint(C.vegan, 20) }}>Default</span>
                : <span className={`text-footnote ${muted}`}>Make default</span>} />
          )
        })}
      </List>

      {/* Promo */}
      <BlockTitle>Promo codes</BlockTitle>
      <List strong inset>
        <ListItem
          media={<Tile color={C.dessert} size={36} tinted><Ticket className="w-5 h-5" style={{ color: C.dessert }} /></Tile>}
          title={<span className="font-mono font-semibold tracking-wide">BERLIN5</span>}
          subtitle={<span className={`text-footnote ${muted}`}>€5 off · 2 of 3 orders left</span>}
          after={<span className="text-headline" style={{ color: C.burgers }}>−€5</span>}
          text={<div className="mt-2 w-40"><Meter value={2 / 3} color={C.dessert} /></div>} />
      </List>

      {/* Notifications */}
      <BlockTitle>Notifications</BlockTitle>
      <List strong inset dividers>
        <ListItem
          media={<Tile color={C.burgers} size={36}><Bell className="w-5 h-5 text-white" /></Tile>}
          title="Order updates"
          subtitle={<span className={`text-footnote ${muted}`}>Courier and delivery alerts</span>}
          after={<Toggle checked={orderUpdates} onChange={() => setOrderUpdates(!orderUpdates)} />} />
        <ListItem
          media={<Tile color={C.drinks} size={36}><Tag className="w-5 h-5 text-white" /></Tile>}
          title="Deals from your Kiez"
          subtitle={<span className={`text-footnote ${muted}`}>Weekly offers nearby</span>}
          after={<Toggle checked={offers} onChange={() => setOffers(!offers)} />} />
      </List>

      {/* Help & logout */}
      <List strong inset dividers>
        <ListItem link onClick={() => setHelpOpen(true)}
          media={<Tile color={C.asian} size={36}><LifeBuoy className="w-5 h-5 text-white" /></Tile>}
          title="Help & support" />
        <ListItem link onClick={() => nav.reset('orders')}
          media={<Tile color={C.pizza} size={36}><Clock className="w-5 h-5 text-white" /></Tile>}
          title="Order history" after={<span className={`text-subhead ${muted}`}>{USER.orders}</span>} />
      </List>

      <Block className="!mt-2">
        <Button large rounded tonal className="!text-red-500" onClick={() => setLogoutOpen(true)}>
          <LogOut className="w-5 h-5 mr-2" /> Log out
        </Button>
        <p className={`text-caption1 text-center mt-3 ${muted}`}>Kiezbite · made with love in Berlin 🧡</p>
      </Block>

      <Actions opened={helpOpen} onBackdropClick={() => setHelpOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>How can we help, Lena?</ActionsLabel>
          <ActionsButton onClick={() => { setHelpOpen(false); flash('Chat opened') }}>Chat with support</ActionsButton>
          <ActionsButton onClick={() => { setHelpOpen(false); flash('Email draft opened') }}>Email us</ActionsButton>
          <ActionsButton onClick={() => { setHelpOpen(false); flash('FAQ opened') }}>Read the FAQ</ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setHelpOpen(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>

      <Dialog opened={logoutOpen} onBackdropClick={() => setLogoutOpen(false)}
        title="Log out?"
        content="Your basket and favourites stay saved for next time."
        buttons={<>
          <DialogButton onClick={() => setLogoutOpen(false)}>Cancel</DialogButton>
          <DialogButton strong onClick={() => { setLogoutOpen(false); nav.push('onboarding') }}>Log out</DialogButton>
        </>} />

      <Toast position="center" opened={!!toast}>{toast}</Toast>

      <AppTabbar active="profile" />
    </Page>
  )
}
