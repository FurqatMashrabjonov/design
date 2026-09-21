# Warm Whisper Minimal — style card
Mood: Warm, paper-like minimalism with near-invisible structure. Depth is felt, not seen; colour is a rare event.
Colour energy: low — under 10% of a screen carries accent colour; the rest is white, warm white and warm gray.

## Colour use
- Screen background is var(--bg); alternate full-width bands use var(--surface) for gentle rhythm.
- Body and heading text: var(--fg); headings on tinted bands may use var(--fg-2).
- Secondary text, descriptions, list subtitles: var(--muted). Placeholders, timestamps, disabled labels: var(--meta).
- Exactly one accent: var(--accent) for the primary action, links and active tab. Pressed state var(--accent-hover); text on accent var(--accent-on).
- Status only: var(--success), var(--warn), var(--danger) — never decorative.
- Every division line is var(--border); row dividers inside lists use var(--border-soft).

## Type
- One family for everything: var(--font-display) for headings, var(--font-body) for text. Numerals and codes: var(--font-mono).
- Screen title: var(--text-2xl), weight 700, line-height var(--leading-tight), letter-spacing var(--tracking-display).
- Section heading: var(--text-xl), weight 700, line-height 1.23, letter-spacing -0.625px.
- Card title: 22px, weight 700, line-height 1.27, letter-spacing -0.25px.
- Body: var(--text-base), weight 400, line-height var(--leading-body).
- Labels, tab labels, button text: 15px, weight 600, line-height 1.33.
- Caption and metadata: var(--text-sm), weight 500 (weight 400 for descriptive captions).
- Badges and micro labels: var(--text-xs), weight 600, letter-spacing 0.125px — the only positive tracking.
- Compression scales with size: tight tracking on large text, normal tracking at var(--text-base) and below.

## Shape and depth
- Buttons, inputs, chips that act as controls: var(--radius-sm).
- Small containers and inline blocks: var(--radius-md).
- Cards and image tops: var(--radius-lg).
- Badges, tags, status pills: var(--radius-pill).
- Default card: var(--bg) fill, 1px var(--border), var(--elev-raised).
- Flat rows and dividers: var(--elev-flat) with a single var(--border-soft) line.
- Selected or focused containers: var(--elev-ring).
- Never a single hard shadow; depth comes from the layered stack in var(--elev-raised).

## Layout and density
- 390px wide, side padding var(--space-4); vertical rhythm between blocks var(--space-6) to var(--space-8).
- Base unit var(--space-2); use var(--space-1), var(--space-3), var(--space-4), var(--space-5), var(--space-6), var(--space-8), var(--space-12) only.
- Every tappable row, button and input is at least 44px tall; pad controls to reach it rather than shrinking text.
- Lists are single-column rows separated by var(--border-soft); cards stack one per row with var(--space-3) gaps.
- Text blocks stay narrow with generous surrounding space; never fill the width edge to edge with body copy.
- Alternate a var(--surface) band between white blocks to separate groups without lines.

## Signature moves
- A 1px var(--border) hairline around every card, plus the multi-layer var(--elev-raised) stack — structure you notice only when you look for it.
- One blue var(--accent) primary button per screen, var(--radius-sm), white label at 15px weight 600; everything else is neutral or ghost.
- Pill badges in var(--radius-pill) at var(--text-xs) weight 600 with 0.125px tracking for status and tags.
- Warm gray text ladder: var(--fg) for titles, var(--muted) for descriptions, var(--meta) for captions — three clearly separated tiers on every screen.
- Large headings set tight (var(--leading-tight) with var(--tracking-display)) directly above a var(--muted) one-line description.

## Avoid
- Cold blue-grays anywhere; all neutrals stay warm.
- Borders heavier than 1px, or any shadow with a single opaque layer.
- More than one saturated colour on a screen; no accent-filled large surfaces.
- Pure black text, pure black borders, or coloured section backgrounds other than var(--surface).
- Radii other than var(--radius-sm), var(--radius-md), var(--radius-lg), var(--radius-pill).
- Controls shorter than 44px, or body text below var(--text-sm).
