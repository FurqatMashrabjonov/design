import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Button, Actions, ActionsGroup, ActionsLabel, ActionsButton } from 'konsta/react'
import { Play, Moon, Timer, Heart, Sparkles, Headphones } from 'lucide-react'
import { useNav, AppTabbar, Photo, tint, gradient } from '@od/kit'

const C = {"sleep":"#c99a3e","anxiety":"#c07580","focus":"#5f9e94","breathing":"#8a7bb0","stories":"#d0845a"}

const NIGHT = '#1b1846'
const NIGHT_TO = '#3a2f6b'

const TONIGHT = { id: 'lighthouse', title: 'The Lighthouse Keeper', narrator: 'Thomas Reed', min: 32, emoji: '🏮', photo: 'lighthouse at night sea' }
const NEW_THIS_WEEK = [
  { id: 'kyoto', title: 'Night Train to Kyoto', narrator: 'Isla Moreno', min: 41, emoji: '🚆', photo: 'train window night lights' },
  { id: 'cabin', title: 'The Snowbound Cabin', narrator: 'Grace Hall', min: 28, emoji: '🏔️', photo: 'snowy cabin warm glow' },
]
const FAVOURITES = [
  { id: 'lavender', title: 'Lavender Fields of Provence', narrator: 'Isla Moreno', min: 35, emoji: '💜', photo: 'lavender field at dusk' },
  { id: 'river', title: 'The Slow River', narrator: 'Thomas Reed', min: 30, emoji: '🛶', photo: 'canoe on misty river' },
  { id: 'lighthouse', title: 'The Lighthouse Keeper', narrator: 'Thomas Reed', min: 32, emoji: '🏮', photo: 'lighthouse at night sea' },
]
const SOUNDS = [
  { id: 'Rain', emoji: '🌧️' },
  { id: 'Ocean', emoji: '🌊' },
  { id: 'Fireplace', emoji: '🔥' },
  { id: 'Brown noise', emoji: '🟤' },
]
const TIMERS = [15, 30, 45, 60]
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  opacity: 0.35 + ((i * 17) % 60) / 100,
}))

