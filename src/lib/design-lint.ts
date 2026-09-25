import { extractRootBlock } from './screen-normalizer.ts'
import { HIG, declaredFontSizes } from './hig-rules.ts'
import { renderCharts } from './charts.ts'
import { renderMaps } from './maps.ts'
import { renderStickers } from './stickers.ts'

/**
 * Deterministic checks for the craft rules that are mechanically checkable.
 *
 * `craft/anti-ai-slop.md` told the model its cardinal sins were "auto-enforced by the
 * daemon's lint-artifact linter". No such linter existed, so the rules were advisory and
 * the model treated them that way. This is that linter.
 */

export type Severity = 'error' | 'warn'

export type Finding = {
  rule: string
  severity: Severity
  message: string
  samples: string[]
}

// The textbook AI accent. craft/anti-ai-slop.md cardinal sin #1.
const AI_INDIGO = /#(6366f1|4f46e5|4338ca|3730a3|8b5cf6|7c3aed|a855f7)\b/gi

const FILLER = /\b(lorem ipsum|dolor sit amet|placeholder text|sample content|click here|feature (one|two|three)|your text here)\b/gi

// "10x faster", "99.9% uptime", "3× more productive" — unsourced numbers. Sin #6.
const INVENTED_METRIC = /\b(\d+(?:\.\d+)?\s*[x×]\s*(?:faster|better|more|higher)|\d{2}(?:\.\d+)?%\s*(?:uptime|faster|accuracy))\b/gi

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/u

// Font stacks contain quotes, so the value can only be delimited by ; or } — a value
// lifted from a style="…" attribute keeps a trailing quote that cleanValue drops.
const FONT_FAMILY = /font-family\s*:\s*([^;}]+)/gi

