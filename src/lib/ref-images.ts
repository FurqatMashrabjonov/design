import type { RefImage } from '@/app/Services/LlmService'

// REG-01 (LLM-02, IMG-01/02): the reference pictures a message may carry — at most two, PNG/JPEG/WebP data URLs
// under ~1 MB each (the box refuses bigger files). Anything else is refused here, at the edge, so a remote URL, an
// SVG or a huge body never reaches a model. They ride the one request that carries them and are never stored.
export const MAX_REF_IMAGES = 2
const MAX_CHARS = 1_400_000 // ~1 MB of image as base64
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/

export function parseRefImages(v: unknown): RefImage[] | undefined {
  if (v === undefined || v === null) return undefined
  if (!Array.isArray(v) || v.length > MAX_REF_IMAGES) throw new Error(`At most ${MAX_REF_IMAGES} reference images`)
  const out = v.map((d) => {
    if (typeof d !== 'string' || d.length > MAX_CHARS || !DATA_URL.test(d)) throw new Error('A reference image must be a PNG, JPEG or WebP under 1 MB')
    return { dataUrl: d }
  })
  return out.length ? out : undefined
}

/** What every call that sees the pictures is told about them. */
export const REF_IMAGE_NOTE = `\n\n# REFERENCE IMAGE\nThe person attached a reference picture. Take its visual language — layout and density, card and button shapes, type weight, how imagery and colour are used — and make this screen feel like it, within this app's own style card and palette. Do not copy its text or data.`
