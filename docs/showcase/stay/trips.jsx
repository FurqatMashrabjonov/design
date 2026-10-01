import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Button, Segmented, SegmentedButton, Toast } from 'konsta/react'
import { Navigation, MessageCircle, Star, CalendarDays, Clock, Users, ChevronRight } from 'lucide-react'
import { useNav, AppTabbar, Photo, Tile, tint } from '@od/kit'

const C = {"cabins":"#a16207","villas":"#047857","treehouses":"#6b21a8","chalets":"#be185d","beachHouses":"#0e7490"}

const UPCOMING = {
  id: 'reine', name: "Reine Fisherman's Rorbu", place: 'Lofoten, Norway', photo: 'red cabin fjord mountains',
  dates: 'Fri Oct 23 – Tue Oct 27', nights: 4, guests: '2 adults', paid: '€980', checkIn: '15:00', countdown: 'In 22 days',
  host: 'Ingrid', kind: 'Cabin', emoji: '🛖', color: C.cabins,
}
const RESERVED = {
  id: 'cipresso', name: 'Villa Cipresso', place: 'Val d\u2019Orcia, Tuscany', photo: 'stone villa cypress hills',
  dates: 'Thu Nov 13 – Mon Nov 17', nights: 4, guests: '2 adults, 1 child', total: '€1,674', color: C.villas, kind: 'Villa',
}
const PAST = [
  { id: 'edelweiss', name: 'Chalet Edelweiss', place: 'Zermatt, Switzerland', photo: 'wooden chalet snowy peaks', dates: 'Feb 12–16, 2026', guests: '4 guests', reviewed: 5, color: C.chalets },
  { id: 'canopy', name: 'Canopy Nest Treehouse', place: 'Ubud, Bali', photo: 'bamboo treehouse jungle', dates: 'Jun 3–8, 2026', guests: '2 guests', reviewed: 0, color: C.treehouses },
]

export default function Screen() {
  const nav = useNav()
  const [tab, setTab] = useState('upcoming')
  const [toast, setToast] = useState('')
  const open = (id) => nav.push('stay-detail', { id })
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800) }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Trips" subtitle="2 upcoming · 7 taken" />

      <Block className="!my-3">
        <Segmented strong rounded>
          <SegmentedButton rounded active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming</SegmentedButton>
          <SegmentedButton rounded active={tab === 'past'} onClick={() => setTab('past')}>Past</SegmentedButton>
        </Segmented>
      </Block>

      {tab === 'upcoming' && (
        <>
          <div className="px-4 vs-rise">
            <button className="block w-full text-left" onClick={() => open(UPCOMING.id)}>
              <Photo q={UPCOMING.photo} className="w-full h-[420px] rounded-[28px] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 text-black px-3 py-1.5 text-footnote font-semibold">
                  <Clock className="w-4 h-4" style={{ color: UPCOMING.color }} /> {UPCOMING.countdown}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="text-caption1 uppercase tracking-widest opacity-80">{UPCOMING.emoji} {UPCOMING.kind} · {UPCOMING.place}</div>
                  <div className="text-title1 leading-tight mt-1">{UPCOMING.name}</div>
                  <div className="text-subhead opacity-85 mt-2">{UPCOMING.dates} · {UPCOMING.nights} nights · {UPCOMING.guests}</div>
                </div>
              </Photo>
            </button>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Button large rounded onClick={() => flash('Opening directions to Reine…')}>
                <Navigation className="w-5 h-5 mr-2" /> Directions
              </Button>
              <Button large rounded tonal onClick={() => flash(`Message sent to ${UPCOMING.host}`)}>
                <MessageCircle className="w-5 h-5 mr-2" /> Message host
              </Button>
            </div>
            <div className="grid grid-cols-3 mt-4 border-t border-b border-line py-3 text-center">
              <div>
                <div className="text-caption1 text-black/55 dark:text-white/55">Check-in</div>
                <div className="text-headline" style={{ color: UPCOMING.color }}>from {UPCOMING.checkIn}</div>
              </div>
              <div className="border-x border-line">
                <div className="text-caption1 text-black/55 dark:text-white/55">Host</div>
                <div className="text-headline">{UPCOMING.host}</div>
              </div>
              <div>
                <div className="text-caption1 text-black/55 dark:text-white/55">Paid</div>
                <div className="text-headline">{UPCOMING.paid}</div>
              </div>
            </div>
          </div>

          <BlockTitle>Just reserved</BlockTitle>
          <List strong inset>
            <ListItem link onClick={() => open(RESERVED.id)}
              title={<span className="truncate">{RESERVED.name}</span>}
              subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{RESERVED.dates} · {RESERVED.nights} nights</span>}
              text={<span className="inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-caption1 font-semibold" style={{ background: tint(RESERVED.color), color: RESERVED.color }}>🏡 {RESERVED.kind} · {RESERVED.total}</span>}
              media={<Photo q={RESERVED.photo} className="w-14 h-14 rounded-2xl" />}
            />
          </List>
          <Block className="!mt-1 flex items-center gap-2 text-footnote text-black/55 dark:text-white/55">
            <CalendarDays className="w-4 h-4" /> Free cancellation on Villa Cipresso until Nov 6.
          </Block>
        </>
      )}

      <BlockTitle className="!mb-2">Where you’ve been</BlockTitle>
      <div className="px-4">
        {PAST.map((t, i) => (
          <div key={t.id} className="vs-rise border-t border-line py-4 flex gap-4 items-center" style={{ animationDelay: `${i * 60}ms` }}>
            <button className="shrink-0" onClick={() => open(t.id)}>
              <Photo q={t.photo} className="w-24 h-24 rounded-[20px]" />
            </button>
            <div className="min-w-0 flex-1">
              <button className="block w-full text-left" onClick={() => open(t.id)}>
                <div className="text-headline truncate">{t.name}</div>
                <div className="text-footnote text-black/55 dark:text-white/55 truncate">{t.place}</div>
                <div className="text-footnote text-black/55 dark:text-white/55 flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5" /> {t.dates} · {t.guests}
                </div>
              </button>
              {t.reviewed ? (
                <div className="flex items-center gap-1 mt-2 text-footnote" style={{ color: t.color }}>
                  {Array.from({ length: t.reviewed }).map((_, k) => <Star key={k} className="w-3.5 h-3.5 fill-current" />)}
                  <span className="ml-1 text-black/55 dark:text-white/55">You reviewed</span>
                </div>
              ) : (
                <button className="mt-2 inline-flex items-center gap-1 min-h-[32px] text-subhead font-semibold text-primary" onClick={() => open(t.id)}>
                  Leave a review <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="border-t border-line pt-4 flex items-center gap-3">
          <Tile color={C.cabins} tinted size={36}>🧭</Tile>
          <div className="text-footnote text-black/55 dark:text-white/55">7 trips taken since 2023 · 5 reviews written</div>
        </div>
      </div>

      <Toast opened={!!toast} position="center">{toast}</Toast>
      <AppTabbar active="trips" />
    </Page>
  )
}
