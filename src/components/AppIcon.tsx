import { useEffect } from 'react'
import { LoadingImage } from '@/components/LoadingImage'
import { iconKey, iconStops } from '@/lib/app-icon'

/** ICO-01: the app's icon — its emoji (Fluent 3D, from the screen runtime) on its accent; the initial without one. */
export function AppIcon({ emoji, accent, name, size = 64, className = '' }: { emoji?: string; accent: string; name: string; size?: number; className?: string }) {
  const [top, mid, bottom] = iconStops(accent)
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.2227, background: `linear-gradient(180deg, ${top}, ${mid} 55%, ${bottom})`, boxShadow: 'inset 0 0 0 0.5px rgb(255 255 255 / 25%), 0 8px 24px -10px rgb(0 0 0 / 35%)' }}
    >
      {emoji ? (
        <LoadingImage src={`/api/rt/emoji/${iconKey(emoji)}.webp`} alt="" draggable={false} loading="eager" className="rounded-none bg-transparent" style={{ width: size * 0.586, height: size * 0.586 }} />
      ) : (
        <span className="font-bold text-white" style={{ fontSize: size * 0.43 }}>{name.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  )
}

/** The moment an app opens: its icon and name on its own page colour, then the first screen (the preview). */
export function AppSplash({ emoji, accent, name, dark, leaving, onLeft }: { emoji?: string; accent: string; name: string; dark: boolean; leaving: boolean; onLeft: () => void }) {
  // Gone once its fade has run (a timer: transitionend does not always arrive); with reduced motion, at once.
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(onLeft, matchMedia('(prefers-reduced-motion: no-preference)').matches ? 450 : 0)
    return () => clearTimeout(t)
  }, [leaving]) // eslint-disable-line react-hooks/exhaustive-deps -- a new onLeft each render must not restart the fade
  return (
    <div className="od-splash absolute inset-0 z-20 flex flex-col items-center justify-center gap-4" data-leaving={leaving || undefined} style={{ background: dark ? '#000' : '#f2f2f7' }}>
      <AppIcon emoji={emoji} accent={accent} name={name} size={104} />
      <span className="text-[22px] font-semibold tracking-tight" style={{ color: dark ? '#fff' : '#1c1c1e' }}>{name}</span>
    </div>
  )
}
