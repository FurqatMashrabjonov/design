# Warm Retro Print — style card
Mood: Sun-bleached paper warmth with hard offset shadows and monospace display type, like a vintage printed poster brought to a phone screen.
Colour energy: medium — accent colour appears on primary actions, active states, and small meta labels; most of the screen stays in warm cream and off-white surfaces.

## Colour use
- Screen background is var(--bg); cards and sheets sit on var(--surface) or var(--surface-warm).
- var(--accent) is the single action colour: filled buttons, active tab indicators, selected chips, progress fills. Text on it is var(--accent-on).
- Body copy is var(--fg); secondary copy is var(--fg-2); timestamps, captions and helper text are var(--muted).
- Small uppercase meta labels (section tags, counts, status) use var(--meta).
- Status colours are reserved: var(--success), var(--warn), var(--danger) only for state, never decoration.
- Dividers and card outlines use var(--border); softer internal separators use var(--border-soft).

## Type
- Display and headings: var(--font-display), weights 700–900, sizes var(--text-2xl) to var(--text-4xl), line-height var(--leading-tight), tracking var(--tracking-display).
- Body and UI labels: var(--font-body), weight 400–600, var(--text-base) with line-height var(--leading-body).
- Numerals, codes and short data strings: var(--font-mono) at var(--text-sm) or var(--text-xs).
- Meta labels: var(--text-xs), uppercase, weight 700, letter-spacing 0.08em.
- Minimum readable size on screen is var(--text-xs); never set body copy below var(--text-sm).

## Shape and depth
- Radii stay small: var(--radius-sm) for chips and inputs, var(--radius-md) for buttons and cards, var(--radius-lg) for sheets and modals. var(--radius-pill) only for avatars and toggle tracks.
- Default depth is var(--elev-flat) or var(--elev-ring); raised elements use var(--elev-raised), a hard offset shadow with no blur.
- Focus is always var(--focus-ring), a 4px translucent accent ring, on every interactive element.
- Transitions use var(--motion-fast) for state changes and var(--motion-base) for entrances, easing var(--ease-standard).

## Layout and density
- Phone gutter is var(--container-gutter-phone); vertical rhythm between blocks is var(--space-4) to var(--space-6), with var(--space-8) before a new major group.
- Screen padding follows var(--section-y-phone) at the top and bottom of scrollable content.
- Every tappable control is at least 44px tall; buttons use var(--space-4) vertical padding with var(--text-base) labels.
- One primary action per screen region; secondary actions are outlined with var(--border) on var(--surface).
- Lists are single-column with var(--space-3) between rows and a var(--border-soft) divider.

## Signature moves
- Hard offset shadow: raised cards and primary buttons carry var(--elev-raised), a solid 6px/6px shadow with zero blur.
- Monospace display headlines: screen titles set in var(--font-display) at var(--text-2xl) or larger, weight 800, tight leading.
- Uppercase accent meta labels: small var(--meta) text in var(--text-xs), weight 700, 0.08em tracking, above each content block.
- Warm paper palette: var(--bg) behind var(--surface) cards, with var(--border) outlines instead of grey shadows.
- Accent-only interaction: var(--accent) appears on the primary button, the active tab, and the focus ring, nowhere else.

## Avoid
- No large flat areas of var(--accent); keep it to controls and small labels.
- No blurred or soft drop shadows; depth is either flat, a 1px ring, or the hard offset shadow.
- No large corner radii on cards or buttons; var(--radius-pill) is for avatars and toggles only.
- No cool greys or pure white screens; backgrounds stay in the warm cream range.
- No more than two type families on one screen, and no body copy below var(--text-sm).
- No decorative texture or pattern that lowers text contrast against var(--surface).
