# `@od/kit` — the host's own components (import from '@od/kit')

- `useNav()` → `{ push(id, params?), pop(), reset(tabId) }` — moves between the app's planned screens.
- `AppTabbar({ active })` — the app's bottom tab bar, built by the host from the plan; `active` is the current tab id. Only on a tab's root screen, as the last child of `<Page>`.
- `Ring({ value: 0–1, size = 64, stroke = 8, color, children })` — progress ring; children sit in its centre.
- `Bars({ values: number[], goal?, color, labels?: string[], height = 120, highlight? })` — per-day bars with an optional dashed goal line.
- `Area({ values: number[], color, height = 110 })` — a soft trend area.
- `WaterGlass({ value: 0–1, color })` — a filling glass.
- `CountUp({ to, format? })` — a figure that counts up on mount; render it where the number goes.
- `Avatar({ name, color, size = 44 })` — initials in a tinted circle.
- `Tile({ color, size = 30, children })` — a small tinted square holding an icon.
- `Confetti({ run })` — a burst when something is completed.
