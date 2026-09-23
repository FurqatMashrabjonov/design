# Mobile screen craft

How a designer who has shipped apps builds one phone screen: each rule is a decision and its reason.
The style card above decides the *look* and wins on look; where a number differs, the larger, safer one wins.

## 1. One screen, one job

- **Name the screen's job in a sentence before drawing.** "See today's progress and log a meal." Everything on the screen serves that sentence; anything else moves to another screen.
- **One primary action.** It is the only filled, accent-coloured button, and it sits where a thumb rests: the bottom third, full width, or pinned above the tab bar. A second filled button means the screen has two jobs.
- **Order by importance.** What the person came for is visible without scrolling; settings, legal text and rare actions go last or one tap away.
- **Group with space first, then a container, then a divider.** Space inside a group is always smaller than space between groups; equal gaps everywhere is why a screen reads as a pile.
- **Disclose progressively.** 3–5 items of a long list with "See all"; a summary number with its detail one tap away.

## 2. Hierarchy and type

- **Three levels, no more:** one primary element, a few secondary, the rest tertiary. If two compete for first place, demote one.
- **Build hierarchy from weight and colour before size.** Primary text in `var(--fg)`, supporting text in `var(--muted)`, metadata in `var(--meta)`. Size alone makes a screen shout.
- **At most four font sizes and three weights on a screen.** Body text 15–17px, never below 15. Secondary 13–14px. Nothing on the screen below 11px, captions included.
- **Headings are short.** A screen title is 1–3 words. Section labels are 1–2 words. If a heading wraps to three lines at 390px, rewrite it.
- **At most two typeface families on a screen**, and if there are two they must be obviously different (a display face against a text face). Units are smaller and lighter than the number they follow.
- **Long text truncates on purpose:** one line with an ellipsis for titles in rows, two lines for descriptions. Never let a label push its neighbour off the row.
- Type comes only from `var(--font-display)`, `var(--font-body)`, `var(--font-mono)`.

## 3. Colour

- **Every colour is a token** from the `:root` block: `var(--bg)`, `var(--surface)`, `var(--fg)`, `var(--muted)`, `var(--border)`, `var(--accent)` … Never write a hex value outside `:root`, never `bg-white` or `#fff` for a surface.
- **Spend accent the way the style card's "Colour energy" line says.** Low energy: accent on the primary action, the active state and one highlight — the rest is neutral. High energy: accent also fills progress, badges and large surfaces. A low-energy system painted in accent is as wrong as a high-energy one left grey.
- **Status colours mean status.** `var(--success)`, `var(--warn)`, `var(--danger)` only where something succeeded, needs attention or failed — never decoration, never a category palette.
- **Contrast at least 4.5:1** against the real background (3:1 above 24px). Light grey on white is the usual failure: use `var(--muted)`, not a lighter invention.
- **Four to six colours decide the screen** — background, surface, text, muted text, accent, one status. A screen that uses nine has no palette.
- No indigo/violet defaults (`#6366f1`, `#4f46e5`, `#8b5cf6` and neighbours), no two-stop purple→blue gradient, no gradient at all unless the style card asks for one.

## 4. Layout and touch

- **The viewport is 390px and the host draws the phone.** No status bar, notch or home indicator. No fixed width or `max-width` on the root; the root is a block or a column, never a row flex. Nothing scrolls sideways but a carousel whose next card peeks in.
- **16px side gutters** (20px if the style card is airy). Cards and rows run the full content width; do not inset cards inside cards.
- **Everything tappable is at least 44×44px**, including icon buttons, chips, steppers and close buttons. Rows in a list are 48–64px tall. Leave 8px between separate targets.
- **Spacing comes from a 4px scale:** 4, 8, 12, 16, 24, 32, 48. Pick three or four values and reuse them; a screen with eleven different gaps looks unplanned.
- **A row reads left to right:** leading icon or thumbnail, title over one supporting line, trailing value or chevron that never wraps.
- **Bottom of the page:** follow the SHELL CONTRACT's bottom padding exactly. With a pinned action bar of your own, pad the content by the bar's height plus 16px.

## 5. Components

