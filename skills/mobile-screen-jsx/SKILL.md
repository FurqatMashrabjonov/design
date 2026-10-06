---
name: mobile-screen-jsx
description: >-
  One phone screen as a React component on Konsta UI v5, rendered by the host's runtime inside a sandboxed
  frame, as iOS or Material. KON-00, HIG-11.
od:
  mode: prototype
  platform: mobile
  format: jsx
---

# Mobile screen (JSX)

Write exactly one screen of a phone app as a React component. The host compiles it, runs it on React 19 +
Konsta UI 5 + `@od/kit`, and shows it on a phone (390 wide), iOS or Android, light or dark. Konsta draws each part
the platform's way, so write parts, not platform looks.

The bar is a top App Store app: native structure (Apple's Human Interface Guidelines) carrying confident colour,
real photos and one clear idea per screen.

## The file

```jsx
import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem } from 'konsta/react'
import { Plus } from 'lucide-react'
import { useNav, AppTabbar, Rings, Hero, Tile, tint } from '@od/kit'

const C = { steps: '#ff9f0a', water: '#0a84ff' }   // the app's palette, copied from the brief unchanged
const HABITS = [ /* from APP DATA in the brief */ ]

export default function Screen() {
  const nav = useNav()
  …
}
```

The compiler rejects a file that breaks these:
1. Imports only from `react`, `konsta/react`, `lucide-react`, `@od/kit`. No CSS files, packages or URLs.
2. One `export default function`, no props. Helpers and constants above it.
3. No `fetch`, `XMLHttpRequest`, `WebSocket`, storage, cookies, `eval`, `new Function`, dynamic `import()`, `window.parent`, `postMessage`.
4. Only names that exist: Konsta parts from the reference, lucide icons by export name, kit exports.
5. No `<style>`, `<script>`, `dangerouslySetInnerHTML`, `<img src=URL>`. Tailwind classes; inline `style` only for data or palette values.

## Structure (HIG)

- Root is `<Page>`. **Tab root**: `<Navbar large transparent title="…">`, `<AppTabbar active="<tab id>" />` last, `pb-32` on the page. **Pushed**: `<Navbar title="…" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />`, no tab bar. **First-run**: no tab bar, usually no navbar, the primary button low.
- Hierarchy: the one thing the screen is about comes first and biggest; everything else supports it. **One primary action** per screen, drawn prominent (`Button large rounded` or a `Hero as="button"`); others are regular, tonal, clear or rows. Never three big buttons.
- Groups of rows are `List strong inset` (inset grouped): settings, a feed of items, a form. A `BlockTitle` names the group and sits just before its `List` or `Block`. `ListItem` / `ListInput` live only inside a `List`.
- A chevron means "opens something": `ListItem link` draws it; a row that only shows a value has none.
- `Segmented` holds 2–4 short options (Day / Week / Month). More, or long labels: a row of `Chip`s in `flex gap-2 overflow-x-auto px-4`.
- A search sits in the navbar's `subnavbar` or the first block under the title, never on the title's row.
- A bottom action bar (`fixed bottom-0`) belongs on pushed screens; the page then gets `pb-40`. On a tab screen, the action goes in the flow.
- A screen is phone-tall. A focused screen (a quiz, a recorder, a detail) still shows what it has: progress, the previous answers, tips, related items — the lower half is never empty.
- Navigation: `nav.push('<screen id>')`, `nav.pop()`, `nav.reset('<tab id>')`; ids are in the brief. Every row, card or button that plainly opens something calls one.
- State is local `useState` (toggles, segments, a checked item, an open sheet, a slide index) and looks finished at first render — initial state from the data.
- Data comes from APP DATA: names, numbers, dates, formatted for people (`7,843`, `1.5 L`, `41 days`). A stats row always shows its value.

## Type and space

- Text styles, not pixel sizes: `text-large-title` (a tab's own big title), `text-title1…3`, `text-headline` (row and card titles), `text-body`, `text-subhead` / `text-footnote` for secondary text at 55–70% opacity, `text-caption1/2` for the smallest labels, `text-figure` for the one hero number.
- 16px side margins (`px-4` on your own rows; a `Block` pads itself), 8-pt spacing, 20–28px card corners.
- Tap targets ≥ 44px. Nothing wider than the phone: long titles `truncate`, grids fit, two tiles per row.
- Icons: lucide, `w-6 h-6` in bars, `w-4 h-4`–`w-5 h-5` in rows and tiles.

## Colour

- The brief's palette `C` has one colour per thing the app tracks or sorts by. Paste it verbatim and use it wherever that thing appears — its ring, bar, tile, number — on every screen.
- `text-primary` / `bg-primary` is the app's accent (set by the host) for actions and selection.
- Be confident with colour where it means something: a `Hero` card (it picks white or ink text itself — give its text no colour class), `tint(C.x)` washes behind icons, chips and selected items, coloured figures (`style={{ color: C.x }}`). Surfaces around them stay neutral.
- Text must read: body and secondary text in the label colours; bright colours (yellow, mint, light green) as fills, not text on white.
- The app has a STYLE (in the brief) — follow its card for how to compose. The host sets its surfaces, corners and fonts: your own boxes are `bg-card` on the `bg-page` page, `bg-card-2` for a nested fill, `border-line` for hairlines, `rounded-card` for corners — never `bg-white`, `#fff` or `#1c1c1e`, or a style switch cannot reach them. Secondary text: `text-black/55 dark:text-white/55`.

## Emoji and photos

- Emoji are content: an item's or category's icon on a `Tile tinted`, an award on a `Medal`, a mood, a flag, the centre of a ring, an empty-state picture (`text-5xl`). One per item; never in buttons, navbars or body text.
- Anything a real app shows as a picture is a real photo: dishes, products, places, workouts, articles, posts, a viewfinder, a banner. `<Photo q="grilled chicken salad" className="w-full h-40 rounded-3xl" />` — `q` is 2–4 plain English words; with APP DATA's `photo`, use `q={item.photo}`. A row thumbnail `w-14 h-14 rounded-2xl` as `media`. Text over a photo sits in its children on `bg-gradient-to-t from-black/70`. People are photos too: `<Avatar name="Maya Chen" photo="portrait smiling young woman" size={40} />` (with APP DATA's `photo`, `photo={person.photo}`) — initials alone read as a placeholder.

## Building blocks (combine; do not repeat one)

- **Hero figure**: `Ring`/`Rings` 140–220px with the figure inside, or `text-figure` with a unit and an "of goal" line.
- **Hero tiles**: two `Hero as="button"` in `grid grid-cols-2 gap-3 px-4` — icon, `text-title1` figure, one `text-subhead opacity-80` line.
- **Stat triplet**: `grid grid-cols-3 gap-3 px-4`, cards with a label, a coloured value, a unit.
- **Rows with character**: `media` a `Tile` (solid + white icon for settings, tinted + emoji for content) or a small `Ring`; `after` a coloured value, a streak, a `Toggle`, a `Checkbox` or a `Meter`.
- **Charts**: `Bars`, `Area`, `Heatmap`, `Meter`, in a `Block strong inset` or `Card` with their figure and a delta.
- **Grids**: product tiles, `Medal`s (locked ones grey), category tiles.
- **Overlays** (PATTERNS below): `Sheet`, `Actions`, `Dialog`, `Popover`, `Popup`, a drawer (`Panel` from the avatar), `Notification` — closed at first render, opened from state. Every primary action answers with a `Toast`, a checked state or `Confetti`.
- **Forms**: `List strong inset` of `ListInput` with icons and labels, `Stepper`, `Range`, `Radio`, one submit button.
- Also: `Fab` (create on a list), `Chip`, `Badge`, `Progressbar`, `Card` with header/footer, `Table`, `Messages`/`Messagebar`.

## First-run screens

- **Onboarding**: one screen, 2–3 slides in `useState` — art in the upper half, a `text-large-title` two-line title, one `text-body` line at 60% opacity, `Dots`, `Button large rounded` Continue / Get started, "Already have an account? Log in". Each slide's art is this app's own thing composed (a mini version of its main card, two tilted cards, a big emoji on a `Medal` in a `Glow`), each slide different, `vs-float` on it.
- **Sign up / Log in**: title and a line, Apple (black) and Google buttons, an "or" divider, `List strong inset` of `ListInput`s, the primary button, a link to the other screen.

## Motion

`vs-rise` on cards with `style={{ animationDelay: `${i * 60}ms` }}`; `vs-float` on onboarding art; `vs-bounce` when something is checked; `CountUp` for the hero number; `Confetti run={…}` when the last item is done.

## Output

Reply with the file only, inside one fenced block:

```jsx
…the component…
```

Nothing before or after the block.
