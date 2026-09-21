# Midnight Precision — style card
Mood: Near-black, precise, quietly technical. Surfaces read as a lit ladder of dark greys, separated by hairline light rather than shadow.
Colour energy: low — accent colour appears only on one primary action, focus rings and small status dots; the rest of a screen is greys on near-black.

## Colour use
- Screen background is var(--bg); every card, row and panel sits on var(--surface) or var(--surface-warm).
- Text: var(--fg) for titles and values, var(--fg-2) for body, var(--muted) for secondary labels, var(--meta) for timestamps and counts.
- var(--accent) is reserved for the single primary action per screen, the focus ring, and one small emphasis mark. Never fill a whole section with it.
- Status only via var(--success), var(--warn), var(--danger), each as a small dot or a 15%-opacity tinted chip with the semantic colour as text.
- Borders are always var(--border) or var(--border-soft); var(--border-strong) only on the focused or selected element.

## Type
- Everything is var(--font-display) / var(--font-body) at weights 400, 500, 600. Headings 600 with var(--tracking-display).
- Body copy at var(--text-sm) with var(--leading-body); dense list rows and metadata at var(--text-xs).
- Screen titles at var(--text-xl) or var(--text-2xl), var(--leading-tight).
- Numerals, codes, IDs and any figure that should align use var(--font-mono) at 500.
- Secondary labels: var(--text-xs), weight 500, colour var(--muted).

## Shape and depth
- Radii: var(--radius-sm) on buttons, inputs and chips; var(--radius-md) on cards and list groups; var(--radius-lg) on sheets and large panels; var(--radius-pill) on status pills only.
- Depth comes from the surface ladder plus 1px borders. Use var(--elev-raised) on raised cards and var(--elev-ring) on flat ones. No large drop shadows anywhere.
- Every control is at least 44px tall; primary buttons keep var(--radius-sm) and full-width on phone.
- Focus state is var(--focus-ring) on the focused control, nothing else.

## Layout and density
- 390px wide, 16px side gutters, 4px spacing grid: var(--space-2) inside chips, var(--space-3) between list rows, var(--space-4) between blocks, var(--space-6) between sections.
- List rows: leading status mark, title in var(--fg), right-aligned metadata in var(--meta) at var(--text-xs).
- Group related rows into one var(--surface) card with var(--radius-md) and hairline dividers instead of separate floating cards.
- Keep 40px of vertical breathing room above the first block and below the last; screens stay dense but never crowded.

## Signature moves
- A three-step dark surface ladder (var(--bg) → var(--surface) → var(--surface-warm)) where each step is separated by a 1px var(--border) hairline, never by a shadow.
- Raised cards carry var(--elev-raised): a 1px inset top highlight plus a hairline ring, so surfaces look lit from above.
- Exactly one var(--accent) filled action per screen, with white label text at var(--text-sm) weight 600.
- Monospaced var(--font-mono) numerals for any metric, count or code, set against Inter labels.
- Small bordered chips at var(--text-xs) for status and metadata, tinted with a semantic colour at 15% opacity.

## Avoid
- No pure white or light backgrounds; no second accent hue.
- No large drop shadows, no blurred glows behind cards, no gradients on surfaces.
- No emoji, no filled or heavy icons, no icon larger than 24px.
- No radius above var(--radius-lg) except status pills.
- No control shorter than 44px, no body text below var(--text-xs).