function cleanValue(raw: string): string {
  return raw.trim().replace(/["']\s*$/, '').trim()
}

function isTokenised(value: string): boolean {
  return value.startsWith('var(') || /^(inherit|initial|unset)$/i.test(value)
}

function bodyOf(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return m ? m[1] : html
}

/** Strip the token block so canonical values are never reported as violations. */
function withoutRoot(html: string): string {
  const block = extractRootBlock(html)
  // KIT-07: the sheets we inject (kit, craft, slots) are ours and carry data-od-*; judging them flagged
  // every screen that used the kit the day the kit gained one dimmed timestamp.
  return (block ? html.replace(block, '') : html).replace(/<style\b[^>]*\bdata-od-[a-z-]+[^>]*>[\s\S]*?<\/style>/gi, '')
}

function uniq(values: string[], cap = 4): string[] {
  return [...new Set(values)].slice(0, cap)
}

/**
 * Names that belong to the company a design system was modelled on (design-systems/leak-terms.json).
 * `brand` is only a leak where an app names itself — its <title> — because "Pay with Stripe",
 * "Sign in with GitHub" or a sneaker shop's "Nike Air Max 90" heading is ordinary content.
 * `anywhere` holds terms with no innocent use.
 */
export type LeakTerms = { brand: string[]; anywhere: string[] }
export type ColorEnergy = 'low' | 'medium' | 'high'
export type LintOptions = { leakTerms?: LeakTerms; colorEnergy?: ColorEnergy }

// References to the accent outside :root and outside the injected shell. A proxy, not a pixel count:
// on 228 eval screens the median was 6 (low), 7 (medium), 11 (high) with wide overlap, so only the
// far ends are reported. ponytail: reference count; replace with painted area once the render audit (EYE-01) exists.
const ACCENT_REF = /var\(--accent(?:-hover|-active)?\)/g
export const ACCENT_BOUNDS = { lowMax: 20, highMin: 4 }

const textOf = (html: string) => html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
const termRe = (terms: string[]) => new RegExp(`(?<![\\w-])(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w-])`, 'gi')

function brandLeaks(html: string, terms: LeakTerms): string[] {
  const hits: string[] = []
  if (terms.anywhere.length) hits.push(...(textOf(bodyOf(html)).match(termRe(terms.anywhere)) ?? []))
  if (terms.brand.length) {
    const naming = textOf(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    hits.push(...(naming.match(termRe(terms.brand)) ?? []))
  }
  return hits
}

export function lintScreen(html: string, opts: LintOptions = {}): Finding[] {
  const findings: Finding[] = []
  const body = bodyOf(html)
  const scannable = withoutRoot(html)

  const leaks = opts.leakTerms ? brandLeaks(html, opts.leakTerms) : []
  if (leaks.length) {
    findings.push({
      rule: 'design-system-brand-leak',
      severity: 'error',
      message: 'The screen names the company its design system was modelled on. A design system lends its look, not its product.',
      samples: uniq(leaks),
    })
  }

  if (opts.colorEnergy) {
    const refs = (scannable.replace(/<nav\b[^>]*data-od-shell[\s\S]*?<\/nav>/i, '').match(ACCENT_REF) ?? []).length
    const grey = opts.colorEnergy === 'high' && refs < ACCENT_BOUNDS.highMin
    const loud = opts.colorEnergy === 'low' && refs > ACCENT_BOUNDS.lowMax
    if (grey || loud) {
      findings.push({
        rule: 'accent-energy-mismatch',
        severity: 'warn',
        message: grey
          ? 'A high-energy design system drawn almost without its accent. Fill the primary action, progress and highlights with var(--accent).'
          : 'A low-energy design system with accent spread across the screen. Keep accent for the primary action, the active state and one highlight.',
        samples: [`${refs} accent references`],
      })
    }
  }

  const indigo = scannable.match(AI_INDIGO)
  if (indigo) {
    findings.push({
      rule: 'ai-indigo-accent',
      severity: 'error',
      message: 'Default Tailwind indigo used as a colour. Use var(--accent).',
      samples: uniq(indigo),
    })
  }

  const filler = body.match(FILLER)
  if (filler) {
    findings.push({
      rule: 'filler-copy',
      severity: 'error',
      message: 'Placeholder copy left in the design.',
      samples: uniq(filler),
    })
  }

  const metrics = body.match(INVENTED_METRIC)
  if (metrics) {
    findings.push({
      rule: 'invented-metrics',
      severity: 'warn',
      message: 'Unsourced performance claim. Use a labelled placeholder.',
      samples: uniq(metrics),
    })
  }

  const emojiIcons = [...body.matchAll(/<(h[1-6]|button|li)\b[^>]*>([\s\S]{0,120}?)<\/\1>/gi)]
    .filter((m) => EMOJI.test(m[2]))
    .map((m) => m[0].slice(0, 60))
  if (emojiIcons.length > 0) {
    findings.push({
      rule: 'emoji-as-icon',
      severity: 'error',
      message: 'Emoji used where an icon belongs. Use <i data-lucide="name">.',
      samples: uniq(emojiIcons),
    })
  }

  const hardFonts = [...scannable.matchAll(FONT_FAMILY)]
    .map((m) => cleanValue(m[1]))
    .filter((v) => v && !isTokenised(v))
  if (hardFonts.length > 0) {
    findings.push({
      rule: 'hardcoded-font-family',
      severity: 'error',
      message: 'Font set literally instead of through var(--font-display|body|mono).',
      samples: uniq(hardFonts.map((f) => f.slice(0, 40))),
    })
  }

  const fontLinks = (html.match(/<link\b[^>]*fonts\.googleapis\.com[^>]*>/gi) ?? []).filter(
    (tag) => !/\bdata-od-font\b/i.test(tag),
  )
  if (fontLinks.length > 0) {
    findings.push({
      rule: 'self-linked-font',
      severity: 'error',
      message: 'Page links its own webfont. The design system owns font loading.',
      samples: uniq(fontLinks.map((l) => l.slice(0, 70))),
    })
  }

  const handDrawn = (body.match(/<svg\b[^>]*viewBox\s*=\s*["']0 0 24 24["'][^>]*>/gi) ?? []).filter(
    (tag) => !/data-od-icon|data-od-shell|data-od-sticker-rendered|class="[^"]*lucide/i.test(tag), // stickers (GQ-21) are drawn by us
  )
  if (handDrawn.length > 0) {
    findings.push({
      rule: 'hand-drawn-icon',
      severity: 'warn',
      message: `${handDrawn.length} icon(s) drawn by hand. Use <i data-lucide="name"> so geometry matches across screens.`,
      samples: uniq(handDrawn.map((t) => t.slice(0, 60))),
    })
  }

  const defined = new Set([...html.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1].toLowerCase()))
  const undefinedRefs = [...html.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)]
    .map((m) => m[1].toLowerCase())
    // --tw-* are injected by the Tailwind CDN at runtime, not declared in the source.
    .filter((name) => !defined.has(name) && !name.startsWith('--tw-'))
  if (undefinedRefs.length > 0) {
    findings.push({
      rule: 'undefined-token',
      severity: 'error',
      message: 'var() references a custom property that is never defined.',
      samples: uniq(undefinedRefs),
    })
  }

  // A kit sketch's [bracket] placeholder that reached the screen (KIT-04).
  const visible = body.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '')
  const brackets = [...visible.matchAll(/(?:>|="|\s)\[([a-z][a-z0-9 ·/…×'-]{1,30})\](?=[<"\s])/gi)].map((m) => `[${m[1]}]`)
  if (brackets.length > 0) {
    findings.push({
      rule: 'kit-placeholder',
      severity: 'error',
      message: 'A [placeholder] from the kit sketch was left in the screen.',
      samples: uniq(brackets),
    })
  }

  // font-size: 0 hides text on purpose; anything else below the minimum is unreadable on a phone.
  const tiny = declaredFontSizes(scannable).filter((px) => px > 0 && px < HIG.minFontPx)
  if (tiny.length > 0) {
    findings.push({
      rule: 'tiny-text',
      severity: 'warn',
      message: `Text smaller than ${HIG.minFontPx}px.`,
      samples: uniq(tiny.map((px) => `${px}px`)),
    })
  }

  // QLT-06: the traits that mark a page as generated. craft/mobile.md bans all three by name and
  // the model still produced them on 28 apps (monospace labels on 62 screens, middle-dot meta on
  // 46, tracked-out caps eyebrows on 46). A rule the prompt cannot hold is a rule for the linter.
  // The injected shell is excluded: its own labels are ours and already canonical.
  const page = scannable.replace(/<nav\b[^>]*data-od-shell[\s\S]*?<\/nav>/gi, '').replace(/<header\b[^>]*data-od-shell[\s\S]*?<\/header>/gi, '')

  // An eyebrow is small, tracked-out caps used as a label above a heading — not an uppercase
  // display headline, which 21 of the 33 design systems ask for by name.
  const eyebrows = (page.match(/\{[^{}]*text-transform\s*:\s*uppercase[^{}]*\}/gi) ?? []).filter((rule) => {
    const size = rule.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i)
    const px = size ? Number(size[1]) : /var\(--text-(xs|sm)\)/.test(rule) ? 12 : NaN
    return px <= 12 && /letter-spacing\s*:\s*(0?\.\d+|[1-9])/.test(rule)
  })
  if (eyebrows.length > 0) {
    findings.push({
      rule: 'caps-eyebrow',
      severity: 'warn',
      message: 'Small tracked-out caps used as a label above a heading — the clearest mark of a generated page. Give the section a heading instead.',
      samples: uniq(eyebrows.map((r) => r.replace(/\s+/g, ' ').slice(0, 60))),
    })
  }

  // EYE-05: --border is a hairline, not an ink. A separator dot painted with it measured 1.26:1 on
  // five rows of one screen — text nobody can read. The same holds for --border-soft. A meta colour
  // (--meta, --muted) is what a dim separator wants, and those are measured against every surface.
  const borderInk = (page.match(/\{[^{}]*(?<!-)color\s*:\s*var\(--border(-soft)?\)[^{}]*\}/gi) ?? [])
  if (borderInk.length > 0) {
    findings.push({
      rule: 'border-as-text',
      severity: 'warn',
      message: '--border is used as a text colour. It is a hairline token and is never measured for legibility — use --meta or --muted.',
      samples: uniq(borderInk.map((r) => r.replace(/\s+/g, ' ').slice(0, 60))),
    })
  }

  // EYE-05: opacity is the quiet way to fail contrast. Every text token clears 4.5:1 against the
  // surfaces it sits on — that is enforced per design system — and then one rule like
  // `.is-locked { opacity: .72 }` dims a whole block and takes its text under AA with it. The
  // render audit measured 4.29:1 on exactly that rule. A token test cannot see this, because
  // nothing about the token changed. Only text-bearing opacity below 0.8 counts: a decorative
  // overlay or a fading image is not a legibility problem.
  const dimmed = (page.match(/\{[^{}]*opacity\s*:\s*0?\.[0-7]\d*[^{}]*\}/gi) ?? []).filter((rule) => !/(background|backdrop|overlay|scrim|shadow|::(after|before))/i.test(rule))
  if (dimmed.length > 0) {
    findings.push({
      rule: 'opacity-dimmed-text',
      severity: 'warn',
      message: 'A block is dimmed with opacity below 0.8. The text inside it loses contrast even though its token passes AA — use a muted colour token instead, which is measured.',
      samples: uniq(dimmed.map((r) => r.replace(/\s+/g, ' ').slice(0, 60))),
    })
  }

  // Monospace belongs to code. A price or a date set in it reads as telemetry, not as product copy.
  const mono = [...page.matchAll(/font-family\s*:\s*([^;}"]*mono[^;}"]*)/gi)].map((m) => m[1]!.trim())
  if (mono.length > 0) {
    findings.push({
      rule: 'mono-for-data',
      severity: 'warn',
      message: 'Monospace on data that is not code. Prices, dates and counts are set in the body face.',
      samples: uniq(mono.map((f) => f.slice(0, 40))),
    })
  }

  // "12 min · Easy · 4.8 · Vegan" on every card: four facts in a row is four facts nobody reads.
  const shown = page.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')
  const runs = (shown.match(/[^·\n]{1,40}·[^·\n]{1,40}·[^·\n]{1,40}·/g) ?? [])
  if (runs.length > 0) {
    findings.push({
      rule: 'middle-dot-meta',
      severity: 'warn',
      message: 'Four or more facts glued with middle dots. Show the one or two that decide, in plain words.',
      samples: uniq(runs.map((r) => r.replace(/\s+/g, ' ').trim().slice(-50))), // the tail is the run itself, not the sentence before it
    })
  }

  // GQ-22: a stack of identical cards is the layout a model reaches for when it has not decided
  // what a section is. Four or more siblings with the same card class, one after another, with
  // nothing between them — and not inside a bento, where uniform squares under a wide tile are the
  // point. Sizes are not measured here; sameness of markup is what the model produces.
  const stack = identicalCardStack(page)
  if (stack) {
    findings.push({
      rule: 'identical-card-stack',
      severity: 'warn',
      message: `${stack.count} identical cards in a row. Vary what a section is — a row, a list, one number, a photo that fills the width — or lead a bento with one wide tile.`,
      samples: [stack.sample],
    })
  }

  return findings
}

