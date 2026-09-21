# Warm Editorial Sharp — style card
Mood: A warm cream magazine page with off-black type set ultra-tight and near-rectangular controls; one hot orange accent lands like a stamp.
Colour energy: low — under 10% of a screen carries accent colour; the rest is warm cream, white, off-black and oat.

## Colour use
- Screen background is var(--bg); lifted cards and panels sit on var(--surface) so they punch above the warm canvas.
- Body and heading text is var(--fg); captions and metadata use var(--muted) and var(--meta).
- Every card edge and divider is warm: var(--border) for card outlines, var(--border-soft) for inner row separators. Never a cool grey.
- var(--accent) is reserved for the single primary action on a screen and for AI/brand moments. One accent element per screen, two at most.
- Text on accent is var(--accent-on); pressed accent uses var(--accent-active).
- Status uses var(--success), var(--warn), var(--danger) as small dots or 12px labels only, never as fills.

## Type
- Everything is var(--font-display) / var(--font-body); technical labels and uppercase eyebrows use var(--font-mono).
- Headings: weight 400, line-height var(--leading-tight), letter-spacing var(--tracking-display). Screen title 32px (var(--text-2xl)); section heading 24px (var(--text-xl)).
- Body 16px (var(--text-base)) at var(--leading-body); secondary body 14px (var(--text-sm)) at weight 300.
- Mono labels: 12px (var(--text-xs)), uppercase, letter-spacing 0.6px–1.2px.
- Hierarchy comes from size and tracking, not from tonal shifts: headings and body share var(--fg).

## Shape and depth
- Buttons and inputs: var(--radius-sm). Never round a button past 4px.
- List rows and nav items: var(--radius-md). Cards and containers: var(--radius-lg).
- Badges and status dots: var(--radius-pill).
- Depth is borders and surface tints, not shadows: cards use var(--elev-flat) with a 1px var(--border) edge; only floating sheets use var(--elev-raised).
- Focus is var(--focus-ring), never a browser-blue outline.

## Layout and density
- 390px wide, 12px side gutters (var(--container-gutter-phone)); content blocks separated by var(--space-4) to var(--space-6).
- Screen top-to-bottom rhythm uses var(--space-8) between major blocks; generous whitespace, few elements per screen.
- All tappable controls are at least 44px tall; primary buttons are 48px tall with 16px horizontal padding.
- Cards stack full-width, one per row, 16px inner padding.
- Transitions use var(--motion-fast) / var(--motion-base) with var(--ease-standard).

## Signature moves
- A warm cream canvas with pure-white lifted cards, each outlined by a 1px oat border and no shadow.
- Oversized headings set at line-height 1.00 with aggressive negative tracking, so two lines almost touch.
- Near-rectangular 4px-radius buttons: solid off-black fill with white label for primary, 1px off-black outline for secondary.
- Exactly one hot orange element per screen — the primary CTA or an AI moment — against an otherwise neutral palette.
- 12px uppercase mono labels with wide tracking used as eyebrows above headings and as row metadata.

## Avoid
- No cool grey borders or cool grey surfaces anywhere.
- No border-radius above 8px on any container; no pill-shaped buttons.
- No drop shadows on cards; no gradients, no glassmorphism, no coloured card fills.
- No accent colour used decoratively, for icons at rest, or for more than one action per screen.
- No positive letter-spacing on headings and no line-height above 1.5 on body.
- No control shorter than 44px.
