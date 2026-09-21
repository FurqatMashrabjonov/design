# Modular Card Grid — style card
Mood: Clean, airy modular blocks on a pale blue canvas, each block a crisp white card with soft depth and a single blue accent.
Colour energy: medium — accent blue appears on one primary action per screen, active states and small meta labels; roughly 10–15% of pixels.

## Colour use
- Canvas is var(--bg); cards and sheets sit on var(--surface).
- Use var(--surface-warm) for grouped or secondary panels inside a card.
- Body text is var(--fg); supporting text is var(--fg-2); captions and timestamps are var(--muted).
- Accent is var(--accent) with var(--accent-on) text on top; pressed state uses var(--accent-active), hover uses var(--accent-hover).
- Status colours: var(--success), var(--warn), var(--danger) only for their literal meaning, never decoratively.
- Dividers use var(--border-soft); card outlines use var(--border).

## Type
- One family throughout: var(--font-body) for everything, var(--font-display) for headings; numerals and code use var(--font-mono).
- Screen title: var(--text-2xl), weight 700, line-height var(--leading-tight), tracking var(--tracking-display).
- Section heading: var(--text-lg), weight 600.
- Body and list rows: var(--text-base), weight 400, line-height var(--leading-body).
- Labels, meta, timestamps: var(--text-sm) or var(--text-xs), weight 500, colour var(--muted).
- Never set two adjacent text blocks to the same size and weight; step at least one level.

## Shape and depth
- Cards: var(--radius-lg) with var(--elev-raised).
- Inputs, small tiles, chips: var(--radius-md); compact controls: var(--radius-sm).
- Pills, tags, segmented controls: var(--radius-pill).
- Flat surfaces use var(--elev-ring) instead of a shadow; never both ring and raised shadow on the same element.
- Focus is always var(--focus-ring), visible on every interactive element.

## Layout and density
- Screen gutter is var(--space-4); vertical rhythm between blocks is var(--space-4) to var(--space-6).
- Card internal padding is var(--space-4) minimum, var(--space-5) for text-heavy cards.
- Stack blocks in a single column; use a 2-up grid only for equal-weight tiles with var(--space-3) gaps.
- All tappable rows and buttons are at least 44px tall; icon-only buttons are 44×44px.
- Keep one primary action per screen, placed at the end of the content flow.

## Signature moves
- Every content group is a white var(--radius-lg) card floating on the var(--bg) canvas with var(--elev-raised).
- A single var(--accent) filled button with var(--accent-on) label anchors each screen; all other actions are neutral or outlined.
- Small var(--muted) uppercase-free meta labels sit above each card title at var(--text-xs).
- Status is shown as a var(--radius-pill) chip tinted with var(--success), var(--warn) or var(--danger).
- Transitions run at var(--motion-base) with var(--ease-standard); press feedback is a colour shift to var(--accent-active), not a scale bounce.

## Avoid
- No second accent hue; resolve every need with the listed tokens.
- No full-bleed colour blocks behind body copy.
- No shadow plus border on the same card.
- No uniform type sizes across a screen.
- No decorative gradients, glows or texture overlays.
