import { ImageCache } from '@/app/Models/ImageCache'
import { genderOf, type Gender } from '@/lib/content-seed'
import { applyAvatars, applyImages, applyLogo, avatarNames, imageQueries, type ResolvedImage } from '@/lib/image-slots'

const SEARCH = 'https://api.pexels.com/v1/search'
const PHOTO_HOST = 'https://images.pexels.com/'
const MAX_SLOTS = 12 // per screen; more than this is a gallery the API budget should not pay for

// Same query, same photo: the first result is the most relevant one and the cache makes it stable.
// ponytail: one provider, first hit. Rotate through `photos` by slot index if screens start repeating a photo.
async function search(query: string, signal?: AbortSignal): Promise<ResolvedImage | null | undefined> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return undefined
  const res = await fetch(`${SEARCH}?query=${encodeURIComponent(query)}&per_page=3`, {
    headers: { Authorization: key },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
  })
  if (!res.ok) return undefined // rate limit or outage: do not cache, try again on a later screen
  const photo = ((await res.json()) as { photos?: { src?: { original?: string }; avg_color?: string }[] }).photos?.[0]
  const original = photo?.src?.original
  if (!original || !original.startsWith(PHOTO_HOST)) return null
  return {
    // 800px covers a 390px frame at 2x; the CDN resizes on the fly.
    url: `${original.split('?')[0]}?auto=compress&cs=tinysrgb&w=800`,
    avgColor: /^#[0-9a-f]{6}$/i.test(photo?.avg_color ?? '') ? photo!.avg_color : undefined,
  }
}

async function lookup(query: string, signal?: AbortSignal): Promise<ResolvedImage | null> {
  const cached = ImageCache.find(query)
  if (cached) return cached.url ? { url: cached.url, avgColor: cached.avgColor ?? undefined } : null
  const found = await search(query, signal).catch(() => undefined)
  if (found === undefined) return null
  ImageCache.save(query, found?.url ?? '', found?.avgColor ?? null)
  return found
}

// Portraits come from two pools, fetched once each and kept in the cache under avatar:<gender>:<n>.
// A person always gets the same face: the index is a hash of the name.
const POOL = 40
const POOL_QUERY: Record<Gender, string> = { f: 'woman portrait face', m: 'man portrait face' }

async function portraitPool(gender: Gender, signal?: AbortSignal): Promise<string[]> {
  const cached = Array.from({ length: POOL }, (_, i) => ImageCache.find(`avatar:${gender}:${i}`)?.url).filter((u): u is string => Boolean(u))
  if (cached.length > 0) return cached
  const key = process.env.PEXELS_API_KEY
  if (!key) return []
  const res = await fetch(`${SEARCH}?query=${encodeURIComponent(POOL_QUERY[gender])}&per_page=${POOL}`, {
    headers: { Authorization: key },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
  })
  if (!res.ok) return []
  const photos = ((await res.json()) as { photos?: { src?: { original?: string } }[] }).photos ?? []
  const urls = photos
    .map((p) => p.src?.original ?? '')
    .filter((u) => u.startsWith(PHOTO_HOST))
    // A square face crop, 2x a 64px avatar.
    .map((u) => `${u.split('?')[0]}?auto=compress&cs=tinysrgb&w=128&h=128&fit=crop`)
  urls.forEach((url, i) => ImageCache.save(`avatar:${gender}:${i}`, url, null))
  return urls
}

function nameHash(name: string): number {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619)
  return h >>> 0
}

// Only seeded people (lib/content-seed) get a face — their gender is known, so the photo can match
// the name. A name the model invented gets initials rather than a coin-flip portrait.
async function resolveAvatars(html: string, signal?: AbortSignal): Promise<string> {
  const names = avatarNames(html)
  if (names.length === 0) return html
  const portraits = new Map<string, string | null>()
  for (const name of names) {
    const gender = genderOf(name)
    const pool = gender ? await portraitPool(gender, signal).catch(() => []) : []
    portraits.set(name, pool.length ? pool[nameHash(name) % pool.length] : null)
  }
  return applyAvatars(html, portraits)
}

/** Fills every slot of a generated screen: the app mark, people's avatars, and photos (a plain block when none is found). */
export async function resolveImages(input: string, signal?: AbortSignal, app?: { name: string }): Promise<string> {
  const html = await resolveAvatars(app ? applyLogo(input, app.name) : input, signal)
  const queries = imageQueries(html)
  if (queries.length === 0) return html
  const found = new Map<string, ResolvedImage | null>()
  await Promise.all(queries.map(async (q, i) => found.set(q, i < MAX_SLOTS ? await lookup(q, signal) : null)))
  return applyImages(html, found)
}
