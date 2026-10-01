import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Card, Link, Button } from 'konsta/react'
import { Flame, Play, Moon, Clock, ChevronRight } from 'lucide-react'
import { useNav, AppTabbar, Hero, Photo, Tile, Ring, Avatar, tint } from '@od/kit'

const C = {"sleep":"#c99a3e","anxiety":"#c07580","focus":"#5f9e94","breathing":"#8a7bb0","stories":"#d0845a"}

const MOODS = [
  { id: 'awful', emoji: '😣', label: 'Awful' },
  { id: 'low', emoji: '😔', label: 'Low' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'calm', emoji: '😌', label: 'Calm' },
]
const RECOMMENDED = { title: 'Unwind After Work', mins: 10, guide: 'Elena Ward', emoji: '🌅', photo: 'dusk over quiet lake' }
const CONTINUE = { title: 'Body Scan for Rest', mins: 12, done: 4, guide: 'Elena Ward', emoji: '🛏️' }
const TONIGHT = { title: 'The Lighthouse Keeper', mins: 32, narrator: 'Thomas Reed', photo: 'lighthouse at night sea' }

export default function Screen() {
  const nav = useNav()
  const [mood, setMood] = useState('okay')

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Today" subtitle="Thursday, 1 October"
        right={<Link iconOnly onClick={() => nav.reset('profile')}><Avatar name="Maya Lindqvist" color={C.breathing} size={32} /></Link>} />

      <div className="px-4 mt-1 mb-4 flex items-center justify-between gap-3">
        <div className="text-title3 truncate">Good evening, Maya</div>
        <button onClick={() => nav.reset('stats')}
          className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-full text-subhead font-semibold"
          style={{ background: tint(C.stories, 18), color: C.stories }}>
          <Flame className="w-4 h-4" />6 days
        </button>
      </div>

      <div className="px-4">
        <Hero color={C.anxiety} to={C.breathing} className="!p-0 overflow-hidden vs-rise">
          <Photo q={RECOMMENDED.photo} className="w-full h-44">
            <div className="w-full h-full bg-gradient-to-t from-black/50 to-transparent" />
          </Photo>
          <div className="p-5">
            <div className="text-footnote uppercase tracking-wide opacity-80">Recommended for this evening</div>
            <div className="text-title2 mt-1">{RECOMMENDED.title}</div>
            <div className="text-subhead opacity-80 mt-1">{RECOMMENDED.mins} min · {RECOMMENDED.guide}</div>
            <button onClick={() => nav.push('player')}
              className="mt-4 h-12 px-6 rounded-full bg-white/90 text-black font-semibold flex items-center gap-2 active:scale-[.97] transition">
              <Play className="w-5 h-5" fill="currentColor" />Play
            </button>
          </div>
        </Hero>
      </div>

      <BlockTitle className="!mt-8 !mb-2">How are you feeling?</BlockTitle>
      <Card className="!mx-4 !rounded-card vs-rise" style={{ animationDelay: '60ms' }}>
        <div className="grid grid-cols-5 gap-1">
          {MOODS.map((m) => {
            const on = mood === m.id
            return (
              <button key={m.id} onClick={() => setMood(m.id)}
                className={`flex flex-col items-center gap-1 py-2 rounded-2xl transition ${on ? 'vs-bounce' : ''}`}
                style={on ? { background: tint(C.breathing, 20) } : undefined}>
                <span className={`text-3xl ${on ? '' : 'opacity-60'}`}>{m.emoji}</span>
                <span className={`text-caption1 ${on ? 'font-semibold' : 'text-black/55 dark:text-white/55'}`}
                  style={on ? { color: C.breathing } : undefined}>{m.label}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <BlockTitle className="!mt-8">Continue</BlockTitle>
      <List strong inset>
        <ListItem link onClick={() => nav.push('player')}
          title={CONTINUE.title}
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{CONTINUE.done} of {CONTINUE.mins} min · {CONTINUE.guide}</span>}
          media={<Ring value={CONTINUE.done / CONTINUE.mins} size={44} stroke={4} color={C.sleep}><span className="text-lg">{CONTINUE.emoji}</span></Ring>}
          after={<span className="text-subhead font-semibold" style={{ color: C.sleep }}>{CONTINUE.mins - CONTINUE.done} min left</span>} />
      </List>

      <BlockTitle className="!mt-8 !mb-2">Tonight</BlockTitle>
      <div className="px-4">
        <button onClick={() => nav.reset('sleep')}
          className="w-full text-left bg-card rounded-card overflow-hidden active:scale-[.98] transition vs-rise" style={{ animationDelay: '120ms' }}>
          <Photo q={TONIGHT.photo} className="w-full h-40">
            <div className="w-full h-full flex items-end p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="text-white">
                <div className="flex items-center gap-1.5 text-caption1 uppercase tracking-wide opacity-80"><Moon className="w-3.5 h-3.5" />Sleep story</div>
                <div className="text-title3 mt-0.5">{TONIGHT.title}</div>
              </div>
            </div>
          </Photo>
          <div className="flex items-center gap-3 p-4">
            <Tile tinted color={C.stories} size={40}>🏮</Tile>
            <div className="flex-1 min-w-0">
              <div className="text-headline truncate">Narrated by {TONIGHT.narrator}</div>
              <div className="text-footnote text-black/55 dark:text-white/55 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{TONIGHT.mins} min · sleep timer 45 min</div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-40" />
          </div>
        </button>
      </div>

      <Block className="!mt-6 text-footnote text-center text-black/55 dark:text-white/55">
        Wind-down reminder at 9:30 PM
      </Block>

      <AppTabbar active="today" />
    </Page>
  )
}
