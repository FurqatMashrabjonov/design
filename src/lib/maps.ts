// Maps are slots, like charts (GQ-04). The model writes where things are, the code draws the map:
//   <div data-od-map data-pins="Burger Palace, 14 Kloof St" data-route data-you></div>
// Left to itself the model asked the photo search for "city street map" and got a street photo, or
// drew a grey box with a pin emoji. Here every map is the same flat, token-coloured street plan (so
// the theme restyles it), pins carry their labels, and a route joins the first pin to the last.
// An image slot that asks for a map photo is turned into a map slot before photos are looked up.

const SLOT = /<(div|figure)\b([^>]*\bdata-od-map\b[^>]*)>([^<]*)<\/\1>/gi
const IMG = /<img\b[^>]*>/gi
const MAP_WORDS = /\b(map|maps|route|directions|street plan|city plan|gps|navigation view)\b/i

const decode = (s: string) => s.replace(/&(amp|quot|#39|lt|gt);/g, (_, e) => ({ amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' })[e as string]!)
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const attr = (attrs: string, name: string) => {
  const v = attrs.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1]
  return v === undefined ? undefined : decode(v)
}
const has = (attrs: string, name: string) => new RegExp(`\\s${name}(?=[\\s=>/]|$)`, 'i').test(attrs)

// A small deterministic generator, so a screen draws the same map every time it is rendered.
function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const W = 390
const H = 260
const r1 = (n: number) => Math.round(n * 10) / 10

function draw(pins: string[], route: boolean, you: boolean, seed: string): string {
  const rand = rng(seed || 'map')
  const roads: string[] = []
  // A tilted street grid: a few long avenues each way, one diagonal boulevard.
  const tilt = (rand() - 0.5) * 16
  for (let i = 0; i < 5; i++) {
    const y = 20 + i * 55 + rand() * 20
    roads.push(`M-40 ${r1(y)} L${W + 40} ${r1(y + tilt)}`)
  }
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 72 + rand() * 24
    roads.push(`M${r1(x)} -40 L${r1(x - tilt)} ${H + 40}`)
  }
  const diag = `M-40 ${r1(H * (0.7 + rand() * 0.3))} L${W + 40} ${r1(H * rand() * 0.3)}`
  const park = { x: r1(40 + rand() * 180), y: r1(30 + rand() * 120), w: r1(70 + rand() * 60), h: r1(50 + rand() * 40) }
  const water = rand() > 0.5 ? `M${W} ${r1(H * 0.55)} C ${W - 70} ${r1(H * 0.65)}, ${W - 40} ${H - 20}, ${W - 110} ${H} L${W} ${H} Z` : `M0 ${r1(H * 0.72)} C 60 ${r1(H * 0.66)}, 120 ${H - 10}, 170 ${H} L0 ${H} Z`

  // Pins spread over the middle of the map, left to right in the order given.
  const n = Math.min(pins.length, 5)
  const points = Array.from({ length: n }, (_, i) => ({
    x: r1(n === 1 ? W / 2 : 60 + (i * (W - 120)) / (n - 1) + (rand() - 0.5) * 30),
    y: r1(70 + rand() * (H - 130)),
  }))
  const routePath =
    route && points.length >= 2
      ? points.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${r1((points[i - 1]!.x + p.x) / 2)} ${points[i - 1]!.y} L${r1((points[i - 1]!.x + p.x) / 2)} ${p.y} L${p.x} ${p.y}`)).join(' ')
      : ''
  const me = you ? { x: points[0] ? r1(Math.max(24, points[0].x - 36)) : W / 2, y: points[0] ? r1(Math.min(H - 24, points[0].y + 44)) : H / 2 } : null

  const label = (text: string, x: number, y: number) => {
    const t = escapeHtml(text.slice(0, 24))
    const w = Math.round(t.length * 6.4 + 16)
    const lx = r1(Math.min(W - w - 6, Math.max(6, x - w / 2)))
    return `<g><rect x="${lx}" y="${r1(y - 36)}" width="${w}" height="22" rx="11" fill="var(--bg)" stroke="var(--border)"/><text x="${r1(lx + w / 2)}" y="${r1(y - 21)}" text-anchor="middle" font-size="11" font-weight="600" font-family="var(--font-body, system-ui)" fill="var(--fg)">${t}</text></g>`
  }

  return [
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map${n ? `: ${escapeHtml(pins.slice(0, n).join(', '))}` : ''}" style="display:block;width:100%;height:100%">`,
    `<rect width="${W}" height="${H}" fill="color-mix(in oklab, var(--surface) 80%, var(--border))"/>`,
    `<path d="${water}" fill="color-mix(in oklab, var(--accent) 14%, var(--surface))"/>`,
    `<rect x="${park.x}" y="${park.y}" width="${park.w}" height="${park.h}" rx="10" fill="color-mix(in oklab, var(--success) 22%, var(--surface))"/>`,
    `<g fill="none" stroke-linecap="round"><path d="${roads.join(' ')} ${diag}" stroke="var(--border)" stroke-width="12"/><path d="${roads.join(' ')} ${diag}" stroke="var(--bg)" stroke-width="8"/></g>`,
    routePath ? `<path d="${routePath}" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` : '',
    me ? `<circle cx="${me.x}" cy="${me.y}" r="16" fill="var(--accent)" opacity=".18"/><circle cx="${me.x}" cy="${me.y}" r="7" fill="var(--accent)" stroke="var(--bg)" stroke-width="3"/>` : '',
    ...points.map((p, i) => `<g><path d="M${p.x} ${p.y} c-9 -12 -13 -17 -13 -23 a13 13 0 1 1 26 0 c0 6 -4 11 -13 23z" fill="${i === points.length - 1 && route ? 'var(--fg)' : 'var(--accent)'}" stroke="var(--bg)" stroke-width="2"/><circle cx="${p.x}" cy="${r1(p.y - 23)}" r="4.5" fill="var(--bg)"/>${label(pins[i]!, p.x, p.y - 24)}</g>`),
    `</svg>`,
  ].join('')
}

