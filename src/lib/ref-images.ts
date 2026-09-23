/**
 * LLM-02: reference pictures a person attaches to a request ("make it look like this").
 *
 * Everything here arrives from the browser, so it is checked before it can reach the model or the
 * spend log. An image is charged as prompt tokens and never comes back as a cache hit, so the
 * limits are a budget decision as much as a safety one: two pictures, and about a megabyte each.
 */
export const MAX_REF_IMAGES = 2
/** Bytes of decoded image. A phone screenshot is 200–600 KB; 1 MB leaves room without inviting uploads. */
export const MAX_REF_BYTES = 1_000_000
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'] as const

export type RefImage = { dataUrl: string }

/** Rough decoded size of a base64 payload, without allocating it. */
export function base64Bytes(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}

/**
 * Keeps the attachments that are safe to send: a data URL of an allowed image type, within the size
 * limit, at most `MAX_REF_IMAGES` of them. Anything else is dropped rather than rejected — a person
 * who pasted an odd file gets their screen, not an error page.
 */
export function parseRefImages(value: unknown): RefImage[] {
  if (!Array.isArray(value)) return []
  const out: RefImage[] = []
  for (const item of value) {
    if (out.length >= MAX_REF_IMAGES) break
    const url = typeof item === 'string' ? item : typeof item?.dataUrl === 'string' ? item.dataUrl : ''
    const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(url.trim())
    if (!m) continue
    if (!(ALLOWED as readonly string[]).includes(m[1]!)) continue
    if (base64Bytes(m[2]!) > MAX_REF_BYTES) continue
    out.push({ dataUrl: url.trim() })
  }
  return out
}

/** What the model is told the pictures are for. Without this it treats them as content to copy. */
export function refImageNote(count: number): string {
  if (count === 0) return ''
  return count === 1
    ? 'A reference image is attached. Take its layout, spacing, type scale and mood as direction — not its literal content. Keep this app\'s own data, copy and design tokens.'
    : `${count} reference images are attached. Take their layout, spacing, type scale and mood as direction — not their literal content. Keep this app\'s own data, copy and design tokens.`
}
