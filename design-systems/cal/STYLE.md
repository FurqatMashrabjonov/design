# Monochrome Precision — style card
Mood: A pure-white, grayscale world where near-black type and layered hairline shadows carry all the weight. Calm, architectural, and deliberately colourless.
Colour energy: low — under 5% of a screen carries accent colour; the only chromatic value is a single link blue used on inline text links and focus rings.

## Colour use
- Canvas and every card surface are var(--bg) / var(--surface); never tint a background.
- Primary text, headings and primary button fills use var(--fg). Reserve var(--fg-2) for the highest-contrast labels only.
- Secondary copy, captions and descriptions use var(--muted).
- var(--accent) is link-only: inline text links and the focus ring. Never fill a button with it.
- Primary buttons are var(--fg) background with var(--accent-on) label. Secondary buttons are var(--surface) with a ring edge.
- var(--success), var(--warn), var(--danger) appear only as small status text or dots, never as large fills.

## Type
- Headings 24px and above: var(--font-display) at weight 600, line-height var(--leading-tight), letter-spacing var(--tracking-display).
- Below 24px, switch headings to var(--font-body) at weight 600 — the display face cramps small.
- Body and UI text: var(--font-body) at var(--text-base), weight 400–500, line-height var(--leading-body).
- Captions: var(--text-sm) or var(--text-xs) in var(--font-body) weight 500, colour var(--muted).
- Numeric or code readouts: var(--font-mono) at var(--text-sm) weight 600.
- Screen title: var(--text-2xl) or var(--text-3xl) in var(--font-display) weight 600.

## Shape and depth
- Radii: var(--radius-sm) for buttons and inputs, var(--radius-md) for cards, var(--radius-lg) for large panels, var(--radius-pill) for badges and chips.
- Depth comes from shadows, not borders. Default card treatment is var(--elev-raised); flat rows use var(--elev-flat); a hairline-only surface uses var(--elev-ring).
- Inner row separators use var(--border-soft); never draw a full CSS border where a ring shadow works.
- Focus state: var(--focus-ring).
- Transitions: var(--motion-fast) or var(--motion-base) with var(--ease-standard); hover is an opacity change, not a movement.

## Layout and density
- 390px wide, single column. Side gutters var(--container-gutter-phone).
- Vertical rhythm between blocks: var(--space-6) to var(--space-8); between major screen sections var(--section-y-phone).
- Card internal padding var(--space-4) to var(--space-6). Gaps between related items var(--space-2) to var(--space-3).
- Every tappable control is at least 44px tall; primary buttons are full-width and 48px tall.
- Keep one idea per block, separated by generous white space — density is low, whitespace is the design.

## Signature moves
- A white card lifted by the three-layer var(--elev-raised) stack: sharp bottom contact shadow, 1px ring hairline, soft ambient — never a flat border.
- A full-width near-black primary button (var(--fg) fill, var(--accent-on) label, var(--radius-sm)) sitting alone under a centred display heading.
- A centred display heading at var(--text-2xl)–var(--text-3xl), weight 600, tight leading, with a single line of var(--muted) body copy beneath.
- Grayscale-only content blocks: any imagery or chart is desaturated so the frame stays neutral.
- One inline var(--accent) text link per screen at most, underlined, as the sole chromatic event.

## Avoid
- Any brand colour, gradient, glow or tinted background.
- CSS borders where a ring shadow achieves the same containment.
- Display face for body copy or for text under 16px.
- Heavy or dark shadows; keep ambient layers at low alpha.
- Illustrations, mascots or decorative graphics — type and content only.
- Section spacing below var(--section-y-phone).
- More than two uses of var(--accent) on one screen.
