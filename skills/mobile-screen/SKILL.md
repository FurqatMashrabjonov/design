---
name: mobile-screen
description: >-
  One mobile app UI screen (iOS/Android) as a single self-contained HTML
  artifact, rendered inside the host app's own device frame.
od:
  mode: prototype
  platform: mobile
  craft:
    requires: [mobile]
---

# Mobile screen

Produce exactly one mobile app screen, 390px wide viewport. The host page already renders the phone frame (notch, status bar, home indicator) around your HTML in an iframe — **do not draw any of that yourself.**

## Rules

1. Follow the design system above strictly — its colors, type, spacing, radius, and component rules. Define its tokens as CSS custom properties on `:root` (`--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, …) and reference them with `var(--token)`. Never hardcode a token's hex a second time elsewhere in the file.
2. Single self-contained HTML file, `<!doctype html>` through `</html>`. Root element is screen content only — no phone chrome, no status bar, no notch, no fixed pixel width or `max-width` on the root (the host controls sizing). Tailwind via `<script src="https://cdn.tailwindcss.com"></script>`.
3. Build from the kit. Every header, card, list and row, figure, button, chip, field and empty state is an `od-` block from HOUSE STYLE and the finished example screen in the brief — copy their markup and classes; the kit styles them. Invent a class of your own only for something the kit has no block for (at most one signature element per screen), and never restyle or coin an `od-` class: yours get plain names.
4. One job per screen — a feed, a detail view, an onboarding step, a form, a profile. If the brief asks for a flow, design the single most important screen in it and say so in the title.
5. Touch targets ≥ 44px. Shared chrome: if the brief carries a SHELL CONTRACT, the bottom tab bar or detail header is injected after you finish — draw none of it, and leave the bottom padding it asks for. Otherwise draw it yourself: a 64px bottom tab bar on `var(--surface)` for a root tab, a back button in the header for a detail screen.
6. Icons: `<i data-lucide="name"></i>`, coloured with `currentColor` (see the icons and fonts contract). Never hand-draw icon SVG. Images and avatars are slots (`data-od-img`, `data-od-avatar`, see the craft rules) with **no `src`** — never invent an image URL or use a placeholder service. An avatar gets a portrait for the people in APP CONTENT, initials for anyone else.
7. Realistic content — real-sounding names, numbers, timestamps, copy. Never lorem ipsum.
8. Small interactivity (tab switch, toggle, expand) is a plain inline `<script>` at the end of `<body>`. No external JS framework.
9. Before emitting, run the "Before you emit" check in the craft rules above, and spend accent the way the style card's "Colour energy" line says.

## Output contract

```
<artifact title="Short screen name">
<!doctype html>
...
</artifact>
```

Nothing before or after the block.
