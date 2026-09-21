# Warm Editorial Parchment — style card
Mood: A quiet, book-like interface on warm cream paper, where serif headlines and soft rounded surfaces feel printed rather than rendered.
Colour energy: low — accent colour appears on roughly one element per screen; the rest is warm cream, ivory and warm near-black.

## Colour use
- Page background is always var(--bg); cards and sheets sit on var(--surface). Never use pure white as a page background.
- Prominent interactive surfaces (secondary buttons, chips, selected rows) use var(--surface-warm).
- Primary text is var(--fg); secondary body text var(--muted); metadata, timestamps and footnotes var(--meta); emphasised secondary text and inline links var(--fg-2).
- var(--accent) is reserved for the single primary action per screen and the highest-signal brand moment. Text on it is var(--accent-on). Pressed states use var(--accent-active).
- Dividers and card outlines use var(--border); stronger containment uses var(--border-soft).
- var(--danger) for destructive/error states, var(--success) and var(--warn) for status only. No other chromatic colour anywhere.
- Every neutral is warm; no cool blue-grey may appear except the focus ring.

## Type
- All headings use var(--font-display) at weight 500 only — never bolder, never lighter.
- All UI, body, labels and buttons use var(--font-body). var(--font-mono) only for code or numeric readouts.
- Screen title: var(--text-3xl), line-height var(--leading-tight). Section heading: var(--text-2xl). Card title: var(--text-xl).
- Body copy: var(--text-base) at line-height var(--leading-body); intro paragraph var(--text-lg). Captions var(--text-sm); uppercase overline labels var(--text-xs) with 0.5px letter-spacing.
- Headings use var(--leading-tight); body never drops below 1.40 line-height.
- Buttons and labels: var(--text-base) at weight 500.

## Shape and depth
- Radii: standard buttons and cards var(--radius-sm); primary buttons, inputs and nav var(--radius-md); featured containers and media var(--radius-lg); chips var(--radius-pill), used sparingly.
- No corner below 8px on any button, card or input.
- Default containment is a 1px outline in var(--border), not a drop shadow.
- Interactive/hover states use var(--elev-ring). Elevated content uses var(--elev-raised) only when genuinely floating.
- Focused inputs and controls get var(--focus-ring) — the only cool colour in the system.
- Transitions run var(--motion-fast) to var(--motion-base) with var(--ease-standard).

## Layout and density
- Screen gutter: var(--container-gutter-phone). Vertical rhythm between blocks: var(--space-8) to var(--space-12); screen top/bottom padding var(--section-y-phone).
- Spacing steps come from the 8px scale: var(--space-2), var(--space-3), var(--space-4), var(--space-6), var(--space-8).
- Card internal padding: var(--space-6) to var(--space-8).
- Single-column stacking is the default; two-column card grids only where content is genuinely parallel.
- Every tappable control is at least 44px tall, including list rows and icon buttons.
- Generous whitespace: prefer fewer, larger blocks over dense lists.

## Signature moves
- A serif headline at weight 500 sitting directly on the warm cream background, with no card or banner behind it.
- One terracotta primary button per screen, fully rounded at var(--radius-md), with ivory label text.
- Cards defined by a 1px var(--border) outline and var(--radius-sm) corners rather than by shadow.
- Secondary actions as var(--surface-warm) fills with var(--fg-2) text and a ring outline.
- Alternating light and dark blocks: a var(--fg) panel with var(--surface) text used to separate major regions of a screen.

## Avoid
- Cool blue-greys, saturated colours beyond var(--accent), or gradients.
- Serif weights above 500, or sans-serif headlines.
- Sharp corners, heavy drop shadows, or visible hard borders in a darker grey.
- Pure white page backgrounds.
- Monospace outside code or numeric data.
- Dense multi-column dashboards and cramped line-heights below 1.40.
