# Frosted Glass Layers — style card
Mood: Cool, airy frosted-glass surfaces floating over a pale blue field, with soft luminous edges and one confident blue accent.
Colour energy: medium — accent blue appears on primary actions, active states and small highlights; most of a screen stays pale blue and translucent white.

## Colour use
- Screen background is var(--bg); content sits on translucent panels using var(--surface) or var(--surface-warm).
- Primary action fill is var(--accent) with label var(--accent-on); pressed states use var(--accent-active), hover var(--accent-hover).
- Body text is var(--fg); secondary text var(--fg-2); captions and metadata var(--muted).
- Status colour is reserved for status only: var(--success), var(--warn), var(--danger).
- Panel edges are var(--border) for main cards and var(--border-soft) for nested or secondary panels.
- Keep accent coverage under roughly one fifth of the screen; the rest is pale background and translucent white.

## Type
- One family throughout: var(--font-display) for headings, var(--font-body) for text; numerals and codes use var(--font-mono).
- Sizes: var(--text-xs) for labels, var(--text-sm) for captions, var(--text-base) for body, var(--text-lg) for list titles, var(--text-xl) for screen titles, var(--text-2xl) for large numbers, var(--text-3xl) and var(--text-4xl) for hero figures only.
- Body line height var(--leading-body); display line height var(--leading-tight) with tracking var(--tracking-display).
- Weights: 400 body, 500 labels and buttons, 600 list titles, 700–800 screen titles and hero numbers.
- Never set a whole screen at one size and weight; each screen needs at least three distinct steps.

## Shape and depth
- Radii: var(--radius-sm) for chips and inputs, var(--radius-md) for cards, var(--radius-lg) for large panels and sheets, var(--radius-pill) for buttons and tags.
- Depth comes from translucency plus var(--elev-raised) on floating panels; flat rows use var(--elev-flat) and rely on var(--elev-ring) instead.
- Focus is always var(--focus-ring); never remove it.
- Transitions run var(--motion-fast) for taps and var(--motion-base) for panel changes, eased with var(--ease-standard).

## Layout and density
- Phone gutter is var(--container-gutter-phone); vertical rhythm uses var(--space-4) between related items and var(--space-6) between groups, with var(--space-8) or var(--space-12) before a major block.
- Screen top padding is var(--space-8); bottom padding clears the safe area plus var(--space-6).
- Every tappable control is at least 44px tall; pill buttons use var(--space-4) vertical padding and var(--space-6) horizontal padding.
- One primary action per screen; secondary actions are neutral pills or text buttons.
- Cards stack in a single column with var(--space-4) gaps; two-column grids only for small stat tiles.

## Signature moves
- Frosted panels: var(--surface) fill over var(--bg) with a var(--border) hairline, so background colour shows faintly through every card.
- Large soft blue glow under floating panels via var(--elev-raised), never a hard grey drop shadow.
- Pill-shaped primary button in var(--accent) with var(--accent-on) label, sitting alone at the bottom of the content column.
- Oversized display numbers in var(--text-2xl) to var(--text-4xl) with var(--tracking-display), paired with a var(--text-xs) uppercase label in var(--muted).
- Status chips: var(--radius-pill), translucent fill, and a single status colour used only for the dot or the value.

## Avoid
- No opaque grey or black panels; depth must come from translucency and the blue-tinted glow.
- No hard-edged rectangles: minimum corner radius is var(--radius-sm).
- No second accent hue; var(--accent) is the only interactive colour.
- No dense multi-column lists or cramped rows; keep the comfortable spacing scale.
- No decorative blur or glow behind body text where it would drop contrast below readable levels.
