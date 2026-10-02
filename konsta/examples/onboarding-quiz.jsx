import { useState } from 'react'
import { Page, Button, Link } from 'konsta/react'
import { ChevronLeft } from 'lucide-react'
import { useNav, Meter, Tile, tint } from '@od/kit'

const C = { strength: '#ff6b35', cardio: '#00a8e8', mobility: '#58cc02', calm: '#7b61ff' }

// A short personal flow: the questions this app really needs, one at a time, each answer a big tappable card.
const QUESTIONS = [
  {
    title: "What's your main goal?",
    note: 'We build your first week around it.',
    options: [
      { id: 'strength', emoji: '🏋️', label: 'Get stronger', hint: 'Lift more, week by week', color: C.strength },
      { id: 'cardio', emoji: '🏃', label: 'Build stamina', hint: 'Run, row and ride longer', color: C.cardio },
      { id: 'mobility', emoji: '🤸', label: 'Move better', hint: 'Mobility and fewer aches', color: C.mobility },
      { id: 'calm', emoji: '🧘', label: 'Feel calmer', hint: 'Gentle sessions, less stress', color: C.calm },
    ],
  },
  {
    title: 'How often can you train?',
    note: 'You can change this any time.',
    options: [
      { id: '2', emoji: '🌱', label: '2 days a week', hint: 'An easy start', color: C.mobility },
      { id: '3', emoji: '🔥', label: '3 days a week', hint: 'Most people pick this', color: C.strength },
      { id: '5', emoji: '⚡️', label: '5 days a week', hint: 'All in', color: C.cardio },
    ],
  },
]

export default function Screen() {
  const nav = useNav()
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState({})
  const q = QUESTIONS[step]
  const choice = picked[step]
  const last = step === QUESTIONS.length - 1
  return (
    <Page className="flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-14">
        <button className="grid size-9 place-items-center rounded-full bg-card" aria-label="Back" onClick={() => (step ? setStep(step - 1) : nav.pop())}>
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1"><Meter value={(step + 1) / (QUESTIONS.length + 1)} /></div>
        <Link onClick={() => nav.push('today')}>Skip</Link>
      </div>
      <div key={step} className="flex-1 px-4 pt-8 vs-rise">
        <h1 className="text-title1">{q.title}</h1>
        <p className="mt-2 text-body opacity-60">{q.note}</p>
        <div className="mt-6 space-y-3">
          {q.options.map((o, i) => {
            const on = choice === o.id
            return (
              <button
                key={o.id}
                className="flex w-full items-center gap-4 rounded-card bg-card p-4 text-left transition vs-rise"
                style={{ animationDelay: `${i * 60}ms`, boxShadow: on ? `0 0 0 2px ${o.color}` : undefined, background: on ? tint(o.color, 12) : undefined }}
                onClick={() => setPicked({ ...picked, [step]: o.id })}
              >
                <Tile color={o.color} tinted size={48}><span className="text-2xl">{o.emoji}</span></Tile>
                <span className="flex-1">
                  <span className="block text-headline">{o.label}</span>
                  <span className="block text-subhead opacity-60">{o.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="px-4 pb-12 pt-4">
        <Button large rounded disabled={!choice} onClick={() => (last ? nav.push('today') : setStep(step + 1))}>
          {last ? 'Build my plan' : 'Continue'}
        </Button>
      </div>
    </Page>
  )
}
