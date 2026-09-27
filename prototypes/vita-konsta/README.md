# Vita — Konsta UI prototype (reference for the JSX pipeline)

Hand-written reference app: habits + steps + water, 23 screens (onboarding → auth → goals →
Today, Habits, Habit detail, New habit → Steps, Water, Insights, Awards → Profile, Settings,
Notifications, Appearance, Premium, Activity). React 19 + Konsta UI v5 (iOS 26) + Tailwind v4.
It is the quality bar the generated JSX screens are measured against (KON-01), and `src/ui.jsx`
(Ring, Bars, Area, WaterGlass, Avatar, Tile, Confetti, CountUp) is the seed of `@od/kit`.

    cd prototypes/vita-konsta && npm install && npm run dev      # http://localhost:5173
    npm run build                                                # dist/ (static)

- `/` — gallery: a live phone (tap through it) + every screen.
- `/?live=1` — the live app alone. `/?screen=today&dark=1` — one screen, settled (no motion).
- `./shoot.sh` — screenshots of every screen (needs `npm run build` and a static server on :8771 serving dist/).

Measured (2026-09-27): screen code ≈ 2.8k chars (~850–950 tokens) per screen; build 434 KB JS /
103 KB CSS (127 KB / 16 KB gzip) for React + Konsta + icons + all screens. Server-side per screen:
JSX → JS (oxc) 2 ms, Tailwind build ~2–22 ms with a warm compiler. Renders inside
`<iframe sandbox="allow-scripts">` unchanged. Not part of the app build; not type-checked.
