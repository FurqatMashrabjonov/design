# App consistency & navigation shell rules

Universal design rules for multi-screen applications. Ensures that screens belonging to the same app look and feel like they were crafted by a single design team, not disparate prototypes.

## 0. The shell contract wins

If the brief carries a **SHELL CONTRACT** saying the shared chrome is injected for you, obey it and draw none of that chrome yourself. The rules below then describe what the injected shell will look like, so your content can sit correctly against it. With no such contract (a one-off screen), render the shell yourself per the rules below.

## 1. Shared Navigation Shell (MANDATORY)

For mobile apps:
- **Consistent Bottom Navigation Bar**: All root tab screens carry the identical bottom tab bar.
  - The exact same tab order, names, and SVG icons across all screens — 64px tall, `position: fixed`, full bleed.
  - Exactly one active tab in `var(--accent)`; every inactive tab in `var(--meta)`.
  - Never invent new tabs or remove tabs between screens.
  - Never reposition a central action button. If it is a floating center action on Screen 1, it is the floating center action on every other tab screen.
  - Page content ends with 88px of bottom padding so the last row clears the bar.
- **Detail screens** are pushed views: a 56px top header with a back button, and **no** bottom tab bar.

For desktop apps:
- **Consistent Sidebar / Top Navigation**:
  - The brand logo, sidebar navigation items, active indicator, and bottom user profile must be visually synchronized across all views.

## 2. Header and Top Bar Rhythm

- **Root Tab Screens**:
  - Greeting / Title on the left (e.g., "Good morning, Maya" or screen title).
  - Quick status or utility on the right (e.g., Streak counter, Notifications, or User Avatar).
  - No back button on root tab screens.
- **Detail / Child Screens**:
  - Back button on the left, 44×44px touch target, chevron-left glyph.
  - Centered or left-aligned screen title.
  - Contextual action on the right (e.g., "Share", "Edit", or "Save").

## 3. Visual Continuity & Token Discipline

- **Surfaces come from tokens, never from literals.** Chrome uses `var(--surface)` and `var(--border)` — never `bg-white`, `#fff`, or `bg-white/95`. A hardcoded white bar turns a dark design system into a broken one.
- **Brand Accent Budget**:
  - The same primary accent color is used for active tabs, primary call-to-action buttons, and active selection pills.
- **Card and Surface Radii**:
  - Maintain a single consistent border-radius language, driven by `var(--radius-md)` for main cards and `var(--radius-sm)` for inner tiles.
- **Icon Style**:
  - Use 1.8–2px monoline inline SVGs throughout all screens. Never mix filled emoji and outline icons.

## 4. House style across parallel screens

When a **HOUSE STYLE** CSS block is supplied, it came from this app's already-designed anchor screen. Reuse its component styles verbatim — same card padding, same radii, same section spacing, same label sizes. Inventing a second visual dialect is the single most visible way a multi-screen app reads as machine-assembled.
