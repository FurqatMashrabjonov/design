import { parse } from '@babel/parser'
import { ImageCache } from '@/app/Models/ImageCache'
import { SecretService } from './SecretService'

// KON-12: real photos. A screen asks for a photo by what it shows — `<Photo q="grilled chicken salad" />`, or
// a data item's `photo: 'grilled chicken salad'` passed on as `q={item.photo}`. When the screen is saved the
// queries are read from its source (never executed) and looked up on Pexels once, into image_cache; the page
// a screen runs in gets the cached URLs (ScreenDocument → mount → the kit's Photo). The model's code is never
// rewritten, and a query with no photo becomes a tinted block, never a broken image.

const SEARCH = 'https://api.pexels.com/v1/search'
const PHOTO_HOST = 'https://images.pexels.com/'
const MAX_PER_SCREEN = 16 // more than this is a gallery the API budget (200/hour) should not pay for
const PHOTO_KEYS = new Set(['photo', 'image', 'img', 'cover', 'picture', 'thumbnail', 'thumb'])

export type Photo = { u: string; c?: string }

/** The one spelling a query is looked up and matched under — the kit's Photo normalises the same way. */
export const photoKey = (q: string) => q.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 80)

/** Every photo a screen asks for: `<Photo q="…">` literals and string values of photo-like data keys. */
export function photoQueries(source: string): string[] {
  let ast: ReturnType<typeof parse>
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx'] })
  } catch {
    return []
  }
  const out = new Set<string>()
  const add = (v: unknown) => typeof v === 'string' && v.trim().length > 1 && !/^https?:|^data:|\//.test(v.trim()) && out.add(photoKey(v))
  ;(function walk(n: unknown): void {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) return n.forEach(walk)
    const node = n as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    if (node.type === 'JSXOpeningElement' && node.name?.name === 'Photo') {
      for (const a of node.attributes ?? []) {
        if (a.type !== 'JSXAttribute' || a.name?.name !== 'q') continue
        if (a.value?.type === 'StringLiteral') add(a.value.value)
        else if (a.value?.expression?.type === 'StringLiteral') add(a.value.expression.value)
        else if (a.value?.expression?.type === 'TemplateLiteral' && a.value.expression.expressions.length === 0) add(a.value.expression.quasis[0]?.value?.cooked)
      }
    }
    if (node.type === 'ObjectProperty' && PHOTO_KEYS.has(node.key?.name ?? node.key?.value) && node.value?.type === 'StringLiteral') add(node.value.value)
    for (const [k, v] of Object.entries(node)) if (k !== 'loc' && typeof v === 'object') walk(v)
  })(ast.program)
  return [...out].slice(0, MAX_PER_SCREEN)
}

// Same query, same photo (the cache keeps it stable) — but not the same photo for every query near it: the top result
// served "runner portrait", "smiling runner portrait" and five more alike, so two runners in one app wore one face
// (263 of 1 012 eval queries shared a photo). PHT-01: the query's own hash picks one of the PICK most relevant.
const PICK = 5
export const pickIndex = (query: string, n: number) => {
  let h = 2166136261
  for (const ch of photoKey(query)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return n > 0 ? (h >>> 0) % Math.min(n, PICK) : 0
}
async function search(query: string, signal?: AbortSignal): Promise<Photo | null | undefined> {
  const key = await SecretService.get('PEXELS_API_KEY')
  if (!key) return undefined
  const res = await fetch(`${SEARCH}?query=${encodeURIComponent(query)}&per_page=${PICK}`, {
    headers: { Authorization: key },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
  })
  if (!res.ok) return undefined // rate limit or outage: not cached, a later save tries again
  const photos = ((await res.json()) as { photos?: { src?: { original?: string }; avg_color?: string }[] }).photos ?? []
  const photo = photos[pickIndex(query, photos.length)]
  const original = photo?.src?.original
  if (!original || !original.startsWith(PHOTO_HOST)) return null
  // 800px covers a 390px frame at 2x; the CDN resizes on the fly.
  return { u: `${original.split('?')[0]}?auto=compress&cs=tinysrgb&w=800`, c: /^#[0-9a-f]{6}$/i.test(photo?.avg_color ?? '') ? photo!.avg_color : undefined }
}

const fromRow = (r: { url: string; avgColor: string | null } | undefined): Photo | null | undefined => (r ? (r.url ? { u: r.url, c: r.avgColor ?? undefined } : null) : undefined)

/** Looks up (and caches) every photo the screen asks for; called when a screen is saved. */
export async function resolvePhotos(source: string, signal?: AbortSignal): Promise<Record<string, Photo>> {
  const found: Record<string, Photo> = {}
  await Promise.all(photoQueries(source).map(async (q) => {
    let p = fromRow(await ImageCache.find(q))
    if (p === undefined) {
      p = await search(q, signal).catch(() => undefined)
      if (p !== undefined) await ImageCache.save(q, p?.u ?? '', p?.c ?? null) // null (nothing found) is cached too
    }
    if (p) found[q] = p
  }))
  return found
}

/** The photos a screen's page shows: cache only, no network — a render never waits on Pexels. */
export async function cachedPhotos(source: string): Promise<Record<string, Photo>> {
  const found: Record<string, Photo> = {}
  await Promise.all(photoQueries(source).map(async (q) => {
    const p = fromRow(await ImageCache.find(q))
    if (p) found[q] = p
  }))
  return found
}
