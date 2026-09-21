# Cloud Console Light — style card
Mood: Crisp, airy productivity surface with cool blue accents, soft panel elevation and a calm, data-first rhythm.
Colour energy: medium — roughly one accent element per screen block; accent colour covers under 10% of pixels, most area is var(--bg) and var(--surface).

## Colour use
- Base canvas is var(--bg); cards and sheets sit on var(--surface).
- Secondary panels and highlighted rows use var(--surface-warm).
- Primary text is var(--fg); supporting copy is var(--fg-2); captions and metadata are var(--muted).
- Accent is var(--accent) only: primary buttons, active tab underline, selected chips, progress fills, focus rings. Text on accent is var(--accent-on).
- Status colours are reserved for status: var(--success), var(--warn), var(--danger). Never use them decoratively.
- Dividers and card outlines use var(--border); inner separators use var(--border-soft).
- var(--meta) is for small numeric or timestamp labels, not for buttons.

## Type
- One family throughout: var(--font-display) for headings, var(--font-body) for copy. Numerals and code-like values use var(--font-mono).
- Screen title: var(--text-2xl) at weight 700, line-height var(--leading-tight), tracking var(--tracking-display).
- Section heading: var(--text-lg) at weight 600.
- Body: var(--text-base) at weight 400, line-height var(--leading-body).
- Labels and captions: var(--text-sm) at weight 500, colour var(--muted).
- Micro labels and badges: var(--text-xs) at weight 600, uppercase, letter-spacing 0.04em.
- Big single metrics: var(--text-3xl) or var(--text-4xl) at weight 700, tracking var(--tracking-display).
- Never set two adjacent text blocks at the same size and weight.

## Shape and depth
- Radii: inputs and small chips var(--radius-sm); cards and list rows var(--radius-md); large panels and sheets var(--radius-lg); pills and tags var(--radius-pill).
- Default card depth is var(--elev-ring); reserve var(--elev-raised) for one floating element per screen (a sheet, a modal, a dragged card).
- No other shadows. No gradients on text. No inner shadows.
- Focus state is var(--focus-ring) on every interactive element, visible on both light surfaces.

## Layout and density
- 390px wide, side gutter var(--space-4); content blocks stack with var(--space-4) between them, var(--space-6) between sections.
- Vertical section padding on phone is var(--section-y-phone).
- Cards use internal padding var(--space-4) to var(--space-5); list rows use var(--space-3) vertical.
- Every tappable row, button and chip is at least 44px tall; icon-only buttons are 44x44px.
- Align everything to a single left edge; no ad-hoc offsets or centred body copy.
- Grids of two or three equal tiles are allowed; keep gutters at var(--space-3).

## Signature moves
- A top summary strip of two to four metric tiles on var(--surface) with var(--elev-ring), each showing a var(--text-xs) uppercase label above a var(--text-2xl) number.
- A segmented control or tab row where the active item is filled with var(--accent) and var(--accent-on) text, inactive items are var(--fg-2) on var(--surface-warm).
- Status pills: var(--radius-pill), var(--text-xs) uppercase, tinted background with the matching status colour as text.
- A single raised sheet or floating action panel using var(--elev-raised) and var(--radius-lg), anchored to the bottom of the screen.
- Progress and completion bars drawn as var(--radius-pill) tracks in var(--border-soft) with a var(--accent) fill.

## Avoid
- Do not use dark backgrounds; this style is light with cool blue accents.
- Do not use more than one accent hue; no purple, pink or teal decoration.
- Do not stack multiple raised shadows on one screen.
- Do not set body copy below var(--text-sm) or above var(--text-lg).
- Do not use square corners on cards, buttons or inputs.
- Do not use status colours for non-status decoration.
- Do not centre long paragraphs or mix left- and centre-aligned blocks.
