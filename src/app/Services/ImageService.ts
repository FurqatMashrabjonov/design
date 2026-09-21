import { ImageCache } from '@/app/Models/ImageCache'
import { applyImages, imageQueries, type ResolvedImage } from '@/lib/image-slots'

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

/** Replaces every image slot in a generated screen with a stock photo, or with a plain block when none is found. */
export async function resolveImages(html: string, signal?: AbortSignal): Promise<string> {
  const queries = imageQueries(html)
  if (queries.length === 0) return html
  const found = new Map<string, ResolvedImage | null>()
  await Promise.all(queries.map(async (q, i) => found.set(q, i < MAX_SLOTS ? await lookup(q, signal) : null)))
  return applyImages(html, found)
}
