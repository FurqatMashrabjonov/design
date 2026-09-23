# Quiet Luxe — style card
Mood: A calm, expensive phone screen: stone-tinted canvas, white squircle cards floating on soft shadow, one serif headline against a tight grotesk, and a single warm accent used like jewellery.
Colour energy: medium — the accent carries the one primary action, the active tab and one highlight per screen; roughly 8–12% of pixels, never a wash.

## Colour use
- Canvas is var(--bg); cards and sheets are var(--surface); grouped panels inside a card use var(--surface-warm).
- Body text is var(--fg); supporting text var(--fg-2); captions, timestamps and units var(--muted) or var(--meta).
- The accent is var(--accent) with var(--accent-on) on top; pressed is var(--accent-active), hover var(--accent-hover).
- Accent as text is only ever var(--od-accent-text); status text only var(--od-success-text), var(--od-warn-text), var(--od-danger-text).
- Status fills use var(--success), var(--warn), var(--danger) for their literal meaning; chips tint them at low opacity, never fill solid beside the primary button.
- Edges are var(--border-soft); var(--border) only on inputs and the rare divider that must be seen.
- Dark palette (a dark var(--bg)): the same rules hold; depth comes from a faint light edge on cards instead of a shadow, and the accent stays vivid on the dark canvas.

## Type
- Two faces, obviously different: var(--font-display) is a serif for the hero figure and screen titles; var(--font-body) is a grotesk for everything else. Numbers stay in var(--font-body) with tabular figures.
- Hero figure: var(--text-4xl) in var(--font-display), weight 400, line-height var(--leading-tight), tracking var(--tracking-display); its label under it at var(--text-sm) in var(--muted).
- Screen title: var(--text-2xl) in var(--font-display), weight 400. Section heading: var(--text-lg) in var(--font-body), weight 600.
- Body and rows: var(--text-base), weight 400 or 500, line-height var(--leading-body). Meta: var(--text-sm) or var(--text-xs), weight 500.
- Never two adjacent blocks at the same size and weight; the serif appears at most twice per screen.

## Shape and depth
- Cards: var(--radius-lg), no border, var(--elev-raised). Tiles and inputs: var(--radius-md). Chips, segmented controls and buttons: var(--radius-pill).
- Depth comes from air and blur, not lines: a card never has both a shadow and an outline. A sticky bar or sheet is translucent with a blur behind it.
- Icons are 1.75px strokes at 20–22px, sitting in a tinted squircle (the kit's icon button) or on the surface with no container at all — never a grey circle.
- Photos and charts are masked to var(--radius-md); a hero photo bleeds to the gutters, not the screen edge.
- Focus is var(--focus-ring) on every interactive element.

## Layout and density
- Gutter is var(--container-gutter-phone); vertical rhythm between blocks var(--space-4) to var(--space-6); card padding var(--space-5).
- One hero block at the top, then a bento of two-up tiles (the kit's bento grid, one tile spanning the width), then rows. Not a stack of identical cards.
- Rows are at least var(--od-row-min) tall with a trailing value; icon-only controls are 44×44px.
- One filled primary button per screen; secondary actions are ghost or text.

## Signature moves
- The hero figure at var(--text-4xl) in the serif, alone on its line, with the screen breathing around it.
- A bento block: one wide tile with a chart or photo and two square tiles with a single number each.
- The active chip inverts to var(--fg) on var(--bg); everything else stays quiet.
- A progress ring drawn thick, with the number inside it in the serif.
- Press feedback is a colour step to var(--accent-active) over var(--motion-fast); nothing bounces.

## Avoid
- No grey circles behind icons, no 1px card outlines, no 12px corners.
- No second accent hue; no gradient washes over body text; no glow.
- No ALL-CAPS tracked-out labels; no monospace for prices or dates.
- No page of identical medium-sized cards; vary tile, row, number and photo.
- No hairline tab bar at the very bottom edge; the bar floats.
