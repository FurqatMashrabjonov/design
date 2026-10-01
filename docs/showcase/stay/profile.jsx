import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, ListButton, Toggle, Dialog, DialogButton, Toast, Button } from 'konsta/react'
import { User, CreditCard, Bell, Globe, LifeBuoy, ShieldCheck, Settings, ArrowRight, BadgeCheck, MapPin } from 'lucide-react'
import { useNav, AppTabbar, Avatar, Hero, Tile, Photo, CountUp } from '@od/kit'

const C = {"cabins":"#a16207","villas":"#047857","treehouses":"#6b21a8","chalets":"#be185d","beachHouses":"#0e7490"}

const USER = { name: 'Elena Marsh', city: 'London', since: 2023, trips: 7, reviews: 5, payment: 'Visa •••• 4821', currency: 'EUR' }
const YEARS = 2026 - USER.since

const STAYED = [
  { id: 'edelweiss', name: 'Chalet Edelweiss', place: 'Zermatt', when: 'Feb 2026', photo: 'wooden chalet snowy peaks', color: C.chalets, emoji: '🏔️' },
  { id: 'canopy', name: 'Canopy Nest', place: 'Ubud, Bali', when: 'Jun 2026', photo: 'bamboo treehouse jungle', color: C.treehouses, emoji: '🌴' },
  { id: 'reine', name: "Reine Rorbu", place: 'Lofoten', when: 'Oct 2026', photo: 'red cabin fjord mountains', color: C.cabins, emoji: '🛖' },
]

export default function Screen() {
  const nav = useNav()
  const [notify, setNotify] = useState(true)
  const [logout, setLogout] = useState(false)
  const [toast, setToast] = useState(false)

  const stats = [
    { label: 'Trips taken', value: USER.trips },
    { label: 'Reviews', value: USER.reviews },
    { label: 'Years here', value: YEARS },
  ]

  const showSoon = () => {
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile"
        right={<Link iconOnly onClick={showSoon}><Settings className="w-6 h-6" /></Link>} />

      {/* Identity */}
      <div className="px-4 pt-2 vs-rise">
        <div className="bg-card rounded-card p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={USER.name} color={C.cabins} size={72} />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-card p-0.5">
                <BadgeCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-title2 truncate">{USER.name}</div>
              <div className="flex items-center gap-1 text-subhead text-black/55 dark:text-white/55">
                <MapPin className="w-4 h-4" /> {USER.city}
              </div>
              <div className="text-footnote text-black/55 dark:text-white/55">Member since {USER.since}</div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-line grid grid-cols-3">
            {stats.map((s, i) => (
              <div key={s.label} className={`text-center ${i > 0 ? 'border-l border-line' : ''}`}>
                <div className="text-title1"><CountUp to={s.value} /></div>
                <div className="text-caption1 text-black/55 dark:text-white/55">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Places stayed */}
      <BlockTitle className="!mb-2">Places you've stayed</BlockTitle>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {STAYED.map((s, i) => (
          <button key={s.id} onClick={() => nav.reset('trips')}
            className="shrink-0 w-40 text-left vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <Photo q={s.photo} className="w-40 h-48 rounded-3xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-2 left-2 text-xl">{s.emoji}</div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="text-headline truncate">{s.name}</div>
                <div className="text-caption1 opacity-80">{s.place} · {s.when}</div>
              </div>
            </Photo>
          </button>
        ))}
      </div>

      {/* Host promo */}
      <div className="px-4 mt-8 vs-rise" style={{ animationDelay: '120ms' }}>
        <Hero as="button" color={C.villas} to={C.beachHouses} onClick={showSoon}
          className="w-full text-left rounded-[24px] p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-caption1 uppercase tracking-wider opacity-80">Become a host</div>
              <div className="text-title2 mt-1">Host your own hideaway</div>
              <div className="text-subhead opacity-80 mt-1">Share a cabin, villa or treehouse with travellers who'll love it.</div>
              <div className="flex items-center gap-1 text-subhead font-semibold mt-3">
                Get started <ArrowRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-5xl vs-float">🏡</div>
          </div>
        </Hero>
      </div>

      {/* Account */}
      <BlockTitle>Account</BlockTitle>
      <List strong inset dividers>
        <ListItem link title="Personal info" onClick={showSoon}
          media={<Tile color="#636366"><User className="w-4 h-4 text-white" /></Tile>} />
        <ListItem link title="Payments" onClick={showSoon}
          after={<span className="text-subhead text-black/55 dark:text-white/55">{USER.payment}</span>}
          media={<Tile color="#34c759"><CreditCard className="w-4 h-4 text-white" /></Tile>} />
        <ListItem link title="Login & security" onClick={showSoon}
          media={<Tile color="#0a84ff"><ShieldCheck className="w-4 h-4 text-white" /></Tile>} />
      </List>

      <BlockTitle>Preferences</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Notifications"
          media={<Tile color="#ff3b30"><Bell className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={notify} onChange={() => setNotify(!notify)} />} />
        <ListItem link title="Language & currency" onClick={showSoon}
          after={<span className="text-subhead text-black/55 dark:text-white/55">English · €{USER.currency}</span>}
          media={<Tile color="#5856d6"><Globe className="w-4 h-4 text-white" /></Tile>} />
      </List>

      <BlockTitle>Support</BlockTitle>
      <List strong inset dividers>
        <ListItem link title="Help Centre" onClick={showSoon}
          media={<Tile color="#ff9500"><LifeBuoy className="w-4 h-4 text-white" /></Tile>} />
        <ListButton className="text-red-500" onClick={() => setLogout(true)}>Log out</ListButton>
      </List>

      <Block className="text-center text-footnote text-black/55 dark:text-white/55">
        Hideaway 4.2 · Made for remarkable places
      </Block>

      <Dialog opened={logout} onBackdropClick={() => setLogout(false)}
        title="Log out?"
        content="Your trips and wishlists stay saved to your account."
        buttons={<>
          <DialogButton onClick={() => setLogout(false)}>Cancel</DialogButton>
          <DialogButton strong className="text-red-500" onClick={() => { setLogout(false); nav.reset('explore') }}>Log out</DialogButton>
        </>} />

      <Toast opened={toast} position="center"
        button={<Button clear small inline onClick={() => setToast(false)}>OK</Button>}>
        <div className="shrink">Coming soon to your profile.</div>
      </Toast>

      <AppTabbar active="profile" />
    </Page>
  )
}
