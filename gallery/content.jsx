import { useRef, useState } from 'react'
import { Page, Navbar, BlockTitle, Block, List, ListItem, Button, Segmented, SegmentedButton, Preloader, Toggle } from 'konsta/react'
import { ArrowDown, ChevronRight, MapPin } from 'lucide-react'
import { AppTabbar, Dots, Photo, Avatar, tint, gradient } from '@od/kit'

const EASE = 'cubic-bezier(.2,.8,.2,1)'

// ── Carousel ────────────────────────────────────────────────────────────────────────────────────────────────
/** Horizontal snap carousel; the next card peeks at the edge, Dots follow the scroll. */
function Carousel({ items, renderItem, itemWidth = '84%', gap = 12 }) {
  const [index, setIndex] = useState(0)
  const onScroll = (e) => {
    const el = e.currentTarget
    const step = (el.firstChild?.offsetWidth ?? 1) + gap
    // The last card cannot snap to the start (nothing peeks after it), so the end of the scroll is the last page.
    const i = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2 ? items.length - 1 : Math.round(el.scrollLeft / step)
    if (i !== index) setIndex(i)
  }
  return (
    <div>
      <div onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ gap }}>
        {items.map((item, i) => (
          <div key={item.id ?? i} className="shrink-0 snap-start" style={{ width: itemWidth }}>{renderItem(item, i)}</div>
        ))}
      </div>
      <div className="mt-3"><Dots count={items.length} active={index} /></div>
    </div>
  )
}

