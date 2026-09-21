# Precision Neutral Capsule — style card
Mood: Gallery-calm neutral surfaces with machined, tightly-tracked type and a single blue action signal; imagery carries the drama while chrome stays thin.
Colour energy: low — under 10% of a screen carries accent colour; blue appears only on primary actions, links and focus, everything else is neutral surface and ink.

## Colour use
- Structure from three neutrals: var(--bg) and var(--surface) for light screens, var(--fg) for dark chapters and dark fills.
- var(--accent) fills primary buttons and selected states; var(--accent-on) is the only text colour on it. var(--accent-hover) and var(--accent-active) are press/hover steps only.
- Text ladder: var(--fg) for headings, var(--fg-2) for emphasised values, var(--muted) for secondary copy, var(--meta) for micro labels and legal lines.
- Containment: var(--border) for dividers and field outlines, var(--border-soft) for the quietest separations.
- var(--success), var(--warn), var(--danger) are reserved for real status, never decoration.
- No gradients in UI chrome; richness comes from imagery and surface stepping.

## Type
- Headlines use var(--font-display) at weight 600, body and controls use var(--font-body) at 400–600; var(--font-mono) only for numeric/code readouts.
- Screen title: var(--text-2xl) at 600, line-height var(--leading-tight), letter-spacing var(--tracking-display).
- Section heading: var(--text-xl) at 600; card title: var(--text-lg) at 600.
- Body: var(--text-base) at 400, line-height var(--leading-body); emphasised body same size at 600.
- Controls and helper labels: var(--text-sm) at 400–600; micro labels and legal: var(--text-xs) at 400.
- Never exceed two weights per screen; 700 only for a single hero number.

## Shape and depth
- Radius tiers by role, never one value everywhere: var(--radius-sm) for fields and small shells, var(--radius-md) for cards and panels, var(--radius-lg) for spotlight modules, var(--radius-pill) for every primary action and chip.
- Depth is contrast-led: var(--elev-flat) on narrative surfaces, var(--elev-ring) for bordered utility cards and inputs, var(--elev-raised) only for one floating module per screen.
- Focus is always var(--focus-ring); never remove it.
- Transitions use var(--motion-fast) for press feedback and var(--motion-base) with var(--ease-standard) for surface changes.

## Layout and density
- 390px wide, single column, gutters var(--space-4); vertical rhythm from var(--space-2), var(--space-4), var(--space-6), var(--space-8), var(--space-12).
- Chapter rhythm: alternate a dark var(--fg) block with a light var(--surface) block, separated by surface change rather than rules.
- Showcase blocks get var(--section-y-phone) top and bottom padding; list and control blocks compress to var(--space-4) between rows.
- Every tappable row, chip and button is at least 44px tall; pill actions use var(--space-4) horizontal padding minimum.
- Content column maxes at var(--container-max) with var(--container-gutter-phone) side padding.

## Signature moves
- One full-bleed image or media block per screen, edge to edge, with no border and no shadow.
- Primary action as a var(--radius-pill) capsule filled var(--accent) with var(--accent-on) label at var(--text-sm) 600; secondary action as a var(--fg) capsule with var(--accent-on) label.
- Alternating dark and light chapter bands so the screen reads as stacked scenes, not one continuous page.
- Option selection as a horizontal row of var(--radius-pill) chips, selected chip filled var(--accent), unselected outlined var(--border).
- Numeric or price emphasis set in var(--font-display) at var(--text-lg) 600 with var(--tracking-display), sitting directly under a var(--text-xs) var(--meta) label.

## Avoid
- No second accent hue; blue is the only action colour.
- No heavy shadow stacks, glows or decorative gradients on chrome.
- No single uniform corner radius across fields, cards and buttons.
- No thick borders or loud fills in dense list and configuration rows.
- No loosened tracking or extra font families beyond the three token families.
- No control shorter than 44px, and no blue used for non-interactive decoration.
