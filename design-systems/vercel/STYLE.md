# Compressed Monochrome Precision — style card
Mood: Gallery-white canvas with near-black compressed type and whisper-level shadow borders; engineered, quiet, built-not-floating.
Colour energy: low — accent colour appears in at most two small moments per screen (a link, a focus ring, a tinted pill); everything else is white, near-black and grey.

## Colour use
- Canvas and every card surface are var(--bg) / var(--surface); never tint a section to separate it — separation comes from var(--elev-ring) and spacing.
- Primary text and headings: var(--fg). Secondary body copy: var(--fg-2). Captions and metadata: var(--muted). Placeholders and disabled: var(--meta).
- Primary action fills use var(--fg) with var(--accent-on) label — the dark button, not a coloured one.
- var(--accent) is reserved for links, the focus ring and tinted pill badges; cap at two visible uses per screen, never decorative.
- Status colour only where a state genuinely exists: var(--success), var(--warn), var(--danger).

## Type
- One family for everything: var(--font-display) / var(--font-body); var(--font-mono) only for code, numbers and uppercase technical labels.
- Three weights only: 400 for reading, 500 for interactive labels, 600 for headings. Never 700 except a 12px uppercase micro-badge.
- Screen title: var(--text-3xl) at weight 600, line-height var(--leading-tight), letter-spacing var(--tracking-display).
- Section heading: var(--text-2xl) weight 600, tracking -0.04em. Card title: var(--text-xl) weight 600, tracking -0.04em.
- Body: var(--text-base) weight 400, line-height var(--leading-body). Emphasis: same size at weight 500.
- Buttons and links: var(--text-sm) weight 500. Captions and tags: var(--text-xs) weight 400–500.
- Letter-spacing is always negative or zero and scales with size; never positive.

## Shape and depth
- Radii: var(--radius-sm) on buttons and inputs, var(--radius-md) on cards, var(--radius-lg) on image cards, var(--radius-pill) on badges and tags only — never on a primary action.
- Borders are shadows, not CSS borders: var(--elev-ring) is the default edge for cards, inputs and dividers.
- Featured cards use var(--elev-raised) whole, including its inner light ring; never drop a layer.
- Row separators inside a list use var(--border-soft) at 1px; keep them quieter than the card edge.
- Focus is a sharp 2px ring: var(--focus-ring) on every interactive element.
- Transitions run var(--motion-fast) to var(--motion-base) with var(--ease-standard); no long entrances.

## Layout and density
- 390px wide, single column, gutters var(--container-gutter-phone).
- Vertical rhythm between blocks: var(--section-y-phone); inside a block use var(--space-2) to var(--space-6).
- Every tappable row, button and input is at least 44px tall; pad buttons to reach it even though the label is var(--text-sm).
- Cards sit flush in the column with var(--space-4) between them; no card overlaps another.
- Text blocks stay inside the gutter — never edge-bleed body copy; only full-width imagery may touch the edges.
- Generous emptiness around a block is the design: prefer more space above a heading than below it.

## Signature moves
- A card whose only edge is a 1px shadow ring (var(--elev-ring)) on a pure white surface, with no visible CSS border.
- A screen title at var(--text-3xl) weight 600 with var(--tracking-display) compression, sitting in a large pocket of white space.
- A dark filled primary button (var(--fg) background, var(--accent-on) label, var(--radius-sm)) paired with a white shadow-ringed secondary button of the same height.
- A var(--radius-pill) badge with a tinted background and var(--text-xs) weight 500 label used as the only chromatic moment on the screen.
- Uppercase var(--font-mono) labels at var(--text-xs) weight 500 for numbers, codes and step markers.

## Avoid
- No warm or saturated background tints, no gradient washes, no coloured section backgrounds.
- No traditional 1px CSS border on cards where var(--elev-ring) would do.
- No shadows heavier than the var(--elev-raised) stack; no floating or blurred drop shadows.
- No weight 700 on body or headings, and no positive letter-spacing anywhere.
- No pill radius on primary action buttons; pills are for badges and tags only.
- No more than two accent-coloured elements visible at once, and none used purely for decoration.
- No control shorter than 44px, and no dense multi-column grids on a 390px screen.
