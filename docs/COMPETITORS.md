# Competitors

Reference only. Nothing here is a commitment — a row becomes work only when it appears in `docs/ROADMAP.md` as `MVP`. Observations come from public pages, the Sleek and ScreenFlow products as seen in a browser, and web research on 2026-09-19.

## Where we stand

The most common complaint about these tools is **inconsistency across generated screens** ("navigation elements appeared different on different pages designed by the same tool", generic look). We enforce consistency in code (shell, tokens, fonts, icons, linter), so that is our positioning: *the tool whose screens look like one team made them.* Build on that, not on matching every feature.

## Sleek (sleek.design) — closest to what we are building

Observed in the editor and dashboard.

**Dashboard**
- Left nav: Projects, Usage, API Keys, References. Upgrade button and user menu.
- Hero "Start generating your app designs": one large prompt box, image attach, `Auto` mode, `Match a design` picker with thumbnails, `Design it`.
- "Need inspiration?": four style-tagged starter cards (Neo-brutalism, Glassmorphism, Playful whimsical, Soft clay 3D minimal) that fill the prompt.
- "My Projects": All / Favourites, search, grid/list toggle. Project cards are an **initials badge** + name + "Created 2 days ago" + star + menu — no screenshot.
- Banner promoting agent access (Claude Code, Cursor, Codex via API keys).

**Editor**
- Top bar: breadcrumb, light/dark toggle, help, **Preview / Share / Export**, Upgrade.
- Sidebar tabs: **Chat / Theme**. Chat input shows the selected screen as a chip and has image attach.
- Theme tab: **theme versions**, body and heading font, **radius slider** with Round/Squircle shape, **full colour palette** (background, foreground, primary, primary-foreground, secondary, muted, accent, card, card-foreground, border).
- Frames: name, **version arrows (`v3 ‹ ›`)** on each frame; selected frame gets a toolbar (code, Figma, open, download, device, more). Frames size to content height. Free plan blurs locked screens with "Upgrade to unlock".
- Canvas bar: select and hand tools, zoom, fit.
- **Preview** (`/preview/:id`): dark stage, single phone, prev/next arrows, theme / share / settings. We copied this.

## ScreenFlow (screenflow.dev)

Public pages only (the dashboard requires an account).
- Hero prompt box with example chips (Travel Planner, Learning, Finance, Shopping) and image attach.
- Editor shows credits, **Preview / Share / Export / Save**, Chat / Config / History tabs (same as ours), a "Zone" canvas tool, and a "Generating Screen 1 of 4" progress bar.
- Marketing: auto-scrolling gallery of generated screens; "30% off forever" banner; export to Figma or code as the headline promise.

## Others (web research)

| Tool | Positioning | Notable |
|---|---|---|
| Google Stitch | Design-first, free | Up to 5 connected screens, image/sketch input, theme sidebar, Figma export with Auto Layout, voice |
| Banani | Flow-first | Auto-links generated screens into a clickable prototype (we have this), PRD input, Figma/HTML export |
| v0 (Vercel) | Component-first | React/shadcn code, developers continue in code |
| Lovable / Bolt | App-first | Full-stack + deploy |
| Figma Make | Figma continuity | Three layout directions per prompt |
| Figr | Design-system-first | Imports an existing Figma/Storybook library; generates empty/loading/error states; handoff specs |

## What to take, and when

| Idea | Source | Roadmap row | Verdict |
|---|---|---|---|
| Inspiration starter cards | Sleek, ScreenFlow | DSH-03 | MVP — cheap, reuses our 33 design systems |
| Initials badge + "created N days ago" on project cards | Sleek | DSH-04 | MVP — removes the need for screenshots/puppeteer |
| Project search | Sleek | DSH-05 | MVP |
| Whole-app download | — | EXP-03 | MVP |
| Visual design picker | Sleek | DSH-07 | Later |
| Favourites, grid/list, left nav | Sleek | DSH-08 | Later |
| Full palette, radius slider, shape, theme versions | Sleek | THM-02..04 | Later |
| Per-frame toolbar and version arrows | Sleek | EDT-09 | Later |
| Screen states (empty/loading/error) | Figr | GEN-10 | Later |
| Image input | Stitch, Sleek, ScreenFlow | GEN-11 | Later — needs a vision call |
| Figma export | Stitch, Sleek, ScreenFlow | EXP-05 | Later |
| Share link, credits, agent access | Sleek | SHR-02, BIL-04..12, AGT-01 | MVP / MVP / Later |
