import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Button, Segmented, SegmentedButton, Stepper } from 'konsta/react'
import { X, ChevronLeft, ChevronRight, Star, ShieldCheck, Users, CalendarDays } from 'lucide-react'
import { useNav, Photo, Tile, tint } from '@od/kit'

const C = {"cabins":"#a16207","villas":"#047857","treehouses":"#6b21a8","chalets":"#be185d","beachHouses":"#0e7490"}

const STAY = { name: 'Villa Cipresso', place: 'Val d’Orcia, Tuscany', price: 340, rating: 4.92, reviews: 126, photo: 'stone villa cypress hills', maxGuests: 6 }
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DOW_LONG = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const OFFSET = 5 // Nov 1 sits under Saturday, so Nov 13 is a Thursday and Nov 17 a Monday
const DAYS = 30
const eur = (n) => `€${n.toLocaleString('en-GB')}`
const dayName = (d) => DOW_LONG[(OFFSET + d - 1) % 7]

export default function Screen() {
  const nav = useNav()
  const [tab, setTab] = useState('Dates')
  const [start, setStart] = useState(13)
  const [end, setEnd] = useState(17)
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(1)
  const [infants, setInfants] = useState(0)

  const nights = start && end ? end - start : 0
  const guests = adults + children
  const full = guests >= STAY.maxGuests

  const pick = (d) => {
    if (!start || end) { setStart(d); setEnd(null) }
    else if (d > start) setEnd(d)
    else setStart(d)
  }
  const clear = () => { setStart(null); setEnd(null); setAdults(1); setChildren(0); setInfants(0) }

  const cells = [...Array(OFFSET).fill(null), ...Array.from({ length: DAYS }, (_, i) => i + 1)]
  const guestLine = `${adults} adult${adults === 1 ? '' : 's'}${children ? ` · ${children} child${children === 1 ? '' : 'ren'}` : ''}${infants ? ` · ${infants} infant${infants === 1 ? '' : 's'}` : ''}`
  const dateLine = start && end ? `${dayName(start)}, Nov ${start} – ${dayName(end)}, Nov ${end}` : start ? `From Nov ${start} · pick check-out` : 'Add dates'

  return (
    <Page className="pb-40">
      <Navbar
        title="Dates & guests"
        left={<Link iconOnly onClick={nav.pop}><X className="w-6 h-6" /></Link>}
      />

      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-line vs-rise">
        <Photo q={STAY.photo} className="w-14 h-14 rounded-2xl shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-headline truncate">{STAY.name}</div>
          <div className="text-footnote text-black/55 dark:text-white/55 truncate">{STAY.place}</div>
          <div className="flex items-center gap-1 text-footnote mt-0.5">
            <Star className="w-3.5 h-3.5 fill-current" style={{ color: C.villas }} />
            <span className="font-semibold">{STAY.rating}</span>
            <span className="text-black/55 dark:text-white/55">({STAY.reviews})</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-headline" style={{ color: C.villas }}>{eur(STAY.price)}</div>
          <div className="text-caption1 text-black/55 dark:text-white/55">night</div>
        </div>
      </div>

      <Block className="!my-4">
        <Segmented strong rounded>
          {['Dates', 'Guests'].map((t) => (
            <SegmentedButton key={t} rounded active={tab === t} onClick={() => setTab(t)}>{t}</SegmentedButton>
          ))}
        </Segmented>
      </Block>

      {tab === 'Dates' ? (
        <>
          <div className="px-4 vs-rise">
            <div className="flex items-center justify-between mb-3">
              <button className="w-11 h-11 flex items-center justify-center rounded-full opacity-30" aria-label="Previous month"><ChevronLeft className="w-5 h-5" /></button>
              <div className="text-title2">November 2026</div>
              <button className="w-11 h-11 flex items-center justify-center rounded-full" aria-label="Next month"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DOW.map((d, i) => (
                <div key={i} className="text-center text-caption1 font-semibold text-black/45 dark:text-white/45 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((d, i) => {
                if (!d) return <div key={`e${i}`} className="h-11" />
                const isStart = d === start
                const isEnd = d === end
                const inRange = start && end && d > start && d < end
                const banded = start && end && d >= start && d <= end && end > start
                return (
                  <button key={d} onClick={() => pick(d)} className="relative h-11 flex items-center justify-center">
                    {banded && (
                      <span
                        className="absolute inset-y-0.5 bg-primary opacity-15"
                        style={{ left: isStart ? '50%' : 0, right: isEnd ? '50%' : 0 }}
                      />
                    )}
                    <span
                      className={`relative w-10 h-10 flex items-center justify-center rounded-full text-body ${isStart || isEnd ? 'bg-primary text-white font-semibold vs-bounce' : inRange ? 'font-semibold' : ''}`}
                    >
                      {d}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="text-center mt-4">
              <div className="text-title3">{nights ? `${nights} night${nights === 1 ? '' : 's'}` : 'Select check-out'}</div>
              <div className="text-footnote text-black/55 dark:text-white/55 mt-0.5">{dateLine}</div>
            </div>
          </div>

          <BlockTitle>Your stay</BlockTitle>
          <List strong inset dividers>
            <ListItem
              title="Free cancellation"
              text="Until Nov 6 — full refund"
              media={<Tile color={C.villas} tinted><ShieldCheck className="w-4 h-4" style={{ color: C.villas }} /></Tile>}
            />
            <ListItem
              link
              title="Guests"
              after={guestLine}
              onClick={() => setTab('Guests')}
              media={<Tile color={C.villas} tinted><Users className="w-4 h-4" style={{ color: C.villas }} /></Tile>}
            />
          </List>
        </>
      ) : (
        <>
          <List strong inset dividers className="vs-rise">
            <ListItem
              title="Adults"
              text="Ages 13 or above"
              after={<Stepper small rounded value={adults} onMinus={() => setAdults(Math.max(1, adults - 1))} onPlus={() => !full && setAdults(adults + 1)} />}
            />
            <ListItem
              title="Children"
              text="Ages 2–12"
              after={<Stepper small rounded value={children} onMinus={() => setChildren(Math.max(0, children - 1))} onPlus={() => !full && setChildren(children + 1)} />}
            />
            <ListItem
              title="Infants"
              text="Under 2"
              after={<Stepper small rounded value={infants} onMinus={() => setInfants(Math.max(0, infants - 1))} onPlus={() => setInfants(Math.min(3, infants + 1))} />}
            />
          </List>
          <div className="px-8 -mt-2 text-footnote text-black/55 dark:text-white/55">
            {STAY.name} sleeps {STAY.maxGuests} across 3 bedrooms. Infants don’t count towards the total.
          </div>

          <div className="mx-4 mt-6 rounded-card p-4 flex items-center gap-3" style={{ background: tint(C.villas, 12) }}>
            <div className="text-3xl">🏡</div>
            <div className="flex-1">
              <div className="text-headline">{guests} of {STAY.maxGuests} guests</div>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: STAY.maxGuests }, (_, i) => (
                  <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < guests ? C.villas : tint(C.villas, 25) }} />
                ))}
              </div>
            </div>
          </div>

          <BlockTitle>Your stay</BlockTitle>
          <List strong inset>
            <ListItem
              link
              title="Dates"
              after={nights ? `Nov ${start}–${end}` : 'Add dates'}
              onClick={() => setTab('Dates')}
              media={<Tile color={C.villas} tinted><CalendarDays className="w-4 h-4" style={{ color: C.villas }} /></Tile>}
            />
          </List>
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-line px-4 pt-3 pb-8 z-20">
        <div className="text-footnote text-black/55 dark:text-white/55 mb-2 truncate">
          {nights ? `${nights} × ${eur(STAY.price)} = ${eur(nights * STAY.price)} · ${guestLine}` : guestLine}
        </div>
        <div className="flex items-center justify-between gap-4">
          <button onClick={clear} className="text-headline underline underline-offset-4 h-11 px-1">Clear</button>
          <Button large rounded className="!w-44" disabled={!nights} onClick={nav.pop}>Save</Button>
        </div>
      </div>
    </Page>
  )
}
