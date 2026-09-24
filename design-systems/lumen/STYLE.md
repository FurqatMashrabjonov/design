# Liquid Glass — style card
Mood: A phone screen made of two layers — quiet opaque content, and controls that float above it in blurred glass. Cool light neutrals, one blue accent, corners that nest inside each other.
Colour energy: medium — the accent carries the primary action, the active tab and links; roughly 8–12% of pixels, never a wash.

## Colour use
- Canvas is var(--bg); cards and sheets are var(--surface); grouped panels inside a card use var(--surface-warm).
- Body text is var(--fg); supporting text var(--fg-2); captions, timestamps and units var(--muted) or var(--meta).
- The accent is var(--accent) with var(--accent-on) on top; pressed is var(--accent-active), hover var(--accent-hover).
- Accent as text is only ever var(--od-accent-text); status text only var(--od-success-text), var(--od-warn-text), var(--od-danger-text).
- Status fills use var(--success), var(--warn), var(--danger) for their literal meaning; chips tint them at low opacity, never fill solid beside the primary button.
- Edges are var(--border-soft); var(--border) on inputs and on a glass control that needs to separate from what is behind it.
- Dark palette (a dark var(--bg)): the same rules hold; glass becomes a dark tint with a faint light edge, and the accent stays vivid on the dark canvas.

## Type
- One face everywhere: var(--font-body) and var(--font-display) are the same family. The hero is weight 700 and var(--tracking-display), never a second typeface.
- Hero figure: var(--text-3xl) or var(--text-4xl), weight 700, line-height var(--leading-tight); its label under it at var(--text-sm) in var(--muted).
- Screen title: var(--text-2xl), weight 700, tracking var(--tracking-display). Section heading: var(--text-lg), weight 600.
- Body and rows: var(--text-base), weight 400 or 500, line-height var(--leading-body). Meta: var(--text-sm) or var(--text-xs), weight 500.
- Figures, prices and times use tabular numerals; never a monospace face.

## Shape and depth
- Cards: var(--radius-lg) with a var(--border-soft) hairline and var(--elev-raised). Tiles and inputs: var(--radius-md). Chips, segmented controls and buttons: var(--radius-pill).
- Corners are concentric: a control inside a card uses the card's radius minus the card's padding, so var(--radius-sm) inside a var(--radius-lg) card.
- Glass belongs to the control layer only — the bottom bar, a sticky header, a sheet, a floating button — with backdrop-filter var(--od-blur) over a translucent var(--surface). Content cards are opaque: never blur one, and never put glass on glass.
- Icons are 2px strokes at 20–22px, bare on the surface or in a round tinted chip; never a grey square.
- Photos and charts are masked to var(--radius-md); a hero photo bleeds to the gutters, not the screen edge.
- Focus is var(--focus-ring) on every interactive element.

## Layout and density
- Gutter is var(--container-gutter-phone); vertical rhythm between blocks var(--space-4) to var(--space-6); card padding var(--space-5).
- Content scrolls under the floating bar rather than stopping short of it, so the last block ends with clearance, not a hard edge.
- Rows are at least var(--od-row-min) tall with a trailing value; icon-only controls are 44×44px.
- One filled primary button per screen; secondary actions are glass, ghost or text.

## Signature moves
- The floating glass tab bar, rounded and inset from the screen edge, with content visibly passing under it.
- A sticky header that is transparent at the top of the scroll and turns to glass once content moves beneath it.
- A hero figure at var(--text-3xl) in weight 700 with tight tracking, alone on its line.
- A glass sheet rising from the bottom over dimmed content, its corners matching the screen's.
- Press feedback is a colour step to var(--accent-active) over var(--motion-fast); glass controls settle with var(--ease-spring).

## Avoid
- No blurred content cards; glass is for controls, and never over glass.
- No second typeface; the hero is weight and tracking.
- No second accent hue; no gradient washes over body text; no glow.
- No ALL-CAPS tracked-out labels; no monospace for prices or dates.
- No hairline tab bar pinned to the very bottom edge; the bar floats and is inset.
