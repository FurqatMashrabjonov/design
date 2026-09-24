import { useEffect, useRef, useState } from 'react'
import { Phone, shot } from '@/Landing'

// UI-11: one real app (Ripple, from public/showcase) laid out as its screens link. Every edge is a
// real `data-od-tab` / `data-od-link` in those files — change the set and the edges change with it.
// Drawn at a fixed 1080 × 640 and scaled to the column, so the lines and the phones stay aligned.
const W = 1080
const H = 640
const PHONE_W = 170
const SET = 'ember-habit'

const SCREENS = [
  { i: 2, name: 'Create habit', x: 0, y: 210 },
  { i: 0, name: 'Today', x: 300, y: 90 },
  { i: 3, name: 'Progress', x: 600, y: 230 },
  { i: 1, name: 'Habit detail', x: 900, y: 110 },
]

// [path, label, label x, label y, kind]
const EDGES: [string, string, number, number, 'link' | 'tab'][] = [
  ['M296 210 C 236 210, 246 330, 186 330', 'link · Create habit', 242, 262, 'link'],
  ['M186 450 C 246 450, 236 380, 296 380', 'link · Save habit', 242, 436, 'link'],
  ['M486 360 C 546 360, 540 400, 596 400', 'tab · Progress', 540, 356, 'tab'],
  ['M596 470 C 540 470, 546 440, 486 440', 'tab · Today', 540, 478, 'tab'],
  ['M786 420 C 846 420, 836 300, 896 300', 'link · Habit detail', 842, 350, 'link'],
  ['M990 104 C 990 20, 390 10, 390 84', 'link · See today', 690, 36, 'link'],
]

export function AppMap() {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e!.contentRect.width / W)))
    ro.observe(el)
    // The lines draw in when the map scrolls into view, once.
    const io = new IntersectionObserver(([e]) => e!.isIntersecting && (setOn(true), io.disconnect()), { threshold: 0.3 })
    io.observe(el)
    return () => (ro.disconnect(), io.disconnect())
  }, [])
  return (
    <div ref={box} className="lm-map relative w-full" data-on={on || undefined} style={{ height: H * scale }}>
      <div className="absolute top-0 left-1/2 origin-top" style={{ width: W, height: H, transform: `translateX(-50%) scale(${scale})` }}>
        <svg className="absolute inset-0 overflow-visible text-foreground" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {EDGES.map(([d, , , , kind], k) => (
            <g key={k} style={{ ['--lm-delay' as string]: `${k * 180}ms` }}>
              <path d={d} pathLength={1} className="lm-edge" fill="none" stroke="currentColor" strokeOpacity={kind === 'tab' ? 0.35 : 0.55} strokeWidth={2} strokeLinecap="round" />
              <circle r={4.5} className="lm-dot fill-primary stroke-brand-ink" strokeWidth={1.5} style={{ offsetPath: `path('${d}')` }} />
            </g>
          ))}
        </svg>
        {SCREENS.map((s) => (
          <figure key={s.i} className="absolute m-0" style={{ left: s.x, top: s.y }}>
            <Phone src={shot(SET, s.i)} width={PHONE_W} />
            <figcaption className="mt-3 text-center text-sm font-medium text-muted-foreground">{s.name}</figcaption>
          </figure>
        ))}
        {EDGES.map(([, label, x, y], k) => (
          <span
            key={k}
            className="lm-label absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground shadow-1"
            style={{ left: x, top: y, ['--lm-delay' as string]: `${k * 180 + 400}ms` }}
          >
            <span className="font-normal text-muted-foreground">{label.split(' · ')[0]}</span> {label.split(' · ')[1]}
          </span>
        ))}
      </div>
    </div>
  )
}
