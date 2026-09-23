// Image slots: the model describes the photo it wants, code finds one.
//   <img data-od-img="grilled salmon bowl, top view" alt="Grilled salmon bowl">
// A model cannot know a working image URL, so left alone it invents one or reaches for a
// placeholder CDN ("592 × 333" boxes). Pure string work here; the lookup is in ImageService.

export type ResolvedImage = { url: string; avgColor?: string }

const IMG_TAG = /<img\b[^>]*>/gi
const PLACEHOLDER_HOST = /placehold\.co|via\.placeholder\.com|placekitten\.com|picsum\.photos|dummyimage\.com|source\.unsplash\.com|images\.unsplash\.com|loremflickr\.com/i

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
const attrValue = (tag: string, name: string) => {
  const m = attr(tag, name)
  return m ? (m[2] ?? m[3] ?? '') : undefined
}
const setAttr = (tag: string, name: string, value: string) => {
  const safe = value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const m = attr(tag, name)
  return m ? tag.replace(m[0], ` ${name}="${safe}"`) : tag.replace(/\s*\/?>$/, ` ${name}="${safe}">`)
}
const dropAttr = (tag: string, name: string) => {
  const m = attr(tag, name)
  return m ? tag.replace(m[0], '') : tag
}

/** What to search for: letters, digits and spaces only, so the text is safe in a URL and as a cache key. */
export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/** The search query a tag asks for, or null when the tag is not ours to fill (it already has a real src). */
export function slotQuery(tag: string): string | null {
  if (attr(tag, 'data-od-avatar') || /\sdata-od-logo(?=[\s=>/])/i.test(tag)) return null // a person or the app mark, not a photo subject
  const src = attrValue(tag, 'src') ?? ''
  const wanted = attrValue(tag, 'data-od-img')
  const fillable = src === '' || src === '#' || PLACEHOLDER_HOST.test(src)
  if (!fillable || /^data:/i.test(src)) return null
  const query = normalizeQuery(wanted ?? attrValue(tag, 'alt') ?? '')
  return query || null
}

export function imageQueries(html: string): string[] {
  return [...new Set((html.match(IMG_TAG) ?? []).map(slotQuery).filter((q): q is string => q !== null))]
}

// A slot keeps its box whatever photo lands in it: a photo never decides the layout. The default
// box (full width, 4:3) lives in a zero-specificity rule, not in the inline style: a size the model
// gave by class (`.cart-thumb { width: 64px }`) must win. An inline width:100% once beat it and blew
// every list thumbnail up to the full row (GQ-01).
export const SLOT_CSS =
  ':where([data-od-img-resolved],[data-od-img-fallback]){display:block;width:100%;aspect-ratio:4/3}' +
  ':where([data-od-avatar-resolved]){width:40px;height:40px}' +
  ':where([data-od-logo-resolved]){width:56px;height:56px;border-radius:22%}'

/** Adds the slot defaults once, ahead of the page's own styles so any rule of the page wins. */
export function withSlotCss(html: string): string {
  if (html.includes('data-od-slots')) return html
  const tag = `<style data-od-slots>${SLOT_CSS}</style>`
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (m) => m + tag)
  return tag + html
}

function lockBox(style: string, background: string): string {
  const has = (prop: string) => new RegExp(`(^|;)\\s*${prop}\\s*:`, 'i').test(style)
  const add: string[] = []
  if (!has('object-fit')) add.push('object-fit:cover')
  if (!has('background') && !has('background-color')) add.push(`background:${background}`)
  return [style.trim().replace(/;$/, ''), ...add].filter(Boolean).join(';')
}

