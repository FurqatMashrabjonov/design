// FIG-02: the layer tree as one SVG that Figma turns into editable layers when pasted (⌘V):
// groups named after the layers, rectangles with their fills, borders, corners and shadows, text
// as real text (one <text> per drawn line, so wrapping matches the render), photos as images and
// icons, charts and maps as vectors. No plugin needed; Auto Layout comes with the plugin (FIG-03).
import type { Fill, ODNode, ODTree, RGBA } from './figma-serialize.ts'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n = (v: number) => String(Math.round(v * 10) / 10)
const color = (c: RGBA) => `rgb(${c.r},${c.g},${c.b})`
const alpha = (c: RGBA) => (c.a < 1 ? ` fill-opacity="${n(c.a)}"` : '')
const fillColor = (f: Fill) => (f.type === 'solid' ? f.color : f.fallback)

// Figma knows common families by name; the page's fallbacks (system-ui, -apple-system) are not fonts.
const family = (f: string) => (/^(system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|sans-serif)$/i.test(f) ? 'Inter' : f)

function roundedRect(node: ODNode, attrs: string): string {
  const r = node.radius
  if (!r || (r[0] === r[1] && r[1] === r[2] && r[2] === r[3])) return `<rect x="${n(node.x)}" y="${n(node.y)}" width="${n(node.w)}" height="${n(node.h)}"${r ? ` rx="${n(Math.min(r[0], node.w / 2, node.h / 2))}"` : ''}${attrs}/>`
  // Different corners: a path.
  const [tl, tr, br, bl] = r.map((v) => Math.min(v, node.w / 2, node.h / 2)) as [number, number, number, number]
  const { x, y, w, h } = node
  const d = `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + tr)}V${n(y + h - br)}Q${n(x + w)} ${n(y + h)} ${n(x + w - br)} ${n(y + h)}H${n(x + bl)}Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - bl)}V${n(y + tl)}Q${n(x)} ${n(y)} ${n(x + tl)} ${n(y)}Z`
  return `<path d="${d}"${attrs}/>`
}

class Writer {
  defs: string[] = []
  private id = 0
  next(prefix: string) {
    return `${prefix}${++this.id}`
  }
}

function nodeSvg(node: ODNode, out: Writer): string {
  const name = ` id="${esc(out.next('l'))}" data-name="${esc(node.name)}"`
  const op = node.opacity !== undefined && node.opacity < 1 ? ` opacity="${n(node.opacity)}"` : ''
  if (node.type === 'text') {
    const f = node.font!
    const style = ` font-family="${esc(family(f.family))}" font-size="${n(f.size)}" font-weight="${f.weight}"${f.italic ? ' font-style="italic"' : ''}${f.letterSpacing ? ` letter-spacing="${n(f.letterSpacing)}"` : ''}${f.decoration !== 'none' ? ` text-decoration="${f.decoration}"` : ''} fill="${color(f.color)}"${alpha(f.color)}`
    // Baseline: the line box centres the glyphs; 0.35em below the middle is the alphabetic baseline for most fonts.
    const lines = (node.lines?.length ? node.lines : [{ x: node.x, y: node.y, w: node.w, h: node.h, text: node.text ?? '' }])
      .map((l) => `<tspan x="${n(l.x)}" y="${n(l.y + l.h / 2 + f.size * 0.35)}">${esc(l.text)}</tspan>`)
      .join('')
    return `<text${name}${style}${op} xml:space="preserve">${lines}</text>`
  }
  if (node.type === 'image') {
    const clip = out.next('c')
    out.defs.push(`<clipPath id="${clip}">${roundedRect(node, '')}</clipPath>`)
    const ratio = node.fit === 'contain' ? 'xMidYMid meet' : node.fit === 'fill' ? 'none' : 'xMidYMid slice'
    const bg = node.fills?.[0] ? roundedRect(node, ` fill="${color(fillColor(node.fills[0]))}"`) : ''
    return `<g${name}${op}>${bg}<image href="${esc(node.src ?? '')}" x="${n(node.x)}" y="${n(node.y)}" width="${n(node.w)}" height="${n(node.h)}" preserveAspectRatio="${ratio}" clip-path="url(#${clip})"/></g>`
  }
  if (node.type === 'svg') {
    // The resolved icon, placed where it was drawn.
    const inner = (node.svg ?? '').replace(/^<svg\b/, `<svg x="${n(node.x)}" y="${n(node.y)}"`)
    return `<g${name}${op}>${inner}</g>`
  }
  // A frame: its box, then its children (clipped if the page clips them).
  const parts: string[] = []
  let filter = ''
  const outer = node.shadows?.filter((s) => !s.inset)
  if (outer?.length) {
    const id = out.next('f')
    out.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${outer.map((s) => `<feDropShadow dx="${n(s.x)}" dy="${n(s.y)}" stdDeviation="${n(s.blur / 2)}" flood-color="${color(s.color)}" flood-opacity="${n(s.color.a)}"/>`).join('')}</filter>`)
    filter = ` filter="url(#${id})"`
  }
  const fills = node.fills ?? []
  if (fills.length || node.stroke || filter) {
    const first = fills[0]
    const paint = first ? ` fill="${color(fillColor(first))}"${alpha(fillColor(first))}` : ' fill="none"'
    const stroke = node.stroke ? ` stroke="${color(node.stroke.color)}" stroke-width="${n(node.stroke.width)}"${node.stroke.color.a < 1 ? ` stroke-opacity="${n(node.stroke.color.a)}"` : ''}` : ''
    parts.push(roundedRect(node, `${paint}${stroke}${filter}`))
    for (const extra of fills.slice(1)) parts.push(roundedRect(node, ` fill="${color(fillColor(extra))}"${alpha(fillColor(extra))}`))
  }
  const kids = (node.children ?? []).map((c) => nodeSvg(c, out)).join('')
  if (node.clip && kids) {
    const clip = out.next('c')
    out.defs.push(`<clipPath id="${clip}">${roundedRect(node, '')}</clipPath>`)
    parts.push(`<g clip-path="url(#${clip})">${kids}</g>`)
  } else parts.push(kids)
  return `<g${name}${op}>${parts.join('')}</g>`
}

/** The whole screen as one pasteable SVG. */
export function odToSvg(tree: ODTree): string {
  const out = new Writer()
  const body = nodeSvg(tree.root, out)
  const bg = `<rect width="${n(tree.width)}" height="${n(tree.height)}" fill="${color(tree.background)}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(tree.width)}" height="${n(tree.height)}" viewBox="0 0 ${n(tree.width)} ${n(tree.height)}" data-name="${esc(tree.name)}"><defs>${out.defs.join('')}</defs>${bg}${body}</svg>`
}

/** Photos travel inside the SVG, so the paste does not depend on Figma fetching them. */
export async function embedImages(tree: ODTree, fetchAsDataUrl: (url: string, width: number) => Promise<string | null>): Promise<ODTree> {
  const copy: ODTree = structuredClone(tree)
  const jobs: Promise<void>[] = []
  const visit = (node: ODNode) => {
    if (node.type === 'image' && node.src && /^https:\/\/images\.pexels\.com\//.test(node.src)) {
      jobs.push(fetchAsDataUrl(node.src, node.w).then((d) => void (d && (node.src = d))))
    }
    for (const c of node.children ?? []) visit(c)
  }
  visit(copy.root)
  await Promise.all(jobs)
  return copy
}
