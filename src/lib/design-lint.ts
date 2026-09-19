import { extractRootBlock } from './screen-normalizer.ts'

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
  return block ? html.replace(block, '') : html
}

function uniq(values: string[], cap = 4): string[] {
  return [...new Set(values)].slice(0, cap)
}

export function lintScreen(html: string): Finding[] {
  const findings: Finding[] = []
  const body = bodyOf(html)
  const scannable = withoutRoot(html)

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
    (tag) => !/data-od-icon|data-od-shell|class="[^"]*lucide/i.test(tag),
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

  return findings
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

  return out
}
