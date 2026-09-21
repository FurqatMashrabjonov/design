# Mobile screen craft

How a designer who has shipped apps builds one phone screen. Each rule is a decision and its reason.
The design system's style card above decides the *look*; this decides whether the screen *works*.
Where the two disagree on look, the style card wins. Where they disagree on a number below, the larger, safer value wins.

## 1. One screen, one job

- **Name the screen's job in a sentence before drawing.** "See today's progress and log a meal." Everything on the screen serves that sentence; anything else moves to another screen.
- **One primary action.** It is the only filled, accent-coloured button, and it sits where a thumb rests: the bottom third, full width, or pinned above the tab bar. A second filled button means the screen has two jobs.
- **Order by importance, top to bottom.** The thing the person came for is visible without scrolling. Settings, legal text and rarely used actions go last or behind a row that pushes to another screen.
- **Group what belongs together; separate what does not.** Use space first, then a container, then a divider. Space inside a group is smaller than space between groups, always — equal gaps everywhere is the most common reason a screen reads as a pile.
- **Disclose progressively.** Show 3–5 items of a long list with "See all"; show a summary number with its detail one tap away. A phone screen that shows everything shows nothing.

## 2. Hierarchy and type

- **Three levels, no more:** one primary element (a number, a title, a hero image), a few secondary, the rest tertiary. If two elements compete for first place, demote one.
- **Build hierarchy from weight and colour before size.** Primary text in `var(--fg)`, supporting text in `var(--muted)`, metadata in `var(--meta)`. Size alone makes a screen shout.
- **At most four font sizes and three weights on a screen.** Body text 15–17px, never below 15. Secondary 13–14px. Nothing on the screen below 11px, captions included.
- **Headings are short.** A screen title is 1–3 words. Section labels are 1–2 words. If a heading wraps to three lines at 390px, rewrite it.
- **Numbers that update or align use `font-variant-numeric: tabular-nums`.** Units are smaller and lighter than the number they follow.
- **Long text truncates on purpose:** one line with an ellipsis for titles in rows, two lines for descriptions. Never let a label push its neighbour off the row.
- Type comes only from `var(--font-display)`, `var(--font-body)`, `var(--font-mono)`.

## 3. Colour

- **Every colour is a token** from the `:root` block: `var(--bg)`, `var(--surface)`, `var(--fg)`, `var(--muted)`, `var(--border)`, `var(--accent)` … Never write a hex value outside `:root`, never `bg-white` or `#fff` for a surface.
- **Spend accent the way the style card's "Colour energy" line says.** Low energy: accent on the primary action, the active state and one highlight — the rest is neutral. High energy: accent also fills progress, badges and large surfaces. A low-energy system painted in accent is as wrong as a high-energy one left grey.
- **Status colours mean status.** `var(--success)`, `var(--warn)`, `var(--danger)` appear only where something succeeded, needs attention, or failed — never as decoration, never as a category palette.
- **Text contrast is at least 4.5:1** against its actual background, 3:1 for text 24px and larger. Light grey text on white is the most common failure: use `var(--muted)`, not a lighter invention.
- No indigo/violet defaults (`#6366f1`, `#4f46e5`, `#8b5cf6` and neighbours), no two-stop purple→blue gradient, no gradient at all unless the style card asks for one.

## 4. Layout and touch

- **The viewport is 390px wide and the host draws the phone.** No status bar, notch or home indicator. No fixed pixel width or `max-width` on the root; the root is a block or a column — never a row flex container. Nothing scrolls sideways unless it is an intentional carousel whose next card peeks in.
- **16px side gutters** (20px if the style card is airy). Cards and rows run the full content width; do not inset cards inside cards.
- **Everything tappable is at least 44×44px**, including icon buttons, chips, steppers and close buttons. Rows in a list are 48–64px tall. Leave 8px between separate targets.
- **Spacing comes from a 4px scale:** 4, 8, 12, 16, 24, 32, 48. Pick three or four values and reuse them; a screen with eleven different gaps looks unplanned.
- **A row reads left to right:** leading icon or thumbnail, title over one line of supporting text, trailing value or chevron. The trailing element is right-aligned and never wraps.
- **Bottom of the page:** follow the SHELL CONTRACT's bottom padding exactly. With a pinned action bar of your own, pad the content by the bar's height plus 16px.