/** Draws every map slot, and turns image slots that ask for a map into map slots first. */
export function renderMaps(html: string): string {
  let out = html
  if (MAP_WORDS.test(out)) {
    out = out.replace(IMG, (tag) => {
      const want = attr(tag, 'data-od-img') ?? ''
      if (!want || !MAP_WORDS.test(want) || has(tag, 'data-od-img-resolved')) return tag
      const cls = attr(tag, 'class')
      const style = attr(tag, 'style')
      return `<div data-od-map data-from-img="${escapeHtml(want)}"${cls ? ` class="${escapeHtml(cls)}"` : ''}${style ? ` style="${escapeHtml(style)}"` : ''}></div>`
    })
  }
  if (!out.includes('data-od-map')) return out
  let drew = false
  out = out.replace(SLOT, (whole, tag: string, attrs: string) => {
    if (has(attrs, 'data-od-map-rendered')) return whole
    drew = true
    const pins = (attr(attrs, 'data-pins') ?? '').split(',').map((p) => p.trim()).filter(Boolean)
    const svg = draw(pins, has(attrs, 'data-route'), has(attrs, 'data-you'), pins.join('|') + (attr(attrs, 'data-from-img') ?? ''))
    return `<${tag}${attrs} data-od-map-rendered>${svg}</${tag}>`
  })
  return drew ? withMapCss(out) : out
}

// The default box is a zero-specificity rule, not inline: a height the page gives the slot by class
// must win — the same lesson as the image slots (GQ-01). By default a map fills its container (a map
// zone is usually a sized box); in a container with no height it keeps its own 3:2 shape, at least 200px.
export const MAP_CSS = ':where([data-od-map-rendered]){display:block;width:100%;height:100%;min-height:200px;overflow:hidden}'
function withMapCss(html: string): string {
  if (html.includes('data-od-map-css')) return html
  const tag = `<style data-od-map-css>${MAP_CSS}</style>`
  return /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, (m) => m + tag) : tag + html
}
