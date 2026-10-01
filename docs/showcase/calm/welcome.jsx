import { useState } from 'react'
import { Page, Block, Button, Link, List, ListItem, Toggle } from 'konsta/react'
import { Check, Bell, Moon } from 'lucide-react'
import { useNav, Ring, Glow, Dots, Photo, Tile, tint } from '@od/kit'

const C = {"sleep":"#c99a3e","anxiety":"#c07580","focus":"#5f9e94","breathing":"#8a7bb0","stories":"#d0845a"}

const GOALS = [
  { id: 'anxiety', emoji: '🍃', title: 'Ease stress', text: 'Soften worry and settle the mind', color: C.anxiety },
  { id: 'sleep', emoji: '🌙', title: 'Sleep better', text: 'Wind down and rest more deeply', color: C.sleep },
  { id: 'focus', emoji: '🎯', title: 'Find focus', text: 'Clear the noise, stay with one thing', color: C.focus },
]

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const [goal, setGoal] = useState('sleep')
  const [remind, setRemind] = useState(true)
  const last = i === 2
  const picked = GOALS.find((g) => g.id === goal)

  return (
    <Page className="flex flex-col">
      <div className="flex justify-end items-end px-4 pt-14 h-24">
        {!last && <Link onClick={() => nav.reset('today')}>Skip</Link>}
      </div>

      <div key={i} className="flex-1 flex flex-col vs-rise">
        {i === 0 && (
          <>
            <div className="px-4">
              <Photo q="moon over still lake" className="w-full h-80 rounded-card vs-float">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-card" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                  <Moon className="w-4 h-4" />
                  <span className="text-footnote opacity-90">An evening breath, whenever you need it</span>
                </div>
              </Photo>
            </div>
            <Block className="text-center !mt-10">
              <h1 className="text-large-title">Breathe in.{'\n'}You're here.</h1>
              <p className="mt-4 text-body opacity-60">
                Hushwell is a soft, slow place to ease stress, rest deeply and find focus.
              </p>
            </Block>
          </>
        )}

        {i === 1 && (
          <>
            <Block className="text-center !mt-2 !mb-6">
              <h1 className="text-large-title">What brings you{'\n'}to Hushwell?</h1>
              <p className="mt-3 text-body opacity-60">Choose one — you can change it any time.</p>
            </Block>
            <div className="flex flex-col gap-3 px-4">
              {GOALS.map((g, n) => {
                const on = goal === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className="vs-rise w-full flex items-center gap-4 p-4 rounded-card bg-card text-left min-h-[88px] transition-all"
                    style={{
                      animationDelay: `${n * 80}ms`,
                      background: on ? tint(g.color, 22) : undefined,
                      boxShadow: on ? `inset 0 0 0 2px ${g.color}` : undefined,
                    }}
                  >
                    <Tile color={g.color} tinted size={52}>
                      <span className="text-2xl">{g.emoji}</span>
                    </Tile>
                    <div className="flex-1 min-w-0">
                      <div className="text-headline">{g.title}</div>
                      <div className="text-subhead text-black/55 dark:text-white/55 truncate">{g.text}</div>
                    </div>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${on ? 'vs-bounce' : ''}`}
                      style={{ background: on ? g.color : tint(g.color, 14) }}
                    >
                      {on && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {i === 2 && (
          <>
            <div className="relative h-60 flex items-center justify-center">
              <Glow color={picked.color} size={240} opacity={0.35} />
              <div className="vs-float">
                <Ring value={0.35} size={190} stroke={14} color={picked.color}>
                  <div className="text-center">
                    <div className="text-4xl">{picked.emoji}</div>
                    <div className="text-title1 mt-1" style={{ color: picked.color }}>10</div>
                    <div className="text-footnote text-black/55 dark:text-white/55">min a day</div>
                  </div>
                </Ring>
              </div>
            </div>
            <Block className="text-center !mt-6 !mb-4">
              <h1 className="text-large-title">We'll start gently,{'\n'}10 minutes a day</h1>
              <p className="mt-3 text-body opacity-60">
                A quiet nudge each evening to help you {picked.title.toLowerCase()}.
              </p>
            </Block>
            <List strong inset>
              <ListItem
                media={<Tile color={C.sleep}><Bell className="w-4 h-4 text-white" /></Tile>}
                title="Evening reminder"
                subtitle={<span style={{ color: C.sleep }} className="font-semibold">9:30 PM</span>}
                after={<Toggle checked={remind} onChange={() => setRemind(!remind)} />}
              />
            </List>
          </>
        )}
      </div>

      <div className="mb-6 mt-4"><Dots count={3} active={i} /></div>
      <Block className="!mb-12">
        <Button large rounded onClick={() => (last ? nav.reset('today') : setI(i + 1))}>
          {last ? 'Begin' : 'Continue'}
        </Button>
        {i > 0 && (
          <div className="text-center mt-4 text-subhead">
            <Link onClick={() => setI(i - 1)}>Back</Link>
          </div>
        )}
      </Block>
    </Page>
  )
}
