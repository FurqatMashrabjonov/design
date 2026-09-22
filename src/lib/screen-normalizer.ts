import { patchElement } from './element-patcher.ts'

/**
 * Deterministic post-generation pass that makes parallel-generated screens agree.
 *
 * Parallel screens are independent samples: each one retypes the :root token block
 * and redraws the nav icons slightly differently. Rather than asking the model to be
 * consistent, this rewrites the parts that must be byte-identical across screens.
 */

export type ShellParts = {
  nav?: string
  header?: string
}

export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Pull the declaration body out of a `:root { ... }` rule. Returns null if absent. */
export function extractRootBlock(css: string): string | null {
  const clean = stripCssComments(css)
  const at = clean.indexOf(':root')
  if (at === -1) return null
  const open = clean.indexOf('{', at)
  if (open === -1) return null
  let depth = 1
  for (let i = open + 1; i < clean.length; i++) {
    if (clean[i] === '{') depth++
    else if (clean[i] === '}') {
      depth--
      if (depth === 0) return clean.slice(open + 1, i)
    }
  }
  return null
}

export function parseDeclarations(block: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const part of block.split(';')) {
    const colon = part.indexOf(':')
    if (colon === -1) continue
    const prop = part.slice(0, colon).trim()
    // Declarations in tokens.css wrap across lines; collapse so the value stays one line.
    const value = part.slice(colon + 1).replace(/\s+/g, ' ').trim()
    if (prop.startsWith('--') && value) out.set(prop, value)
  }
  return out
}

function renderBlock(decls: Map<string, string>): string {
  return [...decls].map(([k, v]) => `${k}: ${v}`).join('; ')
}

/** Brace span of the first real `:root` rule in the raw source, as [openBrace, closeBrace]. */
function findRootSpan(html: string): [number, number] | null {
  const re = /:root\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (insideComment(html, m.index)) continue
    const open = html.indexOf('{', m.index)
    if (open === -1) return null
    let depth = 1
    for (let i = open + 1; i < html.length; i++) {
      if (html[i] === '{') depth++
      else if (html[i] === '}') {
        depth--
        if (depth === 0) return [open, i]
      }
    }
    return null
  }
  return null
}

function insideComment(html: string, index: number): boolean {
  const open = html.lastIndexOf('/*', index)
  if (open === -1) return false
  const close = html.indexOf('*/', open)
  return close === -1 || close > index
}

/**
 * Force the design system's token values into the screen's :root, keeping any extra
 * custom properties the model invented (they may be referenced further down the file).
 */
export function normalizeTokens(html: string, tokensCss: string): string {
  const canonicalBlock = extractRootBlock(tokensCss)
  if (!canonicalBlock) return html
  const canonical = parseDeclarations(canonicalBlock)
  if (canonical.size === 0) return html

  const span = findRootSpan(html)
  if (!span) {
    const style = `<style>:root { ${renderBlock(canonical)} }</style>`
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}</head>`)
    return html.replace(/<body([^>]*)>/i, `<body$1>${style}`)
  }

  const [open, close] = span
  const merged = new Map(parseDeclarations(stripCssComments(html.slice(open + 1, close))))
  for (const [k, v] of canonical) merged.set(k, v)
  return `${html.slice(0, open + 1)} ${renderBlock(merged)} ${html.slice(close)}`
}

/**
 * Swap the model's drawn nav/header for the canonical shell built in ShellService.
 *
 * Screens are told not to draw these at all, so the usual path is a clean inject. The
 * signature matching below only catches a model that drew one anyway — it deliberately
 * ignores in-page navs (filter bars, segmented controls) that must survive untouched.
 */
export function normalizeShell(html: string, shell: ShellParts): string {
  let out = html

  if (shell.nav) {
    out =
      patchById(out, 'bottom-nav', shell.nav) ??
      replaceMatchingTag(out, 'nav', isFixedBottom, shell.nav) ??
      injectBeforeBodyEnd(out, shell.nav)
  }

  if (shell.header) {
    out =
      patchById(out, 'screen-header', shell.header) ??
      replaceMatchingTag(out, 'header', isPinnedTop, shell.header) ??
      injectAfterBodyStart(out, shell.header)
    out = stackRowBody(out)
  }

  return out
}

/**
 * Models like `body { display:flex; justify-content:center }` to centre a 390px column. The header
 * is injected as body's first child, so in that row it became a narrow column beside the screen
 * and pushed the content off the right edge. When body is a row container, stack it instead.
 */
export function bodyIsRowContainer(html: string): boolean {
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => stripCssComments(m[1])).join('\n')
  const bodyRules = [...css.matchAll(/(?:^|[\s,}])body\s*\{([^}]*)\}/gi)].map((m) => m[1]).join(';')
  const inline = html.match(/<body\b[^>]*\bstyle\s*=\s*["']([^"']*)["']/i)?.[1] ?? ''
  const classes = ` ${html.match(/<body\b[^>]*\bclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? ''} `
  const decl = `${bodyRules};${inline}`
  const flexOrGrid = /display\s*:\s*(inline-)?(flex|grid)/i.test(decl) || /\s(flex|inline-flex|grid)\s/.test(classes)
  const column = /flex-direction\s*:\s*column/i.test(decl) || /\sflex-col\s/.test(classes)
  return flexOrGrid && !column
}

function stackRowBody(html: string): string {
  if (!bodyIsRowContainer(html) || html.includes('data-od-shell="stack"')) return html
  const fix = '<style data-od-shell="stack">body{display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-items:stretch!important}</style>'
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${fix}</head>`) : fix + html
}

