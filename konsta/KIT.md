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
- `Medal({ emoji, color = '#ffb800', size = 64, locked = false })` — a round glossy award badge; locked ones are grey.
- `Avatar({ name, color, size = 44 })` — initials on a gradient circle.
- `Glow({ color, size = 260, opacity = 0.5 })` — a blurred halo behind art; place it inside a `relative` box.
- `Dots({ count, active })` — onboarding pager dots.
- `Confetti({ run })` — a burst when something is completed.

Helpers (functions returning CSS strings)
- `tint(color, pct = 16)` — a soft wash: `style={{ background: tint(C.mind) }}`.
- `gradient(color, to?)` — a hero-card gradient: `style={{ background: gradient(C.steps, '#ff6b35') }}`; white text on it.

Motion classes (in the runtime stylesheet): `vs-rise` (entrance; stagger with `animationDelay`), `vs-float` (gentle bob for art), `vs-bounce` (a pop when checked).
