import { useEffect, useId, useState } from 'react'
import { usePhotos } from './nav.jsx'
import { onColor } from './on-color.js'
export { onColor }

// A settled frame (thumbnails, screenshots: `?static`) draws every figure at its final value, with no motion.
export const STATIC = typeof location !== 'undefined' && new URLSearchParams(location.search).has('static')

// The model often passes a Tailwind class ("text-primary", "bg-blue-500") where a colour belongs; that is
// not CSS, so the figure drew nothing. Anything that is not a colour becomes the app's accent.
const PRIMARY = 'var(--color-primary)'
export const cssColor = (c) => (typeof c === 'string' && /^(#[0-9a-f]{3,8}|(rgb|hsl|oklch|oklab|color-mix|var)\(.*\)|[a-z]{3,20})$/i.test(c.trim()) && !/^(text|bg|fill|stroke|primary)$/i.test(c.trim()) ? c : PRIMARY)

/** A progress ring that draws itself in on mount. */
export function Ring({ value, size = 64, stroke = 8, color = 'var(--color-primary)', track, children, delay = 0 }) {
  color = cssColor(color)
  const [v, setV] = useState(STATIC ? Math.min(1, value) : 0)
  useEffect(() => {
    const t = setTimeout(() => setV(Math.min(1, value)), 60 + delay)
    return () => clearTimeout(t)
  }, [value, delay])
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div data-od-kit="Ring" className="relative shrink-0" style={{ width: size, height: size }}>
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
  color = cssColor(color)
  const max = Math.max(goal ?? 0, ...values)
  return (
    <div data-od-kit="Chart · bars">
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
  color = cssColor(color)
  const w = 320
  const max = Math.max(...values) * 1.1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - (v / max) * height])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const id = `g${useId().replace(/:/g, '')}` // a colour is not a valid id (var(--…) broke the fill)
  return (
    <svg data-od-kit="Chart · area" viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
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

/** A person: their portrait when `photo` names one ("portrait smiling young woman", looked up like Photo's `q`),
 *  initials on a gradient until it loads or when there is none (PRM-01: initials everywhere read as placeholders). */
export function Avatar({ name = '', color, size = 44, photo }) {
  color = cssColor(color)
  const p = usePhotos()[String(photo ?? '').toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 80)]
  const [loaded, setLoaded] = useState(STATIC)
  const [failed, setFailed] = useState(false)
  const initials = String(name).split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('')
  return (
    <div data-od-photo={photo || undefined} className="relative overflow-hidden rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, #ff375f))` }}>
      {initials}
      {p && !failed && <img src={p.u} alt="" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" style={{ opacity: loaded ? 1 : 0 }} />}
    </div>
  )
}

/** An icon (or an emoji) on a rounded square: solid with a white icon (iOS Settings), or `tinted` — a soft wash of the colour with the icon in it. */
export function Tile({ color, children, size = 30, tinted = false }) {
  color = cssColor(color)
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: size * 0.3, fontSize: size * 0.5, background: tinted ? tint(color) : color, color: tinted ? color : onColor(color) }}>
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
  color = cssColor(color)
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

/** A soft wash of a colour, for tinted cards, chips and tiles: `style={{ background: tint(C.water) }}`. */
export const tint = (color, pct = 16) => `color-mix(in oklab, ${cssColor(color)} ${pct}%, transparent)`
/** A two-stop gradient for a hero card. With no second stop it deepens a colour that carries white text and
 *  lightens one that carries ink, so the text on it keeps its contrast. Prefer <Hero>, which also sets the text colour. */
export const gradient = (color, to) => {
  const c = cssColor(color)
  const end = to ? cssColor(to) : onColor(c) === '#ffffff' ? `color-mix(in oklab, ${c} 78%, #000000)` : `color-mix(in oklab, ${c} 62%, #ffffff)`
  return `linear-gradient(150deg, ${c}, ${end})`
}

/** HIG-12: a hero / promo card (`as="button"` when it is tapped) on a gradient whose text colour is decided here (white or ink, whichever reads on
 *  `color`), so a light brand colour never carries white text. Corners and padding are defaults `className` can change. */
export function Hero({ as: Tag = 'div', color, to, className = '', style, children, ...rest }) {
  const c = cssColor(color)
  // A default the className sets itself is left out: two rounded-* on one element is a coin toss in Tailwind's order.
  const defaults = [!/\b(absolute|fixed|sticky)\b/.test(className) && 'relative', !/\brounded/.test(className) && 'rounded-[24px]', !/\bp[xytblr]?-/.test(className) && 'p-4', 'overflow-hidden text-left'].filter(Boolean).join(' ')
  return (
    <Tag {...rest} className={`${defaults} ${className}`} style={{ background: gradient(c, to), color: onColor(c), ...style }}>
      {children}
    </Tag>
  )
}

/** Concentric progress rings — the Activity look. `rings` outermost first: [{ value: 0–1, color }]. */
export function Rings({ rings, size = 140, stroke = 14, gap = 3, children }) {
  return (
    <div data-od-kit="Rings" className="relative shrink-0" style={{ width: size, height: size }}>
      {rings.map((r, i) => {
        const s = size - i * 2 * (stroke + gap)
        return s > stroke * 2 && (
          <div key={i} className="absolute" style={{ left: (size - s) / 2, top: (size - s) / 2 }}>
            <Ring value={r.value} size={s} stroke={stroke} color={r.color} delay={i * 120} />
          </div>
        )
      })}
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}

/** A contribution grid: one square per day, 7 rows, a column per week, oldest first. `values` are 0–1 (0 = nothing). */
export function Heatmap({ values, color, labels }) {
  color = cssColor(color)
  const weeks = Math.ceil(values.length / 7)
  return (
    <div data-od-kit="Heatmap">
      <div className="grid gap-[3px]" style={{ gridTemplateRows: 'repeat(7, 1fr)', gridTemplateColumns: `repeat(${weeks}, 1fr)`, gridAutoFlow: 'column' }}>
        {values.map((v, i) => (
          <span key={i} className="aspect-square rounded-[4px] vs-rise" style={{ animationDelay: `${Math.floor(i / 7) * 25}ms`, background: v > 0 ? `color-mix(in oklab, ${color} ${Math.round(30 + Math.min(1, v) * 70)}%, transparent)` : 'rgba(120,120,128,.14)' }} />
        ))}
      </div>
      {labels && <div className="flex justify-between mt-2 text-xs opacity-50">{labels.map((l) => <span key={l}>{l}</span>)}</div>}
    </div>
  )
}

/** A thin progress bar with a tinted track, for rows ("Meditate 100%") and goals. */
export function Meter({ value, color, height = 8 }) {
  color = cssColor(color)
  const [v, setV] = useState(STATIC ? Math.min(1, value) : 0)
  useEffect(() => {
    const t = setTimeout(() => setV(Math.min(1, value)), 80)
    return () => clearTimeout(t)
  }, [value])
  return (
    <div data-od-kit="Meter" className="w-full overflow-hidden rounded-full" style={{ height, background: tint(color, 18) }}>
      <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: color, transition: 'width 1s cubic-bezier(.2,.8,.2,1)' }} />
    </div>
  )
}

/** A blurred halo of colour behind artwork (onboarding, empty states, a hero figure). Put it in a `relative` box. */
export function Glow({ color, size = 260, opacity = 0.5 }) {
  color = cssColor(color)
  return <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" style={{ width: size, height: size, opacity, background: `radial-gradient(${color}, transparent 70%)` }} />
}

/** Pager dots for onboarding slides; the active one stretches. */
export function Dots({ count, active = 0 }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-2 rounded-full transition-all duration-300" style={{ width: i === active ? 22 : 8, background: i === active ? 'var(--color-primary)' : 'rgba(120,120,128,.3)' }} />
      ))}
    </div>
  )
}