function patchById(html: string, id: string, replacement: string): string | null {
  const patched = patchElement(html, id, replacement)
  return patched === html ? null : patched
}

function isFixedBottom(openTag: string): boolean {
  return /\bfixed\b|position:\s*fixed/i.test(openTag) && /bottom-0|bottom:\s*0/i.test(openTag)
}

function isPinnedTop(openTag: string): boolean {
  return /\bsticky\b|\bfixed\b|position:\s*(sticky|fixed)/i.test(openTag) && /top-0|top:\s*0/i.test(openTag)
}

/**
 * Force the design system's webfonts to be the ones the page actually loads.
 *
 * Two screens of one app were rendering in different typefaces: both declared
 * `--font-body: "Inter"`, but only one remembered the stylesheet link. Any font the
 * model linked on its own is dropped first, so a system that asks for Poppins cannot
 * end up showing the model's habitual Inter.
 */
export function normalizeFonts(html: string, fontUrls: string[]): string {
  let out = html.replace(/<link\b[^>]*fonts\.googleapis\.com[^>]*>\s*/gi, '')
  out = out.replace(/@import\s+url\(\s*["']?[^"')]*fonts\.googleapis\.com[^"')]*["']?\s*\);?/gi, '')
  if (fontUrls.length === 0) return out

  // data-od-font marks these as the canonical links so the linter doesn't read them back
  // as the page linking its own font.
  const links = [
    '<link data-od-font rel="preconnect" href="https://fonts.googleapis.com">',
    '<link data-od-font rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    ...fontUrls.map((u) => `<link data-od-font rel="stylesheet" href="${u.replace(/"/g, '&quot;')}">`),
  ].join('')

  if (/<\/head>/i.test(out)) return out.replace(/<\/head>/i, `${links}</head>`)
  return out.replace(/<body([^>]*)>/i, `<body$1>${links}`)
}

/** UMD browser build; pinned so every screen resolves the same icon geometry. */
export const LUCIDE_CDN = 'https://cdn.jsdelivr.net/npm/lucide@1.47.0/dist/umd/lucide.min.js'

/**
 * Make icons agree across screens.
 *
 * A model hand-draws icon paths, so the same concept came out at 1.5px on one screen and
 * 2.5px on the next. Content icons are written as `<i data-lucide="name">` and resolved by
 * the library instead; any SVG still drawn by hand gets its stroke pinned to one weight.
 */
export function normalizeIcons(html: string, stroke: number): string {
  // Only icon-weight strokes. Progress rings and decorative arcs use much thicker
  // values deliberately, and rewriting those would visibly break them.
  let out = html.replace(/stroke-width\s*=\s*["'](\d*\.?\d+)["']/gi, (match, raw: string) => {
    const w = Number(raw)
    return w >= 1 && w <= 3 ? `stroke-width="${stroke}"` : match
  })

  if (!/data-lucide\s*=/.test(out) || out.includes(LUCIDE_CDN)) return out

  const boot = `<script src="${LUCIDE_CDN}"></script><script>lucide.createIcons({attrs:{'stroke-width':${stroke}}})</script>`
  if (/<\/body>/i.test(out)) return out.replace(/<\/body>/i, `${boot}</body>`)
  return out + boot
}

/** Keep page content clear of the fixed bottom nav regardless of what the model set. */
export function applyNavClearance(html: string, px: number): string {
  const style = `<style>body { padding-bottom: ${px}px !important; }</style>`
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}</head>`)
  return html.replace(/<body([^>]*)>/i, `<body$1>${style}`)
}

/**
 * The anchor screen's author CSS minus the canonical :root rule — a compact style signal
 * to hand sibling screens. Sending the anchor's whole HTML would multiply prompt cost by
 * the fan-out width for mostly redundant markup.
 */
export function extractStyleDigest(html: string, maxChars = 1200): string {
  const blocks: string[] = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) blocks.push(m[1])
  if (blocks.length === 0) return ''

  let css = stripCssComments(blocks.join('\n'))
  const span = findRootSpan(css)
  if (span) {
    const ruleStart = css.lastIndexOf(':root', span[0])
    css = css.slice(0, ruleStart) + css.slice(span[1] + 1)
  }
  css = css.replace(/\s+/g, ' ').trim()
  return css.length > maxChars ? `${css.slice(0, maxChars)} /* …truncated */` : css
}

export type NormalizeOptions = {
  tokensCss?: string
  fontUrls?: string[]
  iconStroke?: number
  shell?: ShellParts
  navClearance?: number
  /** kit/od-kit.css (KitService.css()); injected when the page uses an od- class. */
  kitCss?: string
}

const KIT_ONLY = /^\s*\.od-[a-z0-9_-]+(\s*(:{1,2}[a-z-]+(\([^)]*\))?|\[[^\]]+\]))*\s*$/i

/** Walks a stylesheet (into @media / @supports blocks) and drops rules that only restyle kit classes. */
function dropKitRules(css: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    const brace = css.indexOf('{', i)
    if (brace === -1) return out + css.slice(i)
    let depth = 1
    let j = brace + 1
    while (j < css.length && depth > 0) depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0, j++
    const selector = css.slice(i, brace)
    const block = css.slice(brace + 1, j - 1)
    if (selector.trim().startsWith('@')) out += `${selector}{${dropKitRules(block)}}`
    else if (!selector.split(',').every((sel) => KIT_ONLY.test(sel.replace(/\/\*[\s\S]*?\*\//g, '')))) out += css.slice(i, j)
    else out += selector.match(/^\s*/)![0] // keep the whitespace before a dropped rule
    i = j
  }
  return out
}

/**
 * The shared component sheet goes in first, right after <head>, so the page's own styles can
 * still override a kit class. A page with no od- class gets nothing: no dead bytes. Idempotent —
 * a sheet from an earlier pass is replaced, so the stored screen always has the current kit.
 */
export function normalizeKit(html: string, css: string): string {
  let out = html.replace(/<style data-od-kit>[\s\S]*?<\/style>/gi, '')
  // The kit owns its classes: a page rule whose selectors are all plain kit classes (".od-btn",
  // ".od-row__lead, .od-kv:hover") is the model restyling the kit, which makes screens drift apart —
  // it is dropped. Contextual rules (".promo .od-btn", ".od-card.promo") stay: that is composition.
  out = out.replace(/(<style(?![^>]*data-od)[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open: string, body: string, close: string) => open + dropKitRules(body) + close)
  if (!/class="[^"]*(?<![\w-])od-[a-z]/.test(out)) return out
  const sheet = `<style data-od-kit>${css.replace(/<\//g, '<\\/')}</style>`
  if (/<head\b[^>]*>/i.test(out)) return out.replace(/<head\b[^>]*>/i, (m) => `${m}${sheet}`)
  return sheet + out
}

export function normalizeScreen(html: string, opts: NormalizeOptions): string {
  let out = html
  if (opts.tokensCss) out = normalizeTokens(out, opts.tokensCss)
  if (opts.fontUrls) out = normalizeFonts(out, opts.fontUrls)
  if (opts.shell) out = normalizeShell(out, opts.shell)
  if (opts.iconStroke) out = normalizeIcons(out, opts.iconStroke)
  if (opts.navClearance && opts.shell?.nav) out = applyNavClearance(out, opts.navClearance)
  if (opts.kitCss) out = normalizeKit(out, opts.kitCss)
  return out
}

// --- tag helpers (regex, matching element-patcher's dependency-free approach) ---

function replaceMatchingTag(
  html: string,
  tag: string,
  matches: (openTag: string) => boolean,
  replacement: string,
): string | null {
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi')
  let m: RegExpExecArray | null
  while ((m = openRe.exec(html)) !== null) {
    if (!matches(m[0])) continue
    const close = findClosing(html, m.index + m[0].length, tag)
    if (close === -1) return null
    return html.slice(0, m.index) + replacement + html.slice(close + `</${tag}>`.length)
  }
  return null
}

function findClosing(html: string, from: number, tag: string): number {
  const re = new RegExp(`<(/)?${tag}(?:\\s[^>]*)?>`, 'gi')
  re.lastIndex = from
  let depth = 1
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (m[1]) {
      depth--
      if (depth === 0) return m.index
    } else {
      depth++
    }
  }
  return -1
}

function injectBeforeBodyEnd(html: string, snippet: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${snippet}</body>`)
  return html + snippet
}

function injectAfterBodyStart(html: string, snippet: string): string {
  if (/<body([^>]*)>/i.test(html)) return html.replace(/<body([^>]*)>/i, `<body$1>${snippet}`)
  return snippet + html
}
