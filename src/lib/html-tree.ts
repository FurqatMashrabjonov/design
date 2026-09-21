// A minimal HTML tree over the original string: element boundaries only, as offsets into the
// source, so edits can splice the exact bytes they change and leave everything else untouched.
// Generated screens are well-formed enough for this; it is lenient where browsers are (void
// elements, raw-text elements, stray and unclosed tags). ponytail: no entity decoding, no implicit
// <p>/<li> closing rules; add them if a real screen breaks on it.

export type El = {
  tag: string
  /** Offset of `<`. */
  start: number
  /** Offset just past the opening tag's `>`. */
  openEnd: number
  /** Offset of the closing tag's `<` (equals openEnd for void and self-closed elements). */
  closeStart: number
  /** Offset just past the whole element. */
  end: number
  attrs: string
  children: El[]
  parent: El | null
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const RAW = new Set(['script', 'style', 'textarea', 'title'])
const TAG = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi

export function parseTree(html: string): El {
  const root: El = { tag: '#root', start: 0, openEnd: 0, closeStart: html.length, end: html.length, attrs: '', children: [], parent: null }
  const stack: El[] = [root]
  TAG.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TAG.exec(html)) !== null) {
    if (!m[2]) continue // comment or doctype
    const tag = m[2].toLowerCase()
    if (m[1]) {
      // A closing tag closes the nearest open element of that name; a stray one is ignored.
      const at = stack.map((e) => e.tag).lastIndexOf(tag)
      if (at <= 0) continue
      // Elements opened after the matching one were left unclosed: they end where this tag starts.
      while (stack.length - 1 > at) {
        const el = stack.pop()!
        el.closeStart = m.index
        el.end = m.index
      }
      const el = stack.pop()!
      el.closeStart = m.index
      el.end = m.index + m[0].length
      continue
    }
    const parent = stack[stack.length - 1]
    const openEnd = m.index + m[0].length
    const el: El = { tag, start: m.index, openEnd, closeStart: openEnd, end: openEnd, attrs: m[3] ?? '', children: [], parent }
    parent.children.push(el)
    if (VOID.has(tag) || /\/\s*$/.test(m[3] ?? '')) continue
    if (RAW.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, openEnd)
      const closeEnd = close === -1 ? html.length : html.indexOf('>', close) + 1 || html.length
      el.closeStart = close === -1 ? html.length : close
      el.end = closeEnd
      TAG.lastIndex = closeEnd
      continue
    }
    stack.push(el)
  }
  // Anything still open runs to the end of the document.
  for (const el of stack.slice(1)) {
    el.closeStart = html.length
    el.end = html.length
  }
  return root
}

export function attr(el: El, name: string): string | undefined {
  const m = el.attrs.match(new RegExp(`(?:^|\\s)${name}(?:\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+)))?(?=\\s|/|$)`, 'i'))
  if (!m) return undefined
  return m[2] ?? m[3] ?? m[4] ?? ''
}

export function walk(el: El, visit: (el: El) => boolean | void) {
  for (const child of el.children) {
    if (visit(child) === false) continue // false: do not descend
    walk(child, visit)
  }
}

export function findById(root: El, id: string): El | undefined {
  let found: El | undefined
  walk(root, (el) => {
    if (found) return false
    if (attr(el, 'data-od-id') === id) found = el
  })
  return found
}

/** True when `el` or an ancestor carries the attribute. */
export function within(el: El | null, name: string): boolean {
  for (let e = el; e && e.tag !== '#root'; e = e.parent) if (attr(e, name) !== undefined) return true
  return false
}

/** Ranges of the element's own text (not its children's), in source offsets, whitespace-only runs excluded. */
export function ownTextRanges(html: string, el: El): [number, number][] {
  const out: [number, number][] = []
  let cursor = el.openEnd
  for (const child of [...el.children, null]) {
    const stop = child ? child.start : el.closeStart
    if (stop > cursor && html.slice(cursor, stop).replace(/<!--[\s\S]*?-->/g, '').trim()) out.push([cursor, stop])
    if (child) cursor = child.end
  }
  return out
}

export function textOf(html: string, el: El): string {
  return html
    .slice(el.openEnd, el.closeStart)
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