/** A carousel card: a photo (gradient until it loads) with its title over a dark gradient. */
function PhotoCard({ q, color, title, meta, badge }) {
  return (
    <Photo q={q} className="h-60 rounded-card" style={{ background: gradient(color) }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      {badge && <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-caption1 font-semibold text-white backdrop-blur-md">{badge}</span>}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="text-title3">{title}</div>
        <div className="mt-0.5 flex items-center gap-1 text-footnote text-white/85"><MapPin className="size-3.5" />{meta}</div>
      </div>
    </Photo>
  )
}

// ── EmptyState ──────────────────────────────────────────────────────────────────────────────────────────────
/** Centred empty state: art in a soft tinted circle, a title, one line, one primary action, an optional link. */
function EmptyState({ emoji, icon, color, title, text, action, onAction, secondary, onSecondary }) {
  return (
    <div className="flex flex-col items-center px-6 py-9 text-center">
      <div className="flex size-24 items-center justify-center rounded-full" style={{ background: tint(color, 14), color: color ?? 'var(--color-primary)', fontSize: 44 }}>
        {emoji ?? icon}
      </div>
      <div className="mt-5 text-title3">{title}</div>
      <p className="mt-1.5 max-w-[17rem] text-subhead opacity-60">{text}</p>
      {action && <Button large rounded inline className="mt-6 px-8" onClick={onAction}>{action}</Button>}
      {secondary && <button type="button" onClick={onSecondary} className="mt-1 min-h-11 px-4 text-subhead font-medium text-primary active:opacity-50">{secondary}</button>}
    </div>
  )
}

// ── Skeleton ────────────────────────────────────────────────────────────────────────────────────────────────
/** A placeholder bone with a shimmer: a two-period gradient strip slid by `vs-wave` (transform only; the runtime
 *  stops it under reduced motion). Flipped so the light travels left to right. */
function Bone({ className = '' }) {
  return (
    <span aria-hidden className={`relative block overflow-hidden bg-black/[.07] dark:bg-white/[.09] ${className}`}>
      <span
        className="vs-wave absolute inset-y-0 -left-full w-[200%] -scale-x-100 [--sh:rgba(255,255,255,.6)] dark:[--sh:rgba(255,255,255,.08)]"
        style={{ background: 'linear-gradient(90deg, transparent 20%, var(--sh) 25%, transparent 30%, transparent 70%, var(--sh) 75%, transparent 80%)' }}
      />
    </span>
  )
}

function SkeletonRow() {
  return <ListItem media={<Bone className="size-11 rounded-full" />} title={<Bone className="mt-1 h-3.5 w-36 rounded-full" />} text={<Bone className="mt-2.5 h-3 w-52 rounded-full" />} />
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-card bg-card">
      <Bone className="h-36 w-full" />
      <div className="space-y-2.5 p-4">
        <Bone className="h-4 w-2/3 rounded-full" />
        <Bone className="h-3 w-1/2 rounded-full" />
      </div>
    </div>
  )
}

// ── PullToRefresh ───────────────────────────────────────────────────────────────────────────────────────────
/** A scroll area you pull down past `threshold` to run `onRefresh` (a promise); the content springs back after. */
function PullToRefresh({ onRefresh, threshold = 64, className = '', children }) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const start = useRef(null)
  const ready = pull >= threshold

  const down = (e) => { if (!busy && e.currentTarget.scrollTop <= 0) start.current = e.clientY }
  const move = (e) => {
    if (start.current == null) return
    const dy = e.clientY - start.current
    if (dy > 4 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId)
    setPull(dy > 0 ? Math.min(threshold * 1.8, dy * 0.5) : 0)
  }
  const up = () => {
    if (start.current == null) return
    start.current = null
    if (!ready) return setPull(0)
    setBusy(true)
    setPull(threshold * 0.8)
    Promise.resolve(onRefresh?.()).finally(() => { setBusy(false); setPull(0) })
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {(busy || pull > 0) && <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2" style={{ height: threshold * 0.8, opacity: busy ? 1 : Math.min(1, pull / threshold) }}>
        {busy ? <Preloader className="size-5" /> : <ArrowDown className="size-5 opacity-60" style={{ transform: `rotate(${ready ? 180 : (pull / threshold) * 180}deg)` }} />}
        <span className="text-footnote opacity-60">{busy ? 'Refreshing…' : ready ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>}
      <div
        onScroll={(e) => setAtTop(e.currentTarget.scrollTop <= 0)}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="relative h-full select-none overflow-y-auto overscroll-contain"
        style={{ touchAction: atTop ? 'pan-x pan-up' : 'auto' }}
      >
        <div className={`bg-card ${start.current == null ? 'motion-safe:transition-transform motion-safe:duration-300' : ''}`} style={{ transform: `translateY(${pull}px)`, transitionTimingFunction: EASE }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Accordion ───────────────────────────────────────────────────────────────────────────────────────────────
/** Disclosure rows in an inset list; the chevron turns 90° and the body grows (grid-rows 0fr → 1fr). */
function Accordion({ items, single = true, defaultOpen = [] }) {
  const [open, setOpen] = useState(() => new Set(defaultOpen))
  const toggle = (i) => setOpen((s) => {
    const n = new Set(single ? [] : s)
    if (!s.has(i)) n.add(i)
    return n
  })
  return (
    <List strong inset>
      {items.map((it, i) => {
        const on = open.has(i)
        return (
          <li key={it.title} className="relative">
            <button type="button" aria-expanded={on} onClick={() => toggle(i)} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left active:bg-black/5 dark:active:bg-white/5">
              <span className="flex-1 text-body">{it.title}</span>
              <ChevronRight className="size-5 shrink-0 opacity-35 motion-safe:transition-transform motion-safe:duration-200 ease-out" style={{ transform: on ? 'rotate(90deg)' : 'none' }} />
            </button>
            <div className="grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 ease-out" style={{ gridTemplateRows: on ? '1fr' : '0fr' }}>
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-subhead opacity-65" style={{ opacity: on ? 0.65 : 0, transition: 'opacity 250ms ease-out' }}>{it.body}</p>
              </div>
            </div>
            {i < items.length - 1 && <div className="absolute bottom-0 left-4 right-0 h-px bg-line" />}
          </li>
        )
      })}
    </List>
  )
}

// ── Demo data ───────────────────────────────────────────────────────────────────────────────────────────────
const TRIPS = [
  { id: 'kyoto', q: 'kyoto temple autumn', color: '#e0623a', title: 'Kyoto in autumn', meta: 'Japan · 6 nights', badge: 'Trending' },
  { id: 'amalfi', q: 'amalfi coast village', color: '#2f80c8', title: 'Amalfi Coast', meta: 'Italy · 5 nights', badge: 'From $1,240' },
  { id: 'iceland', q: 'iceland waterfall', color: '#2f9e8f', title: 'Ring Road', meta: 'Iceland · 9 nights' },
  { id: 'marrakech', q: 'marrakech market', color: '#c8862f', title: 'Marrakech medina', meta: 'Morocco · 4 nights' },
]

const PEOPLE = [
  { name: 'Maya Chen', text: 'Booked the ryokan for the 14th', color: '#ff7a59' },
  { name: 'Leo Park', text: 'Shared 24 photos from Lisbon', color: '#5e5ce6' },
  { name: 'Aziza Karimova', text: 'Can we push dinner to 8?', color: '#30b0c7' },
]

const MAIL = [
  { id: 1, from: 'Airline', color: '#0a84ff', subject: 'Your boarding pass is ready', time: '9:41' },
  { id: 2, from: 'Maya Chen', color: '#ff7a59', subject: 'Photos from Saturday', time: '8:12' },
  { id: 3, from: 'Hotel Sora', color: '#30b0c7', subject: 'Check-in opens tomorrow', time: 'Yesterday' },
  { id: 4, from: 'Leo Park', color: '#5e5ce6', subject: 'Re: split for the car', time: 'Yesterday' },
  { id: 5, from: 'Bank', color: '#34c759', subject: 'Monthly statement', time: 'Mon' },
]
const FRESH = [
  { from: 'Aziza Karimova', color: '#bf5af2', subject: 'Dinner moved to 8 pm' },
  { from: 'Train Co.', color: '#ff9f0a', subject: 'Seat 14A confirmed' },
  { from: 'Maya Chen', color: '#ff7a59', subject: 'Found the perfect café' },
]

const FAQ = [
  { title: 'Can I change my dates?', body: 'Yes. Open the trip, tap Dates and pick new ones — we only charge the difference in nightly rate.' },
  { title: 'When am I charged?', body: 'Nothing is charged until the host confirms. You will see one payment, in your own currency.' },
  { title: 'What if I need to cancel?', body: 'Cancel for free up to 48 hours before check-in. After that, the first night is not refunded.' },
  { title: 'Do you offer travel insurance?', body: 'You can add cover at checkout. It includes delays, lost luggage and medical care abroad.' },
]

// ── Screen ──────────────────────────────────────────────────────────────────────────────────────────────────
export default function Screen() {
  const [loading, setLoading] = useState(true)
  const [mail, setMail] = useState(MAIL)
  const [single, setSingle] = useState(true)

  const refresh = () => new Promise((done) => setTimeout(() => {
    setMail((m) => [{ ...FRESH[m.length % FRESH.length], id: Date.now(), time: 'Now', fresh: true }, ...m])
    done()
  }, 1000))

  return (
    <Page className="pb-32">
      <Navbar large title="Content" />

      <BlockTitle>Carousel</BlockTitle>
      <Block className="text-footnote opacity-60">Snap-scrolling cards; the next one peeks and the dots follow.</Block>
      <Carousel items={TRIPS} renderItem={(t) => <PhotoCard {...t} />} />

      <BlockTitle>Empty state</BlockTitle>
      <Block className="text-footnote opacity-60">One clear message and one action when there is nothing to show.</Block>
      <div className="mx-4 space-y-3">
        <div className="rounded-card bg-card">
          <EmptyState emoji="🧳" title="No trips yet" text="Save places you love and plan your first trip in minutes." action="Plan a trip" secondary="Browse ideas" />
        </div>
        <div className="rounded-card bg-card">
          <EmptyState emoji="🎉" color="#34c759" title="Inbox zero" text="You are all caught up. Enjoy the quiet — we will ping you when something lands." action="Back to trips" />
        </div>
      </div>

      <BlockTitle>Skeleton</BlockTitle>
      <Block className="text-footnote opacity-60">Shimmering placeholders shaped like the content that is on its way.</Block>
      <Block>
        <Segmented strong rounded>
          <SegmentedButton strong rounded active={loading} onClick={() => setLoading(true)}>Loading</SegmentedButton>
          <SegmentedButton strong rounded active={!loading} onClick={() => setLoading(false)}>Loaded</SegmentedButton>
        </Segmented>
      </Block>
      <List strong inset>
        {loading
          ? PEOPLE.map((p) => <SkeletonRow key={p.name} />)
          : PEOPLE.map((p) => <ListItem key={p.name} className="vs-rise" media={<Avatar name={p.name} color={p.color} />} title={p.name} text={p.text} />)}
      </List>
      <div className="mx-4">
        {loading ? <SkeletonCard /> : (
          <div className="vs-rise overflow-hidden rounded-card bg-card">
            <Photo q="lisbon tram street" className="h-36 w-full" style={{ background: gradient('#e0a43a') }} />
            <div className="p-4">
              <div className="text-headline">Lisbon long weekend</div>
              <div className="mt-0.5 text-footnote opacity-60">3 nights · 4 friends · from $680</div>
            </div>
          </div>
        )}
      </div>

      <BlockTitle>Pull to refresh</BlockTitle>
      <Block className="text-footnote opacity-60">Drag the list down past the line and let go to load new mail.</Block>
      <PullToRefresh onRefresh={refresh} className="mx-4 h-[340px] rounded-card bg-card-2">
        <List className="!my-0">
          {mail.map((m) => (
            <ListItem
              key={m.id}
              className={m.fresh ? 'vs-rise' : ''}
              media={<Avatar name={m.from} color={m.color} size={40} />}
              title={<span className={m.fresh ? 'font-semibold' : ''}>{m.from}</span>}
              after={<span className="text-footnote">{m.time}</span>}
              text={m.subject}
            />
          ))}
        </List>
      </PullToRefresh>

      <BlockTitle>Accordion</BlockTitle>
      <Block className="text-footnote opacity-60">Tap a question to reveal its answer.</Block>
      <List strong inset>
        <ListItem title="One open at a time" after={<Toggle checked={single} onChange={() => setSingle(!single)} />} />
      </List>
      <Accordion key={String(single)} items={FAQ} single={single} defaultOpen={[0]} />

      <AppTabbar active="content" />
    </Page>
  )
}
