---
name: mobile-app-screens
description: Design a multi-screen mobile app UI in HTML/CSS that reads as one app, not five screens. Use when asked to design phone screens, an app flow, or a mobile prototype — plan the app first, then generate each screen against a shared contract. Covers navigation, data consistency, platform minimums, image handling and the craft rules that separate a designed screen from a generated one.
---

# Mobile app screens

Generating phone screens one at a time produces five apps. This skill is the opposite order: decide
the app once, then draw each screen against what was decided. The rules below are the ones that
survive contact with real output; each is a decision and its reason.

## 1. Plan before drawing

Write the plan down before any HTML exists:

- **App name and one-sentence summary.**
- **Screens**, each with a type: a root tab, a detail view pushed from somewhere, or a modal flow.
- **Navigation**: 2–5 bottom-bar destinations, each one the root of a tab. A destination that opens
  no screen gets cut; a screen that no tab or link reaches gets cut.
- **Data**: the four or five entities the app is about, with real values — the dishes, the
  transactions, the habits. Every screen that shows them uses *these*, not its own inventions.

The plan is a contract, not a suggestion. When a screen needs an item the plan does not have, the
plan gains it — the screen does not invent one, or the cart total will disagree with the menu.

## 2. The shell is built once and repeated

Build the bottom bar as one string and paste it into every root screen, identical but for which tab
is active. Asking for "the same tab bar" on each screen produces bars with different labels, icons
and heights, because each screen is an independent sample.

Pick the bar's **shape** once per app and keep it:

- **island** — a rounded panel inset ~12px from the edges, bottom ~12px, radius ~28px, its own
  shadow instead of a top border, labels under the icons.
- **pill** — a narrow centred pill, translucent with a blur, icons only.
- **contrast** — a filled pill in the page's text colour, icons only, so it inverts itself on a dark
  design system.

An edge-to-edge bar with a hairline on top is what dates a generated app: it is on every screen, so
it is read as the app's age. Mark the active tab with a **shape** — a tinted pill behind the icon and
label, or a dot under an icon-only tab — not with colour alone, which is easy to miss.

Leave room for it: a floating bar needs about 112px of bottom padding on the page, an edge-to-edge
one about 88px.

## 3. Platform minimums

These are not preferences:

- Nothing below **11px**, captions and tab labels included.
- Body copy **15–17px**.
- Every tappable thing has a **44×44px** hit area (the drawn icon can be smaller; the target cannot),
  with 8px between separate targets.
- Text contrast **4.5:1** against its real background, 3:1 from 24px up.
- The viewport is **390px** wide and the host draws the phone: no status bar, notch or home
  indicator, no fixed width on the root, nothing scrolling sideways but a deliberate carousel.

## 4. One screen, one job

- Name the screen's job in a sentence. Everything on it serves that sentence.
- **One primary action**, one filled accent button, in the bottom third or pinned above the bar.
- Three levels of hierarchy, no more. Build them from weight and colour before size.
- Group with space first, then a container, then a divider. Space inside a group is always smaller
  than space between groups — equal gaps everywhere is why a screen reads as a pile.
- Show 3–5 items of a long list with "See all". A phone screen that shows everything shows nothing.

## 5. Craft that has one right answer

Apply these in code after generation rather than asking for them:

- `font-variant-numeric: tabular-nums` on prices, stats and times.
- `text-wrap: balance` on headings, `pretty` on body copy.
- A visible `:focus-visible` ring on everything focusable.
- `transform: scale(.96)` on press, inside `@media (prefers-reduced-motion: no-preference)`.
- A 1px outline at 10% of the text colour on photos, so an image on a near-matching surface has an
  edge without a visible border.
- Nested corners are concentric: inner radius = outer radius − padding.

## 6. The tells of generated UI

Each of these clusters in AI output; refuse them by name:

- A tracked-out ALL-CAPS eyebrow above every heading. Sentence case everywhere, buttons included.
- Meta strings glued with middle dots ("12 min · Easy · 4.8 · Vegan") on every card.
- Monospace for data that is not code.
- A grid of identical rounded cards with the same soft grey shadow as the answer to every section.
- Decorative numbering (01 / 02 / 03) where nothing is sequential.
- A fade-and-slide on every section. At most one entrance sequence, whole blocks ~100ms apart.

## 7. Content and images

- Write the real thing: specific names, plausible numbers, times that fit today, prices that fit the
  product. Never lorem ipsum, "Feature one", or invented metrics ("10× faster").
- Numbers agree with each other: a ring at 71% next to "1,340 of 2,000 kcal" is wrong.
- Write in the brief's language — every label, number format and date.
- Images: describe what the photo shows and give it its box in CSS (`width` plus `aspect-ratio`), then
  fill the src from a real photo source. A model-invented image URL is a 404, and an image without a
  locked box decides the layout.
- Icons come from one icon set, sized with CSS and coloured with `currentColor`. Never hand-drawn
  SVG, never emoji as icons.

## 8. Before you emit

Read the screen as its user, at arm's length: can I tell what this screen is for in two seconds? Is
the primary action obvious and reachable? Does anything overlap, clip, or wrap awkwardly at 390px?
Is any text too small or too faint to read? Fix those, then emit.

See `references/shell.md` for the bar markup, and `references/checklist.md` for the pass to run over
a finished screen.
