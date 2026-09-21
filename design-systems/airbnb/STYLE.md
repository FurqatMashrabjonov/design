# Coral Accent Editorial — style card
Mood: Pristine white canvas where full-bleed photography carries the screen and a single coral accent marks the one action that matters. Calm, confident, magazine-like.
Colour energy: low — under 10% of a screen carries accent colour; one coral element per screen, everything else grayscale on white.

## Colour use
- Backgrounds and cards: var(--bg) and var(--surface); use var(--surface-warm) for recessed blocks and map wrappers.
- Text: var(--fg) for ~90% of all copy including headings, labels and prices; var(--fg-2) for focused input text; var(--muted) for secondary lines; var(--meta) for disabled and low-priority metadata.
- Dividers and card edges: 1px var(--border); softer internal rules use var(--border-soft).
- Accent: var(--accent) only on the primary action button, the active tab indicator, and one emphasis figure. Pressed state var(--accent-active), hover var(--accent-hover). Accent text always var(--accent-on).
- Status: var(--success), var(--warn), var(--danger) for inline state only, never as fills.
- Never introduce a second accent hue; no gradient surfaces.

## Type
- One family for everything: var(--font-display) for headings, var(--font-body) for copy; var(--font-mono) only for numeric codes.
- Body weight is 500, not 400. Headings 600–700.
- Screen title: var(--text-2xl) at 700, leading var(--leading-tight).
- Section heading: var(--text-xl) at 500, tracking -0.44px.
- Card title: var(--text-lg) at 600, leading var(--leading-tight).
- Body and button labels: var(--text-base) at 500, leading var(--leading-body).
- Metadata and links: var(--text-sm) at 500; small captions var(--text-xs) at 400.
- Display sizes 20px and above take var(--tracking-display); body stays at 0.
- Sentence case everywhere; the only uppercase is a 12px 700 badge label.

## Shape and depth
- Photography and content containers: var(--radius-md); large hero frames and primary buttons: var(--radius-lg); search field and chips: var(--radius-pill).
- Every icon-only control is a circle at 50% radius, 44px minimum diameter.
- Cards sit flat: var(--elev-flat). Separation comes from whitespace and var(--elev-ring) hairlines.
- Floating panels and sheets use var(--elev-raised), the stacked three-layer lift.
- Focused controls: var(--focus-ring). Circular controls over photography add a 4px white ring.
- Pressed controls scale to 0.92 over var(--motion-fast) with var(--ease-standard).

## Layout and density
- Screen gutter: 16px; between cards: 24px; inside cards: 24px.
- Stack related text rows at 4–8px so a title, subtitle and price read as one unit.
- Images: 4:3 for grid tiles, 16:9 for feature frames, 1:1 for avatars, all with var(--radius-md) or var(--radius-lg).
- No text overlaid on photography — captions sit below the image.
- Vertical rhythm between blocks: 32px.
- Bottom-fixed tab bar with 24px icons above 12px labels; active tab tinted var(--accent).
- Sticky bottom action bar holds a price label on the left and one var(--accent) pill button on the right.
- All touch targets 44px tall or more.

## Signature moves
- A single var(--accent) pill button per screen as the only saturated element.
- Full-bleed 4:3 photography with var(--radius-md) corners, no shadow, no scrim, no overlay text.
- A three-tab picker where each tab is a small illustrated icon above a var(--text-base) 500 label, active tab marked by a 2px var(--fg) underline.
- Circular 44px icon buttons floating over imagery, each ringed with a 4px white separator.
- A centered oversized rating figure at var(--text-3xl) 700 flanked by two small decorative marks, sitting directly on var(--bg) with no container.

## Avoid
- No second accent colour, no gradient fills, no coloured section backgrounds.
- No drop shadows on content cards.
- No text placed inside or on top of photographs.
- No 400-weight body copy.
- No square or rounded-rectangle icon buttons — icon-only controls are always circles.
- No all-caps labels except a 12px 700 badge.
- No mixing a second typeface into headings.
