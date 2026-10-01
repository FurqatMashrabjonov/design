import { useState } from 'react'
import { Page, Navbar, Link, BlockTitle, List, ListItem, Chip, Button } from 'konsta/react'
import { Dumbbell, TrendingUp, Search } from 'lucide-react'
import { useNav, AppTabbar, Hero, Tile, CountUp, tint } from '@od/kit'

const C = {"xp":"#ffc300","streak":"#00c49a","hearts":"#7b61ff","gems":"#ff3d7f","crowns":"#00a8e8","words":"#58cc02"}
const WEAK = '#ff4b4b'

const WORDS = [
  { id: 'manzana', emoji: '🍎', es: 'la manzana', en: 'apple', strength: 4, cat: 'Food' },
  { id: 'cafe', emoji: '☕', es: 'el café', en: 'coffee', strength: 4, cat: 'Food' },
  { id: 'pan', emoji: '🥖', es: 'el pan', en: 'bread', strength: 3, cat: 'Food' },
  { id: 'agua', emoji: '💧', es: 'el agua', en: 'water', strength: 4, cat: 'Food' },
  { id: 'queso', emoji: '🧀', es: 'el queso', en: 'cheese', strength: 2, cat: 'Food' },
  { id: 'platano', emoji: '🍌', es: 'el plátano', en: 'banana', strength: 3, cat: 'Food' },
  { id: 'vino', emoji: '🍷', es: 'el vino', en: 'wine', strength: 1, cat: 'Food' },
  { id: 'pescado', emoji: '🐟', es: 'el pescado', en: 'fish', strength: 1, cat: 'Food' },
  { id: 'hola', emoji: '👋', es: 'hola', en: 'hello', strength: 4, cat: 'Greetings' },
  { id: 'gracias', emoji: '🙏', es: 'gracias', en: 'thank you', strength: 4, cat: 'Greetings' },
  { id: 'aeropuerto', emoji: '✈️', es: 'el aeropuerto', en: 'airport', strength: 2, cat: 'Travel' },
  { id: 'hotel', emoji: '🏨', es: 'el hotel', en: 'hotel', strength: 3, cat: 'Travel' },
  { id: 'cuenta', emoji: '🍽️', es: 'la cuenta', en: 'the bill', strength: 1, cat: 'Food' },
]
const FILTERS = ['All', 'Food', 'Greetings', 'Travel', 'Weak']

const strengthColor = (s) => (s >= 4 ? C.words : s >= 2 ? C.xp : WEAK)

function StrengthBars({ value }) {
  const color = strengthColor(value)
  return (
    <div className="flex items-end gap-[3px] h-5" aria-label={`Strength ${value} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-[5px] rounded-full"
          style={{ height: `${6 + i * 3.5}px`, background: i <= value ? color : tint(color, 22) }} />
      ))}
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [filter, setFilter] = useState('All')
  const weakCount = WORDS.filter((w) => w.strength === 1).length
  const words = WORDS.filter((w) =>
    filter === 'All' ? true : filter === 'Weak' ? w.strength === 1 : w.cat === filter)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Words" subtitle="Spanish 🇪🇸"
        right={<Link iconOnly><Search className="w-6 h-6" /></Link>} />

      <div className="px-4 pt-2">
        <Hero color={C.words} to={C.streak} className="rounded-card p-5 vs-rise">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-subhead opacity-80">Your vocabulary</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-figure"><CountUp to={248} /></span>
                <span className="text-title3">words</span>
              </div>
              <div className="text-subhead opacity-80">learned so far</div>
            </div>
            <span className="text-5xl vs-float">📚</span>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/15 px-3 py-1 text-footnote font-semibold">
              <TrendingUp className="w-4 h-4" /> +36 this week
            </span>
            <span className="inline-flex items-center rounded-full bg-black/15 px-3 py-1 text-footnote font-semibold">
              {weakCount} need practice
            </span>
          </div>
        </Hero>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 mt-5 pb-1">
        {FILTERS.map((f) => (
          <Chip key={f} onClick={() => setFilter(f)}
            className={`shrink-0 min-h-[36px] cursor-pointer ${filter === f ? '!bg-primary !text-white' : ''}`}>
            {f === 'Weak' ? `Weak · ${weakCount}` : f}
          </Chip>
        ))}
      </div>

      <BlockTitle>{filter === 'All' ? 'All words' : filter} · {words.length}</BlockTitle>
      <List strong inset dividers>
        {words.map((w, i) => (
          <ListItem key={w.id}
            className="vs-rise" style={{ animationDelay: `${i * 50}ms` }}
            media={<Tile tinted color={strengthColor(w.strength)} size={44}><span className="text-2xl">{w.emoji}</span></Tile>}
            title={<span className="text-headline truncate">{w.es}</span>}
            subtitle={<span className="text-subhead text-black/55 dark:text-white/55">{w.en}</span>}
            after={
              <div className="flex flex-col items-end gap-1">
                <StrengthBars value={w.strength} />
                {w.strength === 1 && <span className="text-caption2 font-semibold" style={{ color: WEAK }}>Weak</span>}
              </div>
            } />
        ))}
      </List>

      <div className="flex items-center gap-4 px-8 text-caption1 text-black/55 dark:text-white/55">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.words }} /> Strong</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.xp }} /> Learning</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: WEAK }} /> Weak</span>
      </div>

      <div className="px-4 mt-6 mb-4">
        <Button large rounded onClick={() => nav.push('lesson')} className="shadow-lg gap-2">
          <Dumbbell className="w-5 h-5" /> Practice weak words
        </Button>
      </div>

      <AppTabbar active="words" />
    </Page>
  )
}
