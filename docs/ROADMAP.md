# Roadmap

The single source of truth for what gets built. See `CLAUDE.md` for the rules that go with it.

**Scope:** `MVP` = build now. `Later` = wanted, not now. `Cut` = decided against.
**Status:** `Done` · `In progress` · `Todo`.

> **The `Scope` column below is a proposal.** Edit it. Anything you move to `MVP` gets built; anything left as `Later` does not, no matter how easy it looks.

Only one row may be `In progress` at a time.

## A. Generation

| ID | Feature | Scope | Status | Notes |
|---|---|---|---|---|
| GEN-01 | Prompt to one HTML screen (streaming) | MVP | Done | 12 skills (web, mobile, landing, dashboard, …) |
| GEN-02 | Multi-screen app from one brief (3–5 screens) | MVP | Done | Planner returns nav + screen roles |
| GEN-03 | Anchor screen first, siblings seeded with its style | MVP | Done | Also warms the prompt cache |
| GEN-04 | 33 design systems with tokens and webfonts | MVP | Done | Open substitutes back proprietary faces |
| GEN-05 | Shared shell (bottom nav / detail header) built in code | MVP | Done | Inline styles, lucide paths |
| GEN-06 | Deterministic normalizer (tokens, fonts, icons, shell) | MVP | Done | `lib/screen-normalizer.ts` |
| GEN-07 | Design linter with autofix | MVP | Done | `lib/design-lint.ts` |
| GEN-08 | Element-level editing (select a section, re-prompt it) | MVP | Done | `data-od-id` annotator + patcher |
| GEN-09 | Whole-screen edit by instruction | MVP | Done | |
| GEN-10 | Screen states: empty / loading / error variants | Later | Todo | Rules exist in `craft/state-coverage.md`; not generated |
| GEN-11 | Image / screenshot as input | Later | Todo | DeepSeek is not vision; needs one separate vision call |
| GEN-12 | Design variants (2–3 directions per screen) | Later | Todo | |
| GEN-13 | Tablet / responsive breakpoints | Later | Todo | Only 390×844 and 1440×900 today |
| GEN-14 | Dark-mode variant of an app | Later | Todo | |
| GEN-15 | Voice or PRD input | Cut | — | |
| GEN-16 | Desktop sidebar shell built in code | Later | Todo | Desktop still uses the prose contract |

## B. Canvas and editor

| ID | Feature | Scope | Status | Notes |
|---|---|---|---|---|
| CAN-01 | Infinite canvas: pan, zoom, drag frames | MVP | Done | |
| CAN-02 | Screen rename / duplicate / delete | MVP | Done | Hover toolbar + context menu |
| CAN-03 | Per-screen version history and restore | MVP | Done | History tab |
| CAN-04 | Chat panel scoped to the selected screen | MVP | Done | |
| CAN-05 | Full-page clickable preview (`/preview/:id`) | MVP | Done | Tabs, Back, arrows, keyboard, deep link |
| CAN-06 | Screens list panel | MVP | Done | |
| CAN-07 | Design jury (critique + revised HTML) | Later | Done | Manual, off the generation path |
| CAN-08 | Per-frame toolbar: version arrows, code, download, device | Later | Todo | Seen in Sleek |
| CAN-09 | Breadcrumb in top bar (Dashboard › project) | Later | Todo | |
| CAN-10 | Select / hand tool switch on canvas | Later | Todo | |
| CAN-11 | Undo / redo | Later | Todo | |

## C. Theme

| ID | Feature | Scope | Status | Notes |
|---|---|---|---|---|
| THM-01 | Live theme override: accent, corners, heading/body font | MVP | Done | Render-time overlay, sanitized, persisted |
| THM-02 | Full colour palette (background, foreground, secondary, card, border) | Later | Todo | Sleek has this |
| THM-03 | Radius slider + Round/Squircle shape | Later | Todo | |
| THM-04 | Theme versions | Later | Todo | |
| THM-05 | Custom design system import (Figma variables / tokens.css) | Later | Todo | |
| THM-06 | Model-hardcoded colours follow the theme | Later | Todo | Known limit: hex written outside `var(--…)` does not change |

## D. Dashboard (home)

| ID | Feature | Scope | Status | Notes |
|---|---|---|---|---|
| DSH-01 | Prompt composer with device + design system | MVP | Done | |
| DSH-02 | Project list | MVP | Done | Cards show a blank placeholder today |
| DSH-03 | Inspiration cards (style-tagged starters that fill the prompt) | MVP | Todo | Reuse the 33 design systems; 4–6 cards |
| DSH-04 | Project card with initials badge + "created N days ago" | MVP | Todo | No screenshots or puppeteer needed |
| DSH-05 | Search projects | MVP | Todo | |
| DSH-06 | Design picker as visual cards instead of a name dropdown | Later | Todo | |
| DSH-07 | Favourites (star) and grid/list toggle | Later | Todo | |
| DSH-08 | Left navigation (Usage, API keys, References) | Later | Todo | |

## E. Export and share

| ID | Feature | Scope | Status | Notes |
|---|---|---|---|---|
| EXP-01 | Download one screen as HTML (theme applied) | MVP | Done | |
| EXP-02 | Copy HTML / view code | MVP | Done | Theme applied |
| EXP-03 | Download the whole app (all screens, zip) | MVP | Todo | |
| EXP-04 | PNG export | Later | Todo | |
| EXP-05 | Figma export | Later | Todo | Figma MCP is connected in dev |
| EXP-06 | Public share link | Later | Todo | Needs deploy + access control; current preview link is local-only |
| EXP-07 | Export to React / framework code | Cut | — | |

## F. Platform

| ID | Feature | Scope | Status | Notes |
|---|---|---|---|---|
| PLT-01 | SQLite persistence with numbered migrations | MVP | Done | Latest: 0007 |
| PLT-02 | Authentication / accounts | Later | Todo | Decide before any public deploy |
| PLT-03 | Credits / usage / billing | Later | Todo | |
| PLT-04 | Deployment | Later | Todo | |
| PLT-05 | Fix old projects lacking screen-to-tab metadata | Later | Todo | Preview shows arrows only for them |
| PLT-06 | Automated browser tests | Later | Todo | Preview and theme were verified by hand in Chrome |
| PLT-07 | API keys / agent (MCP) access | Cut | — | |

## Open decisions

- Which `Later` rows, if any, move to `MVP`?
- Does the MVP need accounts (PLT-02), or is it single-user and local?
- Is the MVP demo the local app, or a deployed one (PLT-04)? This decides whether share links (EXP-06) matter.
