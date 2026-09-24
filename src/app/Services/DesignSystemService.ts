import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { extractRootBlock, parseDeclarations } from '../../lib/screen-normalizer.ts'
import { hash } from '../../lib/hash.ts'
import { luminance, toRgb, type Rgb } from '../../lib/color.ts'

const DS_DIR = join(process.cwd(), 'design-systems')

export interface DesignSystemEntry {
  id: string
  name: string
  category: string
  description: string
  hasTokens: boolean
  /** DSH-07: what the picker card shows — literal colours and the display font, or null if unset. */
  swatch: { bg: string | null; fg: string | null; accent: string | null; font: string | null }
}

/** The picker's swatch from tokens.css: only literal colours and a plain family name pass. */
export function swatchOf(css: string): DesignSystemEntry['swatch'] {
  // tokens.css also mentions tokens in its comments; the first value of the right shape wins.
  const values = (name: string) => [...css.matchAll(new RegExp(`--${name}:\\s*([^;\\n]+)`, 'g'))].map((m) => m[1]!.trim())
  const color = (name: string) => values(name).find((v) => /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%]+\))$/i.test(v)) ?? null
  const family = values('font-display').map((v) => v.split(',')[0]!.replace(/["']/g, '').trim()).find((f) => /^[\w\s-]{1,40}$/.test(f))
  return { bg: color('bg'), fg: color('fg'), accent: color('accent'), font: family ?? null }
}

function tryReadJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function extractH1(md: string): string | undefined {
  const m = md.match(/^#\s+(.+)$/m)
  if (!m) return undefined
  // Strip "Design System Inspired by " prefix if present
  return m[1].replace(/^Design System Inspired by\s+/i, '').trim()
}

function extractCategory(md: string): string | undefined {
  const m = md.match(/>\s*Category:\s*(.+)/i)
  return m?.[1]?.trim()
}

// GQ-03: when nobody picks a system, the brief does. A style the brief names wins; otherwise the
// app type decides (a food app gets warmth, a bank gets calm polish); otherwise minimal.
// ponytail: word lists and a table, not a model — add a line when a brief lands on the wrong look.
export const AUTO = 'auto'
const STYLE_WORDS: [RegExp, string][] = [
  [/neo-?brutalis/i, 'neobrutalism'],
  [/brutalis/i, 'brutalist'],
  [/glass(morphism)?\b|frosted/i, 'glassmorphism'],
  [/\bneon\b|cyberpunk/i, 'neon'],
  [/\bretro\b|vintage|8-?bit|pixel art/i, 'retro'],
  [/hand-?drawn|doodle|sketchy/i, 'doodle'],
  [/\bbento\b/i, 'bento'],
  [/luxury|elegant|premium|high-end/i, 'elegant'],
  [/\bdark (mode|theme|ui|background)|night mode|all-black/i, 'midnight'],
  [/playful|gamif|for kids|children/i, 'duolingo'],
  [/\bminimal(ist)?\b|clean and simple/i, 'minimal'],
]
// DS-01: candidates, not a verdict. One system per app type meant every habit tracker came back in
// Notion and every food app in Airbnb — two people typing the same thing got the same app, and 21 of
// the 33 systems were never reachable without picking one by hand. The project id chooses among
// these the way artDirection and navStyle choose, so one project is coherent and two differ.
// GQ-13: 'nova' is listed three times on purpose — the flagship is the default look (~60%) for a
// consumer app, and the character systems remain so the same brief does not always give one system.
const BY_APP_TYPE: Record<string, string[]> = {
  // GQ-32: the automatic choice draws from the three systems authored for a phone, not from the
  // thirty-one brand packages, which were written for websites and show it. The brand systems stay
  // reachable by name — a brief that says "like Notion" still gets Notion (STYLE_WORDS), and every
  // one of them is still listed on /systems — but a brief that says nothing gets a system that was
  // designed for the device it will be read on.
  //   nova      warm, consumer, a serif figure — the one that feels like a product
  //   lumen     iOS 26, light and translucent — the one that feels native
  //   graphite  engineered dark, dense, mono figures — the one that feels like an instrument
  //   ember     soft tonal coral, loud and friendly — the one that feels like it is cheering you on
  //   volt      black and volt-lime, condensed italic headlines — the one that feels like a training poster
  fintech: ['graphite', 'lumen'],
  productivity: ['graphite', 'lumen', 'nova'],
  habits: ['ember', 'nova', 'lumen'],
  fitness: ['volt', 'ember', 'graphite'],
  health: ['ember', 'nova', 'lumen'],
  learning: ['ember', 'nova', 'lumen'],
  'food-delivery': ['ember', 'nova', 'lumen'],
  food: ['ember', 'nova', 'lumen'],
  commerce: ['lumen', 'nova', 'volt'],
  marketplace: ['lumen', 'nova'],
  booking: ['lumen', 'nova'],
  travel: ['lumen', 'nova'],
  media: ['volt', 'graphite', 'lumen'],
  social: ['lumen', 'nova'],
}

// GQ-32: "like Notion", "Airbnb-style" — a brief that names a brand means it, and the brand systems
// are no longer in the automatic rotation, so this is how they are reached. Only an explicit
// comparison counts: a bare mention would take "track my apple intake" to the Apple system. Ids that
// are ordinary words (minimal, retro, bento, nova) are left to STYLE_WORDS and the app type.
const BRAND_IDS = /\b(airbnb|nike|stripe|notion|spotify|shopify|slack|github|vercel|supabase|intercom|duolingo|raycast|tesla|shadcn|openai|linear)\b/i
const COMPARISON = /\b(like|similar to|inspired by|in the style of|style of|vibe of)\s+$|[-\s](style|like|esque|inspired)\b/i
function namedSystem(brief: string): string | null {
  for (const m of brief.matchAll(new RegExp(BRAND_IDS, 'gi'))) {
    const before = brief.slice(Math.max(0, m.index! - 24), m.index!)
    const after = brief.slice(m.index! + m[0].length, m.index! + m[0].length + 10)
    if (!COMPARISON.test(before) && !COMPARISON.test(`x${after}`)) continue
    const id = m[0].toLowerCase() === 'linear' ? 'linear-app' : m[0].toLowerCase()
    if (DesignSystemService.exists(id)) return id
  }
  return null
}


export const DesignSystemService = {
  /** The system for a brief when the person left the choice to us. */
  /**
   * The system for a brief when the person left the choice to us. A style the brief names still
   * wins outright; otherwise the app type offers a few that suit it and `seed` (the project id)
   * picks one, so the same brief twice is not the same app twice.
   */
  autoFor(brief: string, appType?: string | null, seed?: string): string {
    const named = namedSystem(brief)
    if (named) return named
    const byStyle = STYLE_WORDS.find(([re]) => re.test(brief))?.[1]
    if (byStyle && DesignSystemService.exists(byStyle)) return byStyle
    const candidates = (appType ? BY_APP_TYPE[appType] : undefined)?.filter((id) => DesignSystemService.exists(id)) ?? []
    if (candidates.length === 0) return 'minimal'
    return candidates[hash(`${seed ?? brief}|system`) % candidates.length]!
  },

  list(): DesignSystemEntry[] {
    return readdirSync(DS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== '_schema')
      .map((d) => {
        const dir = join(DS_DIR, d.name)
        const manifest = tryReadJson(join(dir, 'manifest.json'))
        const designMd = existsSync(join(dir, 'DESIGN.md'))
          ? readFileSync(join(dir, 'DESIGN.md'), 'utf8')
          : ''
        const hasTokens = existsSync(join(dir, 'tokens.css'))

        const name =
          (manifest?.name as string) ||
          extractH1(designMd) ||
          d.name
        const category =
          (manifest?.category as string) ||
          extractCategory(designMd) ||
          'General'
        const description =
          (manifest?.description as string) || ''

        const swatch = swatchOf(hasTokens ? readFileSync(join(dir, 'tokens.css'), 'utf8') : '')
        return { id: d.name, name, category, description, hasTokens, swatch }
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  },

  exists(id: string) {
    return existsSync(join(DS_DIR, id, 'DESIGN.md'))
  },

  /** Read the DESIGN.md content for prompt injection */
  readDesignMd(id: string): string {
    return readFileSync(join(DS_DIR, id, 'DESIGN.md'), 'utf8')
  },

  /**
   * STYLE.md: the look only, in under 60 lines, with no trace of the company it came from.
   * DESIGN.md is a brand document — fed whole, the model copied the brand's product into
   * unrelated apps (a calorie counter drew an owl and "Lesson complete"). Mobile prompts read
   * this card; DESIGN.md stays the source the card is distilled from, and the desktop prompt.
   */
  readStyleCard(id: string): string {
    const path = join(DS_DIR, id, 'STYLE.md')
    return existsSync(path) ? readFileSync(path, 'utf8') : this.readDesignMd(id)
  },

  /** How much of a screen this system paints in accent — the "Colour energy:" line of its style card. */
  readColorEnergy(id: string): 'low' | 'medium' | 'high' | undefined {
    const m = this.readStyleCard(id).match(/^Colou?r energy:\s*(low|medium|high)\b/im)
    return m ? (m[1].toLowerCase() as 'low' | 'medium' | 'high') : undefined
  },

  /** Company and product names this system must never put into an app (see lib/design-lint brand-leak rule). */
  readLeakTerms(id: string): { brand: string[]; anywhere: string[] } {
    const all = tryReadJson(join(DS_DIR, 'leak-terms.json')) as Record<string, { brand?: string[]; anywhere?: string[] }> | null
    return { brand: all?.[id]?.brand ?? [], anywhere: all?.[id]?.anywhere ?? [] }
  },

  /** Read tokens.css if it exists, returns empty string otherwise */
  readTokensCss(id: string): string {
    const path = join(DS_DIR, id, 'tokens.css')
    return existsSync(path) ? readFileSync(path, 'utf8') : ''
  },

  /**
   * The bare `:root { … }` rule with rationale comments stripped.
   * tokens.css carries long explanatory comments for humans; every byte of them would
   * otherwise be re-sent in each screen's system prompt.
   */
  /**
   * @param forPrompt drop the --od-* tokens. They are read by kit/od-kit.css inside the page and
   * are never written by the model, so spending the mobile system prompt's 24 000-character budget
   * on them buys nothing — adding the four --od-*-text values pushed vercel to 24 010.
   */
  readTokensRoot(id: string, forPrompt = false): string {
    const raw = this.readTokensCss(id)
    if (!raw) return ''
    const block = extractRootBlock(raw)
    if (block === null) return ''
    const decls = [...parseDeclarations(block)]
      .filter(([k]) => !(forPrompt && k.startsWith('--od-')))
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')
    return decls ? `:root {\n${decls}\n}` : ''
  },

  /**
   * Webfont stylesheet URLs this system needs, declared as `@import url(…)` in tokens.css.
   * Screens are told to reference `--font-*`, but nothing makes a model remember the
   * `<link>` — so the loading step is owned here and injected deterministically.
   */
  readFontUrls(id: string): string[] {
    const raw = this.readTokensCss(id)
    return [...raw.matchAll(/@import\s+url\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1])
  },

  /** Icon stroke weight for this brand; lucide's own default when the system doesn't override it. */
  readIconStroke(id: string): number {
    const block = extractRootBlock(this.readTokensCss(id))
    const raw = block ? parseDeclarations(block).get('--icon-stroke') : undefined
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : 2
  },

  // Callers must reject an id that fails this before it becomes a file path (PromptComposer reads it directly).
  assertExists(id: string) {
    if (!this.exists(id)) throw new Error('Unknown design system')
  },
}

// --- IMG-02: matching a reference picture to the closest design system -------------------------
// The picture decides the look, so it must decide the system too — before a screen is drawn. The
// judgement (what colour, how round, how loud) is the model's; the choice is arithmetic here, so
// the same picture always lands on the same system and every candidate is scored the same way.

/** Hue in degrees and how saturated it is (0–1) — a grey has no meaningful hue. */
function hueChroma([r, g, b]: Rgb): { hue: number; chroma: number } {
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)]
  const d = max - min
  if (d === 0) return { hue: 0, chroma: 0 }
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { hue: (h * 60 + 360) % 360, chroma: d / 255 }
}

/** 0 (identical) to 1 (opposite side of the wheel), with greys compared by how grey they are. */
function accentDistance(a: Rgb, b: Rgb): number {
  const x = hueChroma(a)
  const y = hueChroma(b)
  if (x.chroma < 0.12 || y.chroma < 0.12) return Math.abs(x.chroma - y.chroma) + 0.35
  const apart = Math.abs(x.hue - y.hue)
  return Math.min(apart, 360 - apart) / 180
}

/** Words a style card uses that a picture's mood can agree with. */
const MOOD_WORDS: Record<string, RegExp> = {
  playful: /playful|friendly|informal|fun|cheerful|whimsical|hand-drawn/i,
  bold: /bold|loud|confident|brutal|heavy|striking|expressive/i,
  calm: /calm|quiet|restrained|serene|understated|minimal/i,
  elegant: /elegant|refined|premium|luxur|editorial/i,
  technical: /technical|precise|utilitarian|developer|dense/i,
  energetic: /energetic|vivid|vibrant|bright|electric|neon/i,
  soft: /soft|warm|gentle|rounded|pastel/i,
  dark: /dark|midnight|night|black/i,
}

/** What a style card says its display type does — the strongest signal after colour. */
const TYPE_WORDS: Record<string, RegExp> = {
  // Cards state weights as numbers ("weight 900", "weights 700–900"), so that is what is matched.
  heavy: /weights? (?:7|8|9)00|–\s*900|extra ?bold|chunky|condensed|marker/i,
  geometric: /grotesk|geometric|neutral sans|system sans/i,
  quiet: /weights? [34]00\b|light weight|thin/i,
  serif: /serif/i,
}

/** Only the card's "Type" section: elsewhere "black" is a colour, not a weight. */
function typeSection(card: string): string {
  const m = /^##\s*Type\b([\s\S]*?)(?=^##\s|\Z)/im.exec(card)
  return m?.[1] ?? ''
}

export type ReferenceMatchInput = { accent?: string; background?: string; mood?: string[]; corners?: 'sharp' | 'soft' | 'round'; type?: 'heavy' | 'geometric' | 'quiet' | 'serif' }

/**
 * Which of our systems a picture is closest to. Colour carries the most weight — light against dark
 * is the first thing an eye reads, then the accent's hue — and the mood words break ties between
 * systems that are already close, which is what separates a playful pink from a corporate one.
 */
export function matchSystem(ref: ReferenceMatchInput): { id: string; score: number } | null {
  const refAccent = toRgb(ref.accent)
  const refBg = toRgb(ref.background)
  if (!refAccent && !refBg) return null
  const mood = (ref.mood ?? []).join(' ')
  const wanted = Object.entries(MOOD_WORDS).filter(([word]) => new RegExp(word, 'i').test(mood)).map(([, re]) => re)

  let best: { id: string; score: number } | null = null
  // Only the systems written for a phone: a reference picture used to be matched against all of
  // them and could land on a brand package written for websites, which the automatic choice no
  // longer offers for exactly that reason. The manifest's category is the one list of them.
  for (const entry of DesignSystemService.list()) {
    if (!entry.hasTokens || entry.category !== 'Mobile') continue
    const bg = toRgb(entry.swatch.bg)
    const accent = toRgb(entry.swatch.accent)
    let score = 0
    // Light against dark: the loudest signal, and the one a person notices instantly.
    if (refBg && bg) score += Math.abs(luminance(refBg) - luminance(bg)) * 2.0
    // Then the accent's hue, weighted so that a real colour match cannot be argued away by words:
    // a typical hue distance is 0.05–0.4 here, so the character bonuses below stay smaller than that.
    if (refAccent && accent) score += accentDistance(refAccent, accent) * 2.0
    // Mood and type: read from the card, and strong enough to separate two systems that share a
    // hue — a playful pink and a corporate pink are the same colour and not the same app.
    if (wanted.length || ref.type) {
      const card = DesignSystemService.readStyleCard(entry.id)
      if (wanted.length) score -= (wanted.filter((re) => re.test(card)).length / wanted.length) * 0.22
      if (ref.type && TYPE_WORDS[ref.type]?.test(typeSection(card))) score -= 0.18
    }
    if (!best || score < best.score) best = { id: entry.id, score }
  }
  return best
}

/** The theme a picture asks for: its accent, and how round its corners are. */
export function themeFromReference(ref: ReferenceMatchInput): { accent?: string; radius?: 'sharp' | 'soft' | 'round' } {
  const out: { accent?: string; radius?: 'sharp' | 'soft' | 'round' } = {}
  const accent = toRgb(ref.accent)
  // A near-grey "accent" is the picture having no accent at all; forcing it would drain the system.
  if (accent && hueChroma(accent).chroma >= 0.12) out.accent = ref.accent!.toLowerCase()
  if (ref.corners) out.radius = ref.corners
  return out
}
