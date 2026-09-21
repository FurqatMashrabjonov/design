# Precision Dark Indigo — style card
Mood: Near-black, engineered calm. Content emerges from darkness through luminance steps and whisper-thin light borders, with one cool indigo accent.
Colour energy: low — under 10% of a screen carries accent; the rest is near-black surfaces and grayscale text.

## Colour use
- Screen canvas is var(--bg); panels sit on var(--surface); raised cards use var(--surface) with a var(--border) hairline.
- Text ladder: var(--fg) for primary, var(--fg-2) for body, var(--muted) for placeholders and metadata, var(--meta) for timestamps and disabled.
- var(--accent) fills only primary CTAs and selected states; var(--accent-hover) on press-hover, var(--accent-active) on press, var(--accent-on) for text on accent.
- var(--success), var(--warn), var(--danger) only for status dots and small badges, never as fills.
- Dividers are var(--border-soft); card and input outlines are var(--border). Never a solid dark border on dark.

## Type
- One family for everything: var(--font-display) / var(--font-body); var(--font-mono) only for code, IDs and numeric readouts.
- Weights: 400 reading, 510 default emphasis and UI labels, 590 strong emphasis. Never 700.
- Sizes: var(--text-xs) micro labels, var(--text-sm) captions, var(--text-base) body, var(--text-lg) intro, var(--text-xl) card titles, var(--text-2xl) screen titles, var(--text-3xl) large display, var(--text-4xl) maximum display.
- Line height var(--leading-body) for body; var(--leading-tight) for anything at var(--text-2xl) and above.
- Negative tracking on display only: var(--tracking-display) at var(--text-3xl) and var(--text-4xl); normal tracking at var(--text-base) and below.
- Sentence case for titles and buttons; uppercase only for var(--text-xs) overlines.

## Shape and depth
- Radii: var(--radius-sm) buttons and inputs, var(--radius-md) cards, var(--radius-lg) panels and sheets, var(--radius-pill) chips and filters.
- Depth comes from luminance stepping, not shadow: var(--elev-flat) on canvas, var(--elev-ring) on cards, var(--elev-raised) on floating menus and sheets.
- Focus is always var(--focus-ring); never remove it.
- Transitions use var(--motion-fast) for state changes and var(--motion-base) for sheets, both on var(--ease-standard).

## Layout and density
- 390px screen, var(--container-gutter-phone) side padding, 12px between stacked cards, var(--space-6) between groups, var(--space-8) above a new section.
- Spacing steps only from var(--space-1) through var(--space-12).
- Every tappable row, button, chip and input is at least 44px tall; icon-only buttons are 44x44 with var(--radius-pill).
- One primary action per screen; secondary actions are ghost buttons with a var(--border) outline.
- Lists are single-column with var(--border-soft) separators and no card chrome.

## Signature moves
- Cards are translucent light-on-dark: var(--surface) fill plus a 1px var(--border) hairline, no drop shadow.
- Primary CTA is a solid var(--accent) pill-free rectangle at var(--radius-sm) with var(--accent-on) label at weight 510.
- Display headlines are tight: var(--leading-tight) with var(--tracking-display), weight 510, in var(--fg).
- Metadata rows pair a var(--text-xs) uppercase overline in var(--muted) with a var(--text-sm) value in var(--fg-2).
- Status is a small dot or chip in var(--success) / var(--warn) / var(--danger) with a var(--radius-pill) outline, never a filled banner.

## Avoid
- No pure white text; primary text is var(--fg).
- No solid opaque button fills other than var(--accent) on the primary CTA.
- No warm hues, gradients, or decorative colour; the palette is cool gray plus one indigo.
- No positive letter-spacing at var(--text-2xl) and above.
- No heavy drop shadows for elevation; use luminance steps and var(--elev-raised).
- No weight 700, no all-caps body copy, no controls under 44px tall.
