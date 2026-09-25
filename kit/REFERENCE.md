# Kit geometry measured against shipped apps

Measured on 390×844 iOS screens from the Gummble library (September 2026), estimated in px at 390 width. Real screens carry a ~47px status bar our frames do not; vertical positions below are given under it. App names only say where a number came from.

## Dashboard / home (6 screens)

| Source | Gutter | Section gap (block → next titled section) | Card radius | Card padding | Section head | Block types | Primary action |
|---|---|---|---|---|---|---|---|
| Ubank | 16 | ~32 | 14 | 16 | 18px semibold, sentence case, arrow button right | 3 | none on screen; arrow per section |
| Rocket Money | 16 | ~29 | 20 | 24 | 11px uppercase tracked, link right | 3 | outlined button inside a card |
| Plazo | 16 | ~34 | 16 | 16 | 17px semibold, "See more" right | 3 | row of three 48px round actions under the hero figure |
| Origin | 16 | 18 (card to card, no head) | 24 | 24 | 12px uppercase tracked inside the card | 2 | round + inside the card |
| Stripe | 20 | ~27 | 12 | 16 | 20px bold, link right | 3 | none |
| Monarch | 12 | 12 (card to card) | 10 | 16 | 17px semibold inside card | 3 | none |

- Titled sections open 27-34px (median ~30) below the block above; cards stacked without a head sit 12-18px apart. **Ours: one 20px gap for both.**
- Gutter 16 in 4/6. Ours 16. Match.
- Card radius 10-24, median 15; padding 16 in 4/6. Kit default (16 / 16) matches. Nova's own `--radius-lg: 28px` is above every measured card (max 24) — a design-system token, left for the system's owner.
- Section head: 17-20px sentence-case title in 4/6, uppercase micro label in 2/6. **Our dashboard exemplar used the micro label.**
- 2-3 distinct block types per screen; the hero figure is 28-56px. Our dashboard-a has 4 (greeting, summary, stat pair, list) — within reach, not changed.

## List (5 screens + 1 skeleton)

| Source | Large title | Search field | Group head | Row height (2-line) | Lead | Row container |
|---|---|---|---|---|---|---|
| Revolut | 34 bold, top ~53 | 40, pill | 18 semibold "Today" + total right | 76 | 40 round | card r16, no hairlines |
| Qonto | 26 bold | — (chips 40) | — | 83 | 40 square r10 | card r16, no hairlines |
| Rocket Money | nav title 15 | 40, pill | 11 uppercase on a grey band | 66 | 36 round | plain, full hairlines |
| Mercury | 28 semibold | 36, r8 | 16 medium | 57 | 32 round | plain |
| Monarch | nav title 17 | 40, r8 | — | — | — | — |
| Crouton | 34 bold | 40, pill | — | — | — | grid |

- Two-line rows are 57-83px, median ~70. **Ours rendered ~64 (10px padding).**
- Search fields are 36-40px in 6/6. **Ours 48.**
- Group-to-group spacing 24-32px. **Ours 12 inside `od-stack`.**
- Large title 26-34, top ~50-70 under the status bar; ours sits at ~64 with `--text-2xl`. Match.
- Lead 32-40, round in 3/4. Ours 40, round or tinted square. Match.

## Detail (4 screens)

| Source | Hero | Gutter | Title | Block spacing | Stats block | Primary action |
|---|---|---|---|---|---|---|
| Airbnb | full-bleed photo, 318 tall (38%), square edge | 24 | 26 semibold, 2 lines | 24-32 | three figures split by hairlines in a card r12 | bottom bar: price left, 48px CTA right, hairline top |
| ASOS | full-bleed photo, 500 (59%) | 16 | price 18 bold, name 17 | 16-24 | — | save / video icons, then bag |
| Crouton | inset photo card r24 | 16 | on the photo, 24 bold | 16-24 | pills | 50px pill "Start" inline |
| The Infatuation | sheet with grabber over a map | 24 | 36 condensed bold | 24-28 | — | floating search pill |

- Blocks in the content area are 24-32px apart in 3/4. **Our `od-sheet--overlap` used 16.**
- Hero photo 38-59% of the height; ours 4:3 ≈ 35%. Close, not changed.
- Section heads are 17-22px sentence case (Crouton "Ingredients", Airbnb). **Our detail exemplar used the micro label.**

## Onboarding (6 screens)

| Source | Art | Title | Body | CTA | CTA bottom inset | Secondary |
|---|---|---|---|---|---|---|
| Garmin | full-bleed dark panel, top 78% | 28 condensed, centred | 15 centred | 52, full width, r4 | ~60 | "Skip" as a second button above |
| Imprint | full-bleed collage, top 65% | 44 serif, centred | 18 | 54 pill | ~92 (link below) | "Log in" text link under the CTA |
| Blackbird | full-screen photo | 36, left | 15 | 56 pill | ~49 | none |
| Clay | full-bleed art, centre | 17 semibold, top | 15 | text "Next" | ~66 | "Sign in" top right |
| Halide | art in a card r16 | 17 semibold, left | 15 | — | — | "Skip" text at the bottom |
| Rise | line art, centre | 26, centred | — | 62 full-bleed bar | ~38 | — |

