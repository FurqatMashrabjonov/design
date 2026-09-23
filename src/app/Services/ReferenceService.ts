import { completeJSON, jsonOnly } from './LlmService.ts'
import type { RefImage } from './LlmService.ts'

/**
 * IMG-01/IMG-02: a reference picture attached when an app is started, read once.
 *
 * A planned run is seven or more calls. Sending the picture with each of them would be charged every
 * time (an image is never a cache hit) and would leave six parallel calls to agree on what it meant
 * — the thing this codebase refuses to hope for. So the picture is read once, into words and a few
 * numbers, and code does the rest: it picks the design system the picture is closest to and sets the
 * theme, before a single screen is drawn.
 */
export type ReferenceStyle = {
  /** How the screens are built — composition only, injected into every screen brief. */
  composition: string
  /** The loudest colour in the interface (buttons, active states), as #rrggbb. */
  accent?: string
  /** The colour the screens sit on, as #rrggbb — this is what decides light against dark. */
  background?: string
  corners?: 'sharp' | 'soft' | 'round'
  /** What the display type does: heavy and loud, geometric and plain, or quiet. */
  type?: 'heavy' | 'geometric' | 'quiet' | 'serif'
  /** Two or three words, used to break ties between systems that match on colour. */
  mood: string[]
}

const SYSTEM = `You read a picture of an app (or a promotional collage showing app screens) and report how the INTERFACE inside it looks, so a designer who cannot see it can match it.

Look at the phone screens themselves, not at the poster around them.

Reply with JSON only:
{
  "composition": "3-4 short sentences: what leads a screen, how sections stack or grid, the spacing rhythm (tight or airy), the type scale, and the shapes (cards, rows, dividers, shadows).",
  "accent": "#rrggbb — the loudest colour used for buttons, active states and highlights",
  "background": "#rrggbb — what the screens sit on",
  "corners": "sharp | soft | round",
  "type": "heavy | geometric | quiet | serif",
  "mood": ["two", "or", "three", "words"]
}

Never name a brand, a product, a person, or any text you can read. Describe how it is built, never what it is about. If there is no interface in the picture, reply {"composition":"","mood":[]}.`

/** At most a paragraph: this is injected into every screen brief, and the prompt has a budget. */
const MAX_CHARS = 700
const HEX = /^#[0-9a-f]{6}$/i

function trim(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= MAX_CHARS) return clean
  // Cut at a sentence, not mid-word: the model reads this as instructions, and a half-finished
  // clause reads as a half-finished thought.
  const cut = clean.slice(0, MAX_CHARS)
  const stop = cut.lastIndexOf('. ')
  return stop > MAX_CHARS / 2 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '')
}

export function parseReferenceStyle(raw: string): ReferenceStyle {
  let v: Record<string, unknown> = {}
  try {
    v = JSON.parse(jsonOnly(raw)) as Record<string, unknown>
  } catch {
    return { composition: '', mood: [] }
  }
  const hex = (x: unknown) => (typeof x === 'string' && HEX.test(x.trim()) ? x.trim().toLowerCase() : undefined)
  const oneOf = <T extends string>(x: unknown, allowed: readonly T[]) => (typeof x === 'string' && (allowed as readonly string[]).includes(x) ? (x as T) : undefined)
  return {
    composition: typeof v.composition === 'string' ? trim(v.composition) : '',
    accent: hex(v.accent),
    background: hex(v.background),
    corners: oneOf(v.corners, ['sharp', 'soft', 'round'] as const),
    type: oneOf(v.type, ['heavy', 'geometric', 'quiet', 'serif'] as const),
    mood: Array.isArray(v.mood) ? v.mood.filter((m): m is string => typeof m === 'string').slice(0, 4).map((m) => m.toLowerCase().trim()) : [],
  }
}

export async function readReference(images: RefImage[], signal?: AbortSignal): Promise<ReferenceStyle> {
  if (!images.length) return { composition: '', mood: [] }
  const raw = await completeJSON(SYSTEM, 'Read this picture.', 1200, undefined, images.slice(0, 2), signal)
  return parseReferenceStyle(raw)
}

/** How the written reference reaches a screen, next to the art direction it refines. */
export const referenceBlock = (style: ReferenceStyle) =>
  style.composition
    ? `REFERENCE the person attached — build the screens the way it is built: ${style.composition}${style.mood.length ? ` Its mood is ${style.mood.join(', ')}.` : ''} Use this app's own data and copy; the colours and type come from the design system, which was chosen to match this picture.`
    : ''
