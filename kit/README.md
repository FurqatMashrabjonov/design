# od-kit catalog

`od-kit.css` is injected into any screen that uses an `od-` class. Every value is a token, so the same markup renders in every design system. Samples of each block are in `samples.ts`; see them all with `node --import ./eval/alias-hook.mjs kit/gallery.ts` (writes `eval/out/kit-gallery/`).

Format: block — variants/elements — when to use.

## Layout
- `od-page` — screen body: 16px inset, 20px between blocks and 32px before a titled `od-section` / `od-group` (24px inside `od-stack`), as shipped apps space them (`REFERENCE.md`).
- `od-stack` / `od-grid` (2 cols) / `od-bento` + `__wide` — vertical rhythm, a tile grid, a grid that opens on one wide tile.
- `od-carousel` — horizontal scroller that bleeds to the screen edge; holds chips or `od-card--carousel`.
- `od-divider` — a hairline.

## Headers and labels
- `od-header` (large title) — `__bar` (44px, `__actions` right), `__title`, `__sub` — the top of a root tab.
- `od-header--compact` — back · centred title · action in a 44/1fr/44 grid — a pushed screen, a modal or a sheet.
- `od-header--greeting` — avatar + `__sub` ("Good morning") + name, bell on the right — a home tab.
- `od-hero` — `__eyebrow`, `__title`, `__sub` — a free-standing intro block (welcome, detail top).
- `od-section` — `__head`, `__title`, `__link` — a titled section with "See all".
- `od-label` / `--accent` — small uppercase tracked label; a quieter section head. Shipped apps head most sections with a 17-20px sentence-case title (`od-section__title`); keep the micro label for day groups, settings groups and labels inside a card.

## Lists
- `od-list` — card of rows with inset hairlines; `--plain` drops the card.
- `od-group` — `__label` (an `od-label`) above an `od-list`, `__note` below — settings and forms, iOS inset-grouped.
- `od-row` — `__lead`, `__body` (`__title`, `__sub`), `__trail` — default row (two lines come to ~68px, as shipped lists do) with a 40px tinted icon.
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
- `od-search` — pill search field, 44px (shipped apps: 36-40).
- `od-amount` — `__unit` + `__field`: a large centred amount being typed (send money, a budget); never a bare oversized input.
- `od-slider` — a native range input in the accent; in a row it sits in `od-row__trail`.
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
- `od-sheet` — `__grabber`, `__title` + content — a bottom sheet or confirm dialog; `--overlap` pulls it 24px up over a photo hero and spaces its blocks 24px apart (detail).
- `od-actions` / `--row` — stacked full-width buttons, or two side by side — the end of a sheet or flow.
- `od-bottom-bar` / `--stack` — sticky bar with the primary action (price + button, or two stacked buttons). A body that holds one becomes a full-height column, so the bar sits at the foot of a short screen.

## First run
- `od-page--fill` — a page that fills the phone; its last block (the actions) sits at the bottom, 32px above the edge. A `--block` button (or one in `od-actions`) is 52px, the height of a flow's last button in shipped apps. `od-feature--fill` — a photo that is the whole screen, copy and button over the scrim.
- `od-art` — the illustration drawn from the kit: an accent wash around one big icon or figure (a ring, chips); in `od-page--fill` it takes the free height and bleeds to the side edges (and the top, when it comes first).
- `od-dots` — `<i>` per page, `is-active` on the current one — the page indicator.
- `od-row--danger` — a destructive row (Delete account, Sign out) in danger text, never a filled red button.

## Overlays (drawn open) and the floating layer — KIT-07
A screen is a still picture, so an overlay is drawn in its open state: `od-scrim` and the overlay are the last children of `<body>`, after the page. Keep a screen that shows a modal overlay to one phone height. Numbers in `REFERENCE.md`.
- `od-scrim` / `--light` — the dim layer (40% black; `--light` 12% under a menu). Every modal overlay sits on one.
- `od-sheet--overlay` — the sheet docked to the bottom over the page; content-high, or a detent: `--medium` (half) / `--large` (~90%). `__head` — a 3-column row: a ghost Reset left, `od-sheet__title` centred, a close `od-icon-btn` right. A last `od-actions` or `od-btn` sits at the foot. The container for filters, share, confirm and previews; a map's nearby list is the same sheet with no scrim.
- `od-drawer` — side navigation over a scrim, 300px from the left: `__head` (avatar + name), `__item` (icon + label, `is-active` tinted pill, an `od-badge` count), `od-label` group heads, `__foot` (settings, account) at the bottom.
- `od-action-sheet` — `__group` cards inset 8px from the edges: `__title` (the question), `__btn` (56px, `--danger`), and Cancel alone in the last group (`__btn--cancel`). A choice of 2-4 actions about one thing; a sheet when there is more to show.
- `od-menu` inside an `od-anchor` (wrap the button and the menu) — a glass pull-down under its button: `__item` (label + trailing icon, 44px, `--danger`), `__divider` between groups; `--left` aligns it to the button's left, `--up` opens above. Pair with `od-scrim--light`.
- `od-dialog` — a centred alert over the scrim: `__icon` (optional), `__title`, `__text`, then an `od-actions` (stacked, or `--row` for two short ones). Only to confirm something that cannot be undone.
- `od-row--swiped` + `od-swipe` (last child of the row) — a list row slid open with 1-3 `od-swipe__action` (icon + word, 78px each; `--accent`, `--danger`, neutral by default). Draw one such row per list, to show the gesture exists.
- `od-toast` / `--success` / `--error` — `__icon`, the message, `__action` (Undo) — an inverted capsule above the tab bar confirming what just happened.
- `od-glass-btn` — a 44px glass circle over a photo or a map (back, save, share); `od-float` / `--bottom` places a row of them over their positioned parent (`od-media`); `od-glass` gives any small thing (a chip, a search field) the same material.
- `od-toolbar` — a floating glass capsule of 2-4 actions at the bottom (icon buttons and at most one `od-btn`), iOS 26 style, for screens without a tab bar.
- `od-search--floating` — the search field as a glass pill at the bottom of the screen, in thumb reach.
- `od-skeleton` / `--title` / `--short` / `--circle` / `--card` — grey shapes where content will land; a loading state, never a spinner in the middle.
- Top tabs: `od-segmented--underline` scrolls sideways when the tabs outgrow the width; pills are `od-chip` in an `od-carousel`.

## Chat and sign-in — KIT-07
- `od-chat` — the thread: `__day` (a centred day label), then `od-bubble`s. `od-bubble` is theirs (surface, left), `--out` is mine (accent, right), `--media` holds a photo, `--ai` is an assistant's answer as plain text across the width; `__time` inside the bubble, `__reactions` (heart + count) hangs off its corner.
- `od-typing` — three dots inside a bubble while the other side writes.
- `od-composer` — the message pill with `__send` (36px accent circle), inside an `od-bottom-bar` after an attach `od-icon-btn`. `--ai` is a card: a textarea over `__tools` (`od-chip--sm` tools, send at the end); put suggestion chips (`od-chip--sm` in an `od-carousel`) above it.
- `od-btn--social` — a neutral full-width provider button: a lucide icon or a letter (`<b>G</b>`) and "Continue with …"; never a brand logo image. `od-divider--label` — a hairline carrying a word ("or"). A passkey is offered as an `od-btn--ghost` with a `fingerprint` icon.
