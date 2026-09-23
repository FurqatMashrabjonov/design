// Colour arithmetic shared by the theme layer, the palette builder and the linter.
//
// One rule runs through all of it: a colour may move in lightness, never in hue. A palette the
// model invented is a judgement about character — "warm terracotta", "cold clinical blue" — and
// darkening a swatch until it passes AA keeps that judgement while making the text readable.
// Replacing it with a safe grey would pass the same test and throw the judgement away.

export type Rgb = [number, number, number]

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value.trim())
}

/** Accepts #abc and #aabbcc, in any case; null for anything else. */
export function toRgb(hex: unknown): Rgb | null {
  const m = HEX.exec(String(hex ?? '').trim())
  if (!m) return null
  const h = m[1]!.length === 3 ? m[1]!.split('').map((c) => c + c).join('') : m[1]!
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

export function toHex([r, g, b]: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return '#' + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')
}

/** WCAG relative luminance. */
export function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1–21. Order does not matter. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/** Text colour for a filled swatch: whichever of white / near-black contrasts more. */
export function inkOn(rgb: Rgb): Rgb {
  return contrast(rgb, [255, 255, 255]) >= contrast(rgb, [17, 17, 17]) ? [255, 255, 255] : [17, 17, 17]
}

// --- HSL, so a colour can be moved in lightness with its hue left alone ------------------------

export type Hsl = { h: number; s: number; l: number }

export function toHsl([r, g, b]: Rgb): Hsl {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === rr ? ((gg - bb) / d + (gg < bb ? 6 : 0)) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

export function fromHsl({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    let x = (t + 360) % 360 / 360
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [channel(h + 120), channel(h), channel(h - 120)].map((v) => Math.round(v * 255)) as Rgb
}

/** Same hue and saturation, new lightness (0–1). */
export function withLightness(rgb: Rgb, l: number): Rgb {
  return fromHsl({ ...toHsl(rgb), l: Math.max(0, Math.min(1, l)) })
}

/**
 * A flat blend, used for borders and for the tint a chip's background sits at.
 *
 * Rounded to whole channels because that is what a hex value can hold: an unrounded blend measures
 * a fraction better than the colour actually written to CSS, which is enough to put a pair that
 * just cleared its target back under it.
 */
export function mix(a: Rgb, b: Rgb, amountOfB: number): Rgb {
  const t = Math.max(0, Math.min(1, amountOfB))
  return [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * t)) as Rgb
}

/**
 * Moves `ink` in lightness until it clears `target` against every background, keeping its hue.
 *
 * Direction is decided once, by whichever end the backgrounds are furthest from: ink on a light
 * page walks toward black, ink on a dark page toward white. Stepping 1% at a time and stopping at
 * the first pass keeps the colour as close to what was asked for as the requirement allows.
 * Returns the nearest attempt when even the endpoint cannot pass — a 1-in-21 ratio is arithmetic,
 * not something a caller can retry differently.
 */
/**
 * The quietest version of `ink` that still clears `target` — the mirror of ensureContrast.
 *
 * A ramp of quiet tones cannot be built by repair alone: ensureContrast only ever raises contrast,
 * so three tones asked for 7:1, 5.5:1 and 4.5:1 all come back as the colour that already passed,
 * and the page loses its hierarchy. This walks the other way, toward the page, and keeps the last
 * step that still passes.
 */
export function quietestAt(ink: Rgb, backgrounds: Rgb[], target: number): Rgb {
  const worst = (c: Rgb) => Math.min(...backgrounds.map((bg) => contrast(c, bg)))
  if (backgrounds.length === 0) return ink
  const lightest = Math.max(...backgrounds.map((bg) => luminance(bg)))
  const toward = lightest > 0.18 ? 1 : 0 // fade up into a light page, down into a dark one
  const { l } = toHsl(ink)
  let best = ink
  for (let step = 1; step <= 100; step++) {
    const next = withLightness(ink, l + (toward - l) * (step / 100))
    if (worst(next) < target) break
    best = next
  }
  return best
}

export function ensureContrast(ink: Rgb, backgrounds: Rgb[], target = 4.5): Rgb {
  const worst = (c: Rgb) => Math.min(...backgrounds.map((bg) => contrast(c, bg)))
  if (backgrounds.length === 0 || worst(ink) >= target) return ink
  const lightest = Math.max(...backgrounds.map((bg) => luminance(bg)))
  const toward = lightest > 0.18 ? 0 : 1 // dark ink on a light page, light ink on a dark one
  const { l } = toHsl(ink)
  let best = ink
  let bestRatio = worst(ink)
  for (let step = 1; step <= 100; step++) {
    const next = withLightness(ink, l + (toward - l) * (step / 100))
    const ratio = worst(next)
    if (ratio > bestRatio) {
      best = next
      bestRatio = ratio
    }
    if (ratio >= target) return next
  }
  return best
}
