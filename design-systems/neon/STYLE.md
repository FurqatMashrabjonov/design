# Electric Violet Glow — style card
Mood: Deep near-black violet canvas lit by one electric lilac accent, with soft coloured bloom around raised surfaces. High-contrast, nocturnal, slightly futuristic.
Colour energy: high — the accent lilac carries roughly a fifth of the screen: primary buttons, active states, key numerals and one glow per screen; everything else sits in dark violet neutrals.

## Colour use
- Base canvas is var(--bg); cards and sheets sit on var(--surface), with var(--surface-warm) for the one elevated or selected block per screen.
- var(--accent) is the single interaction colour: primary buttons, selected tabs, progress fills, focus rings. Text on it is var(--accent-on).
- Body copy is var(--fg); secondary copy is var(--fg-2); labels, captions and timestamps are var(--muted).
- var(--meta) is for small meta text and inline links only — never for large fills.
- Status colours are used alone, never as backgrounds: var(--success), var(--warn), var(--danger).
- Dividers and card outlines use var(--border); quieter separators use var(--border-soft).
- Never place two accent-filled elements side by side; one accent action per viewport.

## Type
- One family for everything: var(--font-display) for headings and var(--font-body) for text; numerals in var(--font-mono) when they must align in columns.
- Sizes: var(--text-xs) for badges, var(--text-sm) for captions and helper text, var(--text-base) for body, var(--text-lg) for list titles, var(--text-xl) for screen titles, var(--text-2xl) for the single hero number or headline.
- Headings at weight 700–800 with letter-spacing var(--tracking-display) and line-height var(--leading-tight); body at weight 400 with line-height var(--leading-body).
- Uppercase only for badges and section labels at var(--text-xs), tracked wide; never uppercase body copy.
- Keep body copy on var(--fg) or var(--fg-2) — never var(--muted) for paragraphs.

## Shape and depth
- Radii: var(--radius-sm) for inputs and chips, var(--radius-md) for cards and list rows, var(--radius-lg) for sheets and modals, var(--radius-pill) for buttons, tabs and avatars.
- Depth comes from glow, not grey shadow: raised cards use var(--elev-raised); flat rows use var(--elev-flat) with var(--elev-ring) when they need an edge.
- Focus is always var(--focus-ring) at 4px, visible on every interactive element.
- Transitions run var(--motion-fast) for state changes and var(--motion-base) for entrances, easing var(--ease-standard).

## Layout and density
- Phone frame 390px wide, gutters var(--container-gutter-phone); stack content in one column with var(--space-4) between related items and var(--space-8) between groups.
- Screen top padding var(--space-6); bottom action bars sit above the safe area with var(--space-4) inset.
- Every tappable row, button and tab is at least 44px tall; pill buttons use var(--space-3) vertical padding at var(--text-base).
- Density is medium: one primary action per screen, 3–6 list rows visible, generous breathing room around the hero number.

## Signature moves
- A single lilac glow bloom (var(--elev-raised)) under the most important card or button on the screen.
- Primary pill button filled with var(--accent) and var(--accent-on) label, with var(--accent-hover) and var(--accent-active) states.
- One oversized numeral or headline at var(--text-2xl) in var(--fg) sitting directly on var(--bg), no card behind it.
- Selected tab or chip switches to var(--accent) fill with var(--accent-on) text; unselected stays var(--surface) with var(--border) ring.
- Progress and metric bars drawn as var(--accent) fills on var(--surface-warm) tracks, rounded to var(--radius-pill).

## Avoid
- No light or white backgrounds; the canvas stays var(--bg) or var(--surface).
- No second accent hue, no gradients between two accents, no off-token colours.
- No grey drop shadows — depth is glow or a 1px var(--border) ring.
- No accent colour on body paragraphs, captions or large surfaces.
- No control shorter than 44px, no text below var(--text-xs).
- No more than one glow and one accent-filled action per screen.
