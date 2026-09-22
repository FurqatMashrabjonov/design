// The platform numbers the checks share, in one place (HIG-03). The prompt states them in words
// (craft/mobile.md); the linter, the autofix and the render audit hold screens to these values.
// Sources: Apple HIG (Layout, Typography, Accessibility) and Material 3 — our wording, their numbers.

export const HIG = {
  /** Nothing on a phone screen is smaller than this, captions and tab labels included. */
  minFontPx: 11,
  /** Body copy. */
  bodyFontPx: { min: 15, max: 17 },
  /** Every tappable thing: icon buttons, chips, steppers, close buttons. */
  minTargetPx: 44,
  /** WCAG AA text contrast; large text is 24px and up (or 19px bold). */
  contrast: { text: 4.5, largeText: 3, largeTextPx: 24 },
  /** Bottom tab bar destinations. */
  tabs: { min: 2, max: 5 },
  /** Space between separate targets. */
  targetGapPx: 8,
} as const

/** Every px font size declared in the screen's CSS or inline styles (not the token block), and Tailwind's text-[Npx]. */
export function declaredFontSizes(css: string): number[] {
  const sizes = [...css.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi)].map((m) => Number(m[1]))
  const tw = [...css.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]))
  return [...sizes, ...tw]
}
