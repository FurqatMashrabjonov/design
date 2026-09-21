# Aubergine Light Panel — style card
Mood: Bright white content panels anchored by a deep aubergine navigation surface; calm, dense, and conversational with restrained colour.
Colour energy: medium — one large aubergine region (top bar or drawer) plus small semantic dots and badges; the rest of the screen is white and near-white.

## Colour use
- Canvas is var(--bg); secondary panels, thread strips and inline code blocks use var(--surface).
- The single brand anchor is var(--accent): use it as a full-bleed top bar or slide-in drawer background, and as the fill of the one primary button per screen.
- On aubergine, text is var(--accent-on); pressed states step to var(--accent-active), hover to var(--accent-hover).
- Body text is var(--fg); timestamps, counts and secondary labels are var(--muted).
- Semantic colour is functional only, never decorative: var(--success) for online/complete, var(--warn) for pending/away, var(--danger) for unread badges and destructive actions.
- Dividers are var(--border); row separators inside lists use var(--border-soft).

## Type
- UI text uses var(--font-body); code and numeric IDs use var(--font-mono) at var(--text-xs).
- Default body size is var(--text-base) at weight 400, line-height var(--leading-body).
- Screen and modal titles: var(--text-2xl) at weight 700, line-height 1.25.
- Card and section titles: var(--text-xl) at weight 700.
- Metadata, captions and timestamps: var(--text-xs) in var(--muted).
- Unread or unselected-but-new items are signalled by weight 700, not by colour.
- Never go below var(--text-xs).

## Shape and depth
- Buttons, inputs and code blocks: var(--radius-sm).
- Composer, cards and grouped panels: var(--radius-md).
- Larger sheets and modals: var(--radius-lg).
- Status dots, avatars and reaction chips: var(--radius-pill).
- Depth is light: flat rows use var(--elev-flat); cards and inputs use var(--elev-ring); menus and popovers use var(--elev-raised).
- Focus is always the blue ring var(--focus-ring) on inputs and tappable rows.

## Layout and density
- 390px-wide single column, 16px side gutters (var(--space-4)).
- Vertical rhythm on the 4px grid: var(--space-2) inside chips, var(--space-3) inside inputs, var(--space-4) between rows, var(--space-6) between groups, var(--space-8) before a new section.
- Rows are compact but every tappable row is at least 44px tall; list rows use 44–48px, primary buttons 44px.
- A persistent aubergine bar sits at the top of the screen; a bottom tab bar carries 4 items with icon above a var(--text-xs) label.
- Content is left-aligned and flush; no centred marketing blocks.

## Signature moves
- A full-width aubergine header or drawer in var(--accent) with white text, sitting above an all-white content area.
- Flat list rows with no bubbles: avatar left, name in weight 700, body in var(--text-base), timestamp in var(--text-xs) var(--muted) on a second line.
- A 4px left rule in var(--border) on quoted or attached content blocks, with var(--surface) fill and var(--radius-sm) on the right corners only.
- Pill reaction chips: var(--surface) fill, 1px var(--border) outline, var(--radius-pill), var(--text-sm) label; the active chip swaps its outline to the focus blue.
- A small var(--danger) pill badge with white var(--text-xs) weight-700 numerals for unread counts.

## Avoid
- No dark content area: the canvas stays var(--bg).
- No speech bubbles or chat tails.
- No pure black text and no colour outside the listed tokens.
- No scattering of semantic colours as decoration.
- No ALL-CAPS labels.
- No button or input radius above var(--radius-md).
- No font size below var(--text-xs).
- No control shorter than 44px.
