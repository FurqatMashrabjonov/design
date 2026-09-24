// GQ-10: the app's colours are invented for the brief instead of picked from a catalogue.
//
// Why the model only gets a few fields. Six screens are six independent samples, so anything a
// screen could choose for itself is something six screens will disagree about. The planner runs
// once, so a palette decided there is the one thing every screen can share. What it decides is the
// judgement — the hue, the mood, how round the corners are. What it must not decide is the craft:
// the ink ramp, the borders, the hover states, the text colour on a coloured chip. Those are
// arithmetic, they are where accessibility is won or lost, and a model asked to hold sixty tokens
// in its head gets them subtly wrong in a way no prompt wording fixes.
//
// So: the model proposes five colours, a radius feel and a font pairing. This file derives the
// rest and drags anything that fails AA into range, hue intact (see lib/color.ts).

import {
  contrast,
  ensureContrast,
  quietestAt,
  fromHsl,
  inkOn,
  isHex,
  mix,
  toHex,
  toHsl,
  toRgb,
  withLightness,
  type Rgb,
} from './color.ts'
import { extractRootBlock, parseDeclarations } from './screen-normalizer.ts'

/** What the planner is allowed to decide. Everything else in a palette is derived from these. */
export type ProposedPalette = {
  accent: string
  bg: string
  surface: string
  fg: string
  success?: string
  warn?: string
  danger?: string
  radius?: RadiusFeel
  /** Free text; recorded for the agent log and the style card, never written into CSS. */
  character?: string
}

export type RadiusFeel = 'sharp' | 'soft' | 'round' | 'pill'

/** px for --radius-sm / -md / -lg. `pill` still leaves --radius-pill at 9999px. */
const RADIUS: Record<RadiusFeel, [number, number, number]> = {
  sharp: [2, 4, 6],
  soft: [8, 12, 16],
  round: [12, 18, 24],
  pill: [16, 24, 32],
}

export const RADIUS_FEELS = Object.keys(RADIUS) as RadiusFeel[]

/** AA for body text. Large display text is allowed 3:1 by WCAG; we do not spend that budget. */
const AA = 4.5
/** Borders and other non-text edges only have to be visible. */
const EDGE = 1.6
/** How strongly a chip tints its surface in kit/od-kit.css — text on a chip sits on this, not on --surface. */
const CHIP_TINT = 0.15

export type Palette = {
  bg: string
  surface: string
  surfaceWarm: string
  fg: string
  fg2: string
  muted: string
  meta: string
  border: string
  borderSoft: string
  accent: string
  accentOn: string
  accentHover: string
  accentActive: string
  success: string
  warn: string
  danger: string
  /** Role colours dragged to AA over both the plain surface and their own tinted chip. */
  accentText: string
  successText: string
  warnText: string
  dangerText: string
  radius: [number, number, number]
  dark: boolean
  character?: string
}

const DEFAULTS = { success: '#16a34a', warn: '#b45309', danger: '#dc2626' } as const

/**
 * Reads a palette the model proposed. Returns null when the four required colours are not all
 * valid hex — a half-read palette would silently fall back to greys, which is the failure this
 * whole row exists to remove, so the caller is told instead.
 */
export function readProposal(raw: unknown): ProposedPalette | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const required = ['accent', 'bg', 'surface', 'fg'] as const
  if (!required.every((k) => isHex(o[k]))) return null
  const optional = (k: 'success' | 'warn' | 'danger') => (isHex(o[k]) ? String(o[k]).trim().toLowerCase() : undefined)
  const radius = typeof o.radius === 'string' && RADIUS_FEELS.includes(o.radius as RadiusFeel) ? (o.radius as RadiusFeel) : undefined
  const character = typeof o.character === 'string' ? o.character.trim().slice(0, 120) : undefined
  return {
    accent: String(o.accent).trim().toLowerCase(),
    bg: String(o.bg).trim().toLowerCase(),
    surface: String(o.surface).trim().toLowerCase(),
    fg: String(o.fg).trim().toLowerCase(),
    success: optional('success'),
    warn: optional('warn'),
    danger: optional('danger'),
    radius,
    character,
  }
}

/** The text colour for a role: readable on the plain surfaces *and* on its own tinted chip. */
function roleText(role: Rgb, surfaces: Rgb[]): string {
  const chips = surfaces.map((s) => mix(s, role, CHIP_TINT))
  return toHex(ensureContrast(role, [...surfaces, ...chips], AA))
}

/**
 * A filled button is the one place a colour has to carry text of its own. White gets more readable
 * as a colour darkens and near-black as it lightens, so the worst case is the middle — a mid-tone
 * accent carries neither. Pushing it away from the middle, in whichever direction it was already
 * leaning, is the smallest change that makes the primary button legible.
 */
