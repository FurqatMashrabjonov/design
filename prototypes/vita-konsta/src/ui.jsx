import { useEffect, useState } from 'react'

// Gallery frames (?screen=) show each screen settled: no draw-in, no count-up, no entrance motion.
export const STATIC = typeof location !== 'undefined' && new URLSearchParams(location.search).has('screen')

/** A progress ring that draws itself in on mount. */
export function Ring({ value, size = 64, stroke = 8, color = 'var(--color-primary)', track, children, delay = 0 }) {
  const [v, setV] = useState(STATIC ? Math.min(1, value) : 0)
  useEffect(() => {
    const t = setTimeout(() => setV(Math.min(1, value)), 60 + delay)
    return () => clearTimeout(t)
  }, [value, delay])
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? `color-mix(in oklab, ${color} 18%, transparent)`} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}

/** Counts up to a number on mount — the dashboard figures arrive rather than appear. */
export function CountUp({ to, duration = 900, format = (n) => n.toLocaleString('en-US') }) {
  const [n, setN] = useState(STATIC ? to : 0)
  useEffect(() => {
    if (STATIC) return setN(to)
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <>{format(n)}</>
}

export function Bars({ values, goal, color, labels, height = 120, highlight = values.length - 1 }) {
  const max = Math.max(goal ?? 0, ...values)
  return (
    <div>
      <div className="relative flex items-end justify-between gap-2" style={{ height }}>
        {goal && <div className="absolute left-0 right-0 border-t border-dashed opacity-40" style={{ bottom: (goal / max) * height, borderColor: color }} />}
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <div className="w-full max-w-7 rounded-lg vs-rise" style={{ height: Math.max(6, (v / max) * height), background: i === highlight ? color : `color-mix(in oklab, ${color} 40%, transparent)`, animationDelay: `${i * 50}ms` }} />
          </div>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between gap-2 mt-2">
          {labels.map((l, i) => <span key={i} className={`flex-1 text-center text-xs ${i === highlight ? 'font-semibold' : 'opacity-50'}`}>{l}</span>)}
        </div>
      )}
    </div>
  )
}

export function Area({ values, color, height = 110 }) {
  const w = 320
  const max = Math.max(...values) * 1.1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - (v / max) * height])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const id = `g${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts.at(-1)[0] - 2} cy={pts.at(-1)[1]} r="5" fill={color} stroke="white" strokeWidth="2" />
    </svg>
  )
}

export function Avatar({ name, color, size = 44 }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <div className="rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, #ff375f))` }}>
      {initials}
    </div>
  )
}

/** An icon on a tinted rounded square — the iOS Settings look. */
export function Tile({ color, children, size = 30 }) {
  return (
    <span className="rounded-[8px] flex items-center justify-center text-white shrink-0" style={{ width: size, height: size, background: color }}>
      {children}
    </span>
  )
}

export function Confetti({ run }) {
  if (!run) return null
  const colors = ['#ff9f0a', '#0a84ff', '#30d158', '#ff375f', '#bf5af2', '#ffd60a']
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} className="vs-confetti" style={{ background: colors[i % colors.length], '--x': `${(i % 2 ? 1 : -1) * (30 + ((i * 47) % 170))}px`, animationDelay: `${(i % 6) * 40}ms`, left: `${35 + ((i * 13) % 30)}%` }} />
      ))}
    </div>
  )
}

/** The glass of water: the level rises with a moving wave on top. */
export function WaterGlass({ value, color = '#0a84ff' }) {
  const level = Math.min(1, value)
  return (
    <div className="relative mx-auto overflow-hidden" style={{ width: 150, height: 210, borderRadius: '18px 18px 44px 44px', background: `color-mix(in oklab, ${color} 10%, transparent)`, boxShadow: `inset 0 0 0 3px color-mix(in oklab, ${color} 30%, transparent)` }}>
      <div className="absolute left-0 right-0 bottom-0" style={{ height: `${level * 100}%`, transition: 'height 1s cubic-bezier(.2,.8,.2,1)' }}>
        <svg className="absolute -top-3 left-0 vs-wave" width="300" height="16" viewBox="0 0 300 16" preserveAspectRatio="none">
          <path d="M0 8 Q 37.5 0 75 8 T 150 8 T 225 8 T 300 8 V16 H0 Z" fill={color} />
        </svg>
        <div className="absolute inset-0 top-2" style={{ background: `linear-gradient(${color}, color-mix(in oklab, ${color} 70%, #5ac8fa))` }} />
      </div>
    </div>
  )
}
