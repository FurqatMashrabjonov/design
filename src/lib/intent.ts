// Some requests are not design work. "make it blue" is a change to the app's accent, which the
// theme layer applies to every screen at once, instantly and for free — sent to generation it
// became a new screen called "Blue Please — Accent Swatch". This recognises the theme requests it
// is sure about and leaves everything else to generation. ponytail: word lists, not a classifier;
// add a word when a real request slips through.

import type { Radius, Theme } from './theme-override.ts'

// `\b` only knows ASCII letters, so it never matches around Cyrillic; these boundaries are Unicode-aware.
const word = (alternatives: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, 'iu')

// Accessible mid-tones for each colour word. Deliberately none of the default-Tailwind violets the
// linter treats as "AI indigo", unless the person names indigo or violet themselves.
const COLORS: [RegExp, string, string][] = [
  [word("navy|dark blue|т[её]мно-синий"), '#1e3a8a', 'navy'],
  [word('sky ?blue|light blue|голуб\\p{L}*|havorang'), '#0284c7', 'sky blue'],
  [word("blue|ko['‘’]?k|син\\p{L}*"), '#2563eb', 'blue'],
  [word('teal|turquoise|бирюзов\\p{L}*'), '#0d9488', 'teal'],
  [word('cyan'), '#0891b2', 'cyan'],
  [word('mint|emerald'), '#059669', 'emerald'],
  [word('lime'), '#65a30d', 'lime'],
  [word('green|yashil|зел[её]н\\p{L}*'), '#16a34a', 'green'],
  [word('indigo'), '#4f46e5', 'indigo'],
  [word('violet'), '#7c3aed', 'violet'],
  [word('purple|binafsha|фиолетов\\p{L}*'), '#9333ea', 'purple'],
  [word('magenta|fuchsia'), '#c026d3', 'magenta'],
  [word('pink|pushti|розов\\p{L}*'), '#db2777', 'pink'],
  [word('rose|crimson'), '#e11d48', 'crimson'],
  [word('coral|salmon'), '#f0634f', 'coral'],
  [word("orange|to['‘’]?q sariq|оранжев\\p{L}*"), '#ea580c', 'orange'],
  [word('gold|amber'), '#b45309', 'amber'],
  [word('yellow|sariq|ж[её]лт\\p{L}*'), '#eab308', 'yellow'], // bright; the theme layer puts dark text on it (onAccent)
  [word('red|qizil|красн\\p{L}*'), '#dc2626', 'red'],
  [word('brown|jigarrang|коричнев\\p{L}*'), '#92400e', 'brown'],
  [word('black|qora|ч[её]рн\\p{L}*'), '#111111', 'black'],
]

// Words that point at a part of a screen: "make the header blue" is an edit, not a theme.
// Whole words ("navy" is a colour, not "nav").
const PART = word(
  'headers?|footers?|buttons?|btns?|cards?|text|titles?|headings?|icons?|images?|photos?|pictures?|tab ?bar|tabs?|nav|navigation|menus?|lists?|rows?|items?|badges?|chips?|background|bg|borders?|links?|inputs?|fields?|forms?|banners?|hero|logo|avatars?|sections?|screens?|pages?|sarlavha|tugma|rasm|matn|fon|кнопк\\p{L}*|заголов\\p{L}*|фон\\p{L}*|текст\\p{L}*|картинк\\p{L}*|экран\\p{L}*',
)
// Words that say "the whole app's colour" outright.
const THEME_WORD = word('accent|theme|primary|brand|colou?rs?|palette|rang\\p{L}*|mavzu|цвет\\p{L}*|тем[аыу]|акцент\\p{L}*')
const HEX = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i

export type Intent = { kind: 'theme'; theme: Partial<Theme>; summary: string } | { kind: 'generate' }

export function routeIntent(prompt: string, ctx: { elementSelected: boolean }): Intent {
  const text = prompt.trim()
  if (!text || ctx.elementSelected || text.length > 120 || PART.test(text)) return { kind: 'generate' }
  const words = text.split(/\s+/).length
  const sure = words <= 7 || THEME_WORD.test(text)

  const hex = text.match(HEX)?.[0]
  const named = COLORS.find(([re]) => re.test(text))
  if (sure && (hex || named)) {
    const accent = hex ? normalizeHex(hex) : named![1]
    return { kind: 'theme', theme: { accent }, summary: `the accent colour to ${hex ? accent : named![2]}` }
  }

  const radius: Radius | null = word('rounder|more round(?:ed)?|very round(?:ed)?|pill|yumaloq\\p{L}*').test(text)
    ? 'round'
    : word("sharper|square|sharp corners|no (?:rounded|round) corners|less round(?:ed)?|o['‘’]?tkir").test(text)
      ? 'sharp'
      : word('softer|slightly round(?:ed)?|soft corners').test(text)
        ? 'soft'
        : null
  if (radius && (words <= 7 || word('corners?|radius|edges|burchak\\p{L}*').test(text))) {
    return { kind: 'theme', theme: { radius }, summary: `corners to ${radius}` }
  }
  return { kind: 'generate' }
}

function normalizeHex(hex: string): string {
  const h = hex.slice(1).toLowerCase()
  return `#${h.length === 3 ? [...h].map((c) => c + c).join('') : h}`
}

// GQ-02: a brief often says the look it wants ("…with yellow accents", "primary colour teal",
// "#FFC107"). A colour counts only next to a word that makes it the app's colour — "a red wine
// shop" names a product, not a palette. Hex codes count anywhere.
const ACCENT_WORD = word("accents?|primary|brand|theme|palette|colou?rs?|colou?r scheme|highlights?|buttons?|cta|rang\\p{L}*|urg['‘’]?u|акцент\\p{L}*|цвет\\p{L}*").source
const NEAR = (color: string) =>
  new RegExp(`${color}(?:[\\s,/&-]+[\\p{L}'’]+){0,2}[\\s,/&-]+${ACCENT_WORD}|${ACCENT_WORD}(?:[\\s,:/&-]+[\\p{L}'’]+){0,3}[\\s,:/&-]+${color}`, 'iu')
const BRIEF_COLORS = COLORS.map(([re, hex, name]) => [NEAR(re.source), hex, name] as const)

/** The accent and corners a brief asks for, if it says so clearly; applied as the project's theme. */
export function briefStyle(brief: string): { theme: Partial<Theme>; said: string[] } {
  const theme: Partial<Theme> = {}
  const said: string[] = []
  const hex = brief.match(HEX)?.[0]
  const named = hex ? undefined : BRIEF_COLORS.find(([re]) => re.test(brief))
  if (hex || named) {
    theme.accent = hex ? normalizeHex(hex) : named![1]
    said.push(`accent ${hex ? theme.accent : named![2]}`)
  }
  if (word('pill[- ]shaped|very rounded|fully rounded|rounded corners|soft rounded').test(brief)) (theme.radius = 'round'), said.push('rounded corners')
  else if (word('sharp corners|square corners|no rounded corners|brutalist').test(brief)) (theme.radius = 'sharp'), said.push('sharp corners')
  return { theme, said }
}
