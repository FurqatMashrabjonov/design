---
name: mobile-screen-jsx
description: >-
  One phone screen as a React component on Konsta UI v5 (iOS look), rendered by the host's runtime
  inside a sandboxed frame. Successor of mobile-screen (HTML); KON-00.
od:
  mode: prototype
  platform: mobile
  format: jsx
---

# Mobile screen (JSX)

Write exactly one screen of a phone app as a React component. The host compiles it (JSX → JS, Tailwind v4
for the classes you use), loads it on a runtime that already contains React 19, Konsta UI 5 and `@od/kit`,
and shows it at 390×844 inside an iPhone frame. Nothing you write runs on the server.

## The file

```jsx
import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Button, Segmented, SegmentedButton } from 'konsta/react'
import { Flame, Plus, ChevronRight } from 'lucide-react'
import { useNav, AppTabbar, Ring, Bars } from '@od/kit'

const HABITS = [ /* the screen's data: copied from APP DATA in the brief, never invented */ ]

export default function Screen() {
  const nav = useNav()
  const [part, setPart] = useState('All')
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Habits" right={<Link iconOnly onClick={() => nav.push('add-habit')}><Plus className="w-6 h-6" /></Link>} />
      …
      <AppTabbar active="habits" />
    </Page>
  )
}
```

Rules the compiler enforces — a file that breaks one is rejected, not repaired:
1. Imports only from `react`, `konsta/react`, `lucide-react` and `@od/kit`. Nothing else: no CSS files, no other packages, no URLs.
2. One `export default function` component, no props required. Helper components and constants may sit above it in the same file.
3. No `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `document.cookie`, `eval`, `new Function`, dynamic `import()`, `window.parent`, `postMessage`. The screen shows the data in the brief; it never loads anything.
4. Only names that exist: Konsta components from the reference below, lucide icons by their exported name (`Flame`, `ChevronRight`, `Droplets`…), kit exports listed under `@od/kit`.
5. No `<style>`, no `<script>`, no `dangerouslySetInnerHTML`. Style with Tailwind classes (arbitrary values allowed: `text-[15px]`, `rounded-[28px]`, `bg-primary/10`) and, for values from data, inline `style={{ color }}`.

## How a screen is built

- Root is `<Page>`. A tab's root screen: `<Navbar large transparent title="…">` and `<AppTabbar active="<tab id>" />` last; pad the page bottom (`pb-32`) so nothing hides under the bar. A pushed screen: `<Navbar title="…" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />` and no tab bar. A first-run screen (welcome, sign in): no Navbar, the primary button at the bottom.
- Content is Konsta blocks: `<Block>` for free layout, `<BlockTitle>` + `<List strong inset dividers>` of `<ListItem>` for rows (title/subtitle/after/media; `link` + `linkProps={{ onClick }}` when it opens something), `<Card raised>` for a summary, `<Segmented strong rounded>` for a filter, `<Button large rounded>` for the one primary action, `<Sheet>`/`<Dialog>`/`<Toast>` for overlays (`opened` state in `useState`), `<Toggle>` in settings rows.
- Figures come from the kit, never hand-drawn: `Ring` (progress), `Bars` (per-day bars), `Area` (trend), `WaterGlass`, `CountUp`. No SVG of your own except a tiny mark.
- Icons are lucide components sized `w-6 h-6` (rows: `w-5 h-5`), colour through `text-…` classes or `style`. No emoji anywhere — not in data, not as an icon, not in copy.
- Navigation: `const nav = useNav()`; `nav.push('<screen id>', params)` to open another planned screen (ids are given in the brief), `nav.pop()` for back, `nav.reset('<tab id>')` for a tab. Every row or button that plainly opens something calls one of these.
- Interactivity is local `useState` only (a toggle, a segment, a checked habit, an open sheet). It must look finished at first render: pick sensible initial state from the data (e.g. two habits already done).
- Text and numbers come from APP DATA in the brief. Format numbers for people (`7,843`, `1.5 L`, `41 days`); dates as the brief gives them.

## Craft (iOS 26)

- One idea per screen and one primary action. Large title for tabs, 17px body, 13–15px secondary at 55–70% opacity (`opacity-70`, `text-black/55 dark:text-white/55`), 8-pt spacing.
- Lead with the one thing the screen is about — a figure, a ring, a list — never a stack of identical cards and never a decorative badge or sticker.
- Colour: `text-primary`/`bg-primary` for the accent (the host sets it), one tint per metric from the data's colours, everything else neutral. Dark mode comes from `dark:` variants Konsta already applies; do not hardcode white surfaces (`bg-white`) — use `bg-white dark:bg-black` pairs only when you must.
- Tap targets ≥ 44px. Rows 44–72px. No horizontal overflow: long titles truncate (`truncate`), grids use `grid-cols-2`.
- Restraint: what a shipped app would do. If a section is not in the brief, leave it out.

## Output

Reply with the file only, inside one fenced block:

```jsx
…the component…
```

Nothing before or after the block.
