# Monochrome Athletic Editorial — style card
Mood: A stark black-and-white sports editorial: full-bleed imagery, oversized condensed uppercase headlines, and a UI that stays entirely greyscale so photography carries all colour.
Colour energy: low — accent/brand colour covers under 5% of a screen; the interface is white, near-white grey and near-black, with colour reserved for status only.

## Colour use
- Canvas is var(--bg); secondary surfaces are var(--surface) and var(--surface-warm).
- Text is var(--fg) for titles and primary copy, var(--muted) for supporting copy, prices and metadata, var(--meta) for disabled or tertiary text.
- The only "accent" is var(--accent) (near-black) used as a filled button background, with var(--accent-on) text on top. Hover shifts to var(--accent-hover), press to var(--accent-active).
- Status colour appears only as meaning: var(--danger) for errors, var(--success) for confirmation, var(--warn) for warnings. Never as decoration.
- Dividers and outlines use var(--border) and var(--border-soft). No coloured panels behind UI controls.

## Type
- Display headlines: var(--font-display), uppercase, weight 500, var(--text-3xl) or var(--text-4xl), line-height var(--leading-tight), letter-spacing var(--tracking-display).
- Never set display type below var(--text-xl).
- Section titles: var(--font-display) at var(--text-2xl)/var(--text-xl), weight 500, line-height 1.2.
- Card titles and buttons: var(--font-body) at var(--text-base), weight 500, line-height 1.5.
- Body copy: var(--font-body) at var(--text-base), weight 400, line-height var(--leading-body).
- Captions, prices, timestamps: var(--text-sm) or var(--text-xs), weight 500, line-height 1.5.
- Numeric or code-like values: var(--font-mono).
- Interactive text is always weight 500, never 400.

## Shape and depth
- Buttons and filter chips: fully rounded, var(--radius-pill); minimum height 44px, padding 12px 24px.
- Search fields: var(--radius-lg); other form fields: var(--radius-sm).
- Content containers and cards holding UI: var(--radius-md).
- Photography and product imagery: 0 radius, edge-to-edge, no rounding, no shadow.
- Elevation is flat: var(--elev-flat) by default, var(--elev-ring) or var(--elev-raised) when a boundary is genuinely needed. No drop shadows, no hover lift.
- Focus is always var(--focus-ring).
- Transitions use var(--motion-fast)/var(--motion-base) with var(--ease-standard).

## Layout and density
- 390px screen: 16px side gutters, single column, vertical rhythm on the 4px grid (var(--space-1) to var(--space-8)).
- Section spacing on phone: var(--section-y-phone).
- Grids are tight: 4–12px gaps between tiles (var(--space-1) to var(--space-3)) so the screen feels packed with product.
- Every tappable element is at least 44px tall; icon-only controls get a 48px square hit area.
- Cards stack image first, then metadata with a 12px gap; at most two text levels per card (title + one supporting line).
- Sticky top bar: var(--bg) background, 60px tall, with a dark promotional strip above it using var(--fg) background and var(--accent-on) text at var(--text-xs), weight 500, 8–12px vertical padding.

## Signature moves
- A full-bleed, zero-radius image block at the top of the screen with a dark scrim and an uppercase display headline sitting directly on the photograph.
- A near-black pill button (var(--radius-pill), 44px+ tall, var(--accent) fill, var(--accent-on) label, weight 500) as the single strongest element on the screen.
- A dense two-column tile grid with 4–8px gaps, square unrounded images, and metadata in var(--muted) beneath each tile.
- A dark full-width strip at the very top carrying one line of var(--text-xs) weight-500 text in var(--accent-on).
- Total absence of shadow: separation comes only from var(--surface) fills and 1px var(--border-soft) lines.

## Avoid
- No hex values, no colour outside the tokens above, no tinted UI panels.
- No rounded corners on photography or product imagery.
- No card shadows, glows or hover lift.
- No display type below var(--text-xl), and no lowercase display headlines.
- No weight 400 on buttons, links or chips.
- No decorative dividers beyond a 1px var(--border-soft) line.
- No more than two text levels inside a single card.
- No gradients in the interface; any gradient belongs to imagery only.
