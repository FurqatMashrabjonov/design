import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The device every phone is drawn on, 390 × 844 at scale 1. */
export const PHONE = { width: 390, height: 844 }

/**
 * UI-10: the one device bezel of the studio (landing, dashboard). A warm ink bezel, the corner from
 * `--radius-phone` scaled by the frame's width, and the phone shadow. `width` is the screen's width;
 * the bezel adds to it. The screen inside is whatever the caller renders at `width` × 844·scale —
 * usually a scaled iframe, which keeps its own design-system styles.
 */
export function PhoneFrame({ width, children, notch = false, className }: { width: number; children: ReactNode; notch?: boolean; className?: string }) {
  const scale = width / PHONE.width
  const bezel = Math.max(3, Math.round(10 * scale))
  return (
    <div
      className={cn('relative shrink-0 bg-brand-ink shadow-phone ring-1 ring-brand-ink/10', className)}
      style={{ width: width + bezel * 2, padding: bezel, borderRadius: `calc(var(--radius-phone) * ${scale} + ${bezel}px)` }}
    >
      <div className="relative overflow-hidden bg-card" style={{ width, height: PHONE.height * scale, borderRadius: `calc(var(--radius-phone) * ${scale})` }}>
        {children}
        {notch && <span aria-hidden className="absolute left-1/2 -translate-x-1/2 rounded-full bg-brand-ink" style={{ top: 11 * scale, width: 120 * scale, height: 34 * scale }} />}
      </div>
    </div>
  )
}
