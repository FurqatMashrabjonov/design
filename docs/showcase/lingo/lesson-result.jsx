import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Button } from 'konsta/react'
import { X, Zap, Target, Flame, Clock, BookOpen } from 'lucide-react'
import { useNav, Hero, Glow, Confetti, CountUp, Bars, Tile, tint } from '@od/kit'

const C = {"xp":"#ffc300","streak":"#00c49a","hearts":"#7b61ff","gems":"#ff3d7f","crowns":"#00a8e8","words":"#58cc02"}

const RESULT = { lesson: 'Ordering at a café', xp: 15, accuracy: 90, streak: 22, time: '4:12', correct: 9, total: 10 }
const WEEK_LABELS = ['F', 'S', 'S', 'M', 'T', 'W', 'T']
const WEEK_XP = [72, 45, 90, 60, 85, 60, 15]
const WEEK_TOTAL = 412 + 15

export default function Screen() {
  const nav = useNav()
  const [burst] = useState(true)

  const stats = [
    { label: 'Total XP', value: <><span>+</span><CountUp to={RESULT.xp} /></>, unit: 'XP', color: C.xp, Icon: Zap },
    { label: 'Accuracy', value: <><CountUp to={RESULT.accuracy} /></>, unit: '%', color: C.crowns, Icon: Target },
    { label: 'Streak', value: <><CountUp to={RESULT.streak} /></>, unit: 'days', color: C.streak, Icon: Flame },
  ]

  return (
    <Page className="pb-44">
      <Confetti run={burst} />
      <Navbar
        title="Lesson complete"
        left={<Link iconOnly onClick={nav.pop}><X className="w-6 h-6" /></Link>}
      />

      <div className="relative flex flex-col items-center pt-6 px-4 text-center">
        <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none">
          <Glow color={C.xp} size={240} opacity={0.45} />
        </div>
        <div className="relative w-36 h-36 rounded-full flex items-center justify-center vs-float" style={{ background: tint(C.xp, 22) }}>
          <span className="text-7xl">🦜</span>
          <span className="absolute -top-1 -right-1 text-4xl">🎉</span>
        </div>
        <h1 className="relative text-large-title mt-5">Lesson complete!</h1>
        <p className="relative text-subhead text-black/55 dark:text-white/55 mt-1 truncate max-w-full">
          {RESULT.lesson} · {RESULT.correct} of {RESULT.total} right
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mt-6">
        {stats.map(({ label, value, unit, color, Icon }, i) => (
          <Hero key={label} color={color} className="!p-3 rounded-card text-center vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-center gap-1 text-caption1 font-semibold opacity-90">
              <Icon className="w-4 h-4" />{label}
            </div>
            <div className="text-title1 mt-1 leading-none">{value}</div>
            <div className="text-caption1 opacity-80 mt-1">{unit}</div>
          </Hero>
        ))}
      </div>

      <div className="px-4 mt-4">
        <Hero color={C.streak} className="rounded-card vs-rise" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <span className="text-5xl">🔥</span>
            <div className="min-w-0">
              <div className="text-headline">You extended your streak!</div>
              <div className="text-subhead opacity-80">21 → {RESULT.streak} days in a row</div>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            {WEEK_LABELS.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-subhead font-bold ${i === 6 ? 'bg-white/90 text-black vs-bounce' : 'bg-white/30'}`}>
                  {i === 6 ? '🔥' : '✓'}
                </div>
                <span className="text-caption2 opacity-80">{d}</span>
              </div>
            ))}
          </div>
        </Hero>
      </div>

      <List strong inset dividers className="vs-rise" style={{ animationDelay: '260ms' }}>
        <ListItem
          title="You moved up to #3 in Gold League"
          subtitle="Passed Mei Lin · ends in 3 days"
          media={<Tile color={C.xp} tinted size={40}><span className="text-xl">🏆</span></Tile>}
          after={<span className="text-subhead font-bold" style={{ color: C.words }}>▲ 1</span>}
        />
      </List>

      <BlockTitle>This week</BlockTitle>
      <Block strong inset>
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-title3">{WEEK_TOTAL.toLocaleString('en-US')} <span className="text-subhead text-black/55 dark:text-white/55 font-normal">XP</span></span>
          <span className="text-subhead font-semibold" style={{ color: C.words }}>+{RESULT.xp} today</span>
        </div>
        <Bars values={WEEK_XP} color={C.xp} labels={WEEK_LABELS} height={100} />
      </Block>

      <BlockTitle>Lesson recap</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Time" after={RESULT.time} media={<Tile color={C.hearts}><Clock className="w-4 h-4" /></Tile>} />
        <ListItem title="New words" after="la manzana, el queso" media={<Tile color={C.words}><BookOpen className="w-4 h-4" /></Tile>} />
      </List>

      <div className="fixed bottom-0 inset-x-0 px-4 pt-3 pb-8 bg-page/95 backdrop-blur border-t border-line flex flex-col gap-2">
        <Button large rounded onClick={() => nav.reset('learn')}>Continue</Button>
        <Button large rounded clear onClick={() => nav.reset('league')}>View league</Button>
      </div>
    </Page>
  )
}
