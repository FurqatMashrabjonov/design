import { useEffect, useRef, useState } from 'react'
import { Page, Navbar, BlockTitle, Block, List, ListItem, Toggle, Button } from 'konsta/react'
import { Archive, Trash2, Pin, Star, Plus } from 'lucide-react'
import { AppTabbar, Avatar, Meter } from '@od/kit'

const C = { coral: '#ff6b5e', violet: '#8e5cf7', teal: '#14b8a6', amber: '#ff9f0a', sky: '#0a84ff', pink: '#ff375f', green: '#30d158' }
const STAR = '#ff9f0a'
const MUTED = 'rgba(120,120,128,.28)'

// A one-shot transform animation that reduced motion skips (Web Animations, so no stylesheet is needed).
const play = (el, frames, ms = 240) => {
  if (!el || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  el.animate(frames, { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' })
}

/* ───────── SwipeRow ───────── */

const ACTION_W = 76

/** A row of a `List` that drags sideways to reveal actions. `right` shows on a left drag (a full swipe runs the last one),
 *  `left` on a right drag. Actions: `{ label, icon, color, onClick }`. `open` false closes it (one row open at a time). */
function SwipeRow({ children, left = [], right = [], open = true, onOpenChange, onClick }) {
  const [x, setX] = useState(0)
  const [drag, setDrag] = useState(false)
  const [gone, setGone] = useState(false)
  const box = useRef(null)
  const g = useRef(null)
  const rw = right.length * ACTION_W
  const lw = left.length * ACTION_W

  useEffect(() => { if (!open) setX(0) }, [open])

  const settle = (nx, isOpen) => { setX(nx); onOpenChange?.(isOpen) }
  const run = (a) => {
    setGone(true)
    setTimeout(() => a.onClick?.(), 260)
  }

  const down = (e) => { g.current = { x0: e.clientX, y0: e.clientY, base: x, moved: false, nx: x } }
  const move = (e) => {
    const s = g.current
    if (!s) return
    const dx = e.clientX - s.x0
    if (!s.moved) {
      if (Math.abs(dx) < 8) return
      if (Math.abs(e.clientY - s.y0) > Math.abs(dx)) { g.current = null; return } // a scroll, not a swipe
      s.moved = true
      setDrag(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    let nx = s.base + dx
    const w = box.current?.offsetWidth ?? 360
    if (nx > 0) nx = left.length ? Math.min(nx, lw + (nx - lw) * 0.3) : nx * 0.15
    if (nx < 0 && !right.length) nx *= 0.15
    s.nx = Math.max(nx, -w)
    setX(s.nx)
  }
  const up = () => {
    const s = g.current
    g.current = null
    setDrag(false)
    if (!s) return
    if (!s.moved) {
      if (x !== 0) settle(0, false)
      else onClick?.()
      return
    }
    const w = box.current?.offsetWidth ?? 360
    if (right.length && s.nx < -w * 0.6) { setX(-w); run(right[right.length - 1]) }
    else if (right.length && s.nx < -rw / 2) settle(-rw, true)
    else if (left.length && s.nx > lw / 2) settle(lw, true)
    else settle(0, false)
  }

  const reveal = x < 0 ? right : left
  const width = Math.abs(x)
  const full = x < 0 && width > rw + 48
  return (
    <li className={`group grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-out ${gone ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'}`}>
      <div ref={box} className="relative overflow-hidden min-h-0">
        {width > 0 && (
          <div className={`absolute inset-y-0 flex ${x < 0 ? 'right-0 flex-row' : 'left-0'}`} style={{ width: Math.max(width, x < 0 ? rw : lw) }}>
            {reveal.map((a, i) => {
              const Icon = a.icon
              const last = i === reveal.length - 1
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => (x < 0 && last ? (setX(-(box.current?.offsetWidth ?? 360)), run(a)) : (settle(0, false), a.onClick?.()))}
                  className={`flex flex-col items-center justify-center gap-1 text-white text-caption1 font-semibold overflow-hidden`}
                  style={{ background: a.color, flex: full ? (last ? 1 : 0) : 1, minWidth: 0 }}
                >
                  <span className={`flex flex-col items-center gap-1 ${full && last ? 'mr-auto ml-6' : ''}`} style={{ width: ACTION_W }}>
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                    {a.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <div
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className={`relative bg-card select-none ${drag ? '' : 'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out'}`}
          style={{ transform: `translateX(${x}px)`, touchAction: 'pan-y' }}
        >
          {children}
          <span className="absolute bottom-0 right-0 left-[72px] h-px bg-line group-last:hidden" />
        </div>
      </div>
    </li>
  )
}

const INBOX = [
  { id: 1, from: 'Maya Lopez', color: C.coral, time: '9:41', subject: 'Saturday hike — still on?', preview: 'Weather looks perfect. Meet at the trailhead at 7, I’ll bring coffee for everyone.', unread: true },
  { id: 2, from: 'Sam Carter', color: C.sky, time: '8:15', subject: 'Photos from the lake', preview: 'Uploaded the whole album. The sunset ones came out unreal, take a look when you can.', unread: true },
  { id: 3, from: 'Priya Nair', color: C.violet, time: 'Yesterday', subject: 'Book club pick for May', preview: 'Voting closes Friday. My money is on Tomorrow, and Tomorrow, and Tomorrow.' },
  { id: 4, from: 'Leo Park', color: C.teal, time: 'Mon', subject: 'Re: rooftop dinner', preview: 'Booked a table for six at 8. They have a heater now, so no excuses this time.' },
]

function Inbox() {
  const [mail, setMail] = useState(INBOX)
  const [openId, setOpenId] = useState(null)
  const [pinned, setPinned] = useState([])
  const remove = (id) => setMail((m) => m.filter((x) => x.id !== id))
  return (
    <>
      <List strong inset className="!my-0">
        {mail.map((m) => (
          <SwipeRow
            key={m.id}
            open={openId === m.id}
            onOpenChange={(o) => setOpenId(o ? m.id : null)}
            left={[{ label: pinned.includes(m.id) ? 'Unpin' : 'Pin', icon: Pin, color: 'var(--color-primary)', onClick: () => setPinned((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id])) }]}
            right={[
              { label: 'Archive', icon: Archive, color: '#ff9500', onClick: () => remove(m.id) },
              { label: 'Delete', icon: Trash2, color: '#ff3b30', onClick: () => remove(m.id) },
            ]}
          >
            <div className="flex gap-3 pl-4 pr-4 py-3">
              <div className="relative pt-0.5">
                <Avatar name={m.from} color={m.color} size={44} />
                {m.unread && <span className="absolute -left-2.5 top-[19px] w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-headline truncate flex-1">{m.from}</span>
                  {pinned.includes(m.id) && <Pin className="w-3.5 h-3.5 shrink-0 self-center text-primary" fill="currentColor" />}
                  <span className="text-footnote opacity-50 shrink-0">{m.time}</span>
                </div>
                <div className={`text-subhead truncate ${m.unread ? 'font-semibold' : ''}`}>{m.subject}</div>
                <div className="text-subhead opacity-60 line-clamp-2">{m.preview}</div>
              </div>
            </div>
          </SwipeRow>
        ))}
      </List>
      {mail.length < INBOX.length && (
        <Block className="!my-2 text-center">
          <Button inline clear small rounded className="mx-auto" onClick={() => { setMail(INBOX); setOpenId(null) }}>Restore inbox</Button>
        </Block>
      )}
    </>
  )
}

/* ───────── Rating ───────── */

/** Five stars. Read-only with half stars (`value` 0–5); pass `onChange` to make it an input (tap 1–5). `count` adds "· N reviews". */
function Rating({ value, count, onChange, size = 18 }) {
  const refs = useRef([])
  const input = !!onChange
  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.max(0, Math.min(1, value - i))
    const shown = input ? (i < value ? 1 : 0) : fill >= 0.75 ? 1 : fill >= 0.25 ? 0.5 : 0
    const star = (
      <span ref={(el) => (refs.current[i] = el)} className="relative inline-flex" style={{ width: size, height: size }}>
        <Star className="absolute inset-0" style={{ width: size, height: size, color: MUTED }} fill={MUTED} strokeWidth={0} />
        {shown > 0 && (
          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${shown * 100}%` }}>
            <Star style={{ width: size, height: size, color: STAR }} fill={STAR} strokeWidth={0} />
          </span>
        )}
      </span>
    )
    if (!input) return <span key={i}>{star}</span>
    return (
      <button
        key={i}
        type="button"
        aria-label={`${i + 1} star${i ? 's' : ''}`}
        aria-pressed={i < value}
        className="flex items-center justify-center w-11 h-11 -mx-0.5"
        onClick={() => {
          onChange(i + 1)
          refs.current.slice(0, i + 1).forEach((el, k) => setTimeout(() => play(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], 260), k * 35))
        }}
      >
        {star}
      </button>
    )
  })
  return (
    <div className="flex items-center gap-1.5" role={input ? 'radiogroup' : 'img'} aria-label={input ? 'Your rating' : `${value} out of 5`}>
      <div className={`flex ${input ? '' : 'gap-0.5'}`}>{stars}</div>
      {count != null && <span className="text-footnote opacity-60 tabular-nums"><span className="font-semibold opacity-100">{value.toFixed(1)}</span> · {count.toLocaleString('en-US')} reviews</span>}
    </div>
  )
}

/** The App Store summary: the average large, then one bar per star count. `dist` is five counts, 5★ first. */
function RatingSummary({ value, dist }) {
  const total = dist.reduce((a, b) => a + b, 0)
  const max = Math.max(...dist)
  return (
    <div className="flex items-center gap-5">
      <div className="text-center shrink-0 w-24">
        <div className="text-figure tabular-nums">{value.toFixed(1)}</div>
        <div className="flex justify-center mt-1.5"><Rating value={value} size={13} /></div>
        <div className="text-caption1 opacity-60 mt-1">{total.toLocaleString('en-US')} ratings</div>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        {dist.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-caption1 opacity-60 w-3 text-right tabular-nums">{5 - i}</span>
            <div className="flex-1"><Meter value={n / max} color={STAR} height={6} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Ratings() {
  const [mine, setMine] = useState(4)
  const labels = ['', 'Not for me', 'It’s okay', 'Good', 'Really good', 'Loved it']
  return (
    <List strong inset className="!my-0">
      <li className="px-4 py-4 border-b border-line">
        <RatingSummary value={4.6} dist={[912, 241, 78, 31, 22]} />
      </li>
      <li className="px-4 py-3.5 border-b border-line">
        <div className="text-headline">Alpine Lodge Retreat</div>
        <div className="mt-1"><Rating value={4.6} count={1284} /></div>
      </li>
      <li className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-headline">Rate your stay</span>
          <span className="text-subhead opacity-60">{labels[mine]}</span>
        </div>
        <div className="-ml-1.5 mt-1"><Rating value={mine} onChange={setMine} size={30} /></div>
      </li>
    </List>
  )
}

/* ───────── AvatarStack ───────── */

/** Overlapping avatars, `max` shown then a "+N" bubble. `ring` is the colour of what it sits on, so the overlaps read as cut-outs. */
function AvatarStack({ people, max = 4, size = 36, ring = 'var(--color-card)' }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  const edge = { boxShadow: `0 0 0 2.5px ${ring}`, marginLeft: -size * 0.22 }
  return (
    <div className="flex items-center shrink-0" aria-label={`${people.length} people`}>
      {shown.map((p, i) => (
        <span key={p.name} className="block shrink-0 rounded-full" style={i ? edge : { boxShadow: edge.boxShadow, marginLeft: 0 }}>
          <Avatar name={p.name} color={p.color} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span className="shrink-0 rounded-full flex items-center justify-center bg-card-2 text-caption1 font-semibold tabular-nums" style={{ ...edge, width: size, height: size }}>
          +{extra}
        </span>
      )}
    </div>
  )
}

const GOING = ['Maya Lopez', 'Sam Carter', 'Priya Nair', 'Leo Park', 'Ana Silva', 'Ben Ito', 'Chloe Hart', 'Dev Rao', 'Eli Moss', 'Fay Kim', 'Gus Lee', 'Hana Oto', 'Ivy Chen', 'Jon Bay', 'Kai Roe', 'Lia Voss']
  .map((name, i) => ({ name, color: Object.values(C)[i % 7] }))

function EventCard() {
  const [going, setGoing] = useState(false)
  const people = going ? [{ name: 'You Me', color: C.green }, ...GOING] : GOING
  const caption = going ? <>You, <b className="font-semibold">Maya</b> and {GOING.length - 1} others are going</> : <><b className="font-semibold">Maya</b>, <b className="font-semibold">Sam</b> and {GOING.length - 2} others are going</>
  return (
    <List strong inset className="!my-0">
      <li className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 shrink-0 rounded-xl overflow-hidden text-center bg-card-2">
            <div className="bg-primary text-white text-caption2 font-bold py-0.5 tracking-wide">MAY</div>
            <div className="text-title3 py-1 tabular-nums">17</div>
          </div>
          <div className="min-w-0">
            <div className="text-headline">Rooftop Jazz Night</div>
            <div className="text-subhead opacity-60">Fri · 8:00 PM · The Standard</div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <AvatarStack people={people} max={4} size={36} />
          <p className="text-footnote opacity-70 min-w-0 flex-1 leading-snug">{caption}</p>
        </div>
        <Button rounded tonal={going} className="mt-4" onClick={() => setGoing((v) => !v)}>{going ? 'You’re going ✓' : 'I’m going'}</Button>
      </li>
    </List>
  )
}

/* ───────── Stories ───────── */

/** A row of story circles: a gradient ring (accent → the story's colour) until seen, then grey. `me` puts the "+" circle first. */
function Stories({ items, me, onOpen, onAdd }) {
  const [seen, setSeen] = useState(() => new Set(items.filter((s) => s.seen).map((s) => s.id)))
  const SIZE = 68
  const circle = (ring, inner) => (
    <span className="rounded-full p-[2.5px] block" style={{ background: ring, width: SIZE, height: SIZE }}>
      <span className="rounded-full p-[2.5px] bg-page block w-full h-full">{inner}</span>
    </span>
  )
  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x scroll-px-4">
      {me && (
        <button type="button" onClick={onAdd} aria-label="Add to your story" className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 snap-start">
          <span className="relative block" style={{ width: SIZE, height: SIZE }}>
            {circle('transparent', <Avatar name={me.name} color={me.color} size={SIZE - 10} />)}
            <span className="absolute right-0 bottom-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center" style={{ boxShadow: '0 0 0 2.5px var(--color-page)' }}>
              <Plus className="w-4 h-4" strokeWidth={3} />
            </span>
          </span>
          <span className="text-caption1 opacity-60 w-full truncate text-center">Your story</span>
        </button>
      )}
      {items.map((s) => {
        const isSeen = seen.has(s.id)
        return (
          <button
            key={s.id}
            type="button"
            aria-label={`${s.name}’s story${isSeen ? ', seen' : ''}`}
            onClick={(e) => {
              play(e.currentTarget.firstChild, [{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1)' }], 220)
              setSeen((p) => new Set(p).add(s.id))
              onOpen?.(s)
            }}
            className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 snap-start"
          >
            <span className="block">
              {circle(isSeen ? MUTED : `linear-gradient(45deg, ${s.color}, var(--color-primary))`, <Avatar name={s.name} color={s.color} size={SIZE - 10} />)}
            </span>
            <span className={`text-caption1 w-full truncate text-center ${isSeen ? 'opacity-50' : ''}`}>{s.name.split(' ')[0]}</span>
          </button>
        )
      })}
    </div>
  )
}

const STORIES = [
  { id: 'maya', name: 'Maya Lopez', color: C.coral },
  { id: 'sam', name: 'Sam Carter', color: C.amber },
  { id: 'alexandra', name: 'Alexandra Whitfield', color: C.pink },
  { id: 'priya', name: 'Priya Nair', color: C.violet },
  { id: 'leo', name: 'Leo Park', color: C.teal, seen: true },
  { id: 'ana', name: 'Ana Silva', color: C.sky, seen: true },
]

/* ───────── CodeInput ───────── */

/** A one-time code: `length` boxes that advance as you type, step back on backspace and take a pasted code whole.
 *  `error` turns them red and shakes the row once. */
function CodeInput({ length = 6, value, onChange, error }) {
  const refs = useRef([])
  const row = useRef(null)
  const [focus, setFocus] = useState(null)
  const digits = value.split('')

  useEffect(() => {
    if (error) play(row.current, [0, -10, 9, -7, 5, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })), 420)
  }, [error])

  const set = (v, at) => {
    const clean = v.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    refs.current[Math.min(at ?? clean.length, length - 1)]?.focus()
  }
  const type = (i, ch) => {
    const d = ch.replace(/\D/g, '')
    if (!d) return
    if (d.length > 1) return set(d) // autofill drops the whole code into one box
    const next = (value.slice(0, i) + d + value.slice(i + 1)).slice(0, length)
    set(next, i + 1)
  }
  const key = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[i]) set(value.slice(0, i) + value.slice(i + 1), i)
      else if (i > 0) set(value.slice(0, i - 1) + value.slice(i), i - 1)
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1].focus()
    else if (e.key === 'ArrowRight' && i < value.length) refs.current[i + 1]?.focus()
  }
  // The box you type into next is lit even before focus, so the row always says where the code goes.
  const active = focus ?? (value.length < length ? value.length : -1)

  return (
    <div ref={row} className="flex justify-center gap-2">
      {Array.from({ length }, (_, i) => {
        const filled = !!digits[i]
        const lit = i === active && !error
        const border = error ? '#ff3b30' : lit ? 'var(--color-primary)' : filled ? 'color-mix(in oklab, var(--color-primary) 35%, var(--color-line))' : 'var(--color-line)'
        return (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={digits[i] ?? ''}
            onChange={(e) => type(i, e.target.value.slice(digits[i] ? 1 : 0) || e.target.value)}
            onKeyDown={(e) => key(i, e)}
            onPaste={(e) => { e.preventDefault(); set(e.clipboardData.getData('text')) }}
            onFocus={(e) => { setFocus(i); e.target.select() }}
            onBlur={() => setFocus(null)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={length}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error || undefined}
            className={`w-12 h-14 rounded-xl bg-card text-center text-title2 tabular-nums caret-transparent outline-none border-2 motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150 ${error ? 'text-[#ff3b30]' : ''}`}
            style={{ borderColor: border, boxShadow: lit ? '0 0 0 4px color-mix(in oklab, var(--color-primary) 18%, transparent)' : 'none' }}
          />
        )
      })}
    </div>
  )
}

function Verify() {
  const [code, setCode] = useState('481')
  const [error, setError] = useState(false)
  const [left, setLeft] = useState(42)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return (
    <>
      <Block className="!my-0">
        <div className="text-center mb-4">
          <div className="text-headline">Enter the code</div>
          <div className="text-subhead opacity-60 mt-0.5">Sent to +1 (415) 555‑0132</div>
        </div>
        <CodeInput length={6} value={code} onChange={(v) => { setCode(v); setError(false) }} error={error} />
        <div className="text-center mt-4 h-11 flex items-center justify-center">
          {error ? (
            <span className="text-footnote font-medium" style={{ color: '#ff3b30' }}>That code didn’t work. Try again.</span>
          ) : left > 0 ? (
            <span className="text-footnote opacity-60 tabular-nums">Resend code in 0:{String(left).padStart(2, '0')}</span>
          ) : (
            <Button clear small inline rounded onClick={() => setLeft(42)}>Resend code</Button>
          )}
        </div>
      </Block>
      <List strong inset className="!mt-2 !mb-0">
        <ListItem title="Show error state" after={<Toggle checked={error} onChange={() => setError((v) => !v)} />} />
      </List>
    </>
  )
}

/* ───────── Screen ───────── */

function Section({ title, about, children }) {
  return (
    <section className="mb-8">
      <BlockTitle className="!mb-1">{title}</BlockTitle>
      <Block className="!mt-1 !mb-3 text-footnote opacity-60">{about}</Block>
      {children}
    </section>
  )
}

export default function Screen() {
  return (
    <Page className="pb-32">
      <Navbar large title="Social" />
      <Section title="SwipeRow" about="Swipe left to archive or delete, right to pin.">
        <Inbox />
      </Section>
      <Section title="Rating" about="Half-star display, tap-to-rate input and a summary.">
        <Ratings />
      </Section>
      <Section title="AvatarStack" about="Overlapping faces, an overflow count, who is going.">
        <EventCard />
      </Section>
      <Section title="Stories" about="Gradient ring until seen; tap one to watch it.">
        <Stories items={STORIES} me={{ name: 'You Me', color: C.green }} />
      </Section>
      <Section title="CodeInput" about="Type, backspace or paste the whole code.">
        <Verify />
      </Section>
      <AppTabbar active="social" />
    </Page>
  )
}
