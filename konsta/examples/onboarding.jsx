import { useState } from 'react'
import { Page, Button, Block, Link } from 'konsta/react'
import { Footprints } from 'lucide-react'
import { useNav, Rings, Glow, Dots, gradient, tint } from '@od/kit'

const C = { steps: '#ff9f0a', water: '#0a84ff', habits: '#30d158', mind: '#bf5af2' }

// Each slide's art is composed from the kit and plain shapes — a picture of what the app does, never clip art.
const SLIDES = [
  {
    title: 'Small habits,\nbig changes',
    text: 'Build routines that stick with gentle reminders, streaks and a day that is easy to read at a glance.',
    art: (
      <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
        <Glow color={C.mind} size={280} />
        <div className="vs-float">
          <Rings size={220} stroke={18} gap={8} rings={[{ value: 0.86, color: C.habits }, { value: 0.64, color: C.steps }, { value: 0.78, color: C.water }]}>
            <span className="text-4xl">✨</span>
          </Rings>
        </div>
      </div>
    ),
  },
  {
    title: 'Every step\ncounts',
    text: 'Your steps become a goal you can actually hit — 10,000 or your own.',
    art: (
      <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
        <div className="absolute inset-4 rounded-[48px] rotate-6" style={{ background: tint(C.steps, 22) }} />
        <div className="absolute inset-4 rounded-[48px] -rotate-6 flex flex-col items-center justify-center vs-float" style={{ background: gradient(C.steps, '#ff6b35') }}>
          <Footprints className="w-16 h-16 text-white" />
          <div className="text-white text-4xl font-bold mt-2">7,843</div>
          <div className="text-white/80 text-sm">steps today</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Stay\nhydrated',
    text: 'One tap per glass. A nudge when you fall behind, a cheer when you get there.',
    art: (
      <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
        <Glow color={C.water} />
        <div className="grid grid-cols-4 gap-3 vs-float">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="w-12 h-16 rounded-b-2xl rounded-t-md flex items-end overflow-hidden" style={{ background: tint(C.water, 18) }}>
              <div className="w-full vs-rise" style={{ height: i < 6 ? '80%' : '0%', background: C.water, animationDelay: `${i * 80}ms` }} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const s = SLIDES[i]
  const last = i === SLIDES.length - 1
  return (
    <Page className="flex flex-col">
      <div className="flex justify-end px-4 pt-14 h-24">{!last && <Link onClick={() => nav.push('sign-up')}>Skip</Link>}</div>
      <div key={i} className="flex-1 flex flex-col justify-center vs-rise">
        {s.art}
        <Block className="text-center !mt-10">
          <h1 className="text-[34px] leading-[1.1] font-bold tracking-tight whitespace-pre-line">{s.title}</h1>
          <p className="mt-4 text-[17px] opacity-60 leading-snug">{s.text}</p>
        </Block>
      </div>
      <div className="mb-6"><Dots count={SLIDES.length} active={i} /></div>
      <Block className="!mb-12">
        <Button large rounded onClick={() => (last ? nav.push('sign-up') : setI(i + 1))}>{last ? 'Get started' : 'Continue'}</Button>
        <div className="text-center mt-4 text-[15px]">
          <span className="opacity-60">Already have an account? </span>
          <Link onClick={() => nav.push('log-in')}>Log in</Link>
        </div>
      </Block>
    </Page>
  )
}
