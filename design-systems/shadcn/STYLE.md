# Monochrome Utility — style card
Mood: A calm, near-monochrome interface where pure white surfaces and hairline borders do all the structural work. Nothing decorative; every element is a legible, functional block.
Colour energy: low — accent colour appears only on primary buttons, focus rings, and small state badges; the rest of a screen is white, near-black text, and grey hairlines.

## Colour use
- Canvas and cards are both var(--bg) / var(--surface) — pure white, no tinting between sections. Depth comes from borders, not fills.
- Body text is var(--fg); captions, subtext and helper lines are var(--muted). Never use var(--accent) for body copy.
- var(--accent) is reserved for the single decisive action on a screen: one filled primary button, plus focus rings. Labels on it use var(--accent-on).
- var(--accent-hover) and var(--accent-active) lighten the fill on press — the button lifts, it does not darken.
- var(--success), var(--warn), var(--danger) appear only as small state badges or inline validation text; keep them under ~5% of visible pixels.
- All edges and dividers are var(--border) at 1px. No coloured borders, no gradient fills.

## Type
- One family for everything: var(--font-display) for headings, var(--font-body) for text. var(--font-mono) only for code, keys, or numeric IDs.
- Sizes: var(--text-xs) captions/badges, var(--text-sm) buttons and inputs, var(--text-base) body, var(--text-lg) lede, var(--text-xl) card titles, var(--text-2xl) screen titles, var(--text-3xl) top headline.
- Weights: 400 body, 500 labels and buttons, 600 headings. Do not go above 600.
- Headings: var(--leading-tight) with var(--tracking-display). Body: var(--leading-body).
- Hierarchy comes from size and weight steps, never from colour or all-caps.

## Shape and depth
- Radii: var(--radius-sm) on buttons and inputs, var(--radius-md) on cards and sheets, var(--radius-lg) on large feature panels, var(--radius-pill) only on badges and avatars.
- Default card treatment is a 1px var(--border) edge with var(--elev-flat) — no shadow.
- Use var(--elev-ring) when a border would shift layout; use var(--elev-raised) only for floating layers (menus, popovers, toasts).
- Focus is always var(--focus-ring): a 2px canvas halo plus a 2px accent ring. Apply it to every interactive element on :focus-visible.
- Transitions use var(--motion-fast) or var(--motion-base) with var(--ease-standard). No bounce, no spring.

## Layout and density
- 390px screen: var(--container-gutter-phone) side padding, never edge-to-edge body text.
- Vertical rhythm on the 4px grid: var(--space-2) inside chips, var(--space-4) inside cards, var(--space-6) between cards, var(--space-8) between groups, var(--space-12) before a major block.
- Stack order per block: heading, one line of var(--muted) support text, then the action.
- Every tappable row, button and input is at least 44px tall.
- Lists separate rows with a 1px var(--border) divider rather than gaps or shadows.

## Signature moves
- One pure-black filled button per screen (var(--accent) fill, var(--accent-on) label, var(--radius-sm)); every other action is a white button with a 1px var(--border) edge and var(--fg) label.
- White-on-white cards defined only by a 1px var(--border) hairline and var(--radius-md) — no shadow, no tint.
- The layered focus ring (var(--focus-ring)) on every input, button and row, visible on both white and dark fills.
- Two-tier text blocks: var(--fg) at var(--text-base)/500 above var(--muted) at var(--text-sm)/400, used for every list row and card.
- Pill badges at var(--radius-pill) with var(--text-xs)/500, filled with a semantic token only when the state is real.

## Avoid
- Any chromatic colour outside var(--success), var(--warn), var(--danger) and their badge use.
- Shadows on resting cards, coloured or gradient surfaces, glassmorphism, glow.
- Pill-shaped buttons, radii above var(--radius-lg) on containers, oversized display type.
- Mixing more than two type sizes in one block, or using colour to signal hierarchy.
- Decorative icons or illustrations that carry no state or action meaning.
