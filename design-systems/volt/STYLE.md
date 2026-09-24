# Electric Sport — style card
Mood: Dark and loud: a black canvas, one electric-lime accent used as a fill with black text on it, condensed heavy italic upper-case headlines like a training poster, and huge figures.
Colour energy: high — the lime fills the start card, the primary button, the active tab and one bar; roughly 15–25% of pixels, one hue only.

## Colour use
- Canvas is var(--bg); cards and tiles are var(--surface); a pressed or nested panel is var(--surface-warm).
- Body text is var(--fg); supporting text var(--fg-2); captions, timestamps and units var(--muted) or var(--meta).
- The accent is var(--accent) and is a fill: the start card, the primary button, the active tab, the one highlighted bar. Text on it is var(--accent-on), near-black.
- Accent as text is only ever var(--od-accent-text) — a figure's unit, a live dot, a delta; status text only var(--od-success-text), var(--od-warn-text), var(--od-danger-text).
- Every card edge is var(--border); a divider inside a card is var(--border-soft). No drop shadows.
- Other bars and inactive cells are var(--surface-warm), so the one lime bar is the only bright one.
- Light palette (a light var(--bg)): the same rules hold; the lime darkens to stay a signal and headlines keep their italic.

## Type
- Headlines and hero figures are var(--font-display): weight 800, line-height var(--leading-tight). Headlines are italic and upper-case; figures are upright.
- Hero figure: var(--text-3xl) or var(--text-4xl), with its unit in var(--font-body) at var(--text-lg) in var(--muted) beside it.
- Screen title: var(--text-2xl), italic, upper-case. Section heading: var(--text-lg) in var(--font-display), weight 700, upper-case.
- Body and rows: var(--text-base) in var(--font-body), weight 500. Labels under figures: var(--text-sm), weight 500, sentence case, in var(--muted).
- Upper-case belongs to the condensed headlines only; small labels stay sentence case.

## Shape and depth
- Cards: var(--radius-lg) with a var(--border) hairline and var(--elev-raised). Tiles and inputs: var(--radius-md). Buttons and chips: var(--radius-pill).
- Depth is a step in surface plus a one-pixel light edge; never a drop shadow, never a blur on a card.
- Icons are 2px strokes at 20–22px, bare or in a var(--radius-sm) tile of var(--surface-warm); the active tab's icon is var(--accent).
- Photos are dark and high-contrast, masked to var(--radius-lg), with the headline set over a black gradient.
- Focus is var(--focus-ring) on every interactive element.

## Layout and density
- Gutter is var(--container-gutter-phone); vertical rhythm var(--space-4) to var(--space-5); card padding var(--space-4) to var(--space-5).
- Rows are at least var(--od-row-min) tall with a trailing figure; icon-only controls are 44×44px.
- One lime fill per section; never two lime blocks side by side.
- The bar is opaque and edge to edge.

## Signature moves
- A lime start card: an italic upper-case action ("START RUN") in var(--accent-on) with a round black play button on it.
- A hero figure in the condensed face at var(--text-4xl) with a small muted unit beside it.
- A bar chart in var(--surface-warm) where only today's bar is var(--accent).
- A row of three stat tiles, each one condensed figure and one label.
- Press feedback is a step to var(--accent-active) with var(--ease-spring); nothing else animates.

## Avoid
- No second accent hue; no gradients on text; no glow.
- No white text on the lime.
- No drop shadows; no blurred cards; no floating rounded bar.
- No small tracked-out upper-case labels; upper-case is for the condensed headlines.
- No serif; no monospace for figures.
