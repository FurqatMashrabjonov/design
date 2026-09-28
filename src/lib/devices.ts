// PRV-01: the phones the preview can show an app on. Each is drawn by us (DeviceFrame — no vendor artwork) at
// its real CSS viewport, so a screen is laid out at that device's width; its status bar and home area are the
// safe-area insets Konsta's Navbar and Tabbar keep clear of (--k-safe-area-*). An Android phone shows the app
// as Material. Viewports: iPhone 18 Pro Max 440×956, Galaxy S26 Ultra 412×891 (2026 device tables).
export type Device = {
  id: string
  name: string
  platform: 'ios' | 'material'
  /** CSS viewport. */
  w: number
  h: number
  /** Screen corner radius and the bezel around it, CSS px. */
  radius: number
  bezel: number
  cutout: 'island' | 'punch'
  /** Safe areas: the status bar at the top, the home indicator / gesture bar at the bottom. */
  top: number
  bottom: number
  /** A foldable's inner screen (PRV-02): wider than tall, shown as two panes either side of the hinge. */
  unfolded?: { w: number; h: number; radius: number }
}

export const DEVICES: Device[] = [
  { id: 'iphone-18-pro', name: 'iPhone 18 Pro', platform: 'ios', w: 402, h: 874, radius: 56, bezel: 12, cutout: 'island', top: 54, bottom: 34 },
  { id: 'iphone-18-pro-max', name: 'iPhone 18 Pro Max', platform: 'ios', w: 440, h: 956, radius: 60, bezel: 12, cutout: 'island', top: 54, bottom: 34 },
  // PRV-02: a book-style foldable — a cover screen folded, an inner screen twice as wide open.
  // Off until November 2026 (PRV-02 is Keyin): the fold, the panes and the tests stay; uncomment to bring it back.
  // Each half of the inner screen is the cover screen's size (≈0.7:1), so folding is one half swinging over the
  // other; open it is ≈1.4:1, as Apple's renders of the Duo show.
  // { id: 'iphone-duo', name: 'iPhone Duo', platform: 'ios', w: 450, h: 640, radius: 44, bezel: 12, cutout: 'punch', top: 44, bottom: 24, unfolded: { w: 900, h: 640, radius: 44 } },
  { id: 'galaxy-s26-ultra', name: 'Galaxy S26 Ultra', platform: 'material', w: 412, h: 891, radius: 30, bezel: 9, cutout: 'punch', top: 36, bottom: 24 },
]

export const DEFAULT_DEVICE = DEVICES[0]!
export const deviceById = (id: string | null | undefined) => DEVICES.find((d) => d.id === id) ?? DEFAULT_DEVICE

type PlanEntry = { id: string; kind?: string; parent?: string }
const opened = (p: PlanEntry | undefined) => p?.kind === 'push' || p?.kind === 'modal'

/** PRV-02: which screens share the open foldable. A screen that is opened from another sits on the right of its
 *  parent; a screen that opens others sits on the left of the first of them; anything else fills the screen. */
export function splitPanes<T extends { id: string; slug: string | null }>(screens: T[], planned: Map<string, PlanEntry>, id: string): { left: string; right?: string } {
  const s = screens.find((x) => x.id === id)
  const p = s?.slug ? planned.get(s.slug) : undefined
  if (opened(p)) {
    const parent = screens.find((x) => x.slug === p!.parent)
    return parent ? { left: parent.id, right: id } : { left: id }
  }
  const child = screens.find((x) => {
    const q = x.slug ? planned.get(x.slug) : undefined
    return opened(q) && q!.parent === s?.slug
  })
  return child ? { left: id, right: child.id } : { left: id }
}

/** Where one frame of an open-or-opening foldable sits, in inner-screen px; `angle` swings it about its `origin`
 *  edge, `soft` (0…1) blurs and dims a frame that is not settled yet, `card` rounds a pane of a split screen. */
export type FoldFrame = { left: number; width: number; z: number; origin?: 'left' | 'right'; angle?: number; soft?: number; card?: boolean }

/** The perspective a swinging half is drawn with, px. */
export const FOLD_PERSPECTIVE = 1800
/** The black gap between the two panes of a split screen, px. */
const GAP = 8

/** PRV-02: the frames of a foldable at fold progress p (0 folded … 1 open), `half` = one half's width. The cover is
 *  the back of the left half: folded, it lies over the right half. Opening, it swings away about the hinge (first
 *  half of p) and the left half's inner side swings in and lands (second half), the way the Duo opens. When the
 *  screen on show is the right pane, or fills the whole screen, nothing has to swing away first, so it lands over
 *  the whole of p. `clipLeft` is how much of the left half is still out of view — the projected width of the
 *  landing half, so the device grows with it. */
export function foldLayout(p: number, panes: { left: string; right?: string }, cover: string, half: number): { frames: Map<string, FoldFrame>; clipLeft: number } {
  const frames = new Map<string, FoldFrame>()
  const t1 = Math.min(p / 0.5, 1)
  const early = !!panes.right && cover === panes.left
  const land = early ? Math.max((p - 0.5) / 0.5, 0) : p
  const soft = 1 - p
  if (p <= 0) frames.set(cover, { left: half, width: half, z: 2 })
  else if (!panes.right) frames.set(cover, { left: 0, width: half * 2, z: 2, soft })
  else {
    const card = { card: true, soft }
    frames.set(panes.right, { left: half + GAP / 2, width: half - GAP / 2, z: 1, ...card })
    if (early && p < 0.5) frames.set(cover, { left: half, width: half, z: 3, origin: 'left', angle: -90 * t1 })
    else if (land > 0) frames.set(panes.left, { left: 0, width: half - GAP / 2, z: 3, origin: 'right', angle: 90 * (1 - land), ...card })
  }
  const phi = (Math.PI / 2) * (1 - land)
  const projected = (half * Math.cos(phi) * FOLD_PERSPECTIVE) / (FOLD_PERSPECTIVE - half * Math.sin(phi))
  return { frames, clipLeft: Math.max(0, Math.round(half - projected)) }
}
