# od-kit catalog

`od-kit.css` is injected into any screen that uses an `od-` class. Every value is a token, so the same markup renders in every design system. Samples of each block are in `samples.ts`; see them all with `node --import ./eval/alias-hook.mjs kit/gallery.ts` (writes `eval/out/kit-gallery/`).

Format: block — variants/elements — when to use.

## Layout
- `od-page` — screen body: 16px inset, 20px between sections.
- `od-stack` / `od-grid` (2 cols) / `od-bento` + `__wide` — vertical rhythm, a tile grid, a grid that opens on one wide tile.
- `od-carousel` — horizontal scroller that bleeds to the screen edge; holds chips or `od-card--carousel`.
- `od-divider` — a hairline.

## Headers and labels
- `od-header` (large title) — `__bar` (44px, `__actions` right), `__title`, `__sub` — the top of a root tab.
- `od-header--compact` — back · centred title · action in a 44/1fr/44 grid — a pushed screen, a modal or a sheet.
- `od-header--greeting` — avatar + `__sub` ("Good morning") + name, bell on the right — a home tab.
- `od-hero` — `__eyebrow`, `__title`, `__sub` — a free-standing intro block (welcome, detail top).
- `od-section` — `__head`, `__title`, `__link` — a titled section with "See all".
- `od-label` / `--accent` — small uppercase tracked label; use it as the section head instead of a big title (quieter screens).

## Lists
- `od-list` — card of rows with inset hairlines; `--plain` drops the card.
- `od-group` — `__label` (an `od-label`) above an `od-list`, `__note` below — settings and forms, iOS inset-grouped.
- `od-row` — `__lead`, `__body` (`__title`, `__sub`), `__trail` — default 52-56px row with a 40px tinted icon.
  - `--compact` — 44px row, 30px icon tile — settings.
  - `--media` — 56px photo lead (`__lead--round` for a round one) — food, places, people.
  - `--tall` — 72px — media rows or two-line content.
  - `--chevron` — disclosure arrow — row opens something.
  - `__lead--solid` — filled accent icon tile (iOS settings); `__value` — muted trailing value ("English"); `__meta` — small trailing unit; `__trail--stack` — figure over unit.
- `od-check` / `--square` — 24px round (or square) check — to-do and selection rows.
- `od-switch` — iOS switch, inside a row.
- `od-kv` / `--total` — label/value lines — receipts, details.
- `od-timeline` — `__item` (`is-done`, `is-current`), `__dot` — order or progress steps.

## Figures
- `od-stat` — `__label`, `__value`, `__delta` (`--up`/`--down`), `__icon` (32px tile above) — one figure.
  - `--sm` — tile-size figure; `--lg` — the one big figure of a screen; `__label--micro` — uppercase label.
- `od-metrics` — 2-3 `od-stat` in one card, split by hairlines — run stats, totals.
- `od-ring` / `--sm` (44) / `--lg` (148) / `--success` — `__value`, `__label`, `style="--value:72%"` — progress toward a goal.
- `od-progress` / `--thin` / `--success` / `--warn` — `style="--value:68%"` — a bar.
- `od-price` + `__unit` — a price.

## Leading cards (pick one per screen, vary across screens)
- `od-summary` — `__label`, `__value`, `__meta`, `__foot` — the default lead card with a figure.
  - `--tinted` — soft accent wash — "next up", a highlighted item, no big number needed.
  - `--outlined` — hairline, no fill — a quieter secondary summary.
  - `--accent` — solid accent with `--accent-on` text — one hero figure, at most one per screen.
  - `--image` — photo with a dark scrim, white text (put the `<img data-od-img>` first) — trips, events, places.
- `od-card` — `__title`, `__meta`; `--flat`, `--glass`, `--media` (+ `__body`, `od-media`), `--carousel` (240px; `+ --sm` 160px) — generic content card.
- `od-media` / `--wide` / `--square` — a photo box inside a card.
- `od-feature` / `--wide` — full-bleed photo card with `__top` (tag, save), `__body` (`__eyebrow`, `__title`, `__meta`) — editorial picks, programmes, recipes.
- `od-banner` / `--success` / `--warn` / `--danger` — an inline notice.

## Input
- `od-btn` — `--secondary`, `--ghost`, `--danger`, `--sm`, `--block`; `od-icon-btn` (44px) — one filled button per screen.
- `od-form` — `__field` (`__label` + bare `input`/`select`), `__field--inline` (label left, value right) — several fields in one card instead of a box per input.
- `od-field` / `--error` — `__label`, `__help` + `od-input` — a single boxed field.
- `od-search` — pill search field.
- `od-options` / `--2` / `--4` — grid of `od-option` tiles (icon + label; `--row` for a wide row; `is-active`) — pick a category, time, plan.
- `od-swatches` + `od-swatch` (`style="--swatch:var(--success)"`, `is-active`) — pick a colour.
- `od-segmented` / `--pill` / `--underline` — 2-4 views of one list; underline for page-level tabs.
- `od-chip` / `--sm` / `--tinted` (`is-active`) in `od-carousel` (one line) or `od-chips` (wrapping) — filters.
- `od-stepper` — quantity.

## Dates
- `od-week` + `od-week__day` (`<small>` weekday, `is-active`, `is-done` dot) — a day picker strip.
- `od-calendar` — `__dow`, `__day` (`is-today`, `is-active`, `is-muted`, `data-level` soft tint) — a month.
- `od-heat` — `<i data-level="0-4">` cells, 7 rows, one column per week — streaks and activity history.

## People and small parts
- `od-avatar` / `--sm` / `--lg`; `od-avatars` (+ `__more` "+4") — a face; an overlapping group.
- `od-tag` / `--neutral` / `--success` / `--warn` / `--danger` — status label.
- `od-badge` — count on an icon. `od-rating` — star + figure.

## States and bars
- `od-empty` — `__icon`, `__title`, `__text`; `--card` (dashed box), `--inline` (icon left, one line) — nothing here yet.
- `od-sheet` — `__grabber`, `__title` + content — a bottom sheet or confirm dialog.
- `od-actions` / `--row` — stacked full-width buttons, or two side by side — the end of a sheet or flow.
- `od-bottom-bar` / `--stack` — sticky bar with the primary action (price + button, or two stacked buttons). A body that holds one becomes a full-height column, so the bar sits at the foot of a short screen.

## First run
- `od-page--fill` — a page that fills the phone; its last block (the actions) sits at the bottom. `od-feature--fill` — a photo that is the whole screen, copy and button over the scrim.
- `od-art` — the illustration drawn from the kit: an accent wash around one big icon or figure (a ring, chips); in `od-page--fill` it takes the free height.
- `od-dots` — `<i>` per page, `is-active` on the current one — the page indicator.
- `od-row--danger` — a destructive row (Delete account, Sign out) in danger text, never a filled red button.
