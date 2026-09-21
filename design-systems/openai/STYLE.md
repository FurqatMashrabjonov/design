# Quiet Teal Editorial — style card
Mood: A calm, near-monochrome research-lab surface: true white, soft black ink, one restrained teal accent, and editorial serif headlines over a sans UI.
Colour energy: low — accent colour covers under 5% of a screen: one link, one badge, one primary action at most.

## Colour use
- Screen background is var(--bg); cards and elevated panels sit on var(--surface); section breaks and footers use var(--surface-warm).
- Primary text is var(--fg); secondary text and captions var(--muted); placeholders and tertiary labels var(--meta).
- Accent var(--accent) is reserved for links, the single highlighted action, and success states; pressed state var(--accent-active), hover var(--accent-hover); text on accent is var(--accent-on).
- Separators are 1px var(--border); card outlines on white use var(--border-soft).
- Semantic colour only for meaning: var(--danger) for validation and destructive actions, var(--warn) for advisory notes, var(--success) for confirmations.
- Never tint large areas with accent; whitespace, not colour, separates regions.

## Type
- Body and all UI text use var(--font-body) at 400; labels, nav and captions at 500; headings at 600. Never above 600.
- Editorial display headlines use var(--font-display) at 400, size var(--text-4xl), line-height var(--leading-tight), tracking var(--tracking-display).
- Screen heading: var(--text-3xl) / 600. Section heading: var(--text-2xl) / 600. Sub-section: var(--text-xl) / 600.
- Reading text: var(--text-base) / 400 with line-height var(--leading-body); lede paragraphs var(--text-lg).
- Metadata and badges: var(--text-sm) / 500. Eyebrow and uppercase labels: var(--text-xs) / 500 with 0.04em tracking.
- Code or numeric readouts use var(--font-mono) at var(--text-sm).
- Hierarchy comes from size and colour, not weight.

## Shape and depth
- Buttons and inputs: var(--radius-sm). Cards and panels: var(--radius-md). Chips, tags and pills: var(--radius-pill).
- Default elevation is var(--elev-flat); a card may carry var(--elev-ring) as a 1px outline.
- Only on press or hover does a card lift to var(--elev-raised).
- Focused inputs and controls show a var(--accent) border plus var(--focus-ring).
- No gradients, no coloured shadows, no hard corners.

## Layout and density
- 390px-wide screens use a 24px side gutter; content sits on a 4px grid with gaps from var(--space-2) to var(--space-6).
- Vertical rhythm between major blocks is var(--space-12) on phone; keep var(--space-16) for the largest breaks only.
- Cards pad 24px (var(--space-6)); list rows pad 16px vertically.
- Every tappable control is at least 44px tall, including pills and icon buttons.
- One idea per block; leave generous empty space rather than adding dividers.

## Signature moves
- A serif display headline at var(--text-4xl) sitting alone above sans-serif body copy — the editorial/sans split is the tell.
- A single teal element per screen (link, badge or primary action) against otherwise black-and-white content.
- Pill-shaped chips at var(--radius-pill) with var(--surface) fill and var(--muted) text for tags and filters.
- Hairline var(--border) outlines instead of shadows; surfaces stay flat until touched.
- Primary action as a solid var(--fg) pill with var(--accent-on) text, with the teal reserved for the secondary or highlighted path.

## Avoid
- Saturated fills, gradients, or accent colour across more than one element per screen.
- Font weights of 700 or heavier, and all-caps body text.
- Drop shadows at rest, thick borders, or radii outside var(--radius-sm), var(--radius-md) and var(--radius-pill).
- Decorative motion, parallax, or transitions longer than var(--motion-base).
- Dense, boxed-in layouts that fill the screen edge to edge.