function usableAccent(accent: Rgb): Rgb {
  const best = (c: Rgb) => Math.max(contrast(c, [255, 255, 255]), contrast(c, [17, 17, 17]))
  if (best(accent) >= AA) return accent
  const { l } = toHsl(accent)
  const toward = l >= 0.5 ? 1 : 0
  for (let step = 1; step <= 100; step++) {
    const next = withLightness(accent, l + (toward - l) * (step / 100))
    if (best(next) >= AA) return next
  }
  return withLightness(accent, toward)
}

/** Turns a proposal into every colour a screen can reference, with AA enforced throughout. */
export function buildPalette(proposal: ProposedPalette): Palette {
  const rawBg = toRgb(proposal.bg)!
  const accent = usableAccent(toRgb(proposal.accent)!)
  const dark = toHsl(rawBg).l < 0.5

  // A mid-tone page cannot carry AA text of any colour, and the model proposes one often enough
  // that it has to be handled here rather than reported. The hue and saturation it chose survive;
  // only the lightness is pulled into a band a page can actually be.
  const band = (rgb: Rgb, lightRange: [number, number], darkRange: [number, number]) => {
    const [lo, hi] = dark ? darkRange : lightRange
    const { l } = toHsl(rgb)
    return l >= lo && l <= hi ? rgb : withLightness(rgb, Math.max(lo, Math.min(hi, l)))
  }
  const bg = band(rawBg, [0.9, 1], [0.04, 0.14])
  const surface = band(toRgb(proposal.surface)!, [0.93, 1], [0.09, 0.2])

  // A third surface the kit paints icon buttons with; 20 systems define it and it was the hole
  // behind sixteen failing ink/surface pairs, so it is derived and measured like the others.
  const surfaceWarm = mix(surface, dark ? [255, 255, 255] : [17, 17, 17], 0.05)
  const surfaces = [bg, surface, surfaceWarm]

  const fg = ensureContrast(toRgb(proposal.fg)!, surfaces, 7) // body text gets AAA headroom

  // The quiet tones are spread between --fg and the quietest ink the page allows at all, rather
  // than aimed at the page and clamped back. On white, AA leaves exactly one lightest usable grey,
  // so anything aimed past it lands on it: two of the three tones come back identical and the page
  // flattens. Anchoring at that limit and interpolating toward --fg keeps the steps apart, and
  // every tone between two AA-passing ends passes too.
  const quietest = quietestAt(fg, surfaces, AA)
  const fgL = toHsl(fg).l
  const quietL = toHsl(quietest).l
  const ramp = (fraction: number) => withLightness(fg, fgL + (quietL - fgL) * fraction)

  const edge = fromHsl({ ...toHsl(fg), l: dark ? 0.28 : 0.86 })
  const success = toRgb(proposal.success ?? DEFAULTS.success)!
  const warn = toRgb(proposal.warn ?? DEFAULTS.warn)!
  const danger = toRgb(proposal.danger ?? DEFAULTS.danger)!

  return {
    bg: toHex(bg),
    surface: toHex(surface),
    surfaceWarm: toHex(surfaceWarm),
    fg: toHex(fg),
    // Three steps of quiet, not one: clamping them all to the AA minimum makes them the same
    // colour and the page loses its hierarchy. Each step keeps a target of its own, so a caption
    // still reads as quieter than a subtitle while all three stay above 4.5:1.
    fg2: toHex(ramp(0.45)),
    muted: toHex(ramp(0.75)),
    meta: toHex(quietest),
    border: toHex(ensureContrast(edge, surfaces, EDGE)),
    borderSoft: toHex(mix(edge, surface, 0.5)),
    accent: toHex(accent),
    accentOn: toHex(inkOn(accent)),
    accentHover: toHex(withLightness(accent, toHsl(accent).l + (dark ? 0.06 : -0.06))),
    accentActive: toHex(withLightness(accent, toHsl(accent).l + (dark ? 0.12 : -0.11))),
    success: toHex(success),
    warn: toHex(warn),
    danger: toHex(danger),
    accentText: roleText(accent, surfaces),
    successText: roleText(success, surfaces),
    warnText: roleText(warn, surfaces),
    dangerText: roleText(danger, surfaces),
    radius: RADIUS[proposal.radius ?? 'soft'],
    dark,
    character: proposal.character,
  }
}

/**
 * The colour half of a `:root` block, in the same vocabulary the 33 curated systems use — the kit,
 * the prompt and the linter all read these names, so a generated palette is a drop-in for a
 * catalogue one. Type scale, spacing and motion are not here: they are craft, not colour, and they
 * come from the structural base the palette is merged into.
 */
