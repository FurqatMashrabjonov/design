# App consistency & navigation shell rules

Universal design rules for multi-screen applications. Ensures that screens belonging to the same app look and feel like they were crafted by a single design team, not disparate prototypes.

## 1. Shared Navigation Shell (MANDATORY)

For mobile apps:
- **Consistent Bottom Navigation Bar**: All root tab screens MUST render the identical bottom tab bar.
  - The exact same tab order, names, and SVG icons across all screens.
  - Exactly one active tab marked with `text-primary` (or `var(--accent)`), all inactive tabs marked with `text-muted-foreground`.
  - Never invent new tabs or remove tabs between screens.
  - Never reposition a central action button (e.g. Camera or Add button). If it is a floating center action on Screen 1, it must be the floating center action on all other tab screens.

For desktop apps:
- **Consistent Sidebar / Top Navigation**:
  - The brand logo, sidebar navigation items, active indicator, and bottom user profile must be visually synchronized across all views.

## 2. Header and Top Bar Rhythm

- **Root Tab Screens**:
  - Greeting / Title on the left (e.g., "Good morning, Maya" or screen title).
  - Quick status or utility on the right (e.g., Streak counter, Notifications, or User Avatar).
  - No back button on root tab screens.
- **Detail / Child Screens**:
  - Standard back button on the left: `<button class="p-2 -ml-2 text-foreground"><svg>...chevron-left...</svg></button>`.
  - Centered or left-aligned screen title.
  - Contextual action on the right (e.g., "Share", "Edit", or "Save").

## 3. Visual Continuity & Token Discipline

- **Brand Accent Budget**:
  - The same primary accent color is used for active tabs, primary call-to-action buttons, and active selection pills.
- **Card and Surface Radii**:
  - Maintain a single consistent border-radius language (e.g. `rounded-2xl` for main cards, `rounded-xl` for inner tiles).
- **Icon Style**:
  - Use 1.8–2px monoline inline SVGs throughout all screens. Never mix filled emoji and outline icons.
