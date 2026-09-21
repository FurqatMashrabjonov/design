# Calm Minimal Blue — style card
Mood: Quiet, content-first surfaces with generous whitespace, crisp Inter type, and a single mid-blue accent. Depth comes from 1px borders, not shadows.
Colour energy: low — accent appears on roughly one element per screen (a primary action, an active tab, or a focus ring); everything else is white, near-black text, and light grey borders.

## Colour use
- Backgrounds: `var(--bg)` for screens, `var(--surface)` for grouped blocks and inset panels. `var(--surface-warm)` is an alias of `var(--surface)` — do not introduce a second tint.
- Text ramp: `var(--fg)` for headings and primary values, `var(--fg-2)` for body copy, `var(--muted)` for captions and secondary labels, `var(--meta)` for placeholders and disabled text.
- Lines: `var(--border)` for card and control outlines, `var(--border-soft)` for inner row separators.
- Accent: `var(--accent)` with `var(--accent-on)` text. Hover `var(--accent-hover)`, pressed `var(--accent-active)`. Never substitute an indigo-family hue.
- Status only where meaningful: `var(--success)`, `var(--warn)` (alias `var(--warning)`), `var(--danger)`. One accent colour per screen; status colours do not decorate.

## Type
- Family: `var(--font-display)` and `var(--font-body)` are both Inter; `var(--font-mono)` for codes and numeric IDs.
- Sizes: `var(--text-xs)` captions, `var(--text-sm)` body, `var(--text-base)` emphasised body, `var(--text-lg)` card titles, `var(--text-xl)` screen titles, `var(--text-2xl)` and above for hero numbers.
- Weights: 400 body, 500 labels and buttons, 600 headings. Headings use `var(--leading-tight)` and `var(--tracking-display)`; body uses `var(--leading-body)`.
- Numeric columns, timers and balances use tabular figures.

## Shape and depth
- Radii: `var(--radius-sm)` controls, `var(--radius-md)` cards, `var(--radius-lg)` large panels, `var(--radius-pill)` pills and avatars.
- Depth is borders first: `var(--elev-flat)` for inline content, `var(--elev-ring)` for outlined cards, `var(--elev-raised)` only for floating menus and sheets. No heavier shadow stacks.
- Focus: `var(--focus-ring)` on any focused control.
- Motion: `var(--motion-fast)` for state changes, `var(--motion-base)` for sheets, easing `var(--ease-standard)`.

## Layout and density
- 390px-wide screens, 16px side gutters (`var(--container-gutter-phone)`).
- 4px grid: `var(--space-1)`–`var(--space-12)`. Card padding 20–24px (`var(--space-5)`/`var(--space-6)`); gaps between cards `var(--space-4)`; block separation `var(--space-8)`.
- Vertical rhythm between major blocks: `var(--section-y-phone)`.
- All controls at least 44px tall; primary and secondary buttons 44px, inputs 44px.
- Prefer whitespace over dividers; when a divider is needed use a 1px `var(--border-soft)` row separator with no vertical lines.
- Bottom tab bar for top-level navigation; active item uses `var(--accent)`.

## Signature moves
- One mid-blue primary button per screen: `var(--accent)` fill, `var(--accent-on)` label, 500 weight, `var(--radius-sm)`, 44px tall.
- Secondary actions are white with a 1px `var(--border)` outline and `var(--fg)` label — never a second filled colour.
- Cards are white, `var(--radius-md)`, 1px `var(--border)`, no shadow; grouped lists sit on `var(--surface)` with `var(--border-soft)` row separators.
- Headings set at 600 weight with `var(--tracking-display)` and `var(--leading-tight)`, sitting above 400-weight `var(--fg-2)` body copy.
- Active navigation and selected filters marked by `var(--accent)` text or a pill in `var(--accent)`, with everything else in `var(--muted)`.

## Avoid
- No gradients, no coloured button fills other than `var(--accent)`, no second accent hue.
- No drop-shadow stacks; nothing stronger than `var(--elev-raised)`.
- No indigo-family blues; no warm or tinted surface tier beyond `var(--surface)`.
- No emoji as icons; no more than one accent-coloured element competing per screen.
- No dense dividers or vertical table rules; no control shorter than 44px.
