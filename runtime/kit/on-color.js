// HIG-12: the text colour that reads on a filled surface, decided in code. The model picks a
// hero colour; it does not have to know that white on yellow or mint cannot be read. Plain JS inside the kit, so an
// exported project carries it (ExportService copies runtime/kit).

const WHITE = '#ffffff'
const INK = '#1c1c1e' // iOS's label colour

function rgbOf(color) {
  const hex = color.trim().match(/^#([0-9a-f]{3,8})$/i)?.[1]
  if (!hex || hex.length === 5 || hex.length === 7) return null
  const full = hex.length <= 4 ? [...hex.slice(0, 3)].map((c) => c + c).join('') : hex.slice(0, 6)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

const channel = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
export const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
export const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

/** White while white clears 3:1 on `color` (the large-text bar, and what iOS does on its own filled buttons: white
 *  on system blue or red), otherwise ink — yellow, mint, orange. A colour code cannot measure (a var(), a mix) keeps
 *  white: the accent is chosen to carry white text. */
export function onColor(color) {
  const rgb = typeof color === 'string' ? rgbOf(color) : null
  if (!rgb) return WHITE
  const l = luminance(rgb)
  return contrast(l, 1) >= 3 ? WHITE : INK
}
