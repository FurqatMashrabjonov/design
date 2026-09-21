# Dark Pill Player — style card
Mood: A near-black, theatre-like surface where content glows and the interface recedes into shadow. Rounded, tactile, built for thumb scanning.
Colour energy: medium — accent green appears only on one primary action per screen and on active states; the rest of the screen is achromatic charcoal and white.

## Colour use
- Screen background is var(--bg); cards, list rows and containers sit on var(--surface); interactive surfaces (buttons, inputs, chips) use var(--surface-warm).
- Text is var(--fg) for primary, var(--muted) for secondary and inactive items, var(--meta) for slightly brighter metadata.
- var(--accent) is functional only: one primary CTA per screen, active/selected state, progress fill. Text on it is var(--accent-on).
- var(--success), var(--warn), var(--danger) only for status, never decoration.
- Borders are var(--border) on outlined controls and var(--border-soft) for hairlines; never a raw grey line.
- No second brand hue. Any other colour on screen comes from user content imagery.

## Type
- Display and body both use var(--font-display) / var(--font-body); numerals and codes use var(--font-mono).
- Sizes: var(--text-2xl) for screen titles at weight 700, var(--text-lg) for section headings at weight 600, var(--text-base) for body at 400 or 700, var(--text-sm) for tags and counts, var(--text-xs) for badges.
- Nothing renders above var(--text-2xl); var(--text-3xl) and var(--text-4xl) resolve to the same 24px cap.
- Body leading var(--leading-body); headings and button labels var(--leading-tight).
- Button labels: uppercase, weight 600–700, letter-spacing 1.4px–2px.
- Hierarchy comes from weight contrast (700 vs 400) more than from size.

## Shape and depth
- Buttons and chips: var(--radius-pill) or var(--radius-sm) — fully rounded, never square.
- Cards, list thumbnails and media containers: var(--radius-md).
- Dialogs and sheets: var(--radius-lg).
- Circular controls (play, avatar, icon buttons) use a 50% radius.
- Elevation: var(--elev-raised) on hovered or lifted cards; dialogs use a heavier 0.5-opacity shadow at 24px blur. Shadows must be heavy to read on dark.
- Inputs use an inset ring rather than a flat border; focus uses var(--focus-ring).
- All controls are at least 44px tall; pill buttons get 12px vertical padding to reach it.

## Layout and density
- 390px wide, 16px side gutters (var(--container-gutter-phone)).
- 8px base spacing unit: var(--space-2) between related items, var(--space-4) between groups, var(--space-6) between sections.
- Section rhythm on phone is var(--section-y-phone).
- Dense: list rows and grid tiles pack tightly; the dark background supplies the rest, not large gaps.
- Media grids run 2 columns on phone with var(--space-3) gaps.
- A persistent bottom bar holds the primary action and navigation; content scrolls beneath it.

## Signature moves
- One green pill or green circular button per screen as the single primary action, black glyph/text on it.
- Uppercase, wide-tracked button labels (1.4px–2px) against sentence-case body text.
- Fully pill-shaped controls and inputs sitting on 6px-radius rectangular content cards.
- Heavy 0.3–0.5 opacity shadows lifting dialogs and hovered cards off near-black.
- Achromatic chrome: every non-accent pixel is a charcoal or white/grey step, so user imagery is the only colour.

## Avoid
- Green as a background fill, decorative wash, or on more than one action per screen.
- Light or white primary surfaces.
- Square or lightly rounded buttons; anything below var(--radius-md) on a control.
- Thin, low-opacity shadows that vanish on dark.
- Extra brand hues beyond the accent plus the semantic three.
- Relaxed leading or type above 24px.
- Raw grey divider lines instead of var(--border-soft) or shadow-based separation.
