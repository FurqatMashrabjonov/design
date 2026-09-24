import { hash } from './hash.ts'
// VAR-01: every project gets one art direction, kept for all its screens and different from the
// next project's. The design system decides colour, type and radii; the direction decides
// composition — how big the type plays, how much air, whether content sits in cards, in rows or
// over photos. Seeded by the project id (stable, survives a rename), picked from the directions
// that suit the app's type, so a bank never lands on "immersive media".

export type ArtDirection = { id: string; name: string; brief: string }

export const ART_DIRECTIONS: ArtDirection[] = [
  { id: 'editorial', name: 'Editorial', brief: 'Large, confident headlines and generous white space; big photos with short captions; content sits on the page rather than in boxes; thin dividers instead of cards where possible.' },
  { id: 'dense', name: 'Dense utility', brief: 'Information-first: compact rows, small section headers, numbers in tabular figures, more on screen at once; decoration kept to a minimum; cards only for summaries.' },
  { id: 'mosaic', name: 'Card mosaic', brief: 'Content arranged in tiles of different sizes — one wide hero tile, then a two-column grid of smaller ones; each tile has one job; the grid rhythm is the personality.' },
  { id: 'immersive', name: 'Immersive media', brief: 'Full-bleed imagery leads each screen; text sits on photos over a dark gradient; controls float; the chrome stays quiet so the content fills the screen.' },
  { id: 'friendly', name: 'Friendly', brief: 'Soft and approachable: icons in soft circles (a neutral tint on a quiet design system, the accent tint only on a vivid one), rounded chips, warm encouraging microcopy, big touch targets, one clear illustration or emoji-free mascot moment per screen.' },
  { id: 'calm', name: 'Calm minimal', brief: 'One idea per row, lots of space, a muted palette with a single accent moment per screen, light type weights for secondary text, no competing highlights.' },
]

const FOR_TYPE: Record<string, string[]> = {
  fintech: ['dense', 'calm', 'mosaic'],
  productivity: ['dense', 'calm', 'friendly'],
  commerce: ['editorial', 'mosaic', 'immersive'],
  marketplace: ['mosaic', 'dense', 'friendly'],
  'food-delivery': ['mosaic', 'immersive', 'friendly'],
  food: ['editorial', 'immersive', 'mosaic'],
  travel: ['immersive', 'editorial', 'mosaic'],
  booking: ['immersive', 'editorial', 'calm'],
  social: ['immersive', 'friendly', 'mosaic'],
  media: ['immersive', 'editorial', 'mosaic'],
  fitness: ['mosaic', 'dense', 'friendly'],
  health: ['calm', 'friendly', 'dense'],
  learning: ['friendly', 'mosaic', 'calm'],
}


export function artDirection(seed: string, appType?: string): ArtDirection {
  const ids = FOR_TYPE[appType ?? ''] ?? ART_DIRECTIONS.map((d) => d.id)
  const id = ids[hash(seed) % ids.length]
  return ART_DIRECTIONS.find((d) => d.id === id)!
}

/** The brief line; every screen of the project carries the same one. */
export const artBlock = (d: ArtDirection) => `ART DIRECTION for this whole app — ${d.name}: ${d.brief} Apply it within the design system; it shapes composition, not colours or fonts — how much accent a screen carries is still the design system's call.`
