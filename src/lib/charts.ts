// Charts are slots, like images (KIT-03). The model writes the data, the code draws the chart:
//   <div data-od-chart="bar" data-values="4.2,5.1,3.8,6.0,5.5,7.2,6.4" data-labels="M,T,W,T,F,S,S"
//        data-highlight="5" data-unit="km"></div>
// Hand-drawn charts came out as div towers with made-up heights, bars that did not match their
// numbers, or SVG paths in a different style on every screen. Here the geometry follows the values,
// colours are tokens (so the theme restyles them), and every chart of a type looks the same.

export const CHART_TYPES = ['bar', 'line', 'area', 'donut', 'ring', 'sparkline', 'heatmap'] as const
type ChartType = (typeof CHART_TYPES)[number]

const MAX_POINTS = 31
// A heatmap is a calendar of days (a streak, a habit): up to 12 weeks of cells.
const MAX_CELLS = 84
const SLOT = /<(div|figure)\b([^>]*\bdata-od-chart="([a-z]+)"[^>]*)>([^<]*)<\/\1>/gi

// Attribute values as the browser reads them (entities decoded), escaped again on the way out.
const decode = (s: string) => s.replace(/&(amp|quot|#39|lt|gt);/g, (_, e) => ({ amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' })[e as string]!)
const attr = (attrs: string, name: string) => {
  const v = attrs.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1]
  return v === undefined ? undefined : decode(v)
}
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const num = (n: number) => (Math.round(n * 100) / 100).toString()

function parse(attrs: string) {
  const values = (attr(attrs, 'data-values') ?? '')
    .split(',')
    .map((v) => Number(v.trim().replace(/[^\d.-]/g, '')))
    .filter((v) => Number.isFinite(v))
    .slice(0, attrs.includes('data-od-chart="heatmap"') ? MAX_CELLS : MAX_POINTS)
  const labels = (attr(attrs, 'data-labels') ?? '')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_POINTS)
  const h = Number(attr(attrs, 'data-highlight'))
  return {
    values,
    labels,
    highlight: Number.isInteger(h) && h >= 0 && h < values.length ? h : -1,
    unit: (attr(attrs, 'data-unit') ?? '').slice(0, 8),
    max: Number(attr(attrs, 'data-max')),
  }
}

const labelRow = (labels: string[], highlight: number) =>
  labels.length
    ? `<div style="display:flex;justify-content:space-between;gap:2px;margin-top:6px;font-size:11px;color:var(--muted)">${labels
        .map((l, i) => `<span style="flex:1;text-align:center;${i === highlight ? 'color:var(--fg);font-weight:600' : ''}">${escapeHtml(l)}</span>`)
        .join('')}</div>`
    : ''

function bar(d: ReturnType<typeof parse>): string {
  const max = Math.max(...d.values, 0) || 1
  const n = d.values.length
  const gap = 100 / n / 4
  const w = 100 / n - gap
  const bars = d.values
    .map((v, i) => {
      const h = Math.max(1.5, (Math.max(0, v) / max) * 100)
      const fill = d.highlight === -1 || i === d.highlight ? 'var(--accent)' : 'color-mix(in oklab,var(--accent),transparent 72%)'
      return `<rect x="${num(i * (w + gap) + gap / 2)}" y="${num(100 - h)}" width="${num(w)}" height="${num(h)}" rx="1.5" fill="${fill}"/>`
    })
    .join('')
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;width:100%;flex:1;min-height:0" aria-hidden="true">${bars}</svg>${labelRow(d.labels, d.highlight)}`
}

function line(d: ReturnType<typeof parse>, fill: boolean, axisLabels = true): string {
  const max = Math.max(...d.values)
  const min = Math.min(...d.values)
  const span = max - min || 1
  const n = d.values.length
  const pts = d.values.map((v, i) => [n === 1 ? 50 : (i / (n - 1)) * 100, 92 - ((v - min) / span) * 84] as const)
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${num(x)} ${num(y)}`).join(' ')
  const area = fill ? `<path d="${path} L100 100 L0 100 Z" fill="color-mix(in oklab,var(--accent),transparent 84%)"/>` : ''
  const hi = d.highlight >= 0 ? d.highlight : n - 1
  // The stroke keeps its width however the box stretches; the end dot is HTML so it stays round.
  const [hx, hy] = pts[hi]
  const dot = `<span style="position:absolute;left:${num(hx)}%;top:${num(hy)}%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px var(--surface)"></span>`
  return `<div style="position:relative;flex:1;min-height:0"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">${area}<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>${dot}</div>${axisLabels ? labelRow(d.labels, hi) : ''}`
}

