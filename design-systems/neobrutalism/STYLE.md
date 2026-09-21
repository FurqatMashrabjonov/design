# Warm Block Brutal — style card
Mood: Warm cream surfaces hit with hard offset shadows and a single hot accent; everything reads as printed blocks stacked on a table.
Colour energy: medium — the accent covers roughly one button, one badge and one active state per screen; the rest is warm cream and brown ink.

## Colour use
- Screen background is var(--bg); cards and sheets sit on var(--surface).
- Use var(--surface-warm) for highlighted rows, selected chips and inset panels.
- Text is var(--fg) for headings and numbers, var(--fg-2) for body, var(--muted) for captions and timestamps.
- var(--accent) is the only loud colour: primary buttons, active tab, progress fill, one key metric. Text on it is var(--accent-on).
- var(--meta) for small labels and eyebrow text; var(--success), var(--warn), var(--danger) only for status pills and inline validation.
- Every border is var(--border); dividers inside cards use var(--border-soft).

## Type
- Display: var(--font-display), weight 900, uppercase, tracking var(--tracking-display), leading var(--leading-tight).
- Screen title var(--text-2xl); hero number or big stat var(--text-3xl) or var(--text-4xl).
- Section headings var(--text-lg) in var(--font-display) uppercase; card titles var(--text-base) weight 700.
- Body var(--font-body) at var(--text-base) with leading var(--leading-body); secondary copy var(--text-sm).
- Labels, units and counters var(--text-xs) uppercase in var(--font-mono).
- Never set body copy in the display face; never use a weight below 400 for text under 16px.

## Shape and depth
- Radii stay small: var(--radius-sm) on inputs and tags, var(--radius-md) on cards, var(--radius-lg) on sheets and modals, var(--radius-pill) only for status pills and avatars.
- Default depth is var(--elev-raised): a hard 6px/6px offset shadow in ink, no blur.
- Use var(--elev-ring) for quiet cards and list rows that should not lift.
- var(--elev-flat) for anything inside an already-raised card.
- Focus is always var(--focus-ring); pressed states use var(--accent-active), hover var(--accent-hover).
- Transitions run var(--motion-fast) to var(--motion-base) on var(--ease-standard); no bounce, no scale above 1.02.

## Layout and density
- 390px wide, side gutter var(--container-gutter-phone); vertical rhythm in var(--space-4) steps, var(--space-6) between blocks, var(--space-8) before a new section.
- Stack: title, one-line support text, primary action, then content. One primary action per screen.
- Cards are full-width blocks with var(--space-4) internal padding; two-up grids use var(--space-3) gaps.
- Every tappable row, button and input is at least 44px tall; primary buttons are 52px.
- Keep 3–5 blocks visible per screen; do not fill empty space with decoration.

## Signature moves
- Primary button: var(--accent) fill, var(--accent-on) uppercase label in var(--font-display), var(--radius-md), var(--elev-raised) shadow, 52px tall.
- Cards and stat tiles carry the same hard offset shadow and a 1px var(--border) outline, so they read as physical tiles.
- Big numeric readouts in var(--font-display) at var(--text-3xl)+ with a var(--font-mono) uppercase unit label directly beneath.
- Status pills: var(--radius-pill), var(--surface-warm) fill, var(--border) outline, var(--text-xs) uppercase mono text.
- Selected tab or chip flips to var(--accent) fill with var(--accent-on) text and keeps the offset shadow.

## Avoid
- No blurred or soft shadows, no glass, no gradients, no glow.
- No large radii, no fully rounded cards or buttons.
- No second accent hue; status colours never become fills for primary actions.
- No thin 300-weight display text, no lowercase display headings, no letter-spacing tricks.
- No more than one raised element per row; do not stack shadows inside shadows.
- No decorative illustration or texture behind text.
