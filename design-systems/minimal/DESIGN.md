# Minimal

Clean, calm, content-first. Think Linear meets Apple: lots of whitespace, one accent color, crisp type.

## Color
- Background: `#ffffff`; subtle surface: `#f7f7f8`; borders: `#e5e5e7`
- Text: primary `#111113`, secondary `#6b6b76`, muted `#a1a1aa`
- Accent: `#4f46e5` (indigo). Use only for primary actions, links, active states, and one highlight per chart
- Semantic: success `#16a34a`, warning `#d97706`, danger `#dc2626`

## Typography
- Font: "Inter" from Google Fonts, weights 400/500/600
- Scale: 12, 14 (body), 16, 20, 24, 32, 48
- Headings 600 weight with tight tracking (`tracking-tight`); body 400; labels 500
- Numbers in data views use `tabular-nums`

## Spacing & layout
- 4px base grid; section padding 24–32px; card padding 20–24px
- Max content width 1200px on desktop
- Align everything to a clear grid; generous whitespace over dividers

## Shape & depth
- Radius: 8px controls, 12px cards, full for pills and avatars
- Borders over shadows. At most `shadow-sm` on floating elements (menus, modals)

## Components
- Primary button: accent background, white text, 36px height, 500 weight
- Secondary button: white background, 1px border, primary text
- Inputs: 36px height, 1px border, accent focus ring
- Cards: white, 1px border, 12px radius, no heavy shadow
- Tables: no vertical lines, 1px row separators, secondary-colored header text
- Nav: left sidebar (desktop) or bottom tab bar (mobile), active item uses accent

## Don't
- No gradients on buttons, no drop-shadow stacks, no more than one accent color
- No emoji as icons; use simple 1.5px stroke inline SVG icons
