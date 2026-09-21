# Layered Blue Utility — style card
Mood: Calm, airy, and orderly: white cards floating on a faint blue-grey wash, with one confident blue used as the only signal of action.
Colour energy: medium — roughly one tenth of a screen carries var(--accent); everything else is white, near-white, or grey text.

## Colour use
- Screen background is var(--bg); every card, sheet, and list row sits on var(--surface).
- var(--accent) is reserved for the single primary action per screen, active tab labels, links, and selected controls. Its text/icon colour is var(--accent-on).
- Pressed states darken the accent: var(--accent-hover) on press-in, var(--accent-active) while held.
- Body copy is var(--fg); secondary copy, captions, and metadata are var(--muted); labels inside dense rows are var(--fg-2).
- Status colour is used only on status chips and inline validation: var(--success), var(--warn), var(--danger).
- Tinted blocks (selected rows, info banners) use var(--surface-warm) with var(--fg) text, never accent text on accent fill.
- Dividers are var(--border); hairlines inside cards are var(--border-soft).

## Type
- Display and headings: var(--font-display) at weight 500–600, tracking var(--tracking-display), line-height var(--leading-tight).
- Body, labels, buttons: var(--font-body) at weight 400; button and tab labels at weight 500.
- Numerals, codes, and quantities: var(--font-mono).
- Screen title: var(--text-xl) or var(--text-2xl). Section heading: var(--text-lg). Body: var(--text-base) with line-height var(--leading-body). Captions and helper text: var(--text-sm); the smallest legal label is var(--text-xs).
- Never set two adjacent text levels at the same size and weight; step at least one level between a heading and its support text.

## Shape and depth
- Cards and sheets: var(--radius-md). Large feature panels: var(--radius-lg). Chips, avatars, and toggles: var(--radius-pill). Small inline tags: var(--radius-sm).
- Default card treatment is var(--elev-ring) — a 1px outline, no shadow. Reserve var(--elev-raised) for floating elements only: bottom sheets, menus, snackbars.
- Flat surfaces use var(--elev-flat); do not stack a ring and a shadow on the same element.
- Focus-visible on any control: var(--focus-ring), 4px, outside the shape.

## Layout and density
- Phone gutter is var(--container-gutter-phone); vertical rhythm between blocks is var(--space-4) or var(--space-6), and var(--space-8) before a new section.
- Content column is single-track and full width; cards span the gutter-to-gutter width.
- Card padding is var(--space-4); list rows are var(--space-3) vertical padding with a var(--border-soft) divider between rows.
- Every tappable control is at least 44px tall, including icon buttons, chips, and list rows.
- Hierarchy per block: heading, then support text, then one action. Whitespace separates blocks before any border or shadow is added.

## Signature moves
- A white card with a 1px var(--border) ring and no shadow, sitting on the var(--bg) wash — the default container for any grouped content.
- Exactly one filled var(--accent) pill button per screen; all other actions are text buttons in var(--accent) or neutral outlined buttons.
- Selected or highlighted rows filled with var(--surface-warm) instead of a coloured border.
- Bottom navigation with the active item's icon and label in var(--accent) and inactive items in var(--muted).
- Transitions run var(--motion-fast) to var(--motion-base) with var(--ease-standard); state changes are colour and elevation only, never scale or bounce.

## Avoid
- No second accent hue, no gradients, no coloured card backgrounds other than var(--surface-warm).
- No shadows on resting cards, list rows, or inputs.
- No text below var(--text-xs), and no all-caps body copy.
- No control shorter than 44px, and no icon-only action without a 44px hit area.
- No decorative illustration or texture behind text; keep backgrounds flat.
- No mixing of radii within one component family.
