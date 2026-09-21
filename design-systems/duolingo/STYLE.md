# Chunky Playful Green — style card
Mood: Bright, toy-like and confident, with thick borders and hard offset shadows that make every control look pressable.
Colour energy: high — roughly a third of the screen carries accent colour, mostly on primary actions, progress and success states.

## Colour use
- Canvas is var(--bg); group secondary blocks on var(--surface).
- Accent var(--accent) fills primary buttons, progress fills and success states; hover var(--accent-hover), pressed var(--accent-active).
- Text tiers: var(--fg) for headings and button labels, var(--muted) for captions, var(--meta) for placeholders and disabled.
- Borders use var(--border) at 2px, never hairlines.
- var(--warn) marks badges and achievements, var(--danger) marks wrong or lost states, var(--success) equals var(--accent).
- Accent text on accent fills uses var(--accent-on).

## Type
- Display and headings: var(--font-display) at weight 800, tracking var(--tracking-display), leading var(--leading-tight).
- Body and captions: var(--font-body); body 15px/1.5, captions 13px weight 600.
- Sizes: var(--text-2xl) screen title, var(--text-xl) section heading, var(--text-lg) row title, var(--text-base) body, var(--text-sm) metadata, var(--text-xs) counters.
- Reserve var(--text-4xl) for a single onboarding or milestone hero; never for list content.
- Button labels: var(--font-display) 16px weight 800, letter-spacing 0.02em.

## Shape and depth
- Radii: var(--radius-sm) on buttons and inputs, var(--radius-md) on cards and tiles, var(--radius-lg) on modals, var(--radius-pill) on chips, progress bars and avatars.
- Every button and card carries a hard bottom shadow: var(--elev-raised) on cards, a 4px solid var(--accent-active) under accent buttons, 4px solid var(--border) under white buttons.
- Pressed state translates the element down 4px and removes the bottom shadow.
- Focus uses var(--focus-ring).
- No soft blurred drop shadows anywhere.

## Layout and density
- 390px screen, 16px side gutters, 4px spacing base: var(--space-2), var(--space-3), var(--space-4), var(--space-6), var(--space-8).
- Section rhythm var(--section-y-phone) between blocks.
- One centred column of stacked rows; each row is a card with 16px padding and a 12px gap to the next.
- All controls at least 44px tall; primary buttons use 14px vertical padding plus the 4px bottom shadow.
- Progress bars 16px tall, pill radius, full column width.

## Signature moves
- Primary button: var(--accent) fill, var(--accent-on) label, var(--radius-sm) corners, 4px var(--accent-active) bottom edge that collapses on press.
- Card: white fill, 2px var(--border) outline plus a 4px var(--border) bottom edge, var(--radius-md) corners.
- Circular progress node: 80×72px, pill radius, tinted fill with a 6px darker bottom edge, pulsing 1.0 to 1.05 every 1.6s while active.
- Pill progress bar: var(--border) track, var(--accent) fill, animating over var(--motion-base) with var(--ease-standard).
- Oversized 800-weight heading in var(--font-display) sitting directly above the first card, no decoration.

## Avoid
- Hairline 1px borders, soft blurred shadows, or flat buttons with no bottom edge.
- Thin or light type weights; nothing below weight 600 for headings or labels.
- Sharp corners, square chips, or rectangular progress bars.
- Tinting the page background; keep it var(--bg) and let accent fills carry the colour.
- Bouncy motion on every control; restrict overshoot easing to progress and unlock moments.
