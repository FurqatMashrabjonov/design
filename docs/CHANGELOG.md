# Changelog

Newest first. One entry per completed change: what changed, files touched, how it was verified.
Entries before 2026-09-19 were backfilled from git history and have no verification notes.

## 2026-09-19

### Scope discipline: CLAUDE.md, roadmap, changelog, competitors
Added `CLAUDE.md` (working agreement: only build `MVP` rows from the roadmap, no unlisted features, log every change), `docs/ROADMAP.md` (every feature A–Z with scope and status; the Scope column is a proposal for the user to edit), `docs/CHANGELOG.md` (this file, backfilled from git), and `docs/COMPETITORS.md` (Sleek dashboard/editor, ScreenFlow, Stitch/Banani/v0/Lovable/Figma Make/Figr, with a take-or-skip table tied to roadmap rows).
- Files: `CLAUDE.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/COMPETITORS.md`.
- Verified: documentation only. Roadmap statuses cross-checked against the code and git log; dev port confirmed from `vite.config.ts`.

### Live theme override — THM-01
Config tab gets a Theme panel: accent colour, corner preset (Sharp / Soft / Round), heading and body font from 17 Google Fonts. Applied at render time as a stylesheet after each screen's own `:root`; stored HTML is never rewritten and Reset deletes the override. Editor frames update through `postMessage` (no iframe reload); preview, export, copy and code view use a static overlay. Only a hex colour and allowlisted ids are stored; CSS is generated from them and the controller sanitizes again.
- Files: `src/lib/theme-override.ts`, `src/components/canvas/ThemePanel.tsx`, `src/ScreenFrame.tsx`, `src/routes/p.$projectId.tsx`, `src/routes/preview.$projectId.tsx`, migration `0007_add_project_theme`, `Project`/`ProjectController`/`fns.ts`.
- Verified: `npm run check` (incl. hostile-input test), `tsc`, Chrome — colour + corners + fonts changed all five screens at once, persisted across reload and in preview, Reset restored the original.
- Commit `db6d208`.

### Full-page clickable preview — CAN-05
`/preview/:id`: one device frame on a dark stage, arrows and arrow keys step through screens, tab bar / action button / Back work inside the app, current screen lives in `?s=`. Editor Preview button opens it in a new tab. Removed the earlier in-canvas preview mode.
- Files: `src/routes/preview.$projectId.tsx`, `src/lib/preview-bridge.ts`, `src/components/canvas/TopBar.tsx`, `src/routes/p.$projectId.tsx`.
- Persisting planner output: migration `0006_add_navigation_columns` stores each screen's role, tab and parent, and the project's navigation.
- Fixed: shell nav/header now use inline styles only. A screen written in plain CSS rendered the class-styled nav as an unpositioned block off-screen, trapping the preview on it.
- Verified: `npm run check`, `tsc`, Chrome — tab taps, action button, arrow keys, deep link, editor round trip.
- Commit `00b88ac`.

### Cross-screen coherence in code — GEN-03, GEN-04, GEN-05, GEN-06, GEN-07
Parallel screens drifted (different accents, hand-drawn icons at 1.5–2.5px, one screen loading Inter while its sibling fell back to a system font). Consistency moved from prompt wording into code:
- `ShellService`: bottom nav / detail header as literal HTML from a lucide path map.
- `screen-normalizer`: canonical `:root`, webfont link, shell, unified icon stroke, lucide boot.
- `design-lint`: 8 checks; autofixes indigo accents and literal font stacks.
- `PlanController`: anchor screen first, siblings seeded with its style digest.
- `tokens.css` for `minimal`, `brutalist`, `midnight`; webfont `@import` for 32 systems with open substitutes for proprietary faces.
- Verified: `npm run check`, `tsc`, real multi-screen generation against DeepSeek (lint clean, tokens/fonts matched across screens).
- Commit `e5c88d9`.

## 2026-09-18

- `d40428f` — 30+ design systems, skills, critique jury, element editing, app coherence (GEN-04, GEN-08, CAN-07).
- `015902b` — misc changes.
- `19a0c34` — screen and project CRUD: hover toolbar, rename, duplicate, delete (CAN-02).
- `1032a0e` — fix canvas zoom leaking to whole-page browser zoom (CAN-01).
- `9ba7d6f` — restructure into Laravel-style layers: `app/{Models,Services,Http/Controllers}`, `database/migrations`.
- `bc98c4c` — History tab: per-screen version snapshots and restore (CAN-03).
- `57f296b` — multi-screen planner: one brief to 3–5 designed screens (GEN-02).
- `3ef8561` — rebuild UI on shadcn: infinite canvas, drag-to-position, in-place edit (CAN-01).
- `5a4e5d4` — adopt `craft/` rules + skill composition architecture.
- `f5bf76f` — streaming generation, design system picker, canvas zoom (GEN-01).
- `0640c66` — ignore `.idea`.
- `4f29865` — prompt to HTML screen with DeepSeek, SQLite, sandboxed preview (GEN-01).
