# Warm Editorial Cream — style card
Mood: Warm cream paper surfaces with warm near-black ink, compressed gothic headlines against literary serif body text, and a single urgent orange accent. Feels like a premium print publication rendered on a phone.
Colour energy: low — accent colour touches under 5% of a screen: one primary action, one active link, one status dot. Everything else is cream, warm ink and warm-brown hairlines.

## Colour use
- Screen background is var(--bg); cards, sheets and grouped rows sit on var(--surface) or var(--surface-warm).
- Body and heading text is var(--fg); secondary copy is var(--fg-2); labels and metadata drop to var(--muted) and var(--meta).
- Hairlines and dividers are 1px var(--border); use var(--border-soft) for inner row separators so lists read as one block.
- var(--accent) is reserved for the single primary action per screen, active tab text, and inline links. Text on it is var(--accent-on).
- Status only: var(--success), var(--warn), var(--danger). Never tint large areas with them.
- No pure white and no pure black surfaces; every neutral stays warm-shifted.

## Type
- Display and UI text use var(--font-display) at weight 400 only — hierarchy comes from size and tracking, never from bolding.
- Headings: var(--text-3xl) with letter-spacing var(--tracking-display) and line-height var(--leading-tight); step down to var(--text-2xl), var(--text-xl), var(--text-lg) keeping the negative tracking proportional to size.
- Body and long-form copy use var(--font-body) at var(--text-base) or var(--text-sm), line-height var(--leading-body).
- Numerals, codes, IDs and technical labels use var(--font-mono) at var(--text-xs) or var(--text-sm).
- Buttons and captions use var(--font-display) at var(--text-sm); micro labels at var(--text-xs) in uppercase with 0.05em tracking.
- Never set display type below var(--text-lg); never set serif body below var(--text-sm).

## Shape and depth
- Default radius for buttons, cards, inputs and images is var(--radius-sm); featured containers use var(--radius-md) or var(--radius-lg).
- Tags, filters and status chips are var(--radius-pill) with 8px horizontal padding and a minimum 44px touch height.
- Resting depth is var(--elev-flat) plus a 1px var(--border) ring; only modals and popovers get var(--elev-raised).
- Focus and press feedback uses var(--focus-ring), never a coloured outline.
- Transitions: colour var(--motion-fast) var(--ease-standard), elevation var(--motion-base) var(--ease-standard).

## Layout and density
- 390px wide, single column, 12px side gutters; content blocks separated by var(--space-6) or var(--space-8).
- Screen top padding var(--section-y-phone); group related rows into one var(--surface) block with var(--border) hairline separators instead of many floating cards.
- Every tappable row, chip and button is at least 44px tall; icon-only controls are 44x44px.
- Lists are dense: 12–16px vertical padding per row, 11–14px label text, one line of secondary text maximum.
- Alternate var(--bg) and var(--surface) bands to separate sections; do not draw heavy rules.

## Signature moves
- A single var(--accent) filled button per screen, var(--radius-sm), var(--text-sm) label, with the rest of the actions as flat cream surfaces.
- Warm-brown hairline rings at 1px var(--border) on every card and image, so nothing floats without an edge.
- Compressed gothic headline at var(--text-3xl) with var(--tracking-display) sitting directly above serif body copy at var(--text-base) — the gothic/serif pairing is the tell.
- Pill chips in var(--surface) with var(--muted) text for filters, and one chip switched to var(--accent) with var(--accent-on) text when active.
- Mono type at var(--text-xs) for timestamps, counts and IDs, set in var(--meta) so it reads as annotation.

## Avoid
- Pure white backgrounds, pure black text, cool grey neutrals, blue focus rings.
- Bold or heavy display weights; weight 700 anywhere except system-level micro labels.
- Accent colour on more than one primary action, or as a large background fill.
- Hard drop shadows, thick borders, gradients, glassmorphism, neon glows.
- More than three type families on one screen; more than two radii sizes per screen.
