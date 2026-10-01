import { useState, useEffect, useRef } from 'react'
import { Page, Navbar, NavbarBackLink, BlockTitle, List, ListItem, Toggle } from 'konsta/react'
import { Pause, Play, Square, Heart, Volume2, MapPin } from 'lucide-react'
import { useNav, Photo, Tile, Meter, tint } from '@od/kit'

const C = {"easyRun":"#3b82f6","tempo":"#10b981","intervals":"#f59e0b","longRun":"#8b5cf6","rest":"#ef4444"}

const RUN = {
  elapsed: 21 * 60 + 14,
  distance: 3.68,
  pace: 5 * 60 + 41,
  target: 5 * 60 + 45,
  hr: 164,
  route: 'Ribeira das Naus → Cais do Sodré',
}
const SEGMENTS = [
  { name: 'Warm-up', detail: '1 km easy', emoji: '🟢', color: C.easyRun, done: 1, total: 1 },
  { name: 'Tempo', detail: '4 km at 5:45/km', emoji: '🔥', color: C.tempo, done: 2.68, total: 4 },
  { name: 'Cool-down', detail: '1 km easy', emoji: '🟢', color: C.easyRun, done: 0, total: 1 },
]
const ROUTE = 'M24 214 C 70 200, 96 176, 132 170 S 190 150, 214 128 S 262 92, 292 96'

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Screen() {
  const nav = useNav()
  const [secs, setSecs] = useState(RUN.elapsed)
  const [paused, setPaused] = useState(false)
  const [coach, setCoach] = useState(true)
  const [hold, setHold] = useState(0)
  const timer = useRef(null)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => () => clearInterval(timer.current), [])

  const startHold = () => {
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      setHold((h) => {
        const n = h + 0.04
        if (n >= 1) {
          clearInterval(timer.current)
          nav.push('run-summary')
          return 1
        }
        return n
      })
    }, 30)
  }
  const endHold = () => {
    clearInterval(timer.current)
    setHold((h) => (h >= 1 ? h : 0))
  }

  const lo = RUN.target - 20
  const hi = RUN.target + 20
  const pos = (RUN.pace - lo) / (hi - lo)
  const ahead = RUN.target - RUN.pace

  return (
    <Page className="pb-40">
      <Navbar
        title="Tempo Run"
        subtitle="Thu 1 Oct · 6 km"
        left={<NavbarBackLink showText={false} onClick={nav.pop} />}
      />

      <Photo q="Lisbon riverside street map" className="relative w-full h-64">
        <div className="absolute inset-0 bg-black/15" />
        <svg viewBox="0 0 320 256" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d={ROUTE} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="9" strokeLinecap="round" />
          <path d={ROUTE} fill="none" stroke={C.tempo} strokeWidth="6" strokeLinecap="round" />
          <circle cx="24" cy="214" r="6" fill="#fff" stroke={C.tempo} strokeWidth="3" />
        </svg>
        <div className="absolute" style={{ left: '91.25%', top: '37.5%', transform: 'translate(-50%,-50%)' }}>
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: C.tempo, opacity: 0.5 }} />
          <span className="relative block w-5 h-5 rounded-full border-[3px] border-white shadow-lg" style={{ background: C.tempo }} />
        </div>
        <div className="absolute bottom-0 inset-x-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/70 flex items-center gap-2 text-white">
          <MapPin className="w-4 h-4" />
          <span className="text-footnote font-medium truncate">{RUN.route}</span>
        </div>
      </Photo>

      <div className="px-4 pt-5 text-center vs-rise">
        <div className="text-caption1 uppercase tracking-wide text-black/55 dark:text-white/55">
          {paused ? 'Paused' : 'Elapsed time'}
        </div>
        <div
          className="font-bold tabular-nums leading-none mt-1"
          style={{ fontSize: 76, letterSpacing: '-0.03em', opacity: paused ? 0.5 : 1 }}
        >
          {mmss(secs)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 mt-5">
        {[
          ['Distance', RUN.distance.toFixed(2), 'km', C.tempo],
          ['Current pace', mmss(RUN.pace), '/km', C.tempo],
        ].map(([k, v, u, col], i) => (
          <div key={k} className="bg-card rounded-card p-4 vs-rise" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <div className="text-footnote text-black/55 dark:text-white/55">{k}</div>
            <div className="text-title1 tabular-nums mt-1" style={{ color: col }}>
              {v}
              <span className="text-subhead font-medium text-black/55 dark:text-white/55"> {u}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-3 bg-card rounded-card p-4 vs-rise" style={{ animationDelay: '180ms' }}>
        <div className="flex items-baseline justify-between">
          <span className="text-headline">Target pace {mmss(RUN.target)}/km</span>
          <span className="text-subhead font-semibold" style={{ color: C.tempo }}>
            {ahead > 0 ? `${ahead}s ahead` : `${-ahead}s behind`}
          </span>
        </div>
        <div className="relative h-3 rounded-full mt-4" style={{ background: tint(C.tempo, 18) }}>
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{ left: `${pos * 100}%`, width: `${(0.5 - pos) * 100}%`, background: C.tempo }}
          />
          <div className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-black/60 dark:bg-white/70" style={{ left: '50%' }} />
          <div
            className="absolute top-1/2 w-5 h-5 rounded-full border-[3px] border-white shadow"
            style={{ left: `${pos * 100}%`, transform: 'translate(-50%,-50%)', background: C.tempo }}
          />
        </div>
        <div className="flex justify-between mt-2 text-caption2 text-black/55 dark:text-white/55">
          <span>Faster · {mmss(lo)}</span>
          <span>Slower · {mmss(hi)}</span>
        </div>
      </div>

      <BlockTitle>Workout</BlockTitle>
      <List strong inset dividers>
        {SEGMENTS.map((s) => {
          const active = s.done > 0 && s.done < s.total
          return (
            <ListItem
              key={s.name}
              title={<span className={s.done === 0 ? 'opacity-55' : ''}>{s.name}</span>}
              subtitle={s.detail}
              media={<Tile tinted color={s.color} size={36}><span className="text-lg">{s.emoji}</span></Tile>}
              after={
                active ? (
                  <div className="w-24 text-right">
                    <div className="text-footnote font-semibold tabular-nums" style={{ color: s.color }}>
                      {s.done.toFixed(2)} / {s.total} km
                    </div>
                    <div className="mt-1"><Meter value={s.done / s.total} color={s.color} height={6} /></div>
                  </div>
                ) : (
                  <span className="text-footnote font-semibold" style={{ color: s.done ? s.color : undefined }}>
                    {s.done ? 'Done ✓' : 'Up next'}
                  </span>
                )
              }
            />
          )
        })}
      </List>

      <List strong inset dividers>
        <ListItem
          title="Heart rate"
          subtitle="Polar H10 · Zone 4"
          media={<Tile color={C.rest}><Heart className="w-4 h-4" /></Tile>}
          after={<span className="text-headline tabular-nums" style={{ color: C.rest }}>{RUN.hr} <span className="text-footnote opacity-70">bpm</span></span>}
        />
        <ListItem
          title="Coach Ana"
          subtitle="Audio cue every 1 km"
          media={<Tile color="#5e5ce6"><Volume2 className="w-4 h-4" /></Tile>}
          after={<Toggle checked={coach} onChange={() => setCoach(!coach)} />}
        />
      </List>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-card border-t border-line px-4 pt-3 pb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPaused(!paused)}
            className="w-16 h-16 shrink-0 rounded-full flex items-center justify-center bg-card-2 active:scale-95 transition"
            aria-label={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play className="w-7 h-7" fill="currentColor" /> : <Pause className="w-7 h-7" fill="currentColor" />}
          </button>
          <button
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onContextMenu={(e) => e.preventDefault()}
            className="relative flex-1 h-16 rounded-full overflow-hidden bg-primary text-white select-none active:scale-[0.98] transition"
          >
            <span className="absolute inset-y-0 left-0 bg-black/25" style={{ width: `${hold * 100}%` }} />
            <span className="relative flex items-center justify-center gap-2 text-headline">
              <Square className="w-4 h-4" fill="currentColor" />
              {hold > 0 ? 'Keep holding…' : 'Hold to finish'}
            </span>
          </button>
        </div>
      </div>
    </Page>
  )
}
