# `@od/kit` — the host's own components (import from '@od/kit')

Navigation
- `useNav()` → `{ push(id, params?), pop(), reset(tabId) }` — moves between the app's planned screens.
- `AppTabbar({ active })` — the app's bottom tab bar, built by the host from the plan; `active` is the current tab id. Only on a tab's root screen, as the last child of `<Page>`.

Every `color` below is a CSS colour — a palette entry (`C.water`) or a hex — never a Tailwind class. Leave it out for the app's accent.

Figures (they animate themselves)
- `Ring({ value: 0–1, size = 64, stroke = 8, color, children })` — progress ring; children sit in its centre.
- `Rings({ rings: [{ value, color }], size = 140, stroke = 14, gap = 3, children })` — concentric rings, outermost first (the Activity look).
- `Bars({ values: number[], goal?, color, labels?: string[], height = 120, highlight? })` — per-day bars, the last one highlighted, optional dashed goal line.
- `Area({ values: number[], color, height = 110 })` — a soft trend area with a line.
- `Heatmap({ values: number[] (0–1, 7 per week, oldest first), color, labels? })` — a streak / contribution grid; 84 values = 12 weeks.
- `Meter({ value: 0–1, color, height = 8 })` — a thin progress bar with a tinted track.
- `WaterGlass({ value: 0–1, color })` — a filling glass with a wave.
- `CountUp({ to, format? })` — a number that counts up on mount; render it where the number goes.

Surfaces and marks
- `Photo({ q, className, alt?, children })` — a real photo of what `q` describes (2–4 English words), filled by the host; size and corners from `className`; `children` sit on top (add a dark gradient under white text).
- `Tile({ color, size = 30, tinted = false, children })` — rounded square: solid with a white lucide icon (settings rows), or `tinted` with an emoji or a coloured icon (content rows).
- `Medal({ emoji, color = '#ffb800', size = 64, locked = false })` — an award badge: the emoji on a squircle tinted with its colour; locked ones are grey.
- `Avatar({ name, color, size = 44, photo })` — a person: their portrait when `photo` names one ("portrait smiling young woman", like Photo's `q`), initials on a gradient until it loads. Give every person a `photo`.
- `Glow({ color, size = 260, opacity = 0.5 })` — a blurred halo behind art; place it inside a `relative` box.
- `Dots({ count, active })` — onboarding pager dots.
- `Confetti({ run })` — a burst when something is completed.

- `Hero({ color, to?, as?, className, children })` — a hero or promo card on a gradient of `color` (→ `to`). It sets its own text colour (white, or ink on yellow, mint, orange), so give its text no colour class; `as="button"` with `onClick` when it opens something. Default corners `rounded-[24px]` and `p-4`; `className` may change them.

Sign in
- `SignInButtons({ onApple, onGoogle, onEmail? })` — "Continue with Apple" (black) and "Continue with Google" with their real marks, and an email link: how a first-run screen ends. Never draw a logo yourself.

Helpers (functions returning CSS strings)
- `tint(color, pct = 16)` — a soft wash: `style={{ background: tint(C.mind) }}`. Text on it stays the label colour, never white.
- `gradient(color, to?)` — the gradient `Hero` uses, for art that is not a card. Text on a filled colour takes `onColor(color)`.

Type scale (Tailwind classes; Apple's text styles — use these, not `text-[Npx]`)
- `text-large-title` 34 bold (a tab screen's own big title) · `text-title1` 28 bold · `text-title2` 22 bold · `text-title3` 20 semibold
- `text-headline` 17 semibold (row / card title) · `text-body` 17 · `text-callout` 16 · `text-subhead` 15 · `text-footnote` 13 · `text-caption1` 12 · `text-caption2` 11 (the smallest)
- `text-figure` 44 bold, tight — the one hero number of a screen. A weight class next to a style (`text-body font-semibold`) wins.

Motion classes (in the runtime stylesheet): `vs-rise` (entrance; stagger with `animationDelay`), `vs-float` (gentle bob for art), `vs-bounce` (a pop when checked).
