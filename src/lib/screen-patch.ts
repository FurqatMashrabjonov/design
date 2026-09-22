// Editing a whole screen without rewriting it. The model answers with the parts it changes,
//   <edit target="card-2">…the element's new HTML…</edit>
//   <edit target="p-4" op="delete"></edit>
//   <edit after="card-2">…a new element…</edit>   (or before="…")
// and the server splices them into the stored screen (lib/html-tree.ts), so everything the request
// did not touch stays byte-for-byte what it was. A rewrite used to redraw the whole page: slower
// (the model re-emits ~20 KB), and whatever it did not mean to change could drift anyway.

import { findById, parseTree, within } from './html-tree.ts'
import { describeElement } from './element-ops.ts'

export type ScreenEdit = { op: 'replace' | 'delete' | 'insert'; target: string; where?: 'before' | 'after'; html: string }

const EDIT = /<edit\b([^>]*)>([\s\S]*?)<\/edit>/gi
const ATTR = (attrs: string, name: string) => attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))?.slice(2).find((v) => v !== undefined)

export function parseEdits(text: string): ScreenEdit[] {
  const out: ScreenEdit[] = []
  for (const m of text.matchAll(EDIT)) {
    const attrs = m[1]
    const body = m[2].replace(/^\s*```html\s*/i, '').replace(/```\s*$/, '').trim()
    const after = ATTR(attrs, 'after')
    const before = ATTR(attrs, 'before')
    const target = ATTR(attrs, 'target')
    if (after || before) out.push({ op: 'insert', target: (after ?? before)!, where: after ? 'after' : 'before', html: body })
    else if (target && /^delete$/i.test(ATTR(attrs, 'op') ?? '')) out.push({ op: 'delete', target, html: '' })
    else if (target && body) out.push({ op: 'replace', target, html: body })
  }
  return out
}

// Ranges clash when they overlap; an insertion point clashes only when strictly inside a replaced range.
function clash([a0, a1]: [number, number], [b0, b1]: [number, number]): boolean {
  if (a0 === a1 && b0 === b1) return false
  if (a0 === a1) return a0 > b0 && a0 < b1
  if (b0 === b1) return b0 > a0 && b0 < a1
  return a0 < b1 && b0 < a1
}

/** The ids the model said the request affects (its <affects> line), for the agent log. */
export function parseAffects(text: string): string[] {
  const line = text.match(/<affects>([\s\S]*?)<\/affects>/i)?.[1] ?? ''
  return [...new Set(line.split(/[\s,]+/).map((x) => x.trim()).filter((x) => /^[\w-]{1,80}$/.test(x)))]
}

export type AppliedEdit = { op: ScreenEdit['op']; target: string; label: string }

/**
 * Applies edits to the annotated screen. Edits whose target is missing, sits in the injected
 * shell, or overlaps an earlier edit are skipped and reported, never guessed at.
 */
export function applyEdits(base: string, edits: ScreenEdit[]): { html: string; applied: AppliedEdit[]; skipped: string[] } {
  const root = parseTree(base)
  const splices: { from: number; to: number; text: string; edit: AppliedEdit }[] = []
  const skipped: string[] = []
  for (const e of edits) {
    const el = findById(root, e.target)
    if (!el || within(el, 'data-od-shell') || ['html', 'head', 'body'].includes(el.tag)) {
      skipped.push(`${e.op} ${e.target}: not on this screen`)
      continue
    }
    const from = e.op === 'insert' ? (e.where === 'before' ? el.start : el.end) : el.start
    const to = e.op === 'insert' ? from : el.end
    // Two edits on overlapping ranges would corrupt each other; the first one wins.
    if (splices.some((s) => clash([from, to], [s.from, s.to]))) {
      skipped.push(`${e.op} ${e.target}: overlaps another change`)
      continue
    }
    const text = e.op === 'delete' ? '' : e.op === 'insert' ? (e.where === 'after' ? `\n${e.html}` : `${e.html}\n`) : e.html
    splices.push({ from, to, text, edit: { op: e.op, target: e.target, label: describeElement(base, el) } })
  }
  let html = base
  // Right to left so earlier offsets stay valid; at the same offset a replacement goes before an insertion.
  for (const s of [...splices].sort((a, z) => z.from - a.from || z.to - a.to)) html = html.slice(0, s.from) + s.text + html.slice(s.to)
  return { html, applied: splices.map((s) => s.edit), skipped }
}

/** The prompt text that turns the screen system prompt into edit mode. */
export const EDIT_MODE = `# Editing an existing screen — this replaces the output contract above

You are changing a screen that already exists. Do not redraw it. Every element you may change carries a data-od-id.

First write one line listing every element whose content must change for this request — including every other place that shows the same value or a value derived from it (totals, counts, percentages, labels):
<affects>data-od-id, data-od-id, …</affects>

Then one <edit> block per element in that list, and nothing else:
- Replace an element: <edit target="the-data-od-id">the element's complete new HTML, with the same data-od-id on its outer tag</edit>
- Delete an element: <edit target="the-data-od-id" op="delete"></edit>
- Add a new element: <edit after="the-data-od-id">the new element's HTML</edit>  (or before="…")

Rules:
1. Change as little as the request needs. Target the smallest element that contains the change; never target a large container just to change something inside it. A replacement is the same element: keep its tag and its data-od-id on the outermost tag — do not drop a wrapper or return only its inside.
2. Everything you do not include stays exactly as it is — do not repeat unchanged parts. So if the same fact appears in several places (a count in a card and in a heading, a total in two rows), include an edit for every place.
3. Keep using the same CSS classes, tokens (var(--…)), icons (<i data-lucide>) and image slots (<img data-od-img>) as the rest of the screen. If you need a new style, put it in an inline style attribute.
4. Never target the injected shell (the tab bar or the top header); it has no data-od-id.
5. Answer instead with the complete document in <artifact title="…">…</artifact> when the request changes the whole layout, or when it changes values that the page's own <script> computes or sets (scripts cannot be edited by parts, and would overwrite your change when the page loads).`