/** An award badge in the iOS way: an emoji on a squircle tinted with its colour and a fine ring of it — no gloss, no
 *  glow (the owner's call: the glossy gold disc read as AI slop). `locked` greys it out. */
export function Medal({ emoji, color = '#ffb800', size = 64, locked = false }) {
  color = cssColor(color)
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: size * 0.3, fontSize: size * 0.46, background: locked ? 'rgba(120,120,128,.12)' : tint(color, 16), boxShadow: `inset 0 0 0 1.5px ${locked ? 'rgba(120,120,128,.18)' : tint(color, 38)}`, filter: locked ? 'grayscale(1)' : 'none', opacity: locked ? 0.5 : 1 }}>
      {emoji}
    </span>
  )
}

/** A real photo of what `q` describes ("grilled chicken salad", "beach villa bali"), looked up by the host.
 *  Size and corners come from `className` (e.g. "w-full h-48 rounded-3xl"); `children` sit on top of the photo
 *  (put a dark gradient under white text). With no photo found it is a soft block in the photo's own colour. */
export function Photo({ q = '', alt, className = '', style, children }) {
  const p = usePhotos()[String(q).toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 80)]
  const [loaded, setLoaded] = useState(STATIC)
  const [failed, setFailed] = useState(false)
  return (
    // `relative` only when the screen gives no position of its own: next to `absolute inset-0` it won (Tailwind puts
    // relative after absolute), the photo lost its height and a full-bleed onboarding showed white text on white.
    <div data-od-photo={q} className={`${/(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className) ? '' : 'relative '}overflow-hidden ${className}`} style={{ background: p?.c ?? 'rgba(120,120,128,.16)', ...style }}>
      {p && !failed && <img src={p.u} alt={alt ?? q} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" style={{ opacity: loaded ? 1 : 0 }} />}
      {children && <div className="relative h-full">{children}</div>}
    </div>
  )
}
