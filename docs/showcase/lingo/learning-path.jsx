import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Chip, Sheet, Toast, Button, Link } from 'konsta/react'
import { BookOpen, Lock, Crown, Star, Check, Plane } from 'lucide-react'
import { useNav, AppTabbar, Hero, Tile, Glow, Meter, Ring, tint } from '@od/kit'

const C = {"xp":"#ffc300","streak":"#00c49a","hearts":"#7b61ff","gems":"#ff3d7f","crowns":"#00a8e8","words":"#58cc02"}

const XP_DARK = '#d9a300'
const OFFSETS = [0, 64, 88, 56, 0, -64, -88, -56]

const UNIT2 = [
  { id: 'fruits', name: 'Fruits', state: 'done' },
  { id: 'market', name: 'At the market', state: 'done' },
  { id: 'cafe', name: 'Ordering at a café', state: 'current' },
  { id: 'chest', name: 'Treasure', state: 'chest' },
  { id: 'cooking', name: 'Cooking', state: 'locked' },
  { id: 'restaurant', name: 'Restaurant', state: 'locked' },
]
const UNIT3 = [
  { id: 'airport', name: 'Airport', state: 'locked' },
  { id: 'hotel', name: 'Hotel', state: 'locked' },
  { id: 'directions', name: 'Directions', state: 'locked' },
]
const GUIDE = [
  { emoji: '🍎', es: 'la manzana', en: 'apple' },
  { emoji: '☕', es: 'el café', en: 'coffee' },
  { emoji: '🥖', es: 'el pan', en: 'bread' },
  { emoji: '💧', es: 'el agua', en: 'water' },
  { emoji: '🧀', es: 'el queso', en: 'cheese' },
]

export default function Screen() {
  const nav = useNav()
  const [guide, setGuide] = useState(false)
  const [toast, setToast] = useState('')

  const locked = (name) => {
    setToast(`Finish “Ordering at a café” to unlock ${name}`)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Learn" />

      <div className="flex items-center justify-between gap-2 px-4 mt-1">
        <Stat onClick={() => nav.reset('profile')}><span className="text-xl">🇪🇸</span></Stat>
        <Stat onClick={() => nav.reset('profile')}><span>🔥</span><span className="font-bold" style={{ color: C.streak }}>21</span></Stat>
        <Stat onClick={() => nav.reset('profile')}><span>💎</span><span className="font-bold" style={{ color: C.gems }}>1,260</span></Stat>
        <Stat onClick={() => nav.reset('profile')}><span>❤️</span><span className="font-bold" style={{ color: C.hearts }}>4</span></Stat>
      </div>

      <div className="px-4 mt-4">
        <Hero color={C.xp} to="#ff9500" className="!rounded-card !p-5 vs-rise">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-footnote font-semibold uppercase tracking-wide opacity-80">Unit 2 · Section 1</div>
              <div className="text-title1 leading-tight mt-1 truncate">Food & Drinks</div>
              <div className="text-subhead opacity-80 mt-1">Order coffee, shop for fruit, cook dinner.</div>
            </div>
            <span className="text-5xl vs-float">🥘</span>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1"><Meter value={2 / 5} color="#ffffff" height={10} /></div>
            <span className="text-footnote font-semibold">2 / 5</span>
          </div>
          <button onClick={() => setGuide(true)} className="mt-4 inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/30 font-semibold text-subhead active:scale-95 transition">
            <BookOpen className="w-4 h-4" /> Guidebook
          </button>
        </Hero>
      </div>

      <Path nodes={UNIT2} onStart={() => nav.push('lesson')} onLocked={locked} mascot />

      <div className="px-4 mt-2">
        <div className="rounded-card bg-card p-5 flex items-center gap-4 vs-rise">
          <Tile color={C.crowns} tinted size={52}><Plane className="w-6 h-6" style={{ color: C.crowns }} /></Tile>
          <div className="flex-1 min-w-0">
            <div className="text-footnote font-semibold uppercase tracking-wide text-black/55 dark:text-white/55">Unit 3</div>
            <div className="text-title3 truncate">Travel ✈️</div>
            <div className="text-footnote text-black/55 dark:text-white/55">Airports, hotels and finding your way</div>
          </div>
          <Lock className="w-5 h-5 opacity-40" />
        </div>
      </div>

      <Path nodes={UNIT3} onStart={() => nav.push('lesson')} onLocked={locked} offset={4} />

      <BlockTitle>Completed</BlockTitle>
      <List strong inset>
        <ListItem link title="Unit 1 · Basics" subtitle="Hola!, Introductions, Family, Numbers, Colors"
          media={<Tile tinted color={C.words} size={44}>✅</Tile>}
          after={<span className="flex items-center gap-1 font-semibold" style={{ color: C.xp }}>5/5 👑</span>}
          onClick={() => nav.push('lesson')} />
      </List>

      <Sheet opened={guide} onBackdropClick={() => setGuide(false)} className="pb-8">
        <Block className="!mt-5 !mb-2">
          <div className="text-title2">Guidebook</div>
          <div className="text-subhead text-black/55 dark:text-white/55">Key words for Food & Drinks</div>
        </Block>
        <List strong inset>
          {GUIDE.map((g) => (
            <ListItem key={g.es} title={g.es} after={<span className="text-black/55 dark:text-white/55">{g.en}</span>}
              media={<Tile tinted color={C.xp} size={40}>{g.emoji}</Tile>} />
          ))}
        </List>
        <Block>
          <Button large rounded onClick={() => setGuide(false)}>Got it</Button>
        </Block>
      </Sheet>

      <Toast opened={!!toast} position="center">{toast}</Toast>
      <AppTabbar active="learn" />
    </Page>
  )
}

