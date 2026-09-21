# Gallery Minimal Blue — style card
Mood: A silent white gallery where one full-bleed photograph per screen does all the talking and the interface is almost invisible. Calm, engineered, and uncluttered.
Colour energy: low — accent colour appears on roughly one element per screen, usually a single primary button; everything else is white, near-black text, and photography.

## Colour use
- Screens are built on var(--bg); use var(--surface) only to separate one block from the next, never as a card fill.
- Text hierarchy is strictly three steps: var(--fg) for titles and labels, var(--fg-2) for body copy, var(--muted) for secondary links, var(--meta) for placeholders and disabled text.
- var(--accent) is reserved for the single primary action on a screen. Never tint icons, chips, headers, or decoration with it.
- Secondary actions use var(--bg) fill with var(--fg-2) text. No third button colour exists.
- var(--success), var(--warn), var(--danger) appear only inside form validation, never as decoration.
- Dividers, when unavoidable, use var(--border-soft); structural outlines use var(--border).

## Type
- Display face var(--font-display) for screen titles only, at var(--text-4xl) weight 500, line-height var(--leading-tight).
- Everything else uses var(--font-body): section headings var(--text-2xl) weight 500, item names var(--text-xl) weight 500, body and buttons var(--text-base) weight 400–500.
- Only two weights exist: 400 and 500. No bold, no light, no italics.
- Letter-spacing stays normal at every size; no uppercase transforms on titles, buttons, or labels.
- Body copy line-height var(--leading-body); button and label line-height var(--leading-tight).
- Numeric or code-like values may use var(--font-mono) at var(--text-sm).

## Shape and depth
- Interactive elements use var(--radius-sm). Larger image panels use var(--radius-md). Nothing else is rounded; var(--radius-pill) is limited to carousel dots and avatars.
- Default elevation is var(--elev-flat). Cards and panels carry no shadow and no border.
- var(--elev-ring) is the only way to outline a container; var(--elev-raised) is allowed only on a floating bottom bar.
- Focus states use var(--focus-ring).
- All state changes run at var(--motion-base) with var(--ease-standard); colour and border only, never scale or translate.

## Layout and density
- 390px wide, 12px side gutters (var(--space-3)); content blocks separated by var(--space-8) to var(--space-12).
- One message per screen: a single dominant image or block, one title, at most two actions.
- Primary buttons are full-width minus gutters, minimum 44px tall, var(--radius-sm), var(--accent) fill, var(--accent-on) label.
- Secondary buttons match size and radius with var(--bg) fill and var(--fg-2) label; stack them vertically with var(--space-2) between.
- Lists are single-column with var(--space-4) row gaps and no separators; use spacing, not lines.
- Images run edge to edge with no padding; text sits directly on the image in white when the image is dark enough.

## Signature moves
- A full-bleed photograph occupying most of the screen with a single white title floating over it and no scrim, gradient, or overlay.
- One blue primary button paired with one white secondary button, both 44px+ tall, 4px radius, stacked under the title.
- A transparent header that shows no background, border, or shadow until content scrolls beneath it.
- Large image tiles with var(--radius-md) corners and a small white label in the top-left corner, clipped by overflow.
- A persistent bottom bar with a text input, a send affordance, and one secondary action, separated from content by var(--elev-raised) alone.

## Avoid
- No shadows on cards, panels, or buttons; no gradients, patterns, or decorative backgrounds anywhere.
- No second chromatic colour beyond var(--accent); no coloured icons or tinted surfaces.
- No pill-shaped buttons, no radii above var(--radius-md) on controls.
- No uppercase text, no letter-spacing tweaks, no weights outside 400 and 500.
- No hover or press animations that scale, lift, or slide elements.
- No more than two actions visible on one screen, and no borders used to separate list rows.