/** The longest run of consecutive sibling `od-card` elements with identical class attributes, outside a bento. */
function identicalCardStack(page: string): { count: number; sample: string } | null {
  const body = page.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ')
  const tags = body.matchAll(/<(\/?)([a-z][a-z0-9-]*)\b([^>]*?)(\/?)>/gi)
  const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr'])
  // A stack of open elements; each frame counts the run of identical cards among its direct children.
  // The longest run anywhere on the page is kept as it happens, since frames vanish when they close.
  const open: { cls: string; run: number; runCls: string }[] = [{ cls: '', run: 0, runCls: '' }]
  let best: { count: number; sample: string } | null = null
  for (const m of tags) {
    const [, close, name, attrs, selfClose] = m
    const tag = name!.toLowerCase()
    if (close) {
      if (open.length > 1) open.pop()
      continue
    }
    const parent = open[open.length - 1]!
    const cls = (/\bclass="([^"]*)"/i.exec(attrs!) ?? [])[1]?.trim().split(/\s+/).sort().join(' ') ?? ''
    const isCard = /\bod-card\b/.test(cls)
    if (!/\bod-bento\b/.test(parent.cls)) {
      if (isCard && cls === parent.runCls) parent.run++
      else if (isCard) (parent.run = 1), (parent.runCls = cls)
      else if (!VOID.has(tag)) (parent.run = 0), (parent.runCls = '') // any other sibling breaks the run
      if (parent.run >= 4 && parent.run > (best?.count ?? 0)) best = { count: parent.run, sample: `<div class="${parent.runCls}"> ×${parent.run}` }
    }
    if (!selfClose && !VOID.has(tag)) open.push({ cls, run: 0, runCls: '' })
  }
  return best
}

