# Dense Hairline Utility — style card
Mood: Engineered, flat, and information-first. White panes separated by hairline borders, with colour reserved for state and action.
Colour energy: low — under 10% of a screen carries accent or semantic colour; the rest is white, ink, and gray hairlines.

## Colour use
- Canvas is var(--bg); secondary panels, input fills, and header strips use var(--surface).
- Text is var(--fg) for primary, var(--muted) for captions, metadata, and secondary lines.
- Every pane, row, and control is outlined with 1px var(--border); inner dividers inside a panel use var(--border-soft).
- var(--accent) is for links, primary actions, and focus only; pressed state is var(--accent-hover).
- Semantic colour is state, not decoration: var(--success) for positive/complete, var(--danger) for destructive or error, var(--warn) for caution text.
- Never tint the page background; never use gradients or coloured surfaces beyond a small status pill.

## Type
- One family for all UI: var(--font-body). Code, IDs, and numeric strings use var(--font-mono).
- Body and default UI text is var(--text-sm) at weight 400, line-height var(--leading-body). Never 16px body.
- Captions and metadata are var(--text-xs) at weight 400.
- Panel headers are var(--text-lg) weight 600; section headings var(--text-xl) weight 600; screen titles var(--text-2xl) weight 600.
- Only the largest display size (var(--text-4xl)) takes var(--tracking-display); all other sizes use normal tracking.
- Headings use var(--leading-tight). Weights are binary: 400 or 600, nothing between.

## Shape and depth
- Radius is var(--radius-sm) on every button, input, card, and panel. Pills and status badges use var(--radius-pill).
- Depth comes from 1px var(--border) outlines, not shadows. Default elevation is var(--elev-flat).
- var(--elev-raised) is allowed only on a floating overlay or menu, never on a list row or card.
- Focus is always var(--focus-ring) on the focused control, with the border switching to var(--accent).

## Layout and density
- 4px grid: gaps and paddings come from var(--space-1) through var(--space-8); screen gutters are var(--space-4).
- List rows are 16px horizontal and 12px vertical padding, separated by 1px var(--border-soft); pack rows tightly so many fit per screen.
- Cards use a var(--surface) header strip with a bottom border, then a var(--bg) body at var(--space-4) padding.
- Section rhythm on phone is var(--section-y-phone) between major blocks.
- All tappable controls are at least 44px tall, including icon-only buttons and row actions.
- Motion is minimal: var(--motion-fast) for hover/press, var(--motion-base) with var(--ease-standard) for overlays. No entrance animation.

## Signature moves
- A full-width row list where each row is a hairline-bordered rectangle with a leading status pill and a trailing muted timestamp.
- A status pill in var(--radius-pill) carrying a single semantic colour (var(--success), var(--danger), var(--warn), or var(--muted)) with white text at var(--text-xs) weight 600.
- A panel whose header strip is var(--surface) with a bottom border and whose body is var(--bg), both at var(--radius-sm).
- Monospace var(--font-mono) at var(--text-xs) for identifiers, counts, and code-like values, set inline against sans body text.
- A primary action button in var(--accent) with var(--accent-on) text, 1px var(--border), var(--radius-sm), and a 44px minimum height.

## Avoid
- No shadows on cards, rows, or buttons; no elevation beyond var(--elev-raised) on overlays.
- No large rounded corners: nothing above var(--radius-lg), and never on a control.
- No 16px body text, no weight 500 or 700, no webfonts.
- No decorative colour, gradients, illustrations, or tinted backgrounds.
- No generous whitespace between rows; density is the point.
- No animation beyond the two motion tokens.
