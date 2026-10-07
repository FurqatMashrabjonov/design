// ICO-01: an app's icon — its one emoji (the planner's `icon`, a Fluent 3D still) on a squircle in its accent, lit
// from the top. The same drawing in the studio (AppIcon, the preview's splash) and in the export (icon.svg, the
// splash in main.jsx), so no picture is generated or stored.

/** The Fluent file name of an emoji the plan kept (parsePlan stores only emoji the set has). */
export const iconKey = (emoji: string) => [...emoji].map((c) => c.codePointAt(0)!).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-')

const mix = (hex: string, to: number, t: number) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + to * t).toString(16).padStart(2, '0')).join('')

/** The icon's gradient, top to bottom: a lighter tint of the accent into the accent and a little darker. */
export function iconStops(accent: string): [string, string, string] {
  const a = /^#[0-9a-f]{6}$/i.test(accent) ? accent.toLowerCase() : '#007aff'
  return [mix(a, 255, 0.28), a, mix(a, 0, 0.18)]
}

/** The icon as one SVG (1024², iOS's squircle-ish corner); `emoji` is the image's URL or data URL, or none (the
 *  app's initial instead). */
export function iconSvg(accent: string, emoji: string | null, initial = ''): string {
  const [top, mid, bottom] = iconStops(accent)
  const art = emoji
    ? `<image href="${emoji}" x="212" y="212" width="600" height="600"/>`
    : `<text x="512" y="660" font-family="-apple-system,Inter,system-ui,sans-serif" font-size="440" font-weight="700" fill="#fff" text-anchor="middle">${initial.replace(/[<>&"]/g, '')}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="1024" height="1024" rx="228" fill="url(#g)"/>${art}</svg>`
}
