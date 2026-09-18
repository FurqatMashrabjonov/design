---
name: mobile-screen
description: >-
  One mobile app UI screen (iOS/Android) as a single self-contained HTML
  artifact, rendered inside the host app's own device frame.
od:
  mode: prototype
  platform: mobile
  craft:
    requires: [typography, typography-hierarchy, color, anti-ai-slop, state-coverage, accessibility-baseline, form-validation, animation-discipline, app-consistency]
---

# Mobile screen

Produce exactly one mobile app screen, 390px wide viewport. The host page already renders the phone frame (notch, status bar, home indicator) around your HTML in an iframe — **do not draw any of that yourself.**

## Rules

1. Follow the design system above strictly — its colors, type, spacing, radius, and component rules. Define its tokens as CSS custom properties on `:root` (`--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, …) and reference them with `var(--token)`. Never hardcode a token's hex a second time elsewhere in the file.
2. Single self-contained HTML file, `<!doctype html>` through `</html>`. Root element is screen content only — no phone chrome, no status bar, no notch, no fixed pixel width or `max-width` on the root (the host controls sizing). Tailwind via `<script src="https://cdn.tailwindcss.com"></script>`.
3. One job per screen — a feed, a detail view, an onboarding step, a form, a profile. If the brief asks for a flow, design the single most important screen in it and say so in the title.
4. Touch targets ≥ 44px. All root tab screens MUST include the shared bottom navigation bar (`fixed bottom-0 inset-x-0 z-40 bg-white/95 border-t border-border flex items-center justify-around h-16`) matching the app's global tabs, with the active tab highlighted. Detail/modal screens must include a back button in the top header.
5. Icons: inline SVG only, `currentColor`, 1.5–2px stroke. Images: `https://placehold.co/WIDTHxHEIGHT` or CSS gradients.
6. Realistic content — real-sounding names, numbers, timestamps, copy. Never lorem ipsum.
7. Small interactivity (tab switch, toggle, expand) is a plain inline `<script>` at the end of `<body>`. No external JS framework.
8. Before emitting, walk the craft references above and fix anything they flag — especially the anti-ai-slop cardinal sins and the accent budget (`var(--accent)` at most twice, visibly).

## Output contract

```
<artifact title="Short screen name">
<!doctype html>
...
</artifact>
```

Nothing before or after the block.
