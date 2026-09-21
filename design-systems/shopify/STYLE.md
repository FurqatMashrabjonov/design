# Nocturnal Neon Ethereal — style card
Mood: A dark, cinematic surface where feather-light type glows against near-black teal depths, punctuated by a single electric mint signal.
Colour energy: low — accent colour appears on under 5% of a screen, reserved for focus rings and one critical highlight per view.

## Colour use
- Root background is var(--bg); cards and content containers sit on var(--surface); grouped sections use var(--surface-warm).
- All text is var(--fg) on dark surfaces. Secondary text uses var(--muted); timestamps and tertiary metadata use var(--meta).
- Borders are var(--border) at 1px on cards; dividers use var(--border-soft).
- var(--accent) is reserved for focus rings and one critical highlight per screen. Never fill a large surface with it. Text on accent uses var(--accent-on).
- var(--success) matches the accent; var(--warn) and var(--danger) appear only on status chips or inline alerts.

## Type
- Display and headings use var(--font-display) at weights 330–400 only. Never exceed 500 on display.
- Body and UI text use var(--font-body) at weights 400–550. Code and data labels use var(--font-mono).
- Screen title: var(--text-3xl) at weight 330, line-height var(--leading-tight), tracking var(--tracking-display).
- Section heading: var(--text-2xl) at weight 330, line-height 1.14.
- Card heading: var(--text-xl) at weight 360, line-height 1.14.
- Body: var(--text-base) at weight 400, line-height var(--leading-body).
- Caption: var(--text-sm) at weight 500. Labels: var(--text-xs) uppercase at weight 400 with 0.72px tracking.
- Never mix display and body fonts at the same size and role.

## Shape and depth
- All primary buttons and pills use var(--radius-pill). Standard cards and inputs use var(--radius-md); featured cards use var(--radius-lg).
- No 0px corners on interactive elements.
- Resting cards use var(--elev-raised) — the stacked ring, progressive blur and inset white glow. Never a single-layer shadow.
- Flat surfaces use var(--elev-flat); a 1px boundary alone uses var(--elev-ring).
- Focus state is var(--focus-ring) on every interactive element.
- Transitions run var(--motion-base) with var(--ease-standard); micro-interactions may use var(--motion-fast).

## Layout and density
- Phone gutter is var(--container-gutter-phone). Vertical rhythm between blocks uses var(--space-5) to var(--space-8); between major sections use var(--section-y-phone).
- Base spacing unit is 8px; use var(--space-1) through var(--space-12) only.
- Single column on phone. Cards stack full-width with var(--space-5) gaps.
- Card padding is var(--space-4) to var(--space-5). Input padding is var(--space-3) var(--space-4).
- All touch targets are at least 44px tall; pill buttons are 48px tall minimum.
- Keep body line-height at or below var(--leading-body).

## Signature moves
- A screen title set in var(--font-display) at weight 330 and var(--text-3xl), so large type reads as light rather than heavy.
- One white pill button (var(--radius-pill), var(--fg) fill, var(--accent-on) text) paired with one ghost pill outlined in var(--fg) at 2px.
- Cards on var(--surface) with a 1px var(--border) edge and the full var(--elev-raised) stack, giving a top-lit glass edge on dark.
- A single var(--accent) focus ring or highlight dot per screen — never a filled accent block.
- Generous dark breathing room between blocks, using var(--section-y-phone) as the outer rhythm.

## Avoid
- No warm hues (orange, red, yellow) except var(--warn) and var(--danger) on status chips.
- No light or bright backgrounds; the dark surface hierarchy is mandatory.
- No display weights above 500, and no body weights above 550.
- No large surfaces filled with var(--accent).
- No single-layer box shadows; always use the stacked elevation token.
- No sharp 0px corners on buttons, inputs or cards.
- No mixing display and body fonts at the same size and role.
- No negative letter-spacing on headings.
- No line-height above var(--leading-body) for body text.
