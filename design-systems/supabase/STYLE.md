# Emerald Terminal Dark — style card
Mood: A near-black, code-editor canvas where thin grey borders — not shadows — carve every surface, and one emerald signal cuts through. Engineered, dense, quietly confident.
Colour energy: low — under 10% of a screen carries accent colour; emerald appears at most twice, as a link, a hairline border or a small mark.

## Colour use
- Page canvas is var(--bg); cards, sheets and raised rows sit on var(--surface). Never lighten a primary surface beyond var(--surface).
- Text runs a four-step ramp: var(--fg) for headings and primary values, var(--fg-2) for body and secondary lines, var(--muted) for captions and metadata, var(--meta) for disabled and tertiary labels. Use all four; do not collapse to two.
- Accent is var(--accent), capped at two visible uses per screen. It belongs on links, 1px borders, small marks and the fill of one primary action — never on a background, header band or large panel.
- Interactive green is var(--accent-hover); labels on an emerald fill use var(--accent-on).
- Structure comes from var(--border) for card and divider edges and var(--border-soft) for inner row separators. Both are solid, so their luminance holds on any surface.
- var(--success), var(--warn) and var(--danger) are reserved for state only — never as decoration or section colour.

## Type
- One family for everything: var(--font-display) and var(--font-body) share the same stack. Hierarchy comes from size, not weight.
- Weights: 400 for all prose, headings and values; 500 only for button labels, tab labels and nav items. Never 700.
- Sizes: var(--text-4xl) for a single screen-defining number or headline, var(--text-3xl) for section headings, var(--text-xl) for card titles, var(--text-base) for body, var(--text-sm) for buttons, captions and nav, var(--text-xs) for fine print.
- Line height: var(--leading-tight) on the largest headline so lines stack with no air; var(--leading-body) everywhere else. Tracking stays var(--tracking-display) except card titles, which tighten slightly.
- Technical labels use var(--font-mono) at var(--text-xs), uppercase, with 1.2px letter-spacing, in var(--muted). Use them for one or two small markers per screen, not for body copy.

## Shape and depth
- Radii: var(--radius-pill) for the primary action and for tab indicators, var(--radius-sm) for ghost and secondary controls, var(--radius-md) for cards, var(--radius-lg) for large feature panels. Buttons take pill or var(--radius-sm) only — nothing between.
- Depth is borders, not shadows. Default surfaces carry var(--elev-ring); a card that must separate from the canvas takes var(--elev-raised).
- Focus and selected states use var(--focus-ring) — a 2px emerald-tinted halo.
- Every tappable control is at least 44px tall; pad pill buttons to 44px minimum height with generous horizontal padding.

## Layout and density
- Phone frame 390px wide, 16px side gutters, single column.
- Vertical rhythm between blocks: var(--space-6) inside a group, var(--space-12) between major groups.
- Cards pad var(--space-4) to var(--space-6); inner rows separate with var(--border-soft) hairlines rather than gaps.
- Keep content blocks tight and let the space between them be large — concentrated clusters floating in dark.
- Lists, stat rows and settings rows are full-width with a 1px bottom hairline; no floating rounded list cards.

## Signature moves
- A screen-defining headline or metric set at var(--text-4xl) with var(--leading-tight), sitting directly on var(--bg) with no container.
- One emerald pill action with var(--accent-on) label, paired with a ghost or hairline-bordered secondary of the same height.
- Cards defined by a 1px var(--border) edge and var(--radius-md), with no drop shadow at rest.
- A small uppercase monospace label in var(--muted) above a heading or value, acting as a technical marker.
- A single emerald hairline or 1px accent border marking the one element that matters on the screen.

## Avoid
- No box shadows beyond var(--elev-raised); no soft glows or coloured blur.
- No bold weights, no second typeface, no italic display text.
- No emerald fills on backgrounds, headers, banners or large panels.
- No warm hues as design colour; keep them for state only.
- No radii between var(--radius-sm) and var(--radius-pill) on buttons.
- No light or white page backgrounds, and no gradients across surfaces.
- No letter-spacing tricks on large headlines; density comes from leading, not tracking.
