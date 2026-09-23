// Project-level theme overrides, applied on top of a screen at render time.
//
// Generated screens reference the design system only through CSS custom properties, and the
// normalizer forces those properties onto every screen. So restyling the whole app is a matter
// of redefining a few properties after the screen's own :root — no LLM call, no rewrite of the
// stored HTML, and "reset" is just deleting the override.
//
// The stored theme is a handful of validated ids and a hex colour; CSS is generated from it
// here. Nothing user-supplied is ever concatenated into a stylesheet as-is.

export type Radius = 'sharp' | 'soft' | 'round'

/** The colour tokens every design system defines (services.check enforces the schema), editable one by one. */
// UI-04: `hint` says what a token paints, so the panel does not assume the reader knows the names.
export const COLOR_TOKENS = [
  { id: 'bg', label: 'Background', hint: 'The page behind everything.' },
  { id: 'surface', label: 'Card / surface', hint: 'Cards, sheets and the bars that sit on the page.' },
  { id: 'surface-warm', label: 'Surface 2', hint: 'The second surface: inputs, list rows, quiet panels.' },
  { id: 'fg', label: 'Text', hint: 'Headings and body text.' },
  { id: 'fg-2', label: 'Secondary text', hint: 'Supporting lines next to the main text.' },
  { id: 'muted', label: 'Muted text', hint: 'Labels, captions and placeholders.' },
  { id: 'border', label: 'Border', hint: 'Hairlines around cards, inputs and dividers.' },
  { id: 'success', label: 'Success', hint: 'Done, paid, in stock.' },
  { id: 'warn', label: 'Warning', hint: 'Pending, low balance, careful.' },
  { id: 'danger', label: 'Danger', hint: 'Errors and destructive actions.' },
] as const
export type ColorToken = (typeof COLOR_TOKENS)[number]['id']

export type Theme = {
  accent?: string
  /** A preset (from chat: "rounder corners"). The slider's radiusPx wins when both are set. */
  radius?: Radius
  /** The slider: the medium radius in px (0–40); small and large scale from it. */
  radiusPx?: number
  /** Squircle corners where the browser has corner-shape; plain rounded corners elsewhere. */
  shape?: 'round' | 'squircle'
  colors?: Partial<Record<ColorToken, string>>
  headingFont?: string
  bodyFont?: string
}

type FontKind = 'sans' | 'serif'
export type FontOption = { id: string; label: string; family: string; kind: FontKind }

