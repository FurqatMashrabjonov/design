import { useState } from 'react'
import { Page, Button, Block, Link } from 'konsta/react'
import { Droplets, RotateCw, CloudDrizzle, ScanLine, Stethoscope, Check } from 'lucide-react'
import { useNav, Photo, Glow, Dots, Meter, tint } from '@od/kit'

const C = {"water":"#8a7bb0","mist":"#d0845a","fertilize":"#6f9e80","rotate":"#9b7bb8","repot":"#5f8fc0"}

const TASKS = [
  { icon: Droplets, label: 'Water Monty', room: 'Living room', color: C.water, done: false },
  { icon: CloudDrizzle, label: 'Mist Stripes', room: 'Bedroom · 8:05 AM', color: C.mist, done: true },
  { icon: RotateCw, label: 'Rotate Figgy', room: 'Living room · 8:12 AM', color: C.rotate, done: true },
]

const Corner = ({ className }) => <div className={`absolute w-8 h-8 border-white ${className}`} />

const SLIDES = [
  {
    title: 'Every plant,\non schedule',
    text: 'Watering, misting and feeding for each room, with a gentle nudge at 8:00 AM.',
    art: (
      <div className="relative w-72 h-80 mx-auto">
        <Glow color={C.fertilize} size={300} opacity={0.35} />
        <Photo q="monstera in white pot" className="absolute left-6 top-0 w-60 h-64 rounded-[32px] rotate-3 shadow-sm" />
        <div className="absolute left-0 right-4 bottom-0 bg-card rounded-card p-3 shadow-lg vs-float -rotate-2">
          <div className="text-caption1 font-semibold opacity-60 px-1 mb-1">Today · 2 of 5 done</div>
          {TASKS.map((t) => (
            <div key={t.label} className="flex items-center gap-3 py-1.5 px-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: tint(t.color, 18) }}>
                <t.icon className="w-4 h-4" style={{ color: t.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-subhead font-semibold truncate ${t.done ? 'opacity-50 line-through' : ''}`}>{t.label}</div>
                <div className="text-caption2 text-black/55 dark:text-white/55 truncate">{t.room}</div>
              </div>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={t.done ? { background: C.fertilize } : { boxShadow: `inset 0 0 0 2px ${tint(C.fertilize, 50)}` }}
              >
                {t.done && <Check className="w-4 h-4 text-white" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Snap to identify\nany plant',
    text: 'Point your camera at a leaf or flower and meet your new plant in a moment.',
    art: (
      <div className="relative w-72 h-80 mx-auto">
        <Glow color={C.repot} size={300} opacity={0.3} />
        <Photo q="peace lily white flower" className="absolute inset-x-2 top-0 h-72 rounded-[32px] overflow-hidden">
          <div className="absolute inset-10">
            <Corner className="top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl" />
            <Corner className="top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl" />
            <Corner className="bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl" />
            <Corner className="bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl" />
          </div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-caption1 text-white">
            <ScanLine className="w-4 h-4" /> Scanning
          </div>
        </Photo>
        <div className="absolute left-6 right-6 bottom-0 bg-card rounded-card p-3 shadow-lg vs-float flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: tint(C.fertilize, 18) }}>🌸</div>
          <div className="flex-1 min-w-0">
            <div className="text-headline truncate">Peace lily</div>
            <div className="text-caption1 text-black/55 dark:text-white/55 italic truncate">Spathiphyllum wallisii</div>
          </div>
          <div className="text-headline" style={{ color: C.fertilize }}>94%</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Diagnose problems\nin seconds',
    text: 'Tell us what you see and get a calm, step-by-step plan to help it recover.',
    art: (
      <div className="relative w-72 h-80 mx-auto">
        <Glow color={C.mist} size={300} opacity={0.3} />
        <Photo q="yellow monstera leaf" className="absolute right-2 top-0 w-60 h-60 rounded-[32px] -rotate-3" />
        <div className="absolute left-0 top-6 flex flex-col gap-2 vs-float">
          {['🟡 Yellow leaves', '🤎 Brown tips'].map((s, i) => (
            <div
              key={s}
              className="rounded-full px-3 py-1.5 text-footnote font-semibold bg-card shadow-sm"
              style={i === 0 ? { boxShadow: `inset 0 0 0 2px ${C.mist}` } : undefined}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="absolute left-4 right-2 bottom-0 bg-card rounded-card p-4 shadow-lg vs-float rotate-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: tint(C.water, 18) }}>
              <Stethoscope className="w-4 h-4" style={{ color: C.water }} />
            </div>
            <div className="flex-1 text-headline">Overwatering</div>
            <div className="text-headline" style={{ color: C.water }}>82%</div>
          </div>
          <div className="mt-3"><Meter value={0.82} color={C.water} /></div>
          <div className="mt-2 text-caption1 text-black/55 dark:text-white/55">Check the top 5 cm of soil first</div>
        </div>
      </div>
    ),
  },
]

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const [startX, setStartX] = useState(null)
  const s = SLIDES[i]
  const last = i === SLIDES.length - 1

  const onTouchEnd = (e) => {
    if (startX === null) return
    const dx = e.changedTouches[0].clientX - startX
    if (dx < -40 && i < SLIDES.length - 1) setI(i + 1)
    if (dx > 40 && i > 0) setI(i - 1)
    setStartX(null)
  }

  return (
    <Page className="flex flex-col">
      <div className="absolute inset-0 pointer-events-none" style={{ background: tint(C.fertilize, 14) }} />
      <div className="relative flex flex-col flex-1 min-h-full">
        <div className="flex items-center justify-between px-4 pt-14 h-24">
          <div className="text-headline" style={{ color: C.fertilize }}>🌿 Leaflet</div>
          {!last && <Link onClick={() => nav.push('my-plants')}>Skip</Link>}
        </div>
        <div
          key={i}
          className="flex-1 flex flex-col justify-center vs-rise"
          onTouchStart={(e) => setStartX(e.touches[0].clientX)}
          onTouchEnd={onTouchEnd}
        >
          {s.art}
          <Block className="text-center !mt-10">
            <h1 className="text-large-title whitespace-pre-line">{s.title}</h1>
            <p className="mt-4 text-body opacity-60">{s.text}</p>
          </Block>
        </div>
        <div className="mb-6"><Dots count={SLIDES.length} active={i} /></div>
        <Block className="!mb-12">
          <Button large rounded onClick={() => (last ? nav.push('my-plants') : setI(i + 1))}>
            {last ? 'Get started' : 'Continue'}
          </Button>
          <div className="text-center mt-4 text-subhead">
            <span className="opacity-60">Already have an account? </span>
            <Link onClick={() => nav.push('my-plants')}>Log in</Link>
          </div>
        </Block>
      </div>
    </Page>
  )
}