export function paletteDeclarations(p: Palette): string[] {
  return [
    `--bg: ${p.bg}`,
    `--surface: ${p.surface}`,
    `--surface-warm: ${p.surfaceWarm}`,
    `--fg: ${p.fg}`,
    `--fg-2: ${p.fg2}`,
    `--muted: ${p.muted}`,
    `--muted-2: ${p.meta}`,
    `--meta: ${p.meta}`,
    `--border: ${p.border}`,
    `--border-soft: ${p.borderSoft}`,
    `--accent: ${p.accent}`,
    `--accent-on: ${p.accentOn}`,
    `--accent-hover: ${p.accentHover}`,
    `--accent-active: ${p.accentActive}`,
    `--success: ${p.success}`,
    `--warn: ${p.warn}`,
    `--warning: ${p.warn}`,
    `--danger: ${p.danger}`,
    `--od-accent-text: ${p.accentText}`,
    `--od-success-text: ${p.successText}`,
    `--od-warn-text: ${p.warnText}`,
    `--od-danger-text: ${p.dangerText}`,
    `--radius-sm: ${p.radius[0]}px`,
    `--radius-md: ${p.radius[1]}px`,
    `--radius-lg: ${p.radius[2]}px`,
    // GQ-25: a dark page cannot show a dark shadow. Depth becomes a faint light edge plus a deeper
    // drop, and the primary button's glow keeps the accent visible. Light palettes keep the
    // system's own depth tokens untouched.
    ...(p.dark
      ? [
          '--elev-ring: 0 0 0 1px rgba(255, 255, 255, 0.08)',
          '--elev-raised: 0 0 0 1px rgba(255, 255, 255, 0.07), 0 14px 36px rgba(0, 0, 0, 0.55)',
          '--od-card-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07), 0 14px 36px rgba(0, 0, 0, 0.55)',
          '--od-card-border: 0',
          '--od-btn-shadow: 0 10px 28px color-mix(in oklab, var(--accent), transparent 55%)',
        ]
      : []),
  ]
}

/** A stored palette (projects.palette JSON), or null when the row has none or it is unreadable. */
export function parsePalette(json: string | null | undefined): Palette | null {
  try {
    const p = JSON.parse(json ?? 'null')
    if (!p || typeof p !== 'object') return null
    const required: (keyof Palette)[] = ['bg', 'surface', 'surfaceWarm', 'fg', 'fg2', 'muted', 'meta', 'border', 'accent', 'accentOn', 'accentText', 'successText', 'warnText', 'dangerText']
    return required.every((k) => isHex(p[k])) && Array.isArray(p.radius) && p.radius.length === 3 ? (p as Palette) : null
  } catch {
    return null
  }
}

/**
 * The catalogue system's `:root` block with the palette's colours written over it. The system
 * keeps everything that is craft rather than colour — type scale, spacing, motion, shadows, its
 * fonts — so a generated palette rides on a real system's bones instead of a generic one.
 * Declarations the palette does not name are untouched; the block's shape stays what the prompt,
 * the kit and the linter expect.
 */
export function applyPaletteToRoot(rootCss: string, p: Palette): string {
  const block = extractRootBlock(rootCss)
  if (block === null) return rootCss
  const decls = parseDeclarations(block)
  for (const d of paletteDeclarations(p)) {
    const i = d.indexOf(':')
    decls.set(d.slice(0, i).trim(), d.slice(i + 1).trim())
  }
  const body = [...decls].map(([k, v]) => `  ${k}: ${v};`).join('\n')
  return `:root {\n${body}\n}`
}

/** Every ink/surface pair a screen can legally produce, for tests and for the audit. */
export function contrastReport(p: Palette): { pair: string; ratio: number; target: number }[] {
  const surfaces: [string, Rgb][] = [
    ['--bg', toRgb(p.bg)!],
    ['--surface', toRgb(p.surface)!],
    ['--surface-warm', toRgb(p.surfaceWarm)!],
  ]
  const inks: [string, Rgb, number][] = [
    ['--fg', toRgb(p.fg)!, AA],
    ['--fg-2', toRgb(p.fg2)!, AA],
    ['--muted', toRgb(p.muted)!, AA],
    ['--meta', toRgb(p.meta)!, AA],
    ['--od-accent-text', toRgb(p.accentText)!, AA],
    ['--od-success-text', toRgb(p.successText)!, AA],
    ['--od-warn-text', toRgb(p.warnText)!, AA],
    ['--od-danger-text', toRgb(p.dangerText)!, AA],
    ['--border', toRgb(p.border)!, EDGE],
  ]
  const out: { pair: string; ratio: number; target: number }[] = []
  for (const [inkName, ink, target] of inks) {
    for (const [surfaceName, surface] of surfaces) {
      out.push({ pair: `${inkName} on ${surfaceName}`, ratio: contrast(ink, surface), target })
      // A role colour also has to survive its own chip, which is the surface tinted with it.
      if (inkName.startsWith('--od-')) {
        const role = inkName.replace('--od-', '--').replace('-text', '')
        const tint = mix(surface, toRgb(p[roleKey(role)])!, CHIP_TINT)
        out.push({ pair: `${inkName} on ${role} chip over ${surfaceName}`, ratio: contrast(ink, tint), target })
      }
    }
  }
  // Text sitting on a filled accent button is the other pair a screen always produces.
  out.push({ pair: '--accent-on on --accent', ratio: contrast(toRgb(p.accentOn)!, toRgb(p.accent)!), target: AA })
  return out
}