## 5. Components

- **Buttons:** one filled primary per screen; secondary actions are outlined or plain text; destructive actions are `var(--danger)` text, never a filled red button next to the primary. Labels are verbs: "Save meal", not "OK".
- **Inputs** have a visible label above them (a placeholder is not a label), are 48px tall or more, and show the keyboard-appropriate `type` and `inputmode`. Show at most one validation message, under the field it belongs to.
- **Choosing between 2–4 options** is a segmented control; between many, a list that pushes or a sheet. Filters are horizontally scrolling chips with the active one filled.
- **Lists of the same kind of thing are lists, not grids of cards.** Use a 2-column grid only for visual items — photos, products, album art.
- **Data belongs in a chart only when its shape matters.** One number with a delta beats a chart of seven bars nobody will read. Label axes or values directly; no legends that need a lookup.
- **Empty, loading and error states** are designed only when the brief asks for them. Otherwise show the screen populated, mid-use, with realistic data.

## 6. Content

- **Write the real thing.** Specific names, plausible numbers, times that fit today's date, prices that fit the product. Use the APP CONTENT block for the signed-in user, the other people, the date and the currency — exactly as given, on every screen.
- **Numbers agree with each other:** a ring at 71% next to "1,340 of 2,000 kcal" is wrong. Totals add up, streaks fit the calendar, "3 items" lists three.
- **Write in the brief's language.** If the brief is in Uzbek or Russian, every label, number format and date on the screen is too.
- Never lorem ipsum, "Feature one", "Your text here", or invented performance claims ("10× faster", "99.9% uptime").

## 7. Icons and imagery

- Icons are `<i data-lucide="name"></i>` only, sized with CSS, coloured with `currentColor`. Never draw icon SVG by hand, never use emoji as icons. One icon per meaning across the screen.
- A leading icon sits in a 36–44px tinted container or stands alone — pick one treatment and keep it.
- Your own `<svg>` is for what no icon library has: a chart, a progress ring, a map sketch, a logo mark.

## 8. Motion and interaction

- Interactivity is a small inline `<script>` at the end of `<body>`: switching a segment, toggling a switch, expanding a row. No frameworks, no network calls.
- Motion is CSS only, 150–250ms, ease-out, on state changes the person caused. Nothing loops except a loading indicator. Wrap non-essential animation in `@media (prefers-reduced-motion: no-preference)`.

## 9. Accessibility floor

- `<html lang="…">` matches the content's language. Actions are `<button>`, navigation is `<a href>`; never a clickable `<div>`.
- Icon-only buttons carry `aria-label`. Images carry `alt` (empty for decoration). Inputs are tied to their `<label>`.
- Colour is never the only signal: a status has an icon or a word as well as a colour.

## 10. Part of an app

- **The SHELL CONTRACT wins.** When the brief says the tab bar or the detail header is injected, draw none of it — not a second tab bar, not a floating action button, not your own back button — and leave the space it asks for.
- A root tab screen opens with its title (or a greeting) on the left and at most two utility icons on the right. A detail screen opens directly with its content; its header is injected.
- **When a HOUSE STYLE block is given, reuse it verbatim:** the same card padding, radii, section spacing and label treatment. A second visual dialect inside one app is the clearest sign it was assembled by a machine.

## Before you emit

Read the screen as its user at arm's length: Can I tell what this screen is for in two seconds? Is the primary action obvious and reachable? Does anything touch the screen edge, overlap, or wrap awkwardly at 390px? Is there any text I would not be able to read? Fix those, then emit.
