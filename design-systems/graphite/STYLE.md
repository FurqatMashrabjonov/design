# Instrument Dark — style card
Mood: A precise dark instrument. Stepped neutral surfaces, hairlines instead of shadow, a dense scale, figures set in a mono face, and one amber signal used like a dial marking.
Colour energy: low — the amber carries the primary action and one figure per screen; roughly 4–8% of pixels, never a wash.

## Colour use
- Canvas is var(--bg); cards and sheets are var(--surface); grouped panels and hover rows use var(--surface-warm).
- Body text is var(--fg); supporting text var(--fg-2); captions, timestamps and units var(--muted) or var(--meta).
- The accent is var(--accent) with var(--accent-on) on top; pressed is var(--accent-active), hover var(--accent-hover).
- Accent as text is only ever var(--od-accent-text); status text only var(--od-success-text), var(--od-warn-text), var(--od-danger-text).
- Status fills use var(--success), var(--warn), var(--danger) for their literal meaning; a change or a delta takes its colour from the status tokens, never from the accent.
- Every edge is var(--border); var(--border-soft) for a divider inside a card. A card has a hairline, not a shadow.
- Light palette (a light var(--bg)): the same rules hold; the hairline stays and the amber darkens so it still reads as a signal.

## Type
- One face for text: var(--font-body). Figures — prices, times, counts, IDs, deltas, percentages — are var(--font-mono) with tabular figures.
- Hero figure: var(--text-3xl) or var(--text-4xl) in var(--font-mono), weight 500, line-height var(--leading-tight); its label under it at var(--text-xs) in var(--muted).
- Screen title: var(--text-xl), weight 600. Section heading: var(--text-sm), weight 600, in var(--muted).
- Body and rows: var(--text-base), weight 400 or 450. Meta: var(--text-xs), weight 450.
- Labels stay sentence case; the density does the work, not capitals.

## Shape and depth
- Cards: var(--radius-lg) with a var(--border) hairline and var(--elev-raised). Tiles and inputs: var(--radius-md). Chips and small controls: var(--radius-sm). Only a switch or an avatar is fully round.
- Depth is a step in surface plus a one-pixel light edge along the top. Never a drop shadow, never a blur on a card.
- Icons are 1.5px strokes at 18–20px, bare on the surface or in a var(--radius-sm) tile of var(--surface-warm); never a round grey blob.
- Photos and charts are masked to var(--radius-md); a chart draws its grid in var(--border-soft).
- Focus is var(--focus-ring) on every interactive element.

## Layout and density
- Gutter is var(--container-gutter-phone); vertical rhythm between blocks var(--space-4) to var(--space-5); card padding var(--space-4).
- Rows are var(--od-row-min) tall with a trailing figure in the mono face; icon-only controls still take 44×44px of hit area.
- More rows per screen than a consumer app would use: this system is read, not browsed.
- One filled amber button per screen; secondary actions are an outline in var(--border) or plain text.

## Signature moves
- A column of figures in the mono face, right-aligned, every decimal point in line.
- A dense row: label, one line of meta, a trailing figure, and a delta in a status colour.
- A hero figure in mono with a small amber unit or delta beside it.
- A compact two-up grid of small stat tiles, each one number and one label, separated by hairlines.
- Press feedback is a step to var(--surface-warm) over var(--motion-fast); nothing bounces or overshoots.

## Avoid
- No drop shadows; on this canvas they are invisible and the card looks unattached.
- No floating rounded bottom bar; the bar is part of the chassis, opaque and edge to edge.
- No blur on content; no glassy panels.
- No amber on large surfaces; it is a signal, not a background.
- No ALL-CAPS tracked-out labels; no serif.
