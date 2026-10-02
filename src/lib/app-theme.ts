// The app's own look — accent, light/dark and platform — stored in projects.theme and shared by the server
// (the screen's page) and the studio (the Theme panel, frame URLs). Not the studio's light/dark: that is the
// person's, this is the app's.
export type Platform = 'ios' | 'material'
/** THM-01: the five looks of top apps (runtime/kit/styles.js holds their surfaces, corners and fonts). */
export const APP_STYLES = ['clean', 'midnight', 'vivid', 'soft', 'editorial'] as const
export type AppStyle = (typeof APP_STYLES)[number]
export type AppTheme = { accent: string; dark: boolean; platform: Platform; style: AppStyle }

export const DEFAULT_THEME: AppTheme = { accent: '#5e5ce6', dark: false, platform: 'ios', style: 'clean' }
export const parseStyleName = (s: unknown): AppStyle => ((APP_STYLES as readonly unknown[]).includes(s) ? (s as AppStyle) : 'clean')
const HEX = /^#[0-9a-f]{6}$/i

/** Validated at every boundary: anything unknown falls back to the default. */
export function parseAppTheme(input: unknown): AppTheme {
  let t: Record<string, unknown> = {}
  try {
    t = (typeof input === 'string' ? JSON.parse(input) : input) ?? {}
  } catch {}
  return {
    accent: typeof t.accent === 'string' && HEX.test(t.accent) ? t.accent.toLowerCase() : DEFAULT_THEME.accent,
    dark: t.dark === true,
    platform: t.platform === 'material' ? 'material' : 'ios',
    style: parseStyleName(t.style),
  }
}

/** The query a frame asks for, so a change is a new URL (and never a stale cached page). */
export const themeQuery = (t: AppTheme) => `a=${t.accent.slice(1)}&p=${t.platform}&s=${t.style}${t.dark ? '&dark=1' : ''}`

/** A frame URL's theme: whatever it names wins over the stored one (the panel shows a change before it is saved). */
export function themeFromQuery(q: URLSearchParams, stored: AppTheme): AppTheme {
  const a = q.get('a')
  return {
    accent: a && HEX.test(`#${a}`) ? `#${a.toLowerCase()}` : stored.accent,
    dark: q.has('dark') ? q.get('dark') === '1' : stored.dark,
    platform: q.get('p') === 'material' ? 'material' : q.get('p') === 'ios' ? 'ios' : stored.platform,
    style: q.has('s') ? parseStyleName(q.get('s')) : stored.style,
  }
}

/** iOS system colours, the accents the Theme panel offers. */
export const ACCENTS = ['#007aff', '#5e5ce6', '#af52de', '#ff2d55', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#30b0c7', '#a2845e', '#1c1c1e']

/**
 * THM-01: colours are picked in code, per style, never by the model — the planner used to be shown eight iOS hues
 * and every app came back in the same eight (five apps in a row, 2026-09-29). Each style has its own set; the
 * project id picks where the app's palette starts, so the same brief twice is two different apps. The accent is
 * the palette's first colour, darkened until a button with white text reads (≥3.5:1): buttons and the things the
 * app tracks are one family — an accent picked on its own clashed with the palette (a blue button on an orange app).
 */
const PALETTE_BY_STYLE: Record<AppStyle, string[]> = {
  clean: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'],
  midnight: ['#a3e635', '#22d3ee', '#f97316', '#facc15', '#f472b6', '#34d399', '#818cf8', '#fb7185'],
  vivid: ['#ff6b35', '#ffc300', '#00c49a', '#7b61ff', '#ff3d7f', '#00a8e8', '#58cc02', '#ff9f1c'],
  soft: ['#d0845a', '#6f9e80', '#9b7bb8', '#5f8fc0', '#c99a3e', '#c07580', '#5f9e94', '#8a7bb0'],
  editorial: ['#111111', '#b91c1c', '#1d4ed8', '#a16207', '#047857', '#6b21a8', '#be185d', '#0e7490'],
}
/** FNV-1a with a murmur finaliser: plain FNV's low bits barely move for ids like eval-shop / eval-travel. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}
/** The colour, darkened in small steps until white text on it reaches 3.5:1 (and how many steps it took). */
function darkened(hex: string): { color: string; steps: number } {
  let c = hex
  let k = 0
  for (; k < 30 && 1.05 / (luminance(c) + 0.05) < 3.5; k++) {
    const n = parseInt(c.slice(1), 16)
    const d = (v: number) => Math.round(v * 0.94).toString(16).padStart(2, '0')
    c = `#${d((n >> 16) & 255)}${d((n >> 8) & 255)}${d(n & 255)}`
  }
  return { color: c, steps: k }
}
export const readableOnWhite = (hex: string) => darkened(hex).color
/** ONB-01: one of `options`, chosen by the seed (the project id) and a salt, so a choice is stable per app and spread
 *  across apps — the model, given the choice, put every app in the same one. */
export const seededPick = <T,>(options: readonly T[], seed: string, salt: string): T => options[hash(`${seed}:${salt}`) % options.length]!
/** The accent and one colour per palette key for this app: from its style's set, starting where the seed says. */
export function styleColors(style: AppStyle, keys: string[], seed: string): { accent: string; palette: Record<string, string> } {
  const set = PALETTE_BY_STYLE[style]
  const start = hash(seed) % set.length
  const palette = Object.fromEntries(keys.map((k, i) => [k, set[(start + i) % set.length]!]))
  // A bright yellow darkened to white-text contrast turns muddy: the accent is the first of the app's colours
  // that gets there in a few steps, in the palette's order.
  const order = [...set.slice(start), ...set.slice(0, start)]
  const pick = order.map(darkened).find((d) => d.steps <= 4) ?? darkened(order[0]!)
  return { accent: pick.color, palette }
}
