// THM-01: the app's style — one of five looks measured across 47 top iOS apps (2026-09-29): Clean (~30%),
// Midnight (~25%), Vivid, Soft and Editorial (~15% each). A style is surfaces, corners and type; the accent stays the
// app's own. It is applied as CSS variables, so switching style recolours every screen in place, no regeneration:
// Konsta's own surfaces (iOS --color-ios-*, Material --k-color-md-*) follow it, and so do the kit's classes a
// screen uses for its own boxes (bg-page, bg-card, rounded-card). Plain JS: the export copies runtime/kit as is.

export const STYLES = ['clean', 'midnight', 'vivid', 'soft', 'editorial']

const ROUNDED = 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif'
const SERIF = '"New York", ui-serif, "Iowan Old Style", Georgia, "Times New Roman", serif'

const TOKENS = {
  clean: { radius: 14, light: { page: '#f2f2f7', card: '#ffffff', card2: '#f7f7f8', line: '#e5e5ea' }, dark: { page: '#000000', card: '#1c1c1e', card2: '#121214', line: '#2c2c2e' } },
  midnight: { radius: 18, light: { page: '#f4f4f5', card: '#ffffff', card2: '#f7f7f8', line: '#e4e4e7' }, dark: { page: '#0a0a0b', card: '#161618', card2: '#1f1f22', line: '#2a2a2e' } },
  vivid: { radius: 24, tinted: true, body: ROUNDED, display: ROUNDED, light: { card: '#ffffff', card2: '#fbfbfb', line: '#ececec' }, dark: { page: '#111111', card: '#1d1d1f', card2: '#262628', line: '#303033' } },
  soft: { radius: 22, body: ROUNDED, display: ROUNDED, light: { page: '#f7f2ea', card: '#fffcf7', card2: '#f1ebe2', line: '#e8dfd3' }, dark: { page: '#181512', card: '#23201c', card2: '#2b2723', line: '#3a342e' } },
  // PAL-03: Editorial on warm paper, not white and pure black (the 2026 "elevated neutrals"; a magazine is printed on cream).
  editorial: { radius: 10, display: SERIF, light: { page: '#faf7f1', card: '#fffdf9', card2: '#f3efe7', line: '#e6e0d5' }, dark: { page: '#0e0d0b', card: '#181613', card2: '#201e1a', line: '#2f2c27' } },
}

export const parseStyle = (s) => (STYLES.includes(s) ? s : 'clean')

/** A colour mixed toward white — vivid's page is a light wash of the app's accent. */
function wash(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0')
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`
}

/** The style's surfaces, corners and fonts for this accent and mode. */
export function styleTokens(style, accent, dark) {
  const s = TOKENS[parseStyle(style)]
  const m = dark ? s.dark : s.light
  const page = m.page ?? (s.tinted && /^#[0-9a-f]{6}$/i.test(accent) ? wash(accent, 0.9) : '#f2f2f7')
  return { page, card: m.card, card2: m.card2, line: m.line, radius: s.radius, body: s.body ?? '', display: s.display ?? '' }
}

/** Sets the style on the document: the kit's variables and Konsta's surfaces for the mode on show. */
export function applyStyle(style, accent, dark, root = document.documentElement) {
  const t = styleTokens(style, accent, dark)
  const set = (k, v) => (v ? root.style.setProperty(k, v) : root.style.removeProperty(k))
  set('--app-page', t.page)
  set('--app-card', t.card)
  set('--app-card-2', t.card2)
  set('--app-line', t.line)
  set('--app-radius', `${t.radius}px`)
  set('--app-font-body', t.body)
  set('--app-font-display', t.display)
  root.toggleAttribute('data-app-font', !!t.body)
  root.toggleAttribute('data-app-display', !!t.display)
  const m = dark ? 'dark' : 'light'
  // iOS: the grouped page and the cards on it.
  set(`--color-ios-${m}-surface`, t.page)
  set(`--color-ios-${m}-surface-1`, t.card)
  set(`--color-ios-${m}-surface-2`, t.card2)
  set(`--color-ios-${m}-surface-3`, t.card)
  set(`--color-ios-${m}-surface-variant`, t.card2)
  // Material: the page and its tonal containers.
  set(`--k-color-md-${m}-surface`, t.page)
  for (const i of [1, 2, 3, 4, 5]) set(`--k-color-md-${m}-surface-${i}`, i <= 2 ? t.card : t.card2)
  set(`--k-color-md-${m}-surface-variant`, t.card2)
}
