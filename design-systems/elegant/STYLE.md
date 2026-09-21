# Warm Editorial Serif — style card
Mood: A quiet, paper-toned interface with a serif voice and a single warm brown accent; everything reads like a well-set printed page rather than a screen.
Colour energy: low — under 10% of a screen carries accent colour; the rest is cream, off-white and warm neutral surfaces.

## Colour use
- Screen background is always var(--bg); cards, sheets and list rows sit on var(--surface).
- Use var(--surface-warm) for grouped blocks, selected rows and inset panels — never as a full-screen background.
- var(--accent) is the only brand colour: primary buttons, active tab, links, progress fill, one highlighted number. Cap it at one or two accent elements per screen.
- Text: var(--fg) for headings and primary values, var(--fg-2) for body, var(--muted) for captions and helper text.
- var(--meta) is reserved for small metadata labels (dates, counts, units) at var(--text-xs).
- Status only: var(--success), var(--warn), var(--danger) for badges and inline messages; never as decoration.
- Hairlines are var(--border) for real dividers, var(--border-soft) for row separators inside a card.
- Text on var(--accent) is var(--accent-on).

## Type
- Display and headings use var(--font-display) at weight 400–500 only; never bold serif.
- Body, labels and buttons use var(--font-body) at weight 400–500.
- Numerals, codes and tabular values use var(--font-mono).
- Screen title: var(--text-xl), var(--leading-tight), letter-spacing var(--tracking-display).
- Hero figure (balance, streak count, big stat): var(--text-2xl) or var(--text-3xl) in var(--font-display), var(--leading-tight).
- Section heading: var(--text-lg) in var(--font-display).
- Body copy: var(--text-base), var(--leading-body).
- Labels and secondary rows: var(--text-sm); captions and metadata: var(--text-xs) in var(--muted) or var(--meta).
- Buttons: var(--text-sm), weight 500, no letter-spacing change, no uppercase.

## Shape and depth
- Radii: var(--radius-sm) for inputs and small chips, var(--radius-md) for cards and buttons, var(--radius-lg) for sheets and large panels, var(--radius-pill) for tags and segmented controls.
- Default elevation is var(--elev-flat); separate with spacing first, then var(--elev-ring) for outlined cards.
- var(--elev-raised) is allowed on at most one floating element per screen (a bottom sheet or a single featured card).
- Focus state is var(--focus-ring) on every interactive element.
- Transitions use var(--motion-fast) or var(--motion-base) with var(--ease-standard).

## Layout and density
- 390px wide, gutters var(--container-gutter-phone); vertical rhythm in multiples of var(--space-4).
- Screen padding: var(--space-5) horizontal, var(--space-6) between major blocks, var(--space-8) before a new section.
- Cards use var(--space-5) internal padding; list rows use var(--space-4) vertical.
- Every tappable row, button and input is at least 44px tall; primary buttons are 52px tall and full-width.
- One primary action per screen; secondary actions are outlined or text-only.
- Keep 3–5 content blocks visible per screen; do not compress to fit more.

## Signature moves
- A serif display number or headline sitting on a cream var(--bg) field, with the rest of the screen in sans-serif at var(--text-sm)/var(--text-base).
- A single var(--accent) filled button, full-width, 52px tall, var(--radius-md), white label — the only saturated element on screen.
- Cards as var(--surface) rectangles with var(--radius-md) and a var(--border-soft) hairline, no shadow.
- Metadata lines in var(--text-xs) var(--meta) above a serif title, giving a printed-caption feel.
- var(--surface-warm) used as a soft inset band behind a stat row or selected list item.

## Avoid
- No second accent hue, no gradients, no glass or blur effects.
- No bold or heavy serif weights; no all-caps headings.
- No drop shadows on ordinary cards; no more than one raised element per screen.
- No sharp 0px corners and no fully circular icon buttons except pill tags.
- No dense multi-column grids or more than two columns of content at 390px.
- No accent colour on large background areas, body text or dividers.
