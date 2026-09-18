# Brutalist

Loud, raw, confident. Neo-brutalism like Gumroad: thick black outlines, hard offset shadows, flat saturated colors.

## Color

Define these as CSS custom properties on `:root` and use `var(--token)` everywhere — never hardcode the hex a second time.

| Token | Value |
|---|---|
| `--bg` | `#fffbeb` |
| `--surface` | `#ffffff` |
| `--fg` | `#000000` |
| `--border` | `#000000` |
| `--accent` | `#ffd23f` |
| `--accent-2` | `#ff90e8` |
| `--accent-3` | `#3b82f6` |
| `--success` | `#23c55e` |
| `--warning` | `#ffd23f` |
| `--danger` | `#eb5757` |

`--accent` is primary (CTAs, active states). `--accent-2`/`--accent-3` are section-background fills only, at most one per screen alongside the primary — never blended, never gradient.

## Typography
- Display: "Space Grotesk" 700 from Google Fonts; body: "Space Grotesk" 400/500
- Scale: 14, 16 (body), 20, 28, 40, 64 (hero)
- Headings uppercase or tight sentence case, `tracking-tight`, very large on heroes
- Numbers big and bold

## Spacing & layout
- 8px grid; chunky padding (24–40px in cards)
- Blocky grid layouts with visible borders between areas
- Slight rotation (-2deg to 2deg) allowed on one sticker/badge per screen

## Shape & depth
- Borders: 2–3px solid black on every card, button, input, image
- Shadows: hard offset, no blur: `box-shadow: 4px 4px 0 #000` (6px for large cards)
- Radius: 0 or 8px, pick one per screen and stay consistent

## Components
- Primary button: accent fill, black 2px border, black text 700, hard shadow; on hover translate(2px,2px) and reduce shadow
- Inputs: white, 2px black border, 48px height
- Cards: white, 3px border, hard shadow, bold title
- Tags: accent fill, 2px border, uppercase 12px 700
- Nav: thick bottom border, bold links

## Don't
- No soft shadows, no blur, no gradients, no thin gray borders
- No emoji as icons; bold 2px stroke inline SVG icons