export default function Screen() {
  const nav = useNav()
  const [timer, setTimer] = useState(45)
  const [timerOpen, setTimerOpen] = useState(false)
  const [sound, setSound] = useState('Rain')
  const [saved, setSaved] = useState(['lighthouse'])

  const toggleSaved = (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Sleep Stories" />

      {/* Starfield header with tonight's story */}
      <div className="px-4 pt-2 vs-rise">
        <div
          className="relative overflow-hidden rounded-card p-4"
          style={{ background: gradient(NIGHT, NIGHT_TO) }}
        >
          {STARS.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, background: '#fff8e7', opacity: s.opacity }}
            />
          ))}
          <div className="relative flex items-start justify-between">
            <div>
              <div className="text-title2 text-white">Drift off, Maya</div>
              <div className="text-subhead text-white/70 mt-0.5">Tonight's story</div>
            </div>
            <div className="vs-float">
              <Moon className="w-7 h-7" style={{ color: '#f3d9a4' }} fill="#f3d9a4" />
            </div>
          </div>

          <Photo q={TONIGHT.photo} className="relative mt-4 w-full h-48 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-caption1 text-white/75 uppercase tracking-wide">Sleep story</div>
              <div className="text-title3 text-white truncate">{TONIGHT.title}</div>
              <div className="text-footnote text-white/75">Narrated by {TONIGHT.narrator} · {TONIGHT.min} min</div>
            </div>
          </Photo>

          <div className="relative mt-4">
            <Button
              large
              rounded
              onClick={() => nav.push('player', { id: TONIGHT.id })}
              className="!text-white"
              style={{ background: C.stories, boxShadow: `0 0 28px ${C.stories}aa` }}
            >
              <Play className="w-5 h-5 mr-2" fill="currentColor" /> Listen
            </Button>
          </div>
        </div>
      </div>

      {/* Sleep timer pill */}
      <div className="px-4 mt-4 flex items-center gap-2 vs-rise" style={{ animationDelay: '60ms' }}>
        <button
          onClick={() => setTimerOpen(true)}
          className="flex items-center gap-2 h-11 px-4 rounded-full"
          style={{ background: tint(C.sleep, 20) }}
        >
          <Timer className="w-4 h-4" style={{ color: C.sleep }} />
          <span className="text-subhead font-semibold">Sleep timer · {timer} min</span>
        </button>
        <div className="flex items-center gap-1.5 h-11 px-4 rounded-full bg-card">
          <Headphones className="w-4 h-4 opacity-60" />
          <span className="text-subhead text-black/60 dark:text-white/60">{sound} on</span>
        </div>
      </div>

      {/* New this week */}
      <BlockTitle className="flex items-center gap-1.5 !mb-2">
        <Sparkles className="w-4 h-4" style={{ color: C.stories }} /> New this week
      </BlockTitle>
      <div className="grid grid-cols-2 gap-3 px-4">
        {NEW_THIS_WEEK.map((s, i) => (
          <button
            key={s.id}
            onClick={() => nav.push('player', { id: s.id })}
            className="text-left bg-card rounded-card overflow-hidden vs-rise"
            style={{ animationDelay: `${(i + 2) * 60}ms` }}
          >
            <Photo q={s.photo} className="relative w-full h-32">
              <span className="absolute top-2 left-2 text-caption2 font-semibold px-2 py-0.5 rounded-full bg-black/45 text-white">New</span>
            </Photo>
            <div className="p-3">
              <div className="text-headline leading-tight line-clamp-2">{s.title}</div>
              <div className="text-footnote text-black/55 dark:text-white/55 mt-1 truncate">{s.narrator}</div>
              <div className="text-footnote font-semibold mt-1" style={{ color: C.stories }}>{s.min} min</div>
            </div>
          </button>
        ))}
      </div>

      {/* Narrator favourites */}
      <BlockTitle>Narrator favourites</BlockTitle>
      <List strong inset dividers>
        {FAVOURITES.map((s) => {
          const on = saved.includes(s.id)
          return (
            <ListItem
              key={s.id}
              link
              chevron={false}
              linkProps={{ onClick: () => nav.push('player', { id: s.id }) }}
              title={<span className="truncate block">{s.title}</span>}
              subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{s.narrator} · {s.min} min</span>}
              media={<Photo q={s.photo} className="w-14 h-14 rounded-2xl" />}
              after={
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSaved(s.id) }}
                  className={`w-11 h-11 flex items-center justify-center ${on ? 'vs-bounce' : ''}`}
                  aria-label={on ? 'Remove from favourites' : 'Save to favourites'}
                >
                  <Heart className="w-5 h-5" style={{ color: on ? C.anxiety : undefined }} fill={on ? C.anxiety : 'none'} />
                </button>
              }
            />
          )
        })}
      </List>

      {/* Wind-down sounds */}
      <BlockTitle className="!mb-2">Wind-down sounds</BlockTitle>
      <div className="grid grid-cols-4 gap-2 px-4">
        {SOUNDS.map((s, i) => {
          const on = sound === s.id
          return (
            <button
              key={s.id}
              onClick={() => setSound(s.id)}
              className={`flex flex-col items-center justify-center gap-1 h-20 rounded-card vs-rise ${on ? '' : 'bg-card'}`}
              style={{ animationDelay: `${(i + 4) * 60}ms`, ...(on ? { background: tint(C.sleep, 24), boxShadow: `inset 0 0 0 1.5px ${C.sleep}` } : {}) }}
            >
              <span className={`text-2xl ${on ? 'vs-bounce' : ''}`}>{s.emoji}</span>
              <span className="text-caption1 font-semibold truncate max-w-full px-1">{s.id}</span>
            </button>
          )
        })}
      </div>
      <Block className="text-footnote text-black/55 dark:text-white/55 flex items-center gap-2">
        <Moon className="w-4 h-4" /> Stories fade out gently when the timer ends.
      </Block>

      <Actions opened={timerOpen} onBackdropClick={() => setTimerOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>Stop playing after</ActionsLabel>
          {TIMERS.map((t) => (
            <ActionsButton key={t} bold={t === timer} onClick={() => { setTimer(t); setTimerOpen(false) }}>
              {t} min
            </ActionsButton>
          ))}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setTimerOpen(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>

      <AppTabbar active="sleep" />
    </Page>
  )
}