- Art sits edge to edge in 5/6; only one frames it in a card. **Ours: a tinted card inset 16px with rounded corners.**
- The flow's last button is 50-56px (median 54). **Ours 48.**
- The button ends 38-66px above the bottom edge (home indicator ~34 + margin). **Ours 16.**
- Skip lives at the bottom next to the CTA in 3/5 that offer one. **Ours: top right.**
- Title centred in 3/6 with a title; left-aligned is also shipped (Blackbird, Halide). Not changed.

## What changed in the kit

| Rule | Before | After | Why (from the tables) |
|---|---|---|---|
| gap before a titled `od-section` / `od-group` in `od-page` | 20 | 32 | titled sections open ~30px below the block above; cards without a head keep 20 |
| same, inside `od-stack` | 12 | 24 | list groups are 24-32 apart |
| `od-row` vertical padding | 10 | 12 | two-line rows are ~70px, ours were ~64 |
| `od-search` height | 48 | 44 | shipped fields are 36-40; 44 keeps the tap target |
| `od-sheet--overlap` gap | 16 | 24 | detail blocks are 24-32 apart |
| `od-btn--block`, `od-actions > od-btn` height | 48 | 52 | a flow's last button is 50-56 |
| `od-page--fill` bottom padding | 16 | 32 | the CTA ends 38-66 above the edge |
| `od-art` in `od-page--fill` | inset card, rounded | bleeds to the sides (and top when first), square | 5/6 onboarding arts are full-bleed |

## Overlays, chat and sign-in (KIT-07, 16 screens)

Measured the same way (Gummble, September 2026; images at 1.23× or 2.37×, divided back to 390 px).

| Source | What | Measured | Ours |
|---|---|---|---|
| Crypto.com | "Sort and Filter" sheet | top ~58 under the status bar (≈93%); head row 44 with centred 17px title and × right; chip grid; Reset / Apply side by side, 44 tall, at the foot | `od-sheet--large` = phone − 84 (≈90%); `__head` 44; `od-actions--row` at the foot |
| Savee | board menu sheet | content-high (~245), top radius ~26, grabber 36×4, rows ~46 | `od-sheet--overlay` content-high, radius `--radius-lg`, grabber 36×5, rows 44-56 |
| Savee | comments sheet | top ~55 under the status bar (≈88%), radius ~24 | `--large` |
| bless. | delete confirm (action sheet) | inset 8 from the edges, group radius ~14, Cancel 56 tall in its own card, 8 apart | `od-action-sheet`: 8 inset, 56 buttons, 8 gap, `--radius-md` |
| Messages | pull-down menu | 260 wide, 8 from the edge, 8 under the button; rows ~46 with a 20px trailing icon; groups split by an 8px band; the page behind barely dimmed | `od-menu` min 250, 8 under its anchor, 44 rows, 8px `__divider`, `od-scrim--light` (12%) |
| Claude | side drawer | 318 wide (82%), rows ~49 with 20px icon and 17px label, "Recents" label, account pill at the foot | `od-drawer` min(300, 82%), rows 48, 22px icon, `od-label`, `__foot` |
| Airbnb | swiped message row | actions full row height, ~86 wide each, 18px icon over a 13-14px semibold word, row slid left by their width | `od-swipe__action` 78 wide, 20px icon, 13px 600 |
| Yazio | sign-in | provider buttons full width, ~55 tall, radius ~16, 16 apart, icon + "Continue with …" centred; terms 13px at the foot | `od-btn--social` 52 tall, `--radius-md`, 12 apart in `od-stack` |
| Orb | log-in options | pill rows 60 tall, 8 apart, icon tile left | (not taken: rows read as a list, not as buttons) |
| Airbnb | host chat | bubbles ~16×11 padding, radius ~18, max ~280 (72%), 17px text, 36 avatar, day and system lines 13px centred | `od-bubble` 14×9, radius 20 with a 6px tail corner, max 78%, `--text-base` |
| Revolut | payment chat | composer pill 40 tall, inset 16, send icon inside | `od-composer` 44 (tap target), 36px send inside |
| Instagram | direct message | composer 40 pill, 32px accent send capsule inside | same |
| DeepSeek | assistant chat | prompt as a right bubble; answer as plain full-width text (no bubble); composer a floating card r~20 inset 12, tools (32 tall chips) under the field, send at the end | `od-bubble--ai` (no bubble), `od-composer--ai` (card, `__tools`) |
| KAYAK | map | pill filter chips on top of the map, "List view" capsule floating, photo card docked at the bottom | `od-float` + `od-glass`, `od-sheet--overlay` with no scrim |

- A modal sheet takes 50% (medium) or ~88-93% (large) of the screen, or only its content (menus of 3-5 rows). **Ours:** `--medium` = half, `--large` = phone − 84, default content-high.
- Every modal overlay dims the page behind; menus dim it only slightly. Scrim 40% black, 12% for a menu.
- Destructive actions sit last in their group, in red text, never as the only filled button; Cancel is always the separate, bold one.
- Swipe actions are 78-86 wide, full height, icon above a word.
- iOS 26 floating controls over content (glass): 44 circles, a capsule of actions, search at the bottom. Glass is 78% surface over an 18px blur and saturate(1.4), the same recipe as the shell's floating tab bar; where blur is unsupported it falls back to the solid surface.
- Toasts: an inverted capsule 52 tall, 16 from the sides, 24 above the bottom edge or 104 when the floating tab bar is there (conventions: iOS 26 banners, Material snackbar; no library screen caught one on screen).