function Stat({ children, onClick }) {
  return (
    <button onClick={onClick} className="h-11 px-3 flex-1 rounded-full bg-card flex items-center justify-center gap-1.5 text-body active:scale-95 transition">
      {children}
    </button>
  )
}

function Path({ nodes, onStart, onLocked, offset = 0, mascot = false }) {
  return (
    <div className="relative flex flex-col items-center gap-7 py-8">
      {nodes.map((n, i) => {
        const x = OFFSETS[(i + offset) % OFFSETS.length]
        return (
          <div key={n.id} className="relative flex flex-col items-center vs-rise" style={{ transform: `translateX(${x}px)`, animationDelay: `${i * 60}ms` }}>
            <Node n={n} onStart={onStart} onLocked={onLocked} />
            {mascot && n.state === 'current' && (
              <span className="absolute text-6xl vs-float" style={{ left: x > 0 ? -120 : 110, top: 20 }}>🦜</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Node({ n, onStart, onLocked }) {
  if (n.state === 'current') {
    return (
      <div className="relative flex flex-col items-center">
        <div className="vs-float mb-2 px-3 py-1.5 rounded-xl bg-card font-bold text-footnote tracking-wide" style={{ color: C.xp, boxShadow: '0 2px 0 rgba(0,0,0,.08)' }}>
          START
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Glow color={C.xp} size={150} opacity={0.6} /></div>
          <Ring value={0.05} size={96} stroke={7} color={C.xp}>
            <button onClick={onStart} aria-label={n.name}
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center animate-pulse active:translate-y-1 transition"
              style={{ background: C.xp, boxShadow: `0 6px 0 ${XP_DARK}` }}>
              <Star className="w-8 h-8 text-white" fill="#fff" />
            </button>
          </Ring>
        </div>
        <div className="text-subhead font-semibold mt-2 max-w-[150px] text-center">{n.name}</div>
      </div>
    )
  }
  if (n.state === 'done') {
    return (
      <div className="flex flex-col items-center">
        <button onClick={onStart} aria-label={n.name}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center active:translate-y-1 transition"
          style={{ background: C.xp, boxShadow: `0 6px 0 ${XP_DARK}` }}>
          <Crown className="w-8 h-8 text-white" fill="#fff" />
        </button>
        <div className="text-footnote mt-2 text-black/55 dark:text-white/55 flex items-center gap-1"><Check className="w-3.5 h-3.5" style={{ color: C.words }} />{n.name}</div>
      </div>
    )
  }
  if (n.state === 'chest') {
    return (
      <button onClick={() => onLocked('the treasure chest')} aria-label="Treasure chest"
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
        style={{ background: tint(C.xp, 22), boxShadow: `0 6px 0 ${tint(C.xp, 40)}` }}>
        <span className="opacity-70 grayscale">🎁</span>
      </button>
    )
  }
  return (
    <div className="flex flex-col items-center">
      <button onClick={() => onLocked(n.name)} aria-label={n.name}
        className="w-[72px] h-[72px] rounded-full bg-card-2 flex items-center justify-center"
        style={{ boxShadow: '0 6px 0 rgba(0,0,0,.12)' }}>
        <Lock className="w-7 h-7 opacity-35" />
      </button>
      <div className="text-footnote mt-2 text-black/40 dark:text-white/40">{n.name}</div>
    </div>
  )
}