/**
 * Repair the findings that have exactly one correct answer. Everything else is reported
 * rather than guessed at — silently rewriting copy or swapping an emoji for some icon
 * would hide the problem instead of fixing it.
 */
export function autofixScreen(html: string): string {
  // Skip past the token block — its values are already canonical, and an --accent that
  // legitimately sits in the indigo range must not rewrite itself to var(--accent).
  const rootBlock = extractRootBlock(html)
  const start = rootBlock ? html.indexOf(rootBlock) + rootBlock.length : 0
  let out = html.slice(0, start) + html.slice(start).replace(AI_INDIGO, 'var(--accent)')

  out = out.replace(FONT_FAMILY, (match, value: string) => {
    const trailing = value.match(/["']\s*$/)?.[0] ?? ''
    const v = cleanValue(value)
    if (!v || isTokenised(v)) return match
    const token = /mono|courier|consolas|menlo/i.test(v)
      ? '--font-mono'
      : /serif|georgia|times/i.test(v) && !/sans-serif/i.test(v)
        ? '--font-display'
        : '--font-body'
    return `font-family: var(${token})${trailing}`
  })

  // Text below the platform minimum is raised to it (EYE-03). Zero stays: it hides text on purpose.
  const rootEnd = (() => { const b = extractRootBlock(out); return b ? out.indexOf(b) + b.length : 0 })()
  out = out.slice(0, rootEnd) + out.slice(rootEnd).replace(/(font-size\s*:\s*)(\d+(?:\.\d+)?)px/gi, (m, pre: string, n: string) => (Number(n) > 0 && Number(n) < HIG.minFontPx ? `${pre}${HIG.minFontPx}px` : m))
  out = out.replace(/\btext-\[(\d+(?:\.\d+)?)px\]/g, (m, n: string) => (Number(n) > 0 && Number(n) < HIG.minFontPx ? `text-[${HIG.minFontPx}px]` : m))

  // Chart slots are drawn from their data (lib/charts.ts, KIT-03); map slots, and image slots that
  // ask for a map photo, become a drawn street plan (lib/maps.ts, GQ-04) before photos are looked up.
  out = renderCharts(out)
  out = renderMaps(out)
  out = renderStickers(out) // GQ-21: soft-3D glyph slots, drawn in the tokens' colours

  // An icon-only button gets a 44×44 invisible hit area centred on it, whatever its drawn size.
  // :where() keeps the position rule at zero specificity, so a button the screen positions itself
  // (a fixed FAB) keeps its own position and the hit area still centres on it.
  // A button whose class the screen already decorates with ::after (a badge dot) is left alone.
  if (!out.includes('data-od-hit-area') && /<button\b|data-od-link=/i.test(out)) {
    const t = HIG.minTargetPx
    const decorated = [...new Set([...out.matchAll(/\.([\w-]+)[^{},]*?::?(?:after|before)/g)].map((m) => m[1]))]
    // Every button, not only the icon-only ones: a short text button ("See all", a segment) misses
    // the target just as easily. The area is a pseudo-element, so a button inside a fixed-height
    // track keeps its drawn size — growing the box instead is what made a segmented control bulge
    // out of its own rail.
    //
    // EYE-05: a tap is not always a <button>. Every small-target finding in the last run was an
    // anchor — `<a class="od-icon-btn" data-od-link="Stats">` squeezed to 24px wide, "See all" one
    // pixel short at 43px — because this selector only ever named `button`. Anchors are included
    // only when they carry data-od-link, the marker the model puts on a tap that opens a screen: a
    // link inside a sentence must not grow a 44px overlay over the words beside it. A replaced
    // element (input, and so .od-switch) cannot host ::after and is left out; see the note below.
    const targets = ['button', 'a[data-od-link]', '[role="button"]', 'label']
    const not = decorated.map((c) => `:not(.${c})`).join('')
    const sel = targets.map((x) => `${x}${not}`).join(',')
    const css = `<style data-od-hit-area>:where(${sel}){position:relative}:is(${sel})::after{content:"";position:absolute;left:50%;top:50%;width:max(100%,${t}px);height:max(100%,${t}px);transform:translate(-50%,-50%)}</style>`
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${css}</head>`) : css + out
  }

  // EYE-06: a brand colour used as text goes through its measured --od-*-text token. This is an
  // architecture rule we had written down and never enforced, so the model kept writing
  // `.delta--up { color: var(--success) }` and shipping 3.30:1. The -text tokens are each mixed
  // toward --fg by exactly as much as AA needs on that system's surfaces, so the swap is the one
  // right answer and needs no judgement — the same reason the craft sheet below lives in code.
  // --border is a hairline and is never measured as an ink; a separator dot painted with it read
  // 1.26:1. Only the page's own stylesheets are rewritten: od-kit.css already uses these tokens,
  // and its one raw `color: var(--warn)` is a filled star, where the colour is the point.
  // GQ-34: the same swap for inline style attributes and for the accent's hover and pressed shades.
  // Ember's first run wrote `style="color:var(--accent)"` ten times and `color: var(--accent-active)`
  // nine — neither form was rewritten, and a coral figure on a grey tile read 2.4:1. The shell's
  // own active tab takes the measured token at its source (ShellService), so nothing here edits it.
  const inkSwap = (css: string) =>
    css
      // `color: var(--success)`, and the lightened mixes the model reaches for on a tinted chip
      // (`color-mix(in oklab, var(--danger), white 25%)` measured 1.12:1 on its own tint).
      .replace(/(?<![-\w])color\s*:\s*(?:var\(\s*--(accent|success|warn|danger)(?:-hover|-active)?\s*\)|color-mix\([^;{}"]*?var\(\s*--(accent|success|warn|danger)(?:-hover|-active)?\s*\)[^;{}"]*?\))/gi,
        (_whole: string, a?: string, b?: string) => `color: var(--od-${(a ?? b ?? '').toLowerCase()}-text)`)
      .replace(/(?<![-\w])color\s*:\s*var\(\s*--border(?:-soft)?\s*\)/gi, 'color: var(--meta)')
  out = out.replace(/(<style(?![^>]*\bdata-od)[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, open: string, css: string, close: string) => open + inkSwap(css) + close)
  out = out.replace(/(\sstyle=")([^"]*)(")/gi, (_m, open: string, css: string, close: string) => open + inkSwap(css) + close)

  // EYE-06: a white label on a scrim over a photo. `.hero__tag { color:#fff; background:
  // rgba(17,17,19,.42) }` measured 1.00:1 — the photo behind it happened to be bright, and a 42%
  // scrim hides nothing. The alpha is the only unknown here and there is one right answer: dark
  // enough that white clears AA whatever the photo does, which is 0.75. Only a dark scrim under
  // light text is touched; a tint, a highlight, or any scrim already at 0.75 is left alone.
  out = out.replace(/(<style(?![^>]*\bdata-od)[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, open: string, css: string, close: string) =>
    open + css.replace(/\{[^{}]*\}/g, (rule) => {
      const light = /(?<![-\w])color\s*:\s*(#fff(f{3})?\b|white\b|rgba?\(\s*2[45]\d\s*,\s*2[45]\d\s*,\s*2[45]\d)/i.test(rule)
      if (!light) return rule
      return rule.replace(/background(-color)?\s*:\s*rgba\(\s*(\d{1,2}|1\d\d)\s*,\s*(\d{1,2}|1\d\d)\s*,\s*(\d{1,2}|1\d\d)\s*,\s*(0?\.[0-6]\d*)\s*\)/gi,
        (_w, dash = '', r: string, g: string, b: string) => `background${dash}: rgba(${r}, ${g}, ${b}, .75)`)
    }) + close)

  // CRAFT-01: the craft rules with exactly one right answer, applied in code rather than asked for
  // in the prompt (ui-skills.com playbook + jakubkrehel/better-ui). Everything here is a
  // zero-specificity :where() default or a pseudo-element, so a screen that styles the same thing
  // itself always wins.
  if (!out.includes('data-od-craft')) {
    const css = [
      // Numbers that sit in columns (prices, stats, times) must line up: proportional digits make
      // a list of prices look ragged even when the markup is perfect.
      ':where(table,tbody,td,th,time,output,data,.price,.stat,.amount,.total,.value,[data-od-chart]){font-variant-numeric:tabular-nums}',
      // A heading that breaks one word onto the last line reads as a mistake; body copy gets the
      // gentler rule, which only fixes orphans.
      ':where(h1,h2,h3){text-wrap:balance}',
      ':where(p,li,figcaption,blockquote){text-wrap:pretty}',
      // A photo on a surface of nearly its own colour has no edge; 10% of the page's ink gives it
      // one without a visible border.
      ':where(img[data-od-img-resolved],img[data-od-avatar-resolved]){outline:1px solid color-mix(in oklab, var(--fg) 10%, transparent);outline-offset:-1px}',
      // Nothing is wider than the phone: a replaced element or a form control keeps its intrinsic
      // width otherwise (an amount field drew at 503px on a 390px screen, a range input ran off the
      // edge), and a word longer than its line breaks instead of pushing the page sideways.
      ':where(img,video,svg,canvas,iframe,input,select,textarea){max-width:100%}',
      ':where(body){overflow-wrap:break-word}',
      // Keyboard focus must be visible — the linter cannot see a missing focus ring in a screenshot.
      ':where(a,button,input,select,textarea,[tabindex]):focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
      // Press feedback: 0.96 reads as a press, 0.95 and below reads as a glitch.
      '@media (prefers-reduced-motion:no-preference){:where(button,[role="button"],a[data-od-link]){transition:transform 120ms ease-out}:where(button,[role="button"],a[data-od-link]):active{transform:scale(.96)}}',
    ].join('')
    const tag = `<style data-od-craft>${css}</style>`
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${tag}</head>`) : tag + out
  }

  return out
}
