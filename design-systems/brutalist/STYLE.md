# Neo-Brutalist Bold — style card
Mood: Loud, raw, confident. Thick black outlines, hard offset shadows, flat saturated colour blocks.
Colour energy: high — accent yellow covers roughly a third of a screen; one secondary fill (pink or blue) may appear as a single block.

## Colour use
- Background is var(--bg); cards and inputs sit on var(--surface).
- Every border is var(--border) at var(--border-width) or var(--border-width-card). Never soften to grey.
- var(--accent) fills primary buttons, active tabs, tags and selected chips. Its label is var(--accent-on), never white.
- var(--accent-2) or var(--accent-3) may fill one block per screen — a header band, a stat tile, a banner. Never both, never blended, never a gradient.
- var(--success), var(--warn), var(--danger) only for status text and status pills.
- Body copy is var(--fg); secondary copy var(--muted); timestamps and captions var(--meta).

## Type
- Everything is var(--font-display); numbers use var(--font-mono) when they need to align.
- Body var(--text-base) at var(--leading-body); labels var(--text-sm); tags var(--text-xs) uppercase 700.
- Screen titles var(--text-2xl) or var(--text-3xl), weight 700, uppercase, var(--tracking-display), var(--leading-tight).
- Section headings var(--text-lg) or var(--text-xl), weight 700.
- Big numbers (balances, totals, scores) at var(--text-2xl) weight 700, var(--leading-tight).

## Shape and depth
- Radius: pick 0 or var(--radius-lg) for the whole screen and hold it. Never mix.
- Cards: var(--surface), var(--border-width-card) solid var(--border), var(--elev-raised-lg).
- Buttons, inputs, chips, images: var(--border-width) solid var(--border), var(--elev-raised).
- Shadows are hard offsets with zero blur. Never a blurred or soft shadow.
- Focus state: var(--focus-ring).

## Layout and density
- 8px grid. Screen gutter var(--container-gutter-phone).
- Stack blocks with var(--space-2) or var(--space-3) between them; var(--space-4) above a new section.
- Cards pad var(--space-3) to var(--space-4).
- Every control is at least 44px tall; inputs 48px.
- Blocks butt against each other with visible borders between areas rather than whitespace.
- Bottom action bars: full-width, var(--surface), var(--border-width) top border, one var(--accent) button.

## Signature moves
- A 3px black outline on every card, button, input and image, with no exceptions.
- Hard offset shadow (4px, 6px on large cards) in pure black, zero blur.
- Yellow fill with black label on the single primary action of the screen.
- One badge or sticker rotated between -2deg and 2deg, outlined and shadowed like everything else.
- Uppercase 700 headings at var(--tracking-display) sitting directly above their content, no decorative spacing.

## Avoid
- Blurred shadows, gradients, glass or translucency.
- Thin grey or alpha hairlines in place of var(--border).
- White text on var(--accent).
- More than one of var(--accent-2) / var(--accent-3) per screen.
- Mixing 0 and 8px radii on the same screen.
- Controls shorter than 44px.
