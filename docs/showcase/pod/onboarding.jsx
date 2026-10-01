import { useState } from 'react'
import { Page, Button, Block, Link } from 'konsta/react'
import { Gauge, Moon, Download, Check, Play } from 'lucide-react'
import { useNav, Glow, Dots, Photo, Meter, Tile, tint } from '@od/kit'

const C = {"tech":"#22d3ee","trueCrime":"#f97316","comedy":"#facc15","news":"#f472b6","science":"#34d399","business":"#818cf8"}

const CATEGORIES = [
  { id: 'tech', name: 'Tech', emoji: '💻', color: C.tech },
  { id: 'trueCrime', name: 'True Crime', emoji: '🔍', color: C.trueCrime },
  { id: 'comedy', name: 'Comedy', emoji: '😂', color: C.comedy },
  { id: 'news', name: 'News', emoji: '📰', color: C.news },
  { id: 'science', name: 'Science', emoji: '🔬', color: C.science },
  { id: 'business', name: 'Business', emoji: '💼', color: C.business },
  { id: 'health', name: 'Health', emoji: '🫀', color: C.science },
  { id: 'history', name: 'History', emoji: '🏛️', color: C.news },
]

const SLIDES = [
  { title: 'Every story,\none tap away', text: 'Pick up any episode right where you left off — across every show you follow.' },
  { title: 'Pick what\nyou love', text: 'Choose a few topics and we’ll fill your home with shows worth your time.' },
  { title: 'Listen\nyour way', text: 'Speed it up, drift off with a sleep timer, and download episodes for the road.' },
]

function CoversArt() {
  return (
    <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
      <Glow color={C.tech} size={300} opacity={0.45} />
      <Photo q="foggy forest road night" className="absolute w-40 h-40 rounded-3xl -rotate-12 -translate-x-20 translate-y-4 opacity-80 shadow-2xl" />
      <Photo q="galaxy night sky" className="absolute w-40 h-40 rounded-3xl rotate-12 translate-x-20 translate-y-4 opacity-80 shadow-2xl" />
      <div className="relative vs-float">
        <Photo q="neon circuit board" className="w-52 h-52 rounded-[28px] overflow-hidden shadow-2xl">
          <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent text-white">
            <div className="text-caption1 uppercase tracking-wider opacity-80">Ep. 214</div>
            <div className="text-headline truncate">The Chip War, Explained</div>
            <div className="mt-2"><Meter value={0.55} color={C.tech} height={4} /></div>
            <div className="text-caption2 opacity-70 mt-1">26 m left</div>
          </div>
        </Photo>
      </div>
    </div>
  )
}

function CategoryArt({ picked, toggle }) {
  return (
    <div className="relative px-6">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Glow color={C.business} size={280} opacity={0.35} />
      </div>
      <div className="relative grid grid-cols-2 gap-2">
        {CATEGORIES.map((c, i) => {
          const on = picked.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`h-12 rounded-2xl flex items-center gap-2 px-3 text-left border vs-rise ${on ? 'vs-bounce' : 'bg-card border-line'}`}
              style={{
                animationDelay: `${i * 50}ms`,
                ...(on ? { background: tint(c.color, 22), borderColor: c.color } : {}),
              }}
            >
              <span className="text-xl">{c.emoji}</span>
              <span className="text-subhead font-semibold flex-1 truncate">{c.name}</span>
              {on && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: c.color }}>
                  <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="relative text-center text-footnote text-black/55 dark:text-white/55 mt-3">
        {picked.length} selected
      </div>
    </div>
  )
}

function ControlsArt() {
  const rows = [
    { icon: <Gauge className="w-4 h-4 text-white" />, color: C.tech, label: 'Speed', value: '1.5×' },
    { icon: <Moon className="w-4 h-4 text-white" />, color: C.business, label: 'Sleep timer', value: 'End of episode' },
    { icon: <Download className="w-4 h-4 text-white" />, color: C.science, label: 'Downloads', value: '3 episodes' },
  ]
  return (
    <div className="relative w-80 mx-auto flex items-center justify-center">
      <Glow color={C.business} size={300} opacity={0.4} />
      <div className="relative w-full bg-card rounded-card p-4 vs-float shadow-2xl">
        <div className="flex items-center gap-3">
          <Photo q="neon circuit board" className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-headline truncate">The Chip War, Explained</div>
            <div className="text-footnote text-black/55 dark:text-white/55 truncate">Signal & Noise</div>
          </div>
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>
        <div className="mt-3"><Meter value={32.17 / 58.63} color={C.tech} height={5} /></div>
        <div className="flex justify-between text-caption2 text-black/55 dark:text-white/55 mt-1">
          <span>32:10</span><span>58:38</span>
        </div>
        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 bg-card-2 rounded-2xl px-3 h-11">
              <Tile color={r.color} size={26}>{r.icon}</Tile>
              <span className="text-subhead flex-1">{r.label}</span>
              <span className="text-subhead font-semibold" style={{ color: r.color }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(['tech', 'trueCrime', 'science'])
  const s = SLIDES[i]
  const last = i === SLIDES.length - 1
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <Page className="flex flex-col bg-gradient-to-b from-[#0b1020] via-black to-black">
      <div className="flex justify-end px-4 pt-14 h-24">
        {!last && <Link onClick={() => nav.reset('home')}>Skip</Link>}
      </div>
      <div key={i} className="flex-1 flex flex-col justify-center vs-rise">
        {i === 0 && <CoversArt />}
        {i === 1 && <CategoryArt picked={picked} toggle={toggle} />}
        {i === 2 && <ControlsArt />}
        <Block className="text-center !mt-8">
          <h1 className="text-large-title whitespace-pre-line">{s.title}</h1>
          <p className="mt-3 text-body opacity-60">{s.text}</p>
        </Block>
      </div>
      <div className="mb-6"><Dots count={SLIDES.length} active={i} /></div>
      <Block className="!mb-12">
        <Button large rounded onClick={() => (last ? nav.reset('home') : setI(i + 1))}>
          {last ? 'Start listening' : 'Continue'}
        </Button>
        <div className="text-center mt-4 text-subhead">
          {i > 0 ? (
            <Link onClick={() => setI(i - 1)}>Back</Link>
          ) : (
            <span className="opacity-60">Free forever · no account needed</span>
          )}
        </div>
      </Block>
    </Page>
  )
}
