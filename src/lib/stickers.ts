// GQ-21: stickers drawn in code. A 2026 screen carries a soft-3D glyph where 2020 had an emoji —
// a streak flame on the hero card, a trophy on an achievement, a leaf on an empty state. We cannot
// generate raster art, and an emoji is rendered by the viewer's platform (and banned by lint), so
// the model writes a slot and this draws it: twelve glyphs as SVG with a gradient, a soft inner
// highlight and a drop shadow, coloured from the tokens so every system — and every planner
// palette — gets stickers in its own colours. Same idea as charts and maps: the model decides
// where, the code decides how it looks.
//
//   <div data-od-sticker="fire"></div>                  64px, accent tone
//   <div data-od-sticker="trophy" data-tone="warn" style="width:96px"></div>

const GLYPHS: Record<string, string> = {
  fire: 'M12 3c1 3 4 4.5 4 8.5A4 4 0 0 1 8 11.5c0-1 .4-2 1-2.7.2 1 .8 1.7 1.5 1.7C11.5 9 11 6 12 3z',
  trophy: 'M7 4h10v3a5 5 0 0 1-10 0V4zM5 5h2v2a2 2 0 0 1-2-2zm12 0h2a2 2 0 0 1-2 2V5zm-6 8h2v3h3v2H8v-2h3v-3z',
  leaf: 'M18 5c-8 0-12 4-12 10 0 1.5.3 2.5.8 3.5C9 14 12 11 16 9c-3 3-5 6-6.5 10C15 20 19 15 18 5z',
  star: 'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8l-5.5 2.9 1.2-6.1L3.2 9.4l6.1-.8L12 3z',
  moon: 'M15 3a9 9 0 1 0 6 15.5A8 8 0 0 1 15 3z',
  drop: 'M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z',
  bolt: 'M13 2L5 13h5l-1 9 8-12h-5l1-8z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1.2 12.5l-3.3-3.3 1.4-1.4 1.9 1.9 4.3-4.3 1.4 1.4-5.7 5.7z',
  sparkle: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2zM5 17l.9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9L5 17z',
  calendar: 'M6 4h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 5v10h12V9H6zm2 2h3v3H8v-3z',
}

export const STICKER_NAMES = Object.keys(GLYPHS)

const TONES: Record<string, string> = { accent: '--accent', success: '--success', warn: '--warn', danger: '--danger' }

const SLOT = /<(div|span|figure|i)\b([^>]*\bdata-od-sticker="([a-z-]*)"[^>]*)>([^<]*)<\/\1>/gi

/** One sticker as inline SVG. Unknown names fall back to the sparkle, never to nothing. */
export function stickerSvg(name: string, tone = 'accent', size = 64): string {
  const d = GLYPHS[name] ?? GLYPHS.sparkle!
  const token = TONES[tone] ?? TONES.accent!
  const id = `s${Math.abs(hash(`${name}|${tone}|${size}`)).toString(36)}`
  // Three layers make it "clay": a rounded tile in the tone with a vertical gradient, the glyph
  // in white with a soft inner highlight, and a shadow under the tile in the same tone.
  return `<svg data-od-sticker-rendered viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" style="display:block;overflow:visible">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(${token})" stop-opacity=".92"/><stop offset="1" stop-color="var(${token})"/></linearGradient><filter id="${id}s" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="2.2" stdDeviation="1.8" flood-color="var(${token})" flood-opacity=".35"/></filter><filter id="${id}i" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6"/></filter></defs>
<rect x="2" y="2" width="20" height="20" rx="6.5" fill="url(#${id}g)" filter="url(#${id}s)"/>
<rect x="2.6" y="2.6" width="18.8" height="9" rx="6" fill="#fff" opacity=".14"/>
<path d="${d}" fill="#fff" opacity=".5" filter="url(#${id}i)" transform="translate(0 .8)"/>
<path d="${d}" fill="#fff"/>
</svg>`
}

/** Replaces every sticker slot in a page. Idempotent: a rendered slot is left alone. */
export function renderStickers(html: string): string {
  if (!html.includes('data-od-sticker=')) return html
  return html.replace(SLOT, (whole, tag: string, attrs: string, name: string) => {
    if (/data-od-sticker-rendered/.test(attrs)) return whole
    const tone = (/\bdata-tone="([a-z]+)"/i.exec(attrs) ?? [])[1] ?? 'accent'
    const size = Number((/\bwidth:\s*(\d+)px/i.exec(attrs) ?? [])[1]) || 64
    const rest = attrs.replace(/\s*style="[^"]*"/i, '')
    return `<${tag}${rest} data-od-sticker-rendered style="display:inline-flex;width:${size}px;height:${size}px;flex:none">${stickerSvg(name || 'sparkle', tone, size)}</${tag}>`
  })
}

function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h | 0
}
