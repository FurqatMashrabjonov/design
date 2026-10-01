import { useState } from 'react'
import { Page, Button, Block, Link } from 'konsta/react'
import { Check, Flame, Zap, Crown } from 'lucide-react'
import { useNav, Glow, Dots, Hero, tint } from '@od/kit'

const C = {"xp":"#ffc300","streak":"#00c49a","hearts":"#7b61ff","gems":"#ff3d7f","crowns":"#00a8e8","words":"#58cc02"}

const LANGS = [
  { id: 'es', name: 'Spanish', flag: '🇪🇸' },
  { id: 'fr', name: 'French', flag: '🇫🇷' },
  { id: 'it', name: 'Italian', flag: '🇮🇹' },
  { id: 'de', name: 'German', flag: '🇩🇪' },
  { id: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { id: 'ja', name: 'Japanese', flag: '🇯🇵' },
]

const GOALS = [
  { id: 'casual', name: 'Casual', min: 5, emoji: '🐢', color: C.crowns, line: 'A gentle daily habit' },
  { id: 'regular', name: 'Regular', min: 10, emoji: '🦜', color: C.words, line: 'The sweet spot for most learners' },
  { id: 'serious', name: 'Serious', min: 20, emoji: '🚀', color: C.gems, line: 'Fluency on the fast track' },
]

function Bubble({ children, className = '' }) {
  return (
    <div className={`relative bg-card rounded-3xl px-5 py-3 shadow-lg ${className}`}>
      <span className="text-title2 text-black dark:text-white">{children}</span>
      <div className="absolute -bottom-2 left-8 w-5 h-5 bg-card rotate-45 rounded-sm" />
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const [lang, setLang] = useState('es')
  const [goal, setGoal] = useState('regular')
  const last = i === 2
  const langName = LANGS.find((l) => l.id === lang)?.name ?? 'Spanish'

  return (
    <Page className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-14 h-24">
        <div className="w-12">
          {i > 0 && <Link onClick={() => setI(i - 1)}>Back</Link>}
        </div>
        <Dots count={3} active={i} />
        <div className="w-12 text-right">
          {!last && <Link onClick={() => setI(2)}>Skip</Link>}
        </div>
      </div>

      <div key={i} className="flex-1 flex flex-col vs-rise">
        {i === 0 && (
          <>
            <div className="relative px-4 mt-2">
              <Hero color={C.words} to="#2e9e00" className="relative h-80 rounded-[32px] overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/15" />
                <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-white/10" />
                <Bubble className="mb-4 -ml-16 vs-rise">¡Hola! 👋</Bubble>
                <div className="text-[110px] leading-none vs-float">🦜</div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-footnote font-semibold flex items-center gap-1"><Flame className="w-4 h-4" /> Streaks</span>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-footnote font-semibold flex items-center gap-1"><Zap className="w-4 h-4" /> XP</span>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-footnote font-semibold flex items-center gap-1"><Crown className="w-4 h-4" /> Crowns</span>
                </div>
              </Hero>
            </div>
            <Block className="text-center !mt-8">
              <h1 className="text-large-title">Learn Spanish in{'\n'}</h1>
              <h1 className="text-large-title" style={{ color: C.words }}>5 minutes a day</h1>
              <p className="mt-4 text-body opacity-60">Bite-sized lessons, a winding path to follow and Charlo cheering you on all the way.</p>
            </Block>
          </>
        )}

        {i === 1 && (
          <>
            <div className="flex items-end gap-3 px-4 mt-2">
              <div className="relative">
                <Glow color={C.words} size={120} opacity={0.4} />
                <div className="relative text-7xl leading-none vs-float">🦜</div>
              </div>
              <Bubble className="mb-8">I want to learn…</Bubble>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 mt-6">
              {LANGS.map((l, n) => {
                const on = lang === l.id
                return (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={`relative rounded-card bg-card p-4 flex flex-col items-center gap-2 vs-rise ${on ? 'vs-bounce' : ''}`}
                    style={{
                      animationDelay: `${n * 60}ms`,
                      border: on ? `4px solid ${C.words}` : '4px solid transparent',
                      background: on ? tint(C.words, 14) : undefined,
                    }}
                  >
                    {on && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: C.words }}>
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </span>
                    )}
                    <span className="text-5xl leading-none">{l.flag}</span>
                    <span className="text-headline">{l.name}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {i === 2 && (
          <>
            <div className="flex items-end gap-3 px-4 mt-2">
              <div className="relative">
                <Glow color={C.xp} size={120} opacity={0.45} />
                <div className="relative text-7xl leading-none vs-float">🦜</div>
              </div>
              <Bubble className="mb-8">Pick a daily goal</Bubble>
            </div>
            <div className="flex flex-col gap-3 px-4 mt-6">
              {GOALS.map((g, n) => {
                const on = goal === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`rounded-card bg-card p-4 flex items-center gap-4 text-left vs-rise ${on ? 'vs-bounce' : ''}`}
                    style={{
                      animationDelay: `${n * 60}ms`,
                      border: on ? `4px solid ${g.color}` : '4px solid transparent',
                      background: on ? tint(g.color, 14) : undefined,
                    }}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: tint(g.color, 22) }}>{g.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-headline">{g.name}</div>
                      <div className="text-subhead text-black/55 dark:text-white/55 truncate">{g.line}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-title2" style={{ color: g.color }}>{g.min}</div>
                      <div className="text-caption1 text-black/55 dark:text-white/55">min / day</div>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="px-4 mt-5 text-center text-footnote text-black/55 dark:text-white/55">
              {langName} it is! You can change your goal any time in Profile.
            </p>
          </>
        )}
      </div>

      <Block className="!mb-12 !mt-6">
        <Button large rounded onClick={() => (last ? nav.reset('learn') : setI(i + 1))}>
          {last ? "Let's go!" : 'Continue'}
        </Button>
        <div className="text-center mt-4 text-subhead">
          <span className="opacity-60">Already have an account? </span>
          <Link onClick={() => nav.reset('learn')}>Log in</Link>
        </div>
      </Block>
    </Page>
  )
}
