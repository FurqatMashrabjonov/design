# Soft Tonal — style card
Mood: Friendly and energetic: one warm coral and its tints used as surfaces, neutral ink everywhere else, one heavy geometric sans, big soft corners, and an encouraging voice.
Colour energy: high — the coral fills the hero card, the chart and the active tab; roughly 20–30% of pixels, always one hue.

## Colour use
- Canvas is var(--bg); cards and tiles are var(--surface) with no border; the one encouraging panel on a screen is var(--surface-warm).
- Body text is var(--fg); supporting text var(--fg-2); captions, timestamps and units var(--muted) or var(--meta).
- The accent is var(--accent) and is used as a fill: the hero card, the primary button, the active tab. Text on it is var(--accent-on), which is dark — never white on the coral.
- Every other shade of the accent is a tint of it: color-mix(in oklab, var(--accent), var(--surface) N%) for bars, grid cells and chips. There is no second hue.
- Accent as text is only ever var(--od-accent-text); status text only var(--od-success-text), var(--od-warn-text), var(--od-danger-text).
- Status fills use var(--success), var(--warn), var(--danger) for their literal meaning, small.
- Dark palette (a dark var(--bg)): the same rules hold; cards step up from the canvas, and the coral stays the one fill.

## Type
- One face everywhere: var(--font-body) and var(--font-display) are the same family.
- Hero figure: var(--text-3xl) or var(--text-4xl), weight 800, line-height var(--leading-tight), tracking var(--tracking-display); a small unit beside it at var(--text-lg) weight 700.
- Screen title: var(--text-2xl), weight 800, tracking var(--tracking-display). Section heading: var(--text-lg), weight 700.
- Body and rows: var(--text-base), weight 500. Meta: var(--text-sm), weight 500, in var(--muted).
- Tile figures: var(--text-xl), weight 800, tabular numerals, with a one-line label under them.

## Shape and depth
- Cards: var(--radius-lg), no border, no shadow — they separate by tone. Tiles and inputs: var(--radius-md). Chips, segmented controls, buttons and the tab bar: var(--radius-pill).
- Icons are 2px strokes at 20px, sitting in a white circle (var(--bg)) on a grey card, or in a coral-tinted circle.
- A segmented control is a grey track with the active segment as a white pill.
- Photos are masked to var(--radius-lg).
- Focus is var(--focus-ring) on every interactive element.

## Layout and density
- Gutter is var(--container-gutter-phone); vertical rhythm between blocks var(--space-5) to var(--space-6); card padding var(--space-5).
- Rows are at least var(--od-row-min) tall; icon-only controls are 44×44px.
- One filled coral button per screen; secondary actions are grey pills or text.
- The bar floats, inset from the edges; content passes under it.

## Signature moves
- A hero card filled in var(--accent): a small label with an icon, one ExtraBold figure with its unit, and a tinted chip for the change or the record.
- A bar chart where every bar is a tint of the accent and only the current one is solid.
- An activity grid of round cells in accent tints, today ringed.
- A peach var(--surface-warm) panel with an illustration or sticker and two lines of encouragement.
- Press feedback is a colour step to var(--accent-active); the sticker and the active tab settle with var(--ease-spring).

## Avoid
- No second accent hue; blue, green and purple appear only as small status or icon marks.
- No white text on the coral.
- No card borders and no drop shadows; tone does the separating.
- No ALL-CAPS tracked-out labels; no monospace for figures; no serif.
- No sharp corners anywhere.
