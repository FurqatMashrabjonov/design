import { useState, useEffect } from 'react'
import { Page, Block, BlockTitle, List, ListItem, Button, Chip, Progressbar } from 'konsta/react'
import { X, Play, Pause, RotateCcw, Check, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import { useNav, Ring, Confetti, tint } from '@od/kit'

const C = {"breakfast":"#047857","lunch":"#6b21a8","dinner":"#be185d","produce":"#0e7490","dairy":"#111111","pantry":"#b91c1c"}

const RECIPE = { name: 'Miso Butter Salmon with Bok Choy', emoji: '🐟', servings: 2 }

const STEPS = [
  { text: 'Rinse the rice and cook it in 1¼ cups water.', timer: 15 * 60, label: 'Simmer rice', items: ['1 cup jasmine rice'], tip: 'Keep the lid on — the steam finishes the rice.' },
  { text: 'Heat the oven to 220°C / 425°F and line a tray.', timer: 0, label: '', items: [], tip: 'Parchment keeps the miso glaze from sticking.' },
  { text: 'Mash miso, soft butter, mirin and garlic. Spread over the salmon, then roast with the bok choy.', timer: 8 * 60, label: 'Roast salmon & bok choy', items: ['2 tbsp white miso', '2 tbsp unsalted butter', '1 tbsp mirin', '1 garlic clove, grated', '2 salmon fillets', '2 heads baby bok choy'], tip: 'Lay the bok choy cut-side up so it chars at the edges.' },
  { text: 'Switch to broil until the glaze caramelises.', timer: 2 * 60, label: 'Broil', items: [], tip: 'Watch closely — miso goes from golden to burnt fast.' },
  { text: 'Drizzle the bok choy with soy sauce.', timer: 0, label: '', items: ['1 tsp soy sauce'], tip: 'A squeeze of lemon works here too.' },
  { text: 'Serve over rice, topped with scallion and sesame.', timer: 0, label: '', items: ['1 scallion, sliced', '1 tsp sesame seeds'], tip: 'Spoon any pan juices over the rice.' },
]

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function Screen() {
  const nav = useNav()
  const [step, setStep] = useState(2)
  const [left, setLeft] = useState(STEPS[2].timer)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const cur = STEPS[step]
  const last = step === STEPS.length - 1

  useEffect(() => {
    setLeft(STEPS[step].timer)
    setRunning(false)
  }, [step])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) { setRunning(false); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const next = () => {
    if (last) { setFinished(true); setTimeout(() => nav.pop(), 1400); return }
    setStep(step + 1)
  }

  return (
    <Page className="pb-40">
      <Confetti run={finished} />

      <div className="px-4 pt-12 flex items-center gap-3">
        <button onClick={nav.pop} aria-label="Close" className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center bg-card-2">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-caption1 uppercase tracking-wider font-semibold" style={{ color: C.dinner }}>Step {step + 1} of {STEPS.length}</div>
          <div className="text-footnote truncate text-black/55 dark:text-white/55">{RECIPE.name}</div>
        </div>
        <div className="text-2xl">{RECIPE.emoji}</div>
      </div>
      <div className="px-4 mt-3">
        <Progressbar progress={(step + 1) / STEPS.length} />
      </div>

      <div key={step} className="px-4 mt-8 vs-rise">
        <div className="text-title1 leading-tight">{cur.text}</div>
        {cur.items.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {cur.items.map((it) => (
              <Chip key={it} className="!m-0 !bg-transparent" style={{ background: tint(C.dinner, 12) }}>
                <span className="text-footnote font-medium">{it}</span>
              </Chip>
            ))}
          </div>
        )}
      </div>

      {cur.timer > 0 ? (
        <div className="flex flex-col items-center mt-8 vs-rise" style={{ animationDelay: '80ms' }}>
          <Ring value={left / cur.timer} size={210} stroke={14} color={C.dinner}>
            <div className="text-center">
              <div className="text-figure tabular-nums">{fmt(left)}</div>
              <div className="text-footnote mt-1 text-black/55 dark:text-white/55">{left === 0 ? 'Time’s up' : cur.label}</div>
            </div>
          </Ring>
          <div className="flex items-center gap-4 mt-5">
            <button onClick={() => { setLeft(cur.timer); setRunning(false) }} aria-label="Reset timer" className="w-12 h-12 rounded-full flex items-center justify-center bg-card-2">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => left > 0 && setRunning(!running)}
              aria-label={running ? 'Pause timer' : 'Start timer'}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white"
              style={{ background: C.dinner }}
            >
              {running ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </button>
            <div className="w-12 h-12" />
          </div>
        </div>
      ) : (
        <div className="px-4 mt-8">
          <div className="border-t border-line" />
        </div>
      )}

      <div className="px-4 mt-8 flex gap-3 items-start">
        <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.dinner }} />
        <div className="text-subhead text-black/70 dark:text-white/70">{cur.tip}</div>
      </div>

      <BlockTitle>All steps</BlockTitle>
      <List strong inset dividers>
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <ListItem
              key={i}
              onClick={() => setStep(i)}
              media={
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-caption1 font-bold ${done ? 'vs-bounce text-white' : ''}`}
                  style={{ background: done ? C.dinner : active ? tint(C.dinner, 22) : tint('#8e8e93', 18), color: active ? C.dinner : undefined }}
                >
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </div>
              }
              title={<span className={`text-subhead ${done ? 'opacity-50 line-through' : ''} ${active ? 'font-semibold' : ''}`}>{s.text}</span>}
              after={s.timer > 0 ? <span className="text-footnote tabular-nums" style={{ color: C.dinner }}>{fmt(s.timer)}</span> : null}
            />
          )
        })}
      </List>

      <div className="fixed bottom-0 left-0 right-0 bg-page border-t border-line px-4 pt-3 pb-8 flex gap-3">
        <Button large rounded tonal className="!w-32" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>
          <ChevronLeft className="w-5 h-5 mr-1" />Previous
        </Button>
        <Button large rounded className="flex-1" onClick={next}>
          {last ? 'Done — enjoy!' : <>Next<ChevronRight className="w-5 h-5 ml-1" /></>}
        </Button>
      </div>
    </Page>
  )
}
