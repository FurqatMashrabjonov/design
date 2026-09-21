# Sunny Sketchbook — style card
Mood: Warm cream paper with hand-drawn, marker-like shapes and a single bright orange accent; friendly and informal but still legible.
Colour energy: medium — accent orange appears on one primary action per screen plus small status marks; most surface area stays cream and white.

## Colour use
- Screen background: var(--bg); cards and sheets: var(--surface).
- Highlight blocks, chips and selected rows: var(--surface-warm).
- Body text: var(--fg); secondary text: var(--fg-2); captions and metadata: var(--muted).
- Primary action fill: var(--accent) with var(--accent-on) label; pressed state var(--accent-active).
- Status only: var(--success), var(--warn), var(--danger); never as large fills.
- Dividers and card outlines: var(--border); inner hairlines: var(--border-soft).
- Keep accent coverage under roughly one fifth of the screen; everything else is cream, white and ink.

## Type
- Display and body share var(--font-display); use it for headings, buttons and labels.
- Numerals, codes and tabular values: var(--font-mono).
- Screen title: var(--text-2xl) at weight 700, tracking var(--tracking-display), leading var(--leading-tight).
- Section heading: var(--text-xl) weight 700; card title: var(--text-lg) weight 600.
- Body: var(--text-base) weight 400, leading var(--leading-body).
- Labels and captions: var(--text-sm) weight 500; legal and timestamps: var(--text-xs) weight 400 in var(--muted).
- Never set a full screen in one size; step at least two levels between title and body.

## Shape and depth
- Cards and inputs: var(--radius-md); large sheets and modals: var(--radius-lg); small chips: var(--radius-sm).
- Buttons and tags: var(--radius-pill).
- Default card treatment is flat with var(--elev-ring); reserve var(--elev-raised) for one floating element per screen.
- Focus state: var(--focus-ring) on every interactive element.
- Transitions: var(--motion-fast) for taps, var(--motion-base) for sheets, easing var(--ease-standard).

## Layout and density
- Phone gutter: var(--container-gutter-phone); stack content in single column with var(--space-4) between blocks.
- Vertical rhythm from var(--space-2), var(--space-3), var(--space-4), var(--space-6), var(--space-8).
- Screen top padding: var(--space-6); bottom padding: var(--space-12) so the last card clears the home indicator.
- Every tappable row, button and input is at least 44px tall; icon-only controls are 44x44px.
- One primary action per screen; secondary actions sit as outlined pills on var(--surface).

## Signature moves
- Cream var(--bg) canvas with white cards outlined by var(--border) instead of heavy shadows.
- A single orange var(--accent) pill button as the only saturated element on the screen.
- Rounded var(--radius-pill) chips and tags for filters, categories and status.
- Handwritten-feeling display type at var(--text-2xl) or larger for the screen title, with body copy two steps smaller.
- Warm var(--surface-warm) blocks used to group related rows inside a white card.

## Avoid
- No hex values, gradients or off-token colours; use only the listed custom properties.
- No more than one raised shadow per screen; no drop shadows on every card.
- No all-caps body text, no letter-spacing on paragraphs.
- No controls shorter than 44px, no icon-only buttons without a 44px hit area.
- No mixing of unrelated decorative metaphors; keep one sketchy, warm visual language.