export const FONTS: FontOption[] = [
  { id: 'inter', label: 'Inter', family: 'Inter', kind: 'sans' },
  { id: 'geist', label: 'Geist', family: 'Geist', kind: 'sans' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans', kind: 'sans' },
  { id: 'manrope', label: 'Manrope', family: 'Manrope', kind: 'sans' },
  { id: 'dm-sans', label: 'DM Sans', family: 'DM Sans', kind: 'sans' },
  { id: 'figtree', label: 'Figtree', family: 'Figtree', kind: 'sans' },
  { id: 'outfit', label: 'Outfit', family: 'Outfit', kind: 'sans' },
  { id: 'sora', label: 'Sora', family: 'Sora', kind: 'sans' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: 'Space Grotesk', kind: 'sans' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', kind: 'sans' },
  { id: 'nunito-sans', label: 'Nunito Sans', family: 'Nunito Sans', kind: 'sans' },
  { id: 'archivo', label: 'Archivo', family: 'Archivo', kind: 'sans' },
  { id: 'newsreader', label: 'Newsreader', family: 'Newsreader', kind: 'serif' },
  { id: 'source-serif', label: 'Source Serif 4', family: 'Source Serif 4', kind: 'serif' },
  { id: 'lora', label: 'Lora', family: 'Lora', kind: 'serif' },
  { id: 'fraunces', label: 'Fraunces', family: 'Fraunces', kind: 'serif' },
  { id: 'playfair', label: 'Playfair Display', family: 'Playfair Display', kind: 'serif' },
]

const FALLBACK: Record<FontKind, string> = {
  sans: '-apple-system, "Segoe UI", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
}

// [sm, md, lg] in px — controls, cards, large panels.
const RADII: Record<Radius, [number, number, number]> = {
  sharp: [2, 4, 6],
  soft: [10, 16, 24],
  round: [16, 24, 32],
}

const HEX = /^#[0-9a-f]{6}$/i
export const THEME_STYLE_ID = '__od_theme'
const FONT_HOST = 'https://fonts.googleapis.com/'

const fontById = (id: string) => FONTS.find((f) => f.id === id)

/** Keep only values this module knows how to render. Anything else is dropped, not escaped. */
export function sanitizeTheme(input: unknown): Theme {
  if (!input || typeof input !== 'object') return {}
  const raw = input as Record<string, unknown>
  const out: Theme = {}
  if (typeof raw.accent === 'string' && HEX.test(raw.accent)) out.accent = raw.accent.toLowerCase()
  if (typeof raw.radius === 'string' && raw.radius in RADII) out.radius = raw.radius as Radius
  if (typeof raw.radiusPx === 'number' && Number.isFinite(raw.radiusPx)) out.radiusPx = Math.round(Math.min(40, Math.max(0, raw.radiusPx)))
  if (raw.shape === 'squircle') out.shape = 'squircle'
  if (raw.colors && typeof raw.colors === 'object') {
    const colors: Partial<Record<ColorToken, string>> = {}
    for (const { id } of COLOR_TOKENS) {
      const v = (raw.colors as Record<string, unknown>)[id]
      if (typeof v === 'string' && HEX.test(v)) colors[id] = v.toLowerCase()
    }
    if (Object.keys(colors).length) out.colors = colors
  }
  if (typeof raw.headingFont === 'string' && fontById(raw.headingFont)) out.headingFont = raw.headingFont
  if (typeof raw.bodyFont === 'string' && fontById(raw.bodyFont)) out.bodyFont = raw.bodyFont
  return out
}

export function parseTheme(json: string | null | undefined): Theme {
  if (!json) return {}
  try {
    return sanitizeTheme(JSON.parse(json))
  } catch {
    return {}
  }
}

export function isEmptyTheme(theme: Theme | null | undefined): boolean {
  return !theme || Object.keys(theme).length === 0
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

/** Text colour for a filled accent: whichever of white / near-black contrasts more. */
export function onAccent(hex: string): string {
  const l = luminance(hex)
  const white = 1.05 / (l + 0.05)
  const dark = (l + 0.05) / (luminance('#111111') + 0.05)
  return white >= dark ? '#ffffff' : '#111111'
}

function fontStack(id: string): string {
  const f = fontById(id)!
  return `"${f.family}", ${FALLBACK[f.kind]}`
}

export function fontUrl(id: string): string {
  const f = fontById(id)!
  return `${FONT_HOST}css2?family=${f.family.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
}

export function themeCss(theme: Theme): string {
  const t = sanitizeTheme(theme)
  const decls: string[] = []
  if (t.accent) {
    decls.push(
      `--accent:${t.accent}`,
      `--accent-on:${onAccent(t.accent)}`,
      '--accent-hover:color-mix(in oklab,var(--accent),black 8%)',
      '--accent-active:color-mix(in oklab,var(--accent),black 14%)',
    )
  }
  const radii = radiiOf(t)
  if (radii) decls.push(`--radius-sm:${radii[0]}px`, `--radius-md:${radii[1]}px`, `--radius-lg:${radii[2]}px`)
  for (const [id, hex] of Object.entries(t.colors ?? {})) decls.push(`--${id}:${hex}`)
  if (t.headingFont) decls.push(`--font-display:${fontStack(t.headingFont)}`)
  if (t.bodyFont) decls.push(`--font-body:${fontStack(t.bodyFont)}`)
  let css = decls.length ? `:root{${decls.join(';')}}` : ''
  // A squircle with the same radius reads flatter than a circle arc, so it gets ~1.5× the radius.
  // Browsers without corner-shape (Safari, Firefox today) skip the block and keep round corners.
  if (t.shape === 'squircle') {
    const [sm, md, lg] = radii ?? [8, 12, 16]
    css += `@supports (corner-shape:squircle){:root{--radius-sm:${Math.round(sm * 1.5)}px;--radius-md:${Math.round(md * 1.5)}px;--radius-lg:${Math.round(lg * 1.5)}px}*,*::before,*::after{corner-shape:squircle}}`
  }
  return css
}

/** [sm, md, lg] from the slider (md, scaled) or the preset; null leaves the system's own. */
function radiiOf(t: Theme): [number, number, number] | null {
  if (t.radiusPx !== undefined) return [Math.round(t.radiusPx * 0.6), t.radiusPx, Math.round(t.radiusPx * 1.5)]
  return t.radius ? RADII[t.radius] : null
}

export function themeFontUrls(theme: Theme): string[] {
  const t = sanitizeTheme(theme)
  return [...new Set([t.headingFont, t.bodyFont].filter((id): id is string => !!id).map(fontUrl))]
}

function inject(html: string, where: 'head' | 'body', snippet: string): string {
  const close = where === 'head' ? /<\/head>/i : /<\/body>/i
  if (close.test(html)) return html.replace(close, () => `${snippet}${where === 'head' ? '</head>' : '</body>'}`)
  return html + snippet
}

/**
 * Static overlay, for anything that leaves the app (export, copy, code view, shared preview).
 * Appended after the screen's own :root so it wins the cascade without needing !important.
 */
export function applyThemeOverride(html: string, theme: Theme | null | undefined): string {
  if (isEmptyTheme(theme)) return html
  const t = sanitizeTheme(theme)
  const fonts = themeFontUrls(t)
    .map((u) => `<link data-od-font data-od-theme-font="${u}" rel="stylesheet" href="${u}">`)
    .join('')
  let out = html
  if (fonts) out = inject(out, 'head', fonts)
  const css = themeCss(t)
  if (css) out = inject(out, 'body', `<style id="${THEME_STYLE_ID}">${css}</style>`)
  return out
}

// Runs inside the sandboxed iframe. Only the parent window may drive it, and only stylesheet
// URLs on the Google Fonts host are honoured, so a stray postMessage can't load anything else.
const LIVE_LISTENER = `<script id="__od_theme_listener">
window.addEventListener('message', function (e) {
  if (e.source !== window.parent) return;
  var d = e.data;
  if (!d || d.type !== 'od:theme') return;
  var s = document.getElementById('${THEME_STYLE_ID}');
  if (!s) { s = document.createElement('style'); s.id = '${THEME_STYLE_ID}'; document.body.appendChild(s); }
  s.textContent = typeof d.css === 'string' ? d.css : '';
  (d.fonts || []).forEach(function (u) {
    if (typeof u !== 'string' || u.indexOf('${FONT_HOST}') !== 0) return;
    if (document.querySelector('link[data-od-theme-font="' + u + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = u; l.setAttribute('data-od-theme-font', u);
    document.head.appendChild(l);
  });
});
</script>`

/** Overlay plus a listener, so the editor can restyle an open frame without reloading it. */
export function withLiveTheme(html: string, theme: Theme | null | undefined): string {
  return inject(applyThemeOverride(html, theme), 'body', LIVE_LISTENER)
}

/** Payload for the live listener. Always sanitized on the way out. */
export function themeMessage(theme: Theme | null | undefined) {
  const t = sanitizeTheme(theme)
  return { type: 'od:theme', css: themeCss(t), fonts: themeFontUrls(t) }
}
