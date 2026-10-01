import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, BlockFooter, List, ListItem, ListInput, Link, Button, Toggle, Actions, ActionsGroup, ActionsLabel, ActionsButton } from 'konsta/react'
import { Star, CreditCard, CalendarDays, Users, ShieldCheck, Lock, MessageSquare, Check } from 'lucide-react'
import { useNav, Photo, Tile, tint } from '@od/kit'

const C = {"cabins":"#a16207","villas":"#047857","treehouses":"#6b21a8","chalets":"#be185d","beachHouses":"#0e7490"}

const STAY = {
  title: 'Villa Cipresso',
  place: 'Val d’Orcia, Tuscany, Italy',
  kind: 'Villa',
  emoji: '🏡',
  color: C.villas,
  rating: '4.92',
  reviews: 126,
  host: 'Marco',
  photo: 'stone villa cypress hills',
}
const BOOKING = {
  dates: 'Thu, Nov 13 – Mon, Nov 17',
  short: 'Nov 13–17, 2026',
  nights: 4,
  guests: '2 adults, 1 child',
  freeCancel: 'Nov 6',
}
const PRICE = [
  { label: '4 nights × €340', value: '€1,360' },
  { label: 'Cleaning fee', value: '€85' },
  { label: 'Service fee', value: '€168' },
  { label: 'Taxes', value: '€61' },
]
const TOTAL = '€1,674'

export default function Screen() {
  const nav = useNav()
  const [payOpen, setPayOpen] = useState(false)
  const [card, setCard] = useState('Visa •••• 4821')
  const [receipt, setReceipt] = useState(true)
  const [note, setNote] = useState('')

  return (
    <Page className="pb-40">
      <Navbar title="Confirm and pay" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />

      {/* Summary */}
      <div className="px-4 pt-4 vs-rise">
        <div className="flex gap-4 items-center">
          <Photo q={STAY.photo} className="w-28 h-28 rounded-3xl shrink-0" alt={STAY.title} />
          <div className="min-w-0 flex-1">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption1 font-semibold"
              style={{ background: tint(STAY.color), color: STAY.color }}
            >
              {STAY.emoji} {STAY.kind}
            </span>
            <div className="text-title2 mt-1.5 truncate">{STAY.title}</div>
            <div className="text-footnote text-black/55 dark:text-white/55 truncate">{STAY.place}</div>
            <div className="flex items-center gap-1 mt-1 text-footnote">
              <Star className="w-3.5 h-3.5 fill-current" style={{ color: STAY.color }} />
              <span className="font-semibold">{STAY.rating}</span>
              <span className="text-black/55 dark:text-white/55">· {STAY.reviews} reviews</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between px-4 mt-6">
        <div className="text-title3">Your trip</div>
        <Link onClick={() => nav.push('date-guests')}>Edit</Link>
      </div>
      <List strong inset dividers className="!mt-2">
        <ListItem
          title="Dates"
          subtitle={`${BOOKING.dates} · ${BOOKING.nights} nights`}
          media={<Tile color={STAY.color} tinted><CalendarDays className="w-4 h-4" style={{ color: STAY.color }} /></Tile>}
        />
        <ListItem
          title="Guests"
          subtitle={BOOKING.guests}
          media={<Tile color={STAY.color} tinted><Users className="w-4 h-4" style={{ color: STAY.color }} /></Tile>}
        />
      </List>

      {/* Price breakdown */}
      <BlockTitle className="!mb-2">Price details</BlockTitle>
      <div className="px-4">
        {PRICE.map((p, i) => (
          <div
            key={p.label}
            className="flex items-center justify-between py-3 border-b border-line text-body vs-rise"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-black/70 dark:text-white/70">{p.label}</span>
            <span>{p.value}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between pt-4 vs-rise" style={{ animationDelay: '240ms' }}>
          <span className="text-headline">Total (EUR)</span>
          <span className="text-title1">{TOTAL}</span>
        </div>
      </div>

      {/* Payment */}
      <BlockTitle>Pay with</BlockTitle>
      <List strong inset dividers>
        <ListItem
          link
          title={card}
          subtitle="Charged today"
          onClick={() => setPayOpen(true)}
          media={<Tile color="#1a1f71"><CreditCard className="w-4 h-4" /></Tile>}
        />
        <ListItem
          title="Email me the receipt"
          after={<Toggle checked={receipt} onChange={() => setReceipt(!receipt)} />}
          media={<Tile color="#8e8e93"><MessageSquare className="w-4 h-4" /></Tile>}
        />
      </List>

      <BlockTitle>Message {STAY.host}</BlockTitle>
      <List strong inset>
        <ListInput
          type="textarea"
          placeholder={`Say hello and share what brings you to Tuscany`}
          value={note}
          onInput={(e) => setNote(e.target.value)}
          inputClassName="!h-20 resize-none"
        />
      </List>

      {/* Cancellation */}
      <div className="mx-4 mt-6 pt-5 border-t border-line flex gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: STAY.color }} />
        <div>
          <div className="text-headline">Free cancellation until {BOOKING.freeCancel}</div>
          <div className="text-subhead text-black/55 dark:text-white/55 mt-1">
            Cancel before {BOOKING.freeCancel} for a full refund. After that, the first night and service fee are non-refundable.
          </div>
        </div>
      </div>
      <BlockFooter className="!mt-4">
        By selecting Confirm and pay, you agree to the house rules and Hideaway’s booking terms.
      </BlockFooter>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-page border-t border-line px-4 pt-3 pb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-headline">{TOTAL} total</div>
            <div className="text-footnote text-black/55 dark:text-white/55">{BOOKING.short} · {BOOKING.nights} nights</div>
          </div>
          <div className="flex items-center gap-1 text-footnote text-black/55 dark:text-white/55">
            <Lock className="w-3.5 h-3.5" /> Secure
          </div>
        </div>
        <Button large rounded onClick={() => nav.reset('trips')}>Confirm and pay</Button>
      </div>

      <Actions opened={payOpen} onBackdropClick={() => setPayOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>Payment method</ActionsLabel>
          <ActionsButton onClick={() => { setCard('Visa •••• 4821'); setPayOpen(false) }}>
            <span className="flex items-center gap-2 justify-center">
              Visa •••• 4821 {card === 'Visa •••• 4821' && <Check className="w-4 h-4" />}
            </span>
          </ActionsButton>
          <ActionsButton onClick={() => setPayOpen(false)}>Add a new card</ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setPayOpen(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>
    </Page>
  )
}
