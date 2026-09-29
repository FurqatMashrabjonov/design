import { parse } from '@babel/parser'

// HIG-10: what the model gets wrong with Konsta, read off the screen's JSX. A rule with exactly one right
// answer is fixed in the source (a `ListItem link` already draws its chevron, so a second one is removed);
// a rule that needs a decision is reported, counted by the eval, and later fed back to the model (HIG-15).
// The rules come from Apple's HIG (lists, buttons, typography, colour) and from the component contracts in
// konsta/REFERENCE.md. Nothing here re-lays out a screen: it removes, substitutes one class, or reports.

export type LintFinding = { rule: string; message: string; sample?: string }
export type LintResult = { source: string; fixed: string[]; findings: LintFinding[] }

type Node = { type: string; start: number; end: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any

const LIST_CHILDREN = new Set(['ListItem', 'ListInput', 'ListButton'])
const LIST_PARENTS = new Set(['List', 'ListGroup', 'MenuList'])
// Controls where an emoji reads as clip art rather than content (HIG: buttons say what they do in words or a symbol).
const CONTROLS = new Set(['Button', 'Link', 'TabbarLink', 'Navbar', 'NavbarBackLink', 'SegmentedButton'])
const EMOJI = /\p{Extended_Pictographic}/u
const MIN_TEXT_PX = 11 // HIG: Caption 2, the smallest text style

const nameOf = (el: Node): string => (el.openingElement?.name?.type === 'JSXIdentifier' ? el.openingElement.name.name : '')
const attr = (el: Node, name: string): Node | undefined => el.openingElement?.attributes?.find((a: Node) => a.type === 'JSXAttribute' && a.name?.name === name)

/** The class strings of an element that can be edited in place: a literal, or the static parts of a template. */
function classParts(el: Node): { start: number; end: number; text: string; whole?: boolean }[] {
  const a = attr(el, 'className')
  const v = a?.value
  if (!v) return []
  if (v.type === 'StringLiteral') return [{ start: v.start + 1, end: v.end - 1, text: v.value, whole: true }]
  const e = v.type === 'JSXExpressionContainer' ? v.expression : null
  if (e?.type === 'StringLiteral') return [{ start: e.start + 1, end: e.end - 1, text: e.value, whole: true }]
  if (e?.type === 'TemplateLiteral') return e.quasis.map((q: Node) => ({ start: q.start, end: q.end, text: q.value.raw }))
  return []
}
const classText = (el: Node) => classParts(el).map((p) => p.text).join(' ')
const hasClass = (el: Node, cls: string) => classText(el).split(/\s+/).includes(cls)

/** Does the element's inline style paint its background with the kit's tint()? */
function tintedBackground(el: Node): boolean {
  const v = attr(el, 'style')?.value
  const obj = v?.type === 'JSXExpressionContainer' ? v.expression : null
  if (obj?.type !== 'ObjectExpression') return false
  return obj.properties.some((p: Node) => {
    const key = p.key?.name ?? p.key?.value
    return (key === 'background' || key === 'backgroundColor') && p.value?.type === 'CallExpression' && p.value.callee?.name === 'tint'
  })
}

function textOf(n: Node | undefined, src: string): string {
  return n ? src.slice(n.start, n.end) : ''
}

export function lintJsx(source: string): LintResult {
  let ast: { program: Node }
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx'] }) as unknown as { program: Node }
  } catch {
    return { source, fixed: [], findings: [] } // the compiler reports a parse error; nothing to lint
  }
  const edits: [number, number, string][] = []
  const fixed: string[] = []
  const findings: LintFinding[] = []
  const report = (rule: string, message: string, sample?: string) => findings.push({ rule, message, sample: sample?.replace(/\s+/g, ' ').slice(0, 80) })

  // The screen component: `export default function Screen()` or `export default Screen` with Screen declared above.
  let defaultFn = ast.program.body.find((n: Node) => n.type === 'ExportDefaultDeclaration')?.declaration
  if (defaultFn?.type === 'Identifier') defaultFn = ast.program.body.find((n: Node) => (n.type === 'FunctionDeclaration' && n.id?.name === defaultFn.name) || (n.type === 'VariableDeclaration' && n.declarations.some((d: Node) => d.id?.name === defaultFn.name)))
  // Konsta pulls a BlockTitle's bottom margin up (-mb-2) for the Block or List it expects next; anything else
  // under it (a plain div of cards, a grid, a mapped list) then sits 8px over the title's descenders. The one right
  // answer is a small positive gap on that title.
  const KONSTA_UNDER_TITLE = new Set(['Block', 'List', 'BlockHeader', 'BlockFooter', 'Table', 'BlockTitle'])
  const titleGap = new Set<Node>()
  ;(function siblings(x: unknown): void {
    if (!x || typeof x !== 'object') return
    if (Array.isArray(x)) return x.forEach(siblings)
    const y = x as Node
    if ((y.type === 'JSXElement' || y.type === 'JSXFragment') && Array.isArray(y.children)) {
      const kids = y.children.filter((c: Node) => c.type === 'JSXElement' || c.type === 'JSXExpressionContainer' && c.expression?.type !== 'JSXEmptyExpression')
      kids.forEach((c: Node, i: number) => {
        const next = kids[i + 1]
        // A Block or List whose own top margin the model changed no longer leaves room for the pull-up either.
        const konstaNext = next?.type === 'JSXElement' && KONSTA_UNDER_TITLE.has(nameOf(next)) && !/(^|\s)!?-?m[ty]-/.test(classText(next))
        if (c.type === 'JSXElement' && nameOf(c) === 'BlockTitle' && next && !konstaNext && !/(^|\s)!?-?mb-/.test(classText(c))) titleGap.add(c)
      })
    }
    for (const [k, v] of Object.entries(y)) if (k !== 'loc' && typeof v === 'object') siblings(v)
  })(ast.program)
  let largeButtons = 0
  let fixedBottom: Node | null = null
  let tabbar = false

  const walk = (n: unknown, stack: Node[], inDefault: boolean): void => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) return n.forEach((c) => walk(c, stack, inDefault))
    const node = n as Node
    const here = inDefault || node === defaultFn
    if (node.type === 'JSXElement') {
      const name = nameOf(node)
      const ancestors = stack.map(nameOf)

      // A `ListItem link` draws the platform's disclosure chevron itself (HIG: a disclosure indicator, once).
      if (name === 'ListItem' && (attr(node, 'link') || attr(node, 'linkProps'))) {
        const after = attr(node, 'after')?.value
        if (after) {
          const chevrons: Node[] = []
          ;(function find(x: unknown): void {
            if (!x || typeof x !== 'object') return
            if (Array.isArray(x)) return x.forEach(find)
            const y = x as Node
            if (y.type === 'JSXElement' && /^Chevron(Right|Forward)/.test(nameOf(y))) chevrons.push(y)
            for (const [k, v] of Object.entries(y)) if (k !== 'loc' && typeof v === 'object') find(v)
          })(after)
          const lone = after.type === 'JSXExpressionContainer' && chevrons.length === 1 && after.expression === chevrons[0]
          if (lone) edits.push([attr(node, 'after')!.start, attr(node, 'after')!.end, ''])
          else for (const c of chevrons) edits.push([c.start, c.end, ''])
          if (chevrons.length) fixed.push('list-link-chevron: removed a second chevron from a ListItem link')
        }
      }

      // Class substitutions with one right answer, applied to each class string in one pass so two rules on
      // the same element do not overwrite each other.
      const whiteOnTint = tintedBackground(node) && hasClass(node, 'text-white')
      // <Hero> picks white or ink for its colour (HIG-12); text-white on it would override that choice.
      const whiteOnHero = name === 'Hero' && hasClass(node, 'text-white')
      const doubleGutter = name === 'Block' && hasClass(node, 'px-4')
      // THM-01: a white box is the style's card — bg-card follows every style and mode (bg-white stayed white on a
      // midnight page); its hard-coded dark pair goes with it. Translucent whites (bg-white/20 over a photo) are not boxes.
      const whiteBox = hasClass(node, 'bg-white')
      const parts = classParts(node)
      // A template className is left alone: a second className attribute would be a guess.
      const gapTitle = titleGap.has(node) && (parts.length === 0 || parts.some((p) => p.whole)) && !attr(node, 'className')?.value?.expression?.type?.startsWith('Template')
      if (gapTitle && parts.length === 0 && !attr(node, 'className')) edits.push([node.openingElement.name.end, node.openingElement.name.end, ' className="!mb-2"'])
      for (const p of parts) {
        let text = p.text
        if (gapTitle && p.whole) text = `${text} !mb-2`
        // tint() is a 16% wash: white text on it cannot be read; the label colour is the one right answer.
        if (whiteOnTint || whiteOnHero) text = text.replace(/(^|\s)text-white(?=\s|$)/g, '$1')
        // Block already pads its content to the list inset; px-4 on it doubles the gutter.
        if (doubleGutter) text = text.replace(/(^|\s)px-4(?=\s|$)/g, '$1')
        // A light surface with no dark pair turns into a white slab in dark mode.
        if (whiteBox) text = text.replace(/(^|\s)bg-white(?=\s|$)/g, '$1bg-card').replace(/(^|\s)dark:bg-\[#[0-9a-fA-F]{3,6}\](?=\s|$)/g, '$1')
        // Nothing smaller than Caption 2.
        text = text.replace(/\btext-\[(\d+(?:\.\d+)?)px\]/g, (m, px) => (Number(px) < MIN_TEXT_PX ? `text-[${MIN_TEXT_PX}px]` : m))
        // A whole class string is trimmed; a template's static part keeps its edge spaces (they separate it from ${…}).
        if (text !== p.text) edits.push([p.start, p.end, p.whole ? text.replace(/\s{2,}/g, ' ').trim() : text.replace(/ {2,}/g, ' ')])
      }
      if (whiteOnTint) fixed.push('white-on-tint: dropped text-white on a tint() background')
      if (whiteOnHero) fixed.push('white-on-hero: dropped text-white on a Hero (it sets its own text colour)')
      if (doubleGutter) fixed.push('block-double-gutter: dropped px-4 on a Block')
      if (whiteBox) fixed.push('white-box: bg-white became the style card (bg-card)')
      if (gapTitle) fixed.push('title-over-content: gave a BlockTitle with no Block/List under it a bottom gap')
      if (classParts(node).some((p) => /\btext-\[(\d+(?:\.\d+)?)px\]/.test(p.text) && [...p.text.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)].some((m) => Number(m[1]) < MIN_TEXT_PX))) fixed.push(`tiny-text: raised text below ${MIN_TEXT_PX}px`)

      if (here) {
        if (LIST_CHILDREN.has(name) && !ancestors.some((a) => LIST_PARENTS.has(a))) report('list-item-outside-list', `<${name}> outside a <List>: it renders unstyled and loses its row layout. Put it in <List strong inset>.`, textOf(node.openingElement, source))
        if (name === 'BlockTitle' && ancestors.includes('Block')) report('blocktitle-in-block', '<BlockTitle> inside a <Block> overlaps the card below. Place it before the Block/List as a sibling.', textOf(node.openingElement, source))
        if (name === 'Card' && ancestors[ancestors.length - 1] === 'Block') report('card-in-block', '<Card> directly inside <Block>: both add the side margin. Use the Card on its own.', textOf(node.openingElement, source))
        if (name === 'List' && ancestors[ancestors.length - 1] === 'Block') report('list-in-block', '<List> inside a <Block>: a card inside a card, with the inset twice. A List is its own group — place it directly on the Page.', textOf(node.openingElement, source))
      }
      if (name === 'Button' && attr(node, 'large')) largeButtons++
      if (name === 'AppTabbar') tabbar = true
      if (/\bfixed\b/.test(classText(node)) && /\bbottom-0\b/.test(classText(node))) fixedBottom = node
      if (CONTROLS.has(name)) {
        const t = textOf(node, source)
        if (EMOJI.test(t.replace(/icon=\{[^}]*\}/g, ''))) report('emoji-in-control', `An emoji inside <${name}>: controls say what they do in words or with an icon.`, t)
      }
    }
    const next = node.type === 'JSXElement' ? [...stack, node] : stack
    for (const [k, v] of Object.entries(node)) if (k !== 'loc' && k !== 'start' && k !== 'end' && typeof v === 'object') walk(v, next, here)
  }
  walk(ast.program, [], false)

  if (largeButtons > 2) report('prominent-buttons', `${largeButtons} large buttons: HIG keeps one or two prominent actions per view. Make the rest regular, tonal or clear.`)
  if (tabbar && fixedBottom) report('fixed-bottom-under-tabbar', 'A fixed bottom bar on a tab screen sits under the tab bar. Put the action in the flow or at bottom-24.', textOf((fixedBottom as Node).openingElement, source))

  // An edit inside another (a class on a chevron that is removed whole) gives way to the outer one; then the
  // edits apply back to front so earlier offsets stay valid.
  const kept = edits.filter((x, i) => !edits.some((y, j) => j !== i && y[0] <= x[0] && y[1] >= x[1] && (y[0] < x[0] || y[1] > x[1])))
  let out = source
  for (const [s, e, r] of kept.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + r + out.slice(e)
  return { source: out, fixed: [...new Set(fixed)], findings }
}
