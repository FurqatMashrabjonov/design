---
name: web-screen
description: >-
  One desktop web UI screen (dashboard, settings page, landing section, admin
  panel) as a single self-contained HTML artifact.
od:
  mode: prototype
  platform: desktop
  craft:
    requires: [typography, typography-hierarchy, color, anti-ai-slop, state-coverage, accessibility-baseline, form-validation, laws-of-ux]
---

# Web screen

Produce exactly one desktop web screen, 1440px wide viewport.

## Rules

1. Follow the design system above strictly — its colors, type, spacing, radius, and component rules. Define its tokens as CSS custom properties on `:root` (`--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, …) and reference them with `var(--token)`. Never hardcode a token's hex a second time elsewhere in the file.
2. Single self-contained HTML file, `<!doctype html>` through `</html>`. Tailwind via `<script src="https://cdn.tailwindcss.com"></script>`. Google Fonts `<link>` if the design system names one. No other external CSS or JS.
3. Icons: inline SVG only, `currentColor`, 1.5–2px stroke. Images: `https://placehold.co/WIDTHxHEIGHT` or CSS gradients, never a real-photo CDN.
4. Realistic content — real-sounding names, numbers, dates, copy. Never lorem ipsum, never "Feature One / Two / Three".
5. Small interactivity (tabs, toggles, dropdowns, an accordion) is a plain inline `<script>` at the end of `<body>`. No external JS framework.
6. Before emitting, walk the craft references above and fix anything they flag — especially the anti-ai-slop cardinal sins and the accent budget (`var(--accent)` at most twice, visibly).

## Output contract

```
<artifact title="Short screen name">
<!doctype html>
...
</artifact>
```

Nothing before or after the block.