function donut(d: ReturnType<typeof parse>): string {
  const total = d.values.reduce((a, v) => a + Math.max(0, v), 0) || 1
  const r = 15.9155 // circumference 100, so dash lengths are percentages
  let offset = 25
  const shades = [0, 30, 52, 68, 80, 88]
  const segments = d.values
    .map((v, i) => {
      const pct = (Math.max(0, v) / total) * 100
      const color = i === 0 ? 'var(--accent)' : `color-mix(in oklab,var(--accent),var(--surface) ${shades[Math.min(i, shades.length - 1)]}%)`
      const seg = `<circle cx="21" cy="21" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-dasharray="${num(Math.max(0, pct - 0.6))} ${num(100 - pct + 0.6)}" stroke-dashoffset="${num(offset)}"/>`
      offset -= pct
      return seg
    })
    .join('')
  const legend = d.labels.length
    ? `<div style="display:flex;flex-direction:column;gap:6px;font-size:13px;min-width:0">${d.values
        .map((v, i) => {
          const color = i === 0 ? 'var(--accent)' : `color-mix(in oklab,var(--accent),var(--surface) ${shades[Math.min(i, shades.length - 1)]}%)`
          return `<div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="width:10px;height:10px;border-radius:3px;background:${color};flex:none"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg-2,var(--fg))">${escapeHtml(d.labels[i] ?? '')}</span><span style="color:var(--muted);font-variant-numeric:tabular-nums">${Math.round((Math.max(0, v) / total) * 100)}%</span></div>`
        })
        .join('')}</div>`
    : ''
  return `<div style="display:flex;align-items:center;gap:16px;height:100%"><svg viewBox="0 0 42 42" style="height:100%;max-height:160px;aspect-ratio:1;flex:none" aria-hidden="true"><circle cx="21" cy="21" r="${r}" fill="none" stroke="var(--border)" stroke-width="5"/>${segments}</svg>${legend}</div>`
}

function ring(d: ReturnType<typeof parse>): string {
  const value = d.values[0] ?? 0
  const max = Number.isFinite(d.max) && d.max > 0 ? d.max : (d.values[1] ?? 100) || 100
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const r = 15.9155
  const label = d.labels[0] ? `<span style="font-size:11px;color:var(--muted)">${escapeHtml(d.labels[0])}</span>` : ''
  return `<div style="position:relative;height:100%;aspect-ratio:1;max-height:180px;margin:0 auto"><svg viewBox="0 0 42 42" style="width:100%;height:100%;transform:rotate(-90deg)" aria-hidden="true"><circle cx="21" cy="21" r="${r}" fill="none" stroke="var(--border)" stroke-width="3.5"/><circle cx="21" cy="21" r="${r}" fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${num(pct)} ${num(100 - pct)}"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1"><strong style="font-size:clamp(14px,22%,32px);color:var(--fg);font-variant-numeric:tabular-nums">${num(value)}${escapeHtml(d.unit)}</strong>${label}</div></div>`
}

function heatmap(d: ReturnType<typeof parse>, columns: number): string {
  const max = Math.max(...d.values, 0) || 1
  const cells = d.values
    .map((v) => {
      const level = v <= 0 ? 0 : Math.ceil((v / max) * 4) // 0 empty, 1–4 accent steps
      const bg = level === 0 ? 'var(--border)' : `color-mix(in oklab,var(--accent),transparent ${[0, 75, 50, 25, 0][level]}%)`
      return `<span style="aspect-ratio:1;border-radius:3px;background:${bg}"></span>`
    })
    .join('')
  return `<div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:4px">${cells}</div>${labelRow(d.labels, -1)}`
}

const DEFAULT_HEIGHT: Record<ChartType, number> = { bar: 160, line: 160, area: 160, donut: 140, ring: 140, sparkline: 36, heatmap: 0 }

/**
 * Draws every chart slot in the page. A slot with an unknown type, fewer than two values (one for a
 * ring or donut) or child elements is left exactly as written. Idempotent: drawn slots are marked.
 */
export function renderCharts(html: string): string {
  if (!html.includes('data-od-chart=')) return html
  return html.replace(SLOT, (whole, tag: string, attrs: string, type: string) => {
    if (/data-od-chart-rendered/.test(attrs) || !(CHART_TYPES as readonly string[]).includes(type)) return whole
    const d = parse(attrs)
    const t = type as ChartType
    if (d.values.length < (t === 'ring' || t === 'donut' ? 1 : 2)) return whole
    const columns = Math.min(14, Math.max(3, Number(attr(attrs, 'data-columns')) || 7))
    const inner = t === 'bar' ? bar(d) : t === 'line' ? line(d, false) : t === 'area' ? line(d, true) : t === 'sparkline' ? line(d, true, false) : t === 'donut' ? donut(d) : t === 'heatmap' ? heatmap(d, columns) : ring(d)
    // The model may size the slot itself (a style height); otherwise the type's default height.
    const style = attr(attrs, 'style') ?? ''
    // A heatmap sizes itself from its cells.
    const sized = /(^|;)\s*(height|min-height)\s*:/.test(style) || !DEFAULT_HEIGHT[t] ? '' : `height:${DEFAULT_HEIGHT[t]}px;`
    const rest = attrs.replace(/\sstyle="[^"]*"/i, '')
    return `<${tag}${rest} data-od-chart-rendered style="${sized}display:flex;flex-direction:column;${escapeHtml(style)}">${inner}</${tag}>`
  })
}
