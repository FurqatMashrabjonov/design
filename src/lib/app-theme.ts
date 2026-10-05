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
 * PAL-01: each set is drawn in OKLCH at one lightness and chroma per style (yellows and limes a step lighter, or they
 * turn olive), so no colour shouts over the others; before, a set spanned up to 0.38 in lightness and Editorial's
 * first colour was black.
 */
const PALETTE_BY_STYLE: Record<AppStyle, string[]> = {
  clean: ['#3c7fed', '#129b6b', '#d38914', '#8a68e3', '#da4b48', '#1093aa', '#d04a8a', '#72b01b'],
  midnight: ['#95cc48', '#0acde9', '#fd9b67', '#dbb319', '#fe8dc5', '#19d798', '#a5b1fd', '#ff93a0'],
  vivid: ['#fa570e', '#d8a614', '#11ae89', '#8d80fe', '#fb4580', '#0da1de', '#49b007', '#f3950b'],
  soft: ['#c48969', '#6ba882', '#a78ac1', '#6f9ccb', '#cdac72', '#c7828b', '#55aa9d', '#9e8dc7'],
  editorial: ['#934319', '#963e35', '#3a5aa1', '#a3640f', '#0f6e51', '#6d4a94', '#933c56', '#0f6880'],
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
// OKLCH (Björn Ottosson's Oklab, polar): lightness moves without dragging the chroma down with it.
const toLin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
function oklch(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [toLin((n >> 16) & 255), toLin((n >> 8) & 255), toLin(n & 255)]
  const [l, m, s] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b].map(Math.cbrt) as [number, number, number]
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(A, B), Math.atan2(B, A)]
}
function fromOklch(L: number, C: number, H: number): string {
  for (let c = C; ; c -= 0.005) {
    const a = Math.max(0, c) * Math.cos(H), b = Math.max(0, c) * Math.sin(H)
    const [l, m, s] = [L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.291485548 * b].map((x) => x ** 3) as [number, number, number]
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(toSrgb)
    if (c <= 0 || rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`
  }
}
/** The colour, darkened in small OKLCH steps (its chroma kept) until white text on it reaches 3.5:1, and how many
 *  steps it took. Darkening in RGB greyed it: a neon on Midnight came out as dusty mustard. */
function darkened(hex: string): { color: string; steps: number } {
  const [L, C, H] = oklch(hex)
  let c = hex
  let k = 0
  for (; k < 30 && 1.05 / (luminance(c) + 0.05) < 3.5; k++) c = fromOklch(L - 0.025 * (k + 1), C, H)
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
  const tries = order.map(darkened)
  const pick = tries.find((d) => d.steps <= 3) ?? tries.reduce((a, b) => (b.steps < a.steps ? b : a)) // else the one that darkens least
  return { accent: pick.color, palette }
}
