# Obsidian Precision — style card
Mood: A cold, near-black instrument panel with glassy, physically-lit surfaces and one hot punctuation colour.
Colour energy: low — accent colour appears on roughly 5% of a screen: one stripe, one badge, one error state.

## Colour use
- Screen canvas is var(--bg); cards and sheets sit on var(--surface).
- Text ladder: var(--fg) for headings and values, var(--fg-2) for body, var(--muted) for labels and inactive tabs, var(--meta) for placeholders and timestamps.
- var(--accent) is punctuation only: a single diagonal stripe block, a destructive action, an error badge. Never a full-colour header or background.
- var(--accent-on) for text on an accent fill; var(--accent-hover) and var(--accent-active) for pressed states.
- Status colour is reserved: var(--success), var(--warn), var(--danger) each on their own small badge or inline dot, never as a surface.
- Containment comes from var(--border) on cards and var(--border-soft) between rows inside a card.
- Focus and selection use var(--focus-ring), not the accent.

## Type
- Everything is var(--font-display) / var(--font-body); var(--font-mono) only for code, IDs, amounts in a terminal-like readout.
- Body copy at var(--text-base), weight 500, line-height var(--leading-body), letter-spacing +0.2px. Never weight 400 for body.
- Screen title at var(--text-2xl), weight 500, letter-spacing +0.2px.
- One hero number or headline per screen may reach var(--text-3xl), weight 600, line-height var(--leading-tight), letter-spacing var(--tracking-display).
- Section sub-headings at var(--text-xl), weight 500, line-height var(--leading-body).
- Labels and metadata at var(--text-sm), weight 500; badges and micro-labels at var(--text-xs), weight 600, uppercase optional.
- Buttons at var(--text-base), weight 600, letter-spacing +0.3px.

## Shape and depth
- Primary action: pill, var(--radius-pill), min-height 48px, filled with var(--accent) and var(--accent-on) text, or a translucent white fill with dark text.
- Secondary action: var(--radius-sm), min-height 44px, transparent fill, 1px var(--border) outline.
- Cards: var(--radius-md); large feature panels: var(--radius-lg).
- Depth is layered, never a single flat drop shadow: use var(--elev-ring) for contained cards and var(--elev-raised) for anything that should read as a raised physical key.
- Inset top highlight plus inset bottom dark is mandatory on any pressable surface; var(--elev-flat) only for the canvas itself.
- Inputs: var(--radius-sm), var(--bg) fill, 1px var(--border); on focus add var(--focus-ring).

## Layout and density
- 390px screen, var(--container-gutter-phone) side padding, single column.
- Vertical rhythm between blocks: var(--space-8) to var(--space-12); inside a card var(--space-4) to var(--space-6).
- Related items sit var(--space-2) to var(--space-4) apart; list rows are separated by 1px var(--border-soft), not by gaps.
- Cards are information-dense; the space around them is generous. Keep at least var(--space-8) of empty canvas above the first card.
- Every tappable row and button is at least 44px tall; icon-only controls get a 44px square hit area.

## Signature moves
- A single diagonal stripe block in var(--accent) as the only saturated element on the screen.
- Cards that read as glass: var(--surface) fill, var(--border) hairline, plus the double-ring var(--elev-ring) so the card looks inset into the void.
- Pressable surfaces carrying both an inset white top highlight and an inset dark bottom, so buttons look physically raised.
- Positive letter-spacing (+0.2px) on all body text at weight 500 — airy text on a very dark field.
- Hover/press feedback by opacity change over var(--motion-fast) with var(--ease-standard), not by swapping fill colour.

## Avoid
- Pure black backgrounds; the canvas must stay blue-cold via var(--bg).
- Negative letter-spacing anywhere, or weight 400 body text.
- Single-layer flat shadows, or shadows without an inset companion.
- Spreading var(--accent) across headers, tab bars or large fills; it stays a punctuation colour.
- Warm-toned borders or surfaces mixed with the cool grey border palette.
- Decorative gradients or colourful backgrounds behind content.
- Controls shorter than 44px.