function roleKey(role: string): 'accent' | 'success' | 'warn' | 'danger' {
  return role === '--success' ? 'success' : role === '--warn' ? 'warn' : role === '--danger' ? 'danger' : 'accent'
}

// GQ-26: which part of the wheel this app leans toward, decided in code before the planner runs.
//
// Left to itself the model returns green every time: four generations came back moss, moss,
// #2e7d32, #7a9e5f. The prompt was the cause, not the model — its JSON sample carried a real hex
// that the first run copied verbatim, its wording offered "terracotta, ochre, moss, plum, sand,
// teal" as examples, and it ruled out indigo, violet and blue by name, which leaves the earthy
// middle as the only unpunished answer. Asking a sampler for variety does not produce variety; the
// same FNV-1a seed that picks the art direction and the bottom bar picks the hue family here, so
// two projects differ by construction and one project is stable across a rerun.
//
// This steers, it does not decide: the brief still wins ("a pink habit tracker"), and the model
// still chooses the actual colours, their saturation and lightness, the radius and the character.

export type HueFamily = { id: string; lean: string }

export const HUE_FAMILIES: HueFamily[] = [
  { id: 'clay', lean: 'earth reds — terracotta, rust, brick, clay' },
  { id: 'amber', lean: 'warm yellows — amber, ochre, honey, saffron' },
  { id: 'moss', lean: 'greens — moss, olive, fern, sage' },
  { id: 'teal', lean: 'blue-greens — teal, sea, jade, petrol' },
  { id: 'ink', lean: 'deep blues — ink, indigo, slate, denim' },
  { id: 'plum', lean: 'purples — plum, mulberry, aubergine, iris' },
  { id: 'rose', lean: 'pinks and corals — rose, coral, raspberry, blush' },
]

// Three or four per type, spread across the wheel rather than clustered, so the same app type can
// still land somewhere different next time. A type not listed here draws from all seven.
const HUES_FOR_TYPE: Record<string, string[]> = {
  fintech: ['ink', 'teal', 'plum', 'clay'],
  productivity: ['ink', 'teal', 'clay', 'plum'],
  habits: ['amber', 'rose', 'teal', 'moss'],
  fitness: ['clay', 'ink', 'amber', 'rose'],
  health: ['teal', 'moss', 'rose', 'ink'],
  learning: ['amber', 'rose', 'teal', 'plum'],
  'food-delivery': ['clay', 'amber', 'moss', 'rose'],
  food: ['clay', 'amber', 'moss'],
  commerce: ['ink', 'rose', 'clay', 'plum'],
  marketplace: ['teal', 'clay', 'ink', 'amber'],
  booking: ['teal', 'ink', 'clay', 'plum'],
  travel: ['teal', 'amber', 'clay', 'ink'],
  social: ['rose', 'plum', 'amber', 'teal'],
  media: ['plum', 'ink', 'rose', 'clay'],
}

function seedHash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}

/** @param seed the project id — stable across a rerun, different between projects. */
export function hueDirection(seed: string, appType?: string): HueFamily {
  const ids = HUES_FOR_TYPE[appType ?? ''] ?? HUE_FAMILIES.map((f) => f.id)
  const id = ids[seedHash(`${seed}|hue`) % ids.length]!
  return HUE_FAMILIES.find((f) => f.id === id)!
}

/** The line the planner's request carries; the brief overrides it, which is said out loud. */
export const hueBlock = (f: HueFamily) =>
  `PALETTE LEAN for this app: ${f.lean}. Start there and pick the exact colours yourself — the shade, how vivid, how light the page is, the radius and the character are all your call. If the brief names a colour or a mood that points elsewhere, the brief wins and you ignore this line.`
