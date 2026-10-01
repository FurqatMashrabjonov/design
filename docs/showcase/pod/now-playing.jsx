import { useState } from 'react'
import { Page, List, ListItem, Button, Sheet, Actions, ActionsGroup, ActionsButton, ActionsLabel, BlockTitle, Toast } from 'konsta/react'
import { ChevronDown, Play, Pause, RotateCcw, RotateCw, Moon, Airplay, ListMusic, Share, ListOrdered, ChevronRight } from 'lucide-react'
import { useNav, Photo, Glow, Tile, tint } from '@od/kit'

const C = {"tech":"#22d3ee","trueCrime":"#f97316","comedy":"#facc15","news":"#f472b6","science":"#34d399","business":"#818cf8"}

const EP = { show: 'Signal & Noise', host: 'Priya Raman', num: 214, title: 'The Chip War, Explained', released: 'Yesterday · Sep 30', photo: 'neon circuit board', length: 58 * 60 + 38, pos: 32 * 60 + 10 }
const CHAPTERS = [
  { t: 0, name: 'Intro' },
  { t: 4 * 60 + 12, name: 'A tiny transistor' },
  { t: 15 * 60 + 40, name: "Taiwan's foundry bet" },
  { t: 27 * 60 + 5, name: 'Why chips got political' },
  { t: 41 * 60 + 30, name: 'The race for 2nm' },
  { t: 52 * 60 + 18, name: "What's next" },
]
const QUEUE = [
  { show: 'The Missing Hour', title: 'Ep. 41 · The Lighthouse Keeper', len: '54 m', emoji: '⏳', color: C.trueCrime },
  { show: 'Founders After Dark', title: 'Building in a Downturn', len: '47 m', emoji: '🌙', color: C.business },
  { show: 'Deep Field', title: 'Life on Europa?', len: '9 m left', emoji: '🔭', color: C.science },
  { show: 'Signal & Noise', title: '213 · Open Models vs Closed', len: '1 h 4 m', emoji: '💡', color: C.tech },
  { show: 'Morning Brief', title: 'Thursday, Oct 1', len: '18 m', emoji: '📰', color: C.news },
]
const SPEEDS = ['0.8×', '1×', '1.25×', '1.5×', '2×']
const SLEEP = ['Off', '15 minutes', '30 minutes', 'End of episode']