- **Buttons:** one filled primary; secondary outlined or plain text; destructive is `var(--danger)` text, never filled red beside the primary. Labels are verbs: "Save meal", not "OK".
- **Inputs** carry a visible label above (a placeholder is not a label), stand 48px tall or more, and set `type`/`inputmode`. One validation message, under its field.
- **Choosing between 2–4 options** is a segmented control; between many, a list that pushes or a sheet. Filters are horizontally scrolling chips with the active one filled.
- **Lists of the same kind of thing are lists, not grids of cards.** Use a 2-column grid only for visual items — photos, products, album art.
- **A chart only when the shape matters.** One number with a delta beats seven bars nobody reads; label values directly, no legends.
- **Empty, loading and error states** only when the brief asks. Otherwise the screen is populated, mid-use.

## 6. Content

- **Write the real thing:** specific names, plausible numbers, times that fit today, prices that fit the product. Take the user, the other people, the date and the currency from APP CONTENT exactly as given.
- **Numbers agree with each other:** a ring at 71% next to "1,340 of 2,000 kcal" is wrong. Totals add up, streaks fit the calendar, "3 items" lists three.
- **Write in the brief's language.** If the brief is in Uzbek or Russian, every label, number format and date on the screen is too.
- Never lorem ipsum, "Feature one", "Your text here", or invented performance claims ("10× faster", "99.9% uptime").

## 7. Icons and imagery

- Icons are `<i data-lucide="name"></i>` only, sized with CSS, coloured with `currentColor`. Never draw icon SVG by hand, never use emoji as icons. One icon per meaning across the screen.
- **Photos are slots, not URLs:** `<img data-od-img="grilled salmon bowl, top view" alt="Grilled salmon bowl">` with no `src` — 3–6 plain words, its box in CSS (`width` plus `aspect-ratio` or `height`), and only where a real app has a photo. An avatar is `<img data-od-avatar="Full Name" alt="Full Name">`, sized in CSS.
- Your own `<svg>` is for what no icon library has: a map sketch or a logo mark. Charts and progress rings are `data-od-chart` slots.

## 8. Motion and interaction

- Interactivity is a small inline `<script>` at the end of `<body>`: segments, switches, expanding rows. No frameworks, no network calls.
- Motion is CSS only, 150–250ms, ease-out, on state changes the person caused. Nothing loops except a loading indicator. Wrap non-essential animation in `@media (prefers-reduced-motion: no-preference)`.
- **At most one entrance sequence on load**, and it moves whole blocks in order (~100ms apart), not every section on its own. A fade-and-slide on each card is the single clearest sign a machine made the page.

## 9. Accessibility floor

- `<html lang="…">` matches the content's language. Actions are `<button>`, navigation is `<a href>`; never a clickable `<div>`.
- Icon-only buttons carry `aria-label`. Images carry `alt` (empty for decoration). Inputs are tied to their `<label>`.
- Colour is never the only signal: a status has an icon or a word as well as a colour.

## 10. Part of an app

- **The SHELL CONTRACT wins.** When the brief says the tab bar or the detail header is injected, draw none of it — not a second tab bar, not a floating action button, not your own back button — and leave the space it asks for.
- A root tab screen opens with its title (or a greeting) on the left and at most two utility icons on the right. A detail screen opens directly with its content; its header is injected.
- **When a HOUSE STYLE block is given, reuse it verbatim:** the same card padding, radii, section spacing and label treatment. A second visual dialect inside one app is the clearest sign it was assembled by a machine.

## 11. The tells that say "a machine made this"

These cluster in generated screens; each one is banned by name.

- **No tracked-out ALL-CAPS eyebrow above a heading.** A section needs a heading, not a label above the heading. Sentence case everywhere, including buttons and tabs.
- **No meta strings glued together with middle dots** ("12 min · Easy · 4.8 · Vegan") on every card. Show the one or two facts that decide, in plain words.
- **No monospace for data that is not code.** Prices, dates and counts are the body face.
- **No grid of identical rounded cards with the same soft grey shadow** as the answer to every section. Vary what a section is: a row, a list, a single number, a photo that fills the width.
- **No decorative numbering** (01 / 02 / 03) unless the content really is a sequence.
- Borders, dividers and containers are there to separate things that would otherwise run together — never as texture.

## Before you emit

Read the screen as its user at arm's length: Can I tell what this screen is for in two seconds? Is the primary action obvious and reachable? Does anything touch the screen edge, overlap, or wrap awkwardly at 390px? Is there any text I would not be able to read? Fix those, then emit.
