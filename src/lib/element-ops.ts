// Direct edits to one element of a stored screen, without a model: select, retype, delete,
// duplicate, move, re-photo. Everything is a splice over the original string (lib/html-tree.ts),
// so the rest of the screen stays byte-identical.
//
// Elements are addressed by data-od-id. `annotateElements` gives every selectable element one,
// deterministically: the browser runs it on the stored HTML to render, the server runs it on the
// same stored HTML to edit, and both arrive at the same ids without the ids having been saved.

import { attr, findById, ownTextRanges, parseTree, textOf, walk, within, type El } from './html-tree.ts'

const STRUCTURAL = new Set(['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'form', 'ul', 'ol', 'table', 'figure', 'blockquote'])
const LEAF = new Set(['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'img', 'input', 'textarea', 'select', 'label'])
const CLASS_HINT = /\b(card|tile|item|row|chip|badge|pill|tag|stat|metric|avatar|price|banner|hero|list|cell|tab|segment)\b/i
// Never selectable: not content, or owned by code (the shell is identical on every screen and is injected, not drawn).
const SKIP = new Set(['head', 'script', 'style', 'svg', 'i', 'template', 'noscript'])

function selectableBase(el: El): string | null {
  if (LEAF.has(el.tag) || STRUCTURAL.has(el.tag)) return el.tag
  if (el.tag === 'div' || el.tag === 'span') {
    const hint = (attr(el, 'class') ?? '').match(CLASS_HINT)?.[1]?.toLowerCase()
    if (hint) return hint
  }
  return null
}

function openTagInsertAt(html: string, el: El): number {
  // Before the closing `>` of the opening tag, or before `/>` on a self-closed one.
  let at = el.openEnd - 1
  while (at > el.start && /\s/.test(html[at - 1])) at--
  if (html[at - 1] === '/') at--
  return at
}

/**
 * Gives every selectable element a stable, unique data-od-id. Idempotent. Models sometimes write
 * the same id twice (16 of 351 eval screens had two "hero"s); the later ones are renumbered, or an
 * edit aimed at the second would land on the first.
 */
export function annotateElements(html: string): string {
  const root = parseTree(html)
  const used = new Set<string>()
  walk(root, (el) => {
    const id = attr(el, 'data-od-id')
    if (id) used.add(id)
  })
  const edits: [number, number, string][] = [] // [from, to, replacement]
  const counters: Record<string, number> = {}
  const fresh = (base: string) => {
    let n = counters[base] ?? 0
    let id: string
    do id = `${base}-${++n}`
    while (used.has(id))
    counters[base] = n
    used.add(id)
    return id
  }
  const seen = new Set<string>()
  walk(root, (el) => {
    if (SKIP.has(el.tag) || attr(el, 'data-od-shell') !== undefined) return false
    const existing = attr(el, 'data-od-id')
    if (existing !== undefined) {
      // Kept as written unless it clashes with an earlier one or is not a plain token (the editor
      // only accepts [\w-] ids from the sandbox; a model sometimes writes "Hero Section").
      const plain = /^[\w-]{1,80}$/.test(existing)
      if (plain && !seen.has(existing)) {
        seen.add(existing)
        return
      }
      const open = html.slice(el.start, el.openEnd)
      const m = open.match(/\sdata-od-id\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i)!
      const from = el.start + m.index!
      const base = plain ? existing.replace(/-\d+$/, '') : existing.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || selectableBase(el) || el.tag
      edits.push([from, from + m[0].length, ` data-od-id="${fresh(base)}"`])
      return
    }
    const base = selectableBase(el)
    if (!base) return
    const at = openTagInsertAt(html, el)
    edits.push([at, at, ` data-od-id="${fresh(base)}"`])
  })
  let out = html
  for (const [from, to, text] of edits.sort((a, z) => z[0] - a[0])) out = out.slice(0, from) + text + out.slice(to)
  return out
}

const NAMES: Record<string, string> = {
  button: 'Button', a: 'Link', p: 'Text', li: 'List item', img: 'Image', input: 'Input', textarea: 'Text field', select: 'Picker', label: 'Label',
  header: 'Header', nav: 'Navigation', main: 'Content', section: 'Section', article: 'Article', aside: 'Side panel', footer: 'Footer', form: 'Form',
  ul: 'List', ol: 'List', table: 'Table', figure: 'Figure', blockquote: 'Quote', div: 'Block', span: 'Label',
}

/** A name a person recognises: `Button “Add to cart”`, `Image “Pad Thai”`, `Card`. */
export function describeElement(html: string, el: El): string {
  const kind = /^h[1-6]$/.test(el.tag)
    ? 'Heading'
    : (el.tag === 'div' || el.tag === 'span') && CLASS_HINT.test(attr(el, 'class') ?? '')
      ? ((attr(el, 'class') ?? '').match(CLASS_HINT)![1].replace(/^\w/, (c) => c.toUpperCase()))
      : (NAMES[el.tag] ?? 'Element')
  const said = el.tag === 'img' ? (attr(el, 'alt') ?? attr(el, 'data-od-img') ?? '') : el.tag === 'input' || el.tag === 'textarea' ? (attr(el, 'placeholder') ?? '') : textOf(html, el)
  const short = said.length > 28 ? `${said.slice(0, 27).trimEnd()}…` : said
  return short ? `${kind} “${short}”` : kind
}

export class ElementOpError extends Error {}

function locate(html: string, id: string): { root: El; el: El } {
  const root = parseTree(html)
  const el = findById(root, id)
  if (!el || within(el, 'data-od-shell')) throw new ElementOpError('That element is no longer on this screen')
  return { root, el }
}

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Whether an element's text can be retyped in place: it has text of its own, and its children
 * carry none (an icon or an image beside the words is fine, a nested <b>price</b> is not — the
 * person would be retyping text that lives somewhere else).
 */
export function isTextEditable(html: string, el: El): boolean {
  if (['img', 'input', 'textarea', 'select', 'ul', 'ol', 'table'].includes(el.tag)) return false
  if (ownTextRanges(html, el).length === 0) return false
  return el.children.every((c) => ['i', 'svg', 'img', 'br'].includes(c.tag) || !textOf(html, c))
}

export function setElementText(html: string, id: string, text: string): { html: string; before: string } {
  const clean = text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
  if (!clean) throw new ElementOpError('Text cannot be empty — delete the element instead')
  if (clean.length > 500) throw new ElementOpError('Text is too long (500 characters at most)')
  const { el } = locate(html, id)
  if (!isTextEditable(html, el)) throw new ElementOpError('This element has no text of its own to edit')
  const before = textOf(html, el)
  const ranges = ownTextRanges(html, el)
  let out = html
  // Last range first so earlier offsets stay valid. The first run takes the new text (keeping its
  // surrounding whitespace, which can matter next to an icon); any others are emptied.
  for (let i = ranges.length - 1; i >= 0; i--) {
    const [a, b] = ranges[i]
    const chunk = out.slice(a, b)
    const lead = chunk.match(/^\s*/)![0]
    const trail = chunk.match(/\s*$/)![0]
    out = out.slice(0, a) + (i === 0 ? lead + escapeText(clean) + trail : lead ? ' ' : '') + out.slice(b)
  }
  return { html: out, before }
}

const PROTECTED = new Set(['html', 'head', 'body', 'main'])

export function removeElement(html: string, id: string): string {
  const { el } = locate(html, id)
  if (PROTECTED.has(el.tag)) throw new ElementOpError('The page’s main container cannot be deleted')
  // Take the element's own line with it when it sits on one, so no blank line is left behind.
  let start = el.start
  let end = el.end
  const lineStart = html.lastIndexOf('\n', start - 1) + 1
  if (/^[ \t]*$/.test(html.slice(lineStart, start)) && /^[ \t]*\r?\n/.test(html.slice(end))) {
    start = lineStart
    end += html.slice(end).match(/^[ \t]*\r?\n/)![0].length
  }
  return html.slice(0, start) + html.slice(end)
}

export function duplicateElement(html: string, id: string): string {
  const { el } = locate(html, id)
  if (PROTECTED.has(el.tag)) throw new ElementOpError('The page’s main container cannot be duplicated')
  // The copy loses every id (they would clash) and is re-annotated with fresh ones.
  const copy = html.slice(el.start, el.end).replace(/\sdata-od-id\s*=\s*("[^"]*"|'[^']*')/g, '')
  const lineStart = html.lastIndexOf('\n', el.start - 1) + 1
  const indent = html.slice(lineStart, el.start)
  const joint = /^[ \t]*$/.test(indent) ? `\n${indent}` : ''
  return annotateElements(html.slice(0, el.end) + joint + copy + html.slice(el.end))
}

/** Swaps the element with its previous (`up`) or next sibling element. */
export function moveElement(html: string, id: string, direction: 'up' | 'down'): string {
  const { el } = locate(html, id)
  const siblings = (el.parent?.children ?? []).filter((c) => !['script', 'style', 'template'].includes(c.tag) && attr(c, 'data-od-shell') === undefined)
  const i = siblings.indexOf(el)
  const other = siblings[direction === 'up' ? i - 1 : i + 1]
  if (!other) throw new ElementOpError(direction === 'up' ? 'It is already first' : 'It is already last')
  const [a, b] = direction === 'up' ? [other, el] : [el, other]
  return html.slice(0, a.start) + html.slice(b.start, b.end) + html.slice(a.end, b.start) + html.slice(a.start, a.end) + html.slice(b.end)
}

/** Turns an image back into an empty slot with a new description; ImageService fills it. */
export function setImageQuery(html: string, id: string, query: string): string {
  const q = query.replace(/[^\p{L}\p{N}\s,-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  if (!q) throw new ElementOpError('Describe the photo you want')
  const { el } = locate(html, id)
  if (el.tag !== 'img' || attr(el, 'data-od-avatar') !== undefined || attr(el, 'data-od-logo') !== undefined)
    throw new ElementOpError('Only photos can be replaced this way')
  const attrs = el.attrs
    .replace(/\s(src|srcset|data-od-img-resolved|data-od-img)(?=[\s=/>]|$)(\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi, '')
    .replace(/\s*\/\s*$/, '')
  return html.slice(0, el.start) + `<img${attrs} data-od-img="${q}">` + html.slice(el.openEnd)
}

/** What the editor needs to know about an element it is about to show a panel for. */
export function elementInfo(html: string, id: string) {
  const { el } = locate(html, id)
  return {
    label: describeElement(html, el),
    textEditable: isTextEditable(html, el),
    isPhoto: el.tag === 'img' && attr(el, 'data-od-avatar') === undefined && attr(el, 'data-od-logo') === undefined,
    photoQuery: attr(el, 'data-od-img') ?? attr(el, 'alt') ?? '',
  }
}