const fmt = (s) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function Screen() {
  const nav = useNav()
  const [pos, setPos] = useState(EP.pos)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState('1.5×')
  const [sleep, setSleep] = useState('End of episode')
  const [speedOpen, setSpeedOpen] = useState(false)
  const [sleepOpen, setSleepOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [airplay, setAirplay] = useState(false)

  const ratio = pos / EP.length
  const current = CHAPTERS.reduce((acc, c, i) => (pos >= c.t ? i : acc), 0)
  const seek = (s) => setPos(Math.max(0, Math.min(EP.length, s)))
  const onScrub = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - r.left) / r.width) * EP.length)
  }

  return (
    <Page className="pb-10 relative overflow-x-hidden">
      {/* blurred cover-colour backdrop */}
      <div className="absolute inset-x-0 top-0 h-[720px] pointer-events-none overflow-hidden">
        <Photo q={EP.photo} className="absolute inset-0 w-full h-full blur-3xl scale-125 opacity-50" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${tint(C.tech, 28)} 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,1) 100%)` }} />
      </div>

      <div className="relative">
        {/* grab handle + top bar */}
        <div className="flex justify-center pt-3"><div className="w-10 h-1.5 rounded-full bg-white/30" /></div>
        <div className="flex items-center justify-between px-4 pt-2">
          <button className="w-11 h-11 flex items-center justify-center rounded-full text-white" onClick={nav.pop} aria-label="Close">
            <ChevronDown className="w-6 h-6" />
          </button>
          <div className="text-center min-w-0">
            <div className="text-caption1 uppercase tracking-wider text-white/60">Playing from Home</div>
            <div className="text-footnote font-semibold text-white truncate">Continue listening</div>
          </div>
          <button className="w-11 h-11 flex items-center justify-center rounded-full text-white" aria-label="Share">
            <Share className="w-5 h-5" />
          </button>
        </div>

        {/* cover hero */}
        <div className="relative flex justify-center px-8 mt-4 vs-rise">
          <Glow color={C.tech} size={300} opacity={0.45} />
          <Photo
            q={EP.photo}
            className={`relative w-full aspect-square rounded-[28px] shadow-2xl transition-transform duration-500 ${playing ? 'scale-100' : 'scale-90'}`}
          >
            <div className="absolute inset-x-0 bottom-0 p-4 rounded-b-[28px] bg-gradient-to-t from-black/70">
              <span className="text-caption1 font-semibold px-2 py-1 rounded-full text-black" style={{ background: C.tech }}>Ep. {EP.num}</span>
            </div>
          </Photo>
        </div>

        {/* title */}
        <div className="px-6 mt-6 vs-rise" style={{ animationDelay: '60ms' }}>
          <div className="text-title2 text-white truncate">{EP.title}</div>
          <button className="flex items-center gap-1 mt-1 min-h-[28px]" onClick={() => nav.push('show-page')}>
            <span className="text-body font-medium" style={{ color: C.tech }}>{EP.show}</span>
            <ChevronRight className="w-4 h-4" style={{ color: C.tech }} />
            <span className="text-subhead text-white/55 ml-1 truncate">· {EP.released}</span>
          </button>
        </div>

        {/* scrubber */}
        <div className="px-6 mt-6 vs-rise" style={{ animationDelay: '120ms' }}>
          <div className="relative h-8 flex items-center cursor-pointer" onClick={onScrub}>
            <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/15" />
            <div className="absolute left-0 h-1.5 rounded-full" style={{ width: `${ratio * 100}%`, background: C.tech, boxShadow: `0 0 12px ${C.tech}` }} />
            {CHAPTERS.slice(1).map((c) => (
              <div key={c.t} className="absolute w-0.5 h-3 rounded-full bg-black/70" style={{ left: `${(c.t / EP.length) * 100}%` }} />
            ))}
            <div className="absolute w-4 h-4 -ml-2 rounded-full bg-card shadow-lg" style={{ left: `${ratio * 100}%` }} />
          </div>
          <div className="flex items-center justify-between text-caption1 tabular-nums text-white/60">
            <span>{fmt(pos)}</span>
            <span className="font-semibold text-white truncate px-2" style={{ color: C.tech }}>{CHAPTERS[current].name}</span>
            <span>−{fmt(EP.length - pos)}</span>
          </div>
        </div>

        {/* transport */}
        <div className="flex items-center justify-center gap-10 mt-5">
          <button className="relative w-14 h-14 flex items-center justify-center text-white" onClick={() => seek(pos - 15)} aria-label="Back 15 seconds">
            <RotateCcw className="w-9 h-9" strokeWidth={1.6} />
            <span className="absolute text-[11px] font-bold mt-0.5">15</span>
          </button>
          <button
            className="w-20 h-20 rounded-full bg-card text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-9 h-9" fill="currentColor" /> : <Play className="w-9 h-9 ml-1" fill="currentColor" />}
          </button>
          <button className="relative w-14 h-14 flex items-center justify-center text-white" onClick={() => seek(pos + 30)} aria-label="Forward 30 seconds">
            <RotateCw className="w-9 h-9" strokeWidth={1.6} />
            <span className="absolute text-[11px] font-bold mt-0.5">30</span>
          </button>
        </div>

        {/* bottom bar */}
        <div className="grid grid-cols-4 gap-2 px-4 mt-6">
          <button className="h-14 rounded-card bg-white/10 flex flex-col items-center justify-center text-white" onClick={() => setSpeedOpen(true)}>
            <span className="text-headline">{speed}</span>
            <span className="text-caption2 text-white/55">Speed</span>
          </button>
          <button className="h-14 rounded-card bg-white/10 flex flex-col items-center justify-center text-white min-w-0" onClick={() => setSleepOpen(true)}>
            <Moon className="w-5 h-5" style={{ color: sleep === 'Off' ? undefined : C.tech }} />
            <span className="text-caption2 text-white/55 truncate max-w-full px-1">{sleep === 'End of episode' ? 'End of ep.' : sleep}</span>
          </button>
          <button className="h-14 rounded-card bg-white/10 flex flex-col items-center justify-center text-white" onClick={() => setAirplay(true)}>
            <Airplay className="w-5 h-5" />
            <span className="text-caption2 text-white/55">AirPlay</span>
          </button>
          <button className="h-14 rounded-card bg-white/10 flex flex-col items-center justify-center text-white" onClick={() => setQueueOpen(true)}>
            <ListMusic className="w-5 h-5" />
            <span className="text-caption2 text-white/55">Queue</span>
          </button>
        </div>

        {/* chapters */}
        <div className="flex items-center justify-between px-4 mt-6">
          <BlockTitle className="!m-0 !px-0 !mb-2">Chapters</BlockTitle>
          <Button clear small inline rounded className="!w-auto" onClick={() => nav.push('episode-detail')}>
            <ListOrdered className="w-4 h-4 mr-1" /> Chapters & notes
          </Button>
        </div>
        <List strong inset dividers className="!mt-2">
          {CHAPTERS.map((c, i) => {
            const on = i === current
            return (
              <ListItem
                key={c.t}
                className="vs-rise"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => seek(c.t)}
                title={<span className={on ? 'font-semibold' : ''} style={on ? { color: C.tech } : undefined}>{c.name}</span>}
                after={<span className="tabular-nums text-subhead">{fmt(c.t)}</span>}
                media={
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-footnote font-semibold" style={{ background: on ? C.tech : 'rgba(255,255,255,0.08)', color: on ? '#000' : undefined }}>
                    {on && playing ? '▶' : i + 1}
                  </div>
                }
              />
            )
          })}
        </List>
      </div>

      {/* speed */}
      <Actions opened={speedOpen} onBackdropClick={() => setSpeedOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>Playback speed</ActionsLabel>
          {SPEEDS.map((s) => (
            <ActionsButton key={s} bold={s === speed} onClick={() => { setSpeed(s); setSpeedOpen(false) }}>{s}{s === speed ? '  ✓' : ''}</ActionsButton>
          ))}
        </ActionsGroup>
        <ActionsGroup><ActionsButton onClick={() => setSpeedOpen(false)}>Cancel</ActionsButton></ActionsGroup>
      </Actions>

      {/* sleep */}
      <Actions opened={sleepOpen} onBackdropClick={() => setSleepOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>Sleep timer</ActionsLabel>
          {SLEEP.map((s) => (
            <ActionsButton key={s} bold={s === sleep} onClick={() => { setSleep(s); setSleepOpen(false) }}>{s}{s === sleep ? '  ✓' : ''}</ActionsButton>
          ))}
        </ActionsGroup>
        <ActionsGroup><ActionsButton onClick={() => setSleepOpen(false)}>Cancel</ActionsButton></ActionsGroup>
      </Actions>

      {/* queue */}
      <Sheet opened={queueOpen} onBackdropClick={() => setQueueOpen(false)} className="pb-8 !bg-page text-black dark:text-white">
        <div className="flex justify-center pt-3"><div className="w-10 h-1.5 rounded-full bg-black/20 dark:bg-white/30" /></div>
        <div className="flex items-baseline justify-between px-4 pt-3">
          <div className="text-title3 text-black dark:text-white">Up Next</div>
          <div className="text-subhead text-black/55 dark:text-white/55">3 h 41 m</div>
        </div>
        <List strong inset dividers className="!bg-card">
          {QUEUE.map((q) => (
            <ListItem
              key={q.title}
              className="!bg-card"
              title={<span className="truncate text-headline text-black dark:text-white">{q.title}</span>}
              subtitle={<span className="text-subhead text-black/60 dark:text-white/60">{q.show}</span>}
              after={<span className="text-footnote font-semibold" style={{ color: q.color }}>{q.len}</span>}
              media={<Tile color={q.color} tinted size={40}><span className="text-xl">{q.emoji}</span></Tile>}
            />
          ))}
        </List>
      </Sheet>

      <Toast opened={airplay} button={<Button clear small inline onClick={() => setAirplay(false)}>OK</Button>}>
        <span className="text-subhead">Connecting to Living Room speaker…</span>
      </Toast>
    </Page>
  )
}