/** Fills every slot from `found`; a slot with no photo becomes a token-coloured block instead of a broken image. */
export function applyImages(html: string, found: Map<string, ResolvedImage | null>): string {
  let touched = false
  const out = html.replace(IMG_TAG, (tag) => {
    const query = slotQuery(tag)
    if (query === null) return tag
    const image = found.get(query)
    touched = true
    const style = attrValue(tag, 'style') ?? ''
    const classes = attrValue(tag, 'class')
    if (!image) {
      const label = (attrValue(tag, 'alt') ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
      // Text over a photo is light, with the photo dark enough to carry it. When no photo arrives the
      // block takes its place, so it carries the same weight — a pale slab made white captions vanish.
      const box = lockBox(style, 'linear-gradient(160deg,color-mix(in oklab,var(--fg) 62%,var(--surface)),color-mix(in oklab,var(--fg) 78%,var(--surface)))')
      return `<div role="img" aria-label="${label}" data-od-img-fallback${classes ? ` class="${classes}"` : ''} style="${box}"></div>`
    }
    let out = setAttr(dropAttr(tag, 'srcset'), 'src', image.url)
    out = setAttr(out, 'style', lockBox(style, image.avgColor ?? 'var(--surface)'))
    out = setAttr(out, 'loading', 'lazy')
    out = setAttr(out, 'data-od-img', query)
    if (attrValue(out, 'alt') === undefined) out = setAttr(out, 'alt', '')
    return setAttr(out, 'data-od-img-resolved', '')
  })
  return touched ? withSlotCss(out) : out
}

// --- avatars: <img data-od-avatar="Full Name" alt="Full Name"> ---

/** Names of the people whose avatar slots are still empty. */
export function avatarNames(html: string): string[] {
  const names = (html.match(IMG_TAG) ?? []).filter((t) => !attr(t, 'data-od-avatar-resolved')).map((t) => (attrValue(t, 'data-od-avatar') ?? '').trim())
  return [...new Set(names.filter(Boolean))]
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => [...w][0] ?? '')
    .join('')
    .toUpperCase()

/** A portrait where one was found; otherwise the person's initials in a token-coloured circle of the same size. */
export function applyAvatars(html: string, portraits: Map<string, string | null>): string {
  let touched = false
  const done = html.replace(IMG_TAG, (tag) => {
    const name = (attrValue(tag, 'data-od-avatar') ?? '').trim()
    if (!name || attr(tag, 'data-od-avatar-resolved')) return tag
    touched = true
    const style = (attrValue(tag, 'style') ?? '').trim().replace(/;$/, '')
    const classes = attrValue(tag, 'class')
    // The default 40px size is in SLOT_CSS, so a size set by class wins.
    const round = ['border-radius:9999px', 'flex:none']
    const url = portraits.get(name)
    if (!url) {
      const label = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
      const box = [style, ...round, 'display:inline-flex', 'align-items:center', 'justify-content:center', 'background:var(--surface)', 'color:var(--fg)', 'border:1px solid var(--border)', 'font-weight:600', 'font-size:0.8em', 'line-height:1'].filter(Boolean).join(';')
      return `<span role="img" aria-label="${label}" data-od-avatar-resolved${classes ? ` class="${classes}"` : ''} style="${box}">${initialsOf(name).replace(/</g, '')}</span>`
    }
    let out = setAttr(dropAttr(tag, 'srcset'), 'src', url)
    out = setAttr(out, 'style', [style, ...round, 'object-fit:cover', 'display:block', 'background:var(--surface)'].filter(Boolean).join(';'))
    if (attrValue(out, 'alt') === undefined) out = setAttr(out, 'alt', name)
    return setAttr(setAttr(out, 'loading', 'lazy'), 'data-od-avatar-resolved', '')
  })
  return touched ? withSlotCss(done) : done
}

// --- app mark: <img data-od-logo alt=""> ---

/** "LingoStreak" -> "LS", "Nova Bank" -> "NB", "feastly" -> "F". */
export function monogram(appName: string): string {
  const words = appName
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  return (words.length > 1 ? [...words[0]][0] + [...words[1]][0] : [...(words[0] ?? 'A')][0]).toUpperCase()
}

/** The app's mark is drawn in code from its name and the accent tokens, so it is the same on every screen and follows the theme. */
export function applyLogo(html: string, appName: string): string {
  let touched = false
  const done = html.replace(IMG_TAG, (tag) => {
    if (!/\sdata-od-logo(?=[\s=>/])/i.test(tag)) return tag
    touched = true
    const style = (attrValue(tag, 'style') ?? '').trim().replace(/;$/, '')
    const classes = attrValue(tag, 'class')
    const label = appName.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    // Default size and corner are in SLOT_CSS, so a size set by class wins.
    const box = [
      style,
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'flex:none',
      'background:var(--accent)',
      'color:var(--accent-on)',
      'font-family:var(--font-display)',
      'font-weight:700',
      'font-size:1.25em',
      'letter-spacing:-0.02em',
      'line-height:1',
    ]
      .filter(Boolean)
      .join(';')
    return `<span role="img" aria-label="${label}" data-od-logo-resolved${classes ? ` class="${classes}"` : ''} style="${box}">${monogram(appName)}</span>`
  })
  return touched ? withSlotCss(done) : done
}
