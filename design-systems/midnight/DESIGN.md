# Midnight

Dark, precise, developer-tool aesthetic. Think Linear, Vercel, Raycast: near-black surfaces, hairline borders, one luminous accent.

## Color
- Background: `#08090a`; raised surface: `#111214`; hover surface: `#17181b`
- Borders: `rgba(255,255,255,0.08)`; strong border `rgba(255,255,255,0.14)`
- Text: primary `#f7f8f8`, secondary `#8a8f98`, muted `#5c6068`
- Accent: `#5e6ad2` (violet-blue); accent glow for hero only: radial gradient of accent at 20% opacity
- Semantic: success `#4cb782`, warning `#f2c94c`, danger `#eb5757`

## Typography
- Font: "Inter" from Google Fonts, weights 400/500/600; code and numbers "JetBrains Mono"
- Scale: 12, 13 (body in dense UI), 14, 16, 20, 28, 40, 56 (hero)
- Headings 600 weight, `tracking-tight`; hero headings may use a white-to-gray text gradient
- Secondary labels 12–13px, secondary color, 500 weight

## Spacing & layout
- 4px grid; dense UI (lists, tables) uses 8–12px vertical padding
- Desktop: left sidebar 240px + content; marketing pages centered 1100px column
- Keyboard-shortcut hints (`⌘K`) shown as small bordered kbd chips

## Shape & depth
- Radius: 6px controls, 10px cards, 16px for large panels
- Depth from surface color steps and 1px borders, never from big shadows
- Subtle inner highlight on cards: `box-shadow: inset 0 1px 0 rgba(255,255,255,0.04)`

## Components
- Primary button: accent background, white text, 32px height, 6px radius
- Secondary button: raised surface, 1px border, primary text
- Inputs: raised surface, 1px border, accent focus ring at 40% opacity
- Lists: rows with status icon, title, muted metadata right-aligned, hover surface
- Badges: 1px border, 12px text, muted color; status badges tinted with semantic color at 15% opacity

## Don't
- No pure white backgrounds, no colorful multi-hue palettes
- No emoji as icons; thin 1.5px stroke inline SVG icons
