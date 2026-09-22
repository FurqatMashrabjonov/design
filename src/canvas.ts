// Frame pixel sizes at 100% zoom, shared between the canvas (layout math) and ScreenFrame (rendering).
export const FRAME_SIZE = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

export const FRAME_GAP = 64

export function frameSize(device: string) {
  return FRAME_SIZE[device as keyof typeof FRAME_SIZE] ?? FRAME_SIZE.desktop
}

// Next frame goes to the right of the rightmost existing one, top-aligned with it.
export function nextFramePosition(existing: { x: number; y: number }[], device: string) {
  if (existing.length === 0) return { x: 0, y: 0 }
  const { width } = frameSize(device)
  const rightmost = existing.reduce((a, b) => (b.x > a.x ? b : a))
  return { x: rightmost.x + width + FRAME_GAP, y: rightmost.y }
}

export type Rect = { x: number; y: number; w: number; h: number }
/** The frames a rubber-band rectangle touches (all in canvas/world coordinates); a touch counts, containment is not required. */
export const framesIn = (rect: Rect, frames: { id: string; x: number; y: number; width: number; height: number }[]) =>
  frames.filter((f) => f.x < rect.x + rect.w && f.x + f.width > rect.x && f.y < rect.y + rect.h && f.y + f.height > rect.y).map((f) => f.id)
