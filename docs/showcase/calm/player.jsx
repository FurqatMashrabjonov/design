import { useState, useEffect } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Toggle, Range } from 'konsta/react'
import { ChevronDown, RotateCcw, RotateCw, Play, Pause, Heart, Volume1, Volume2, Timer, Wind } from 'lucide-react'
import { useNav, Ring, Photo, Tile, tint } from '@od/kit'

const C = {"sleep":"#c99a3e","anxiety":"#c07580","focus":"#5f9e94","breathing":"#8a7bb0","stories":"#d0845a"}

const SESSION = { title: 'Unwind After Work', guide: 'Elena Ward', emoji: '🌅', category: 'Anxiety', color: C.anxiety, photo: 'dusk over quiet lake', total: 600, elapsed: 222 }
const SOUNDS = [
  { id: 'Rain', emoji: '🌧️', color: C.breathing },
  { id: 'Ocean', emoji: '🌊', color: C.focus },
  { id: 'Forest', emoji: '🌲', color: C.sleep },
]
const UP_NEXT = [
  { title: 'Panic Pause', min: 3, guide: 'Jonah Okafor', emoji: '🌊', color: C.anxiety, photo: 'waves on smooth stones' },
  { title: '4-7-8 Wind Down', min: 8, guide: 'Jonah Okafor', emoji: '💨', color: C.breathing, photo: 'candle in dark room' },
  { title: 'Falling Asleep Gently', min: 20, guide: 'Elena Ward', emoji: '🌙', color: C.sleep, photo: 'moonlit bedroom window' },
]

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function Screen() {
  const nav = useNav()
  const [playing, setPlaying] = useState(true)
  const [elapsed, setElapsed] = useState(SESSION.elapsed)
  const [ambientOn, setAmbientOn] = useState(true)
  const [sound, setSound] = useState('Rain')
  const [volume, setVolume] = useState(35)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setElapsed((e) => Math.min(SESSION.total, e + 1)), 1000)
    return () => clearInterval(t)
  }, [playing])

  const skip = (d) => setElapsed((e) => Math.max(0, Math.min(SESSION.total, e + d)))
  const remaining = SESSION.total - elapsed

  return (
    <Page className="pb-12">
      <Navbar
        transparent
        title="Now Playing"
        left={<Link iconOnly onClick={nav.pop} aria-label="Close player"><ChevronDown className="w-6 h-6" /></Link>}
        right={<Link iconOnly onClick={() => setLiked(!liked)} aria-label="Save to favourites"><Heart className={`w-6 h-6 ${liked ? 'vs-bounce' : ''}`} style={liked ? { color: SESSION.color, fill: SESSION.color } : undefined} /></Link>}
      />

      <div className="px-6 pt-2 vs-rise">
        <Photo q={SESSION.photo} className="w-full h-56 rounded-[28px]" alt="Dusk over a quiet lake" />
      </div>

      <div className="px-6 mt-5 text-center vs-rise" style={{ animationDelay: '60ms' }}>
        <span className="inline-block text-caption1 font-semibold px-3 py-1 rounded-full" style={{ background: tint(SESSION.color), color: SESSION.color }}>
          {SESSION.category} · 10 min
        </span>
        <h1 className="text-title2 mt-2 truncate">{SESSION.title}</h1>
        <p className="text-subhead text-black/55 dark:text-white/55">with {SESSION.guide}</p>
      </div>

      <div className="flex justify-center mt-6 vs-rise" style={{ animationDelay: '120ms' }}>
        <Ring value={elapsed / SESSION.total} size={190} stroke={12} color={SESSION.color}>
          <div className="text-center">
            <div className="text-figure tabular-nums">{fmt(elapsed)}</div>
            <div className="text-footnote text-black/55 dark:text-white/55">of {fmt(SESSION.total)}</div>
            <div className="text-caption1 mt-1" style={{ color: SESSION.color }}>{fmt(remaining)} left</div>
          </div>
        </Ring>
      </div>

      <div className="flex items-center justify-center gap-10 mt-6">
        <button className="w-14 h-14 rounded-full flex flex-col items-center justify-center bg-card" onClick={() => skip(-15)} aria-label="Back 15 seconds">
          <RotateCcw className="w-5 h-5" />
          <span className="text-caption2 font-semibold">15</span>
        </button>
        <button className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-95 transition" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
        </button>
        <button className="w-14 h-14 rounded-full flex flex-col items-center justify-center bg-card" onClick={() => skip(15)} aria-label="Forward 15 seconds">
          <RotateCw className="w-5 h-5" />
          <span className="text-caption2 font-semibold">15</span>
        </button>
      </div>

      <BlockTitle>Ambient sound</BlockTitle>
      <List strong inset>
        <ListItem
          title="Play in background"
          subtitle={ambientOn ? `${sound} · soft volume` : 'Off'}
          media={<Tile color={C.breathing}><Wind className="w-4 h-4" /></Tile>}
          after={<Toggle checked={ambientOn} onChange={() => setAmbientOn(!ambientOn)} />}
        />
      </List>
      <div className={`grid grid-cols-3 gap-3 px-4 transition-opacity ${ambientOn ? '' : 'opacity-40 pointer-events-none'}`}>
        {SOUNDS.map((s, i) => {
          const on = sound === s.id
          return (
            <button
              key={s.id}
              onClick={() => setSound(s.id)}
              className={`rounded-card p-3 flex flex-col items-center gap-2 bg-card vs-rise ${on ? 'ring-2' : ''}`}
              style={{ animationDelay: `${i * 60}ms`, ...(on ? { background: tint(s.color, 20), '--tw-ring-color': s.color } : {}) }}
            >
              <Tile color={s.color} tinted size={40}><span className="text-xl">{s.emoji}</span></Tile>
              <span className="text-subhead font-semibold">{s.id}</span>
            </button>
          )
        })}
      </div>
      <div className={`mx-4 mt-3 rounded-card bg-card px-4 py-2 flex items-center gap-3 ${ambientOn ? '' : 'opacity-40 pointer-events-none'}`}>
        <Volume1 className="w-5 h-5 opacity-60" />
        <div className="flex-1">
          <Range value={volume} min={0} max={100} step={1} onChange={(e) => setVolume(Number(e.target.value))} />
        </div>
        <Volume2 className="w-5 h-5 opacity-60" />
      </div>

      <BlockTitle>Session</BlockTitle>
      <List strong inset>
        <ListItem title="Sleep timer" after="45 min" media={<Tile color={C.sleep}><Timer className="w-4 h-4" /></Tile>} />
        <ListItem title="Mood before" after="😐 Okay" media={<Tile color={C.anxiety} tinted><span>{SESSION.emoji}</span></Tile>} />
      </List>

      <BlockTitle>Up next</BlockTitle>
      <List strong inset>
        {UP_NEXT.map((u) => (
          <ListItem
            key={u.title}
            title={<span className="truncate">{u.title}</span>}
            subtitle={u.guide}
            media={<Photo q={u.photo} className="w-14 h-14 rounded-2xl" alt={u.title} />}
            after={<span className="text-subhead font-semibold" style={{ color: u.color }}>{u.min} min</span>}
          />
        ))}
      </List>
      <Block className="text-center">
        <p className="text-footnote text-black/55 dark:text-white/55">Breathe slowly. There is nowhere else to be.</p>
      </Block>
    </Page>
  )
}
