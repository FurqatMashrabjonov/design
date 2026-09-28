---
name: mobile-screen-jsx
description: >-
  One phone screen as a React component on Konsta UI v5 (iOS look), rendered by the host's runtime
  inside a sandboxed frame. KON-00.
od:
  mode: prototype
  platform: mobile
  format: jsx
---

# Mobile screen (JSX)

Write exactly one screen of a phone app as a React component. The host compiles it (JSX → JS, Tailwind v4
for the classes you use), runs it on React 19 + Konsta UI 5 + `@od/kit`, and shows it at 390×844 in an
iPhone frame, light or dark. Nothing you write runs on the server.

The bar is a top App Store app or a featured Dribbble shot — not a settings page. Konsta gives you native iOS
parts; your job is the composition, the colour and the moments that make a screen feel alive.

## The file

```jsx
import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Card } from 'konsta/react'
import { Plus, Flame } from 'lucide-react'
import { useNav, AppTabbar, Rings, Tile, gradient, tint } from '@od/kit'

const C = { steps: '#ff9f0a', water: '#0a84ff' }   // the app's palette — copied from the brief, unchanged
const HABITS = [ /* the screen's data, from APP DATA in the brief */ ]

export default function Screen() {
  const nav = useNav()
  …
}
```

Rules the compiler enforces — a file that breaks one is rejected, not repaired:
1. Imports only from `react`, `konsta/react`, `lucide-react` and `@od/kit`. No CSS files, no other packages, no URLs.
2. One `export default function` component, no props required. Helpers and constants sit above it in the same file.
3. No `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `document.cookie`, `eval`, `new Function`, dynamic `import()`, `window.parent`, `postMessage`.
4. Only names that exist: Konsta components from the reference, lucide icons by their exported name, kit exports listed under `@od/kit`.
5. No `<style>`, `<script>`, `dangerouslySetInnerHTML`, `<img>` with a remote URL. Style with Tailwind classes (arbitrary values allowed) and inline `style` for values that come from data or the palette.

## Structure

- Root is `<Page>`. A tab's root screen: `<Navbar large transparent title="…">` and `<AppTabbar active="<tab id>" />` last, `pb-32` on the page. A pushed screen: `<Navbar title="…" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />`, no tab bar. A first-run screen (onboarding, sign up, log in): no tab bar, usually no navbar, the primary button near the bottom.
- Navigation: `const nav = useNav()`; `nav.push('<screen id>')` opens a planned screen (ids are in the brief), `nav.pop()` goes back, `nav.reset('<tab id>')` switches tab. Every row, card or button that plainly opens something calls one of these.
- Interactivity is local `useState`: toggles, segments, a checked item, an open sheet, an onboarding slide index. It must look finished at first render — pick initial state from the data (two habits already done, the second slide not shown yet).
- Data: names, numbers and dates come from APP DATA. Format for people (`7,843`, `1.5 L`, `41 days`). Every row shows its value — an empty right side on a stats row is a bug.

## Colour

- The brief gives the app's palette `C` — one colour per thing the app tracks or sorts by (steps, water, sleep; food, drinks; income, rent). Copy it verbatim at the top and use it everywhere that thing appears: its ring, its bar, its tile, its number. Same thing, same colour, on every screen.
- `text-primary` / `bg-primary` is the app's accent (set by the host) for actions and selection.
- Use colour with confidence: hero cards on a `gradient(C.x, secondColour)` with white text; `tint(C.x)` washes behind icons, chips and selected cards; coloured figures (`style={{ color: C.x }}`). Neutral surfaces around them keep it calm.
- Dark mode is automatic in Konsta parts. For your own surfaces use pairs: `bg-white dark:bg-[#1c1c1e]`, `text-black/55 dark:text-white/55`. Never a lone `bg-white`.

## Emoji

Emoji are welcome as content: a habit's or category's icon (`🧘`, `🥗`, `💊`), a category chip, an award (`🥇`), a mood, a flag, the centre of a ring, a spot illustration on an empty state or a reset-password screen. Where a real app would show a picture, it is a photo, not an emoji (next section). Put them on a `Tile tinted` or `Medal`, or large (`text-4xl`–`text-5xl`) as the focal point. Keep them out of buttons, navbars and body text, and use one emoji per item — not a row of them.

## Photos

Anything a real app shows as a picture is a real photo: dishes, products, places and rooms, workouts and courses, articles, posts, a camera viewfinder, a hero banner. Write `<Photo q="…" className="…" />` from `@od/kit` — `q` says what the photo shows in 2–4 plain English words ("grilled chicken salad", "white leather sneakers", "beach villa bali") and the host fills it with a real photo. When APP DATA gives an item a `photo`, use it: `<Photo q={item.photo} … />`, so the same dish is the same photo on every screen.
- Size and corners come from `className`: a card image `w-full h-40 rounded-3xl`, a row thumbnail `w-14 h-14 rounded-2xl` (as `media`), a hero `w-full h-72`, a viewfinder `absolute inset-0`.
- Text over a photo goes in its children on a gradient: `<Photo q=… className="h-56 rounded-3xl"><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><div className="absolute bottom-0 p-4 text-white">…</div></Photo>`.
- Never an emoji, a gradient or a grey box where a photo belongs; never an `<img>` with a URL. People keep `Avatar` initials, except a social feed or profile, where a face is `<Photo q="portrait smiling woman" className="w-10 h-10 rounded-full" />`.

## Visual vocabulary (combine; do not stack the same one)

- **Hero figure** — one big number or ring that says what the screen is about: `Ring`/`Rings` 140–220px with the figure inside, or `text-figure` with a small unit and a "of goal" line.
- **Gradient tiles** — two side-by-side (`grid grid-cols-2 gap-3 px-4`) `<Hero as="button" color=…>`: icon, `text-title1` figure, one `text-subhead opacity-80` line under it.
- **Stat triplet** — `grid grid-cols-3 gap-3 px-4`, each `rounded-2xl p-3 bg-white dark:bg-[#1c1c1e]`: label, coloured value, small unit.
- **Rows with character** — `List strong inset dividers`; `media` is a `Tile` (solid + white lucide icon for settings, `tinted` + emoji for content) or a small `Ring`; `after` is a coloured value, a streak (`<Flame/> 23`), a `Toggle`, a `Checkbox` or a `Meter`.
- **Charts** — `Bars` (last bar highlighted, dashed goal), `Area` in 2-up cards with a label and figure above, `Heatmap` for streak history, `Meter` for progress in rows. Put a chart in `Block strong inset` or a `Card` with its figure and a delta (`▲ 12% vs last week` in green).
- **Filters** — `Segmented strong rounded` (Day/Week/Month, All/Morning/Evening), `Searchbar` in the navbar's `subnavbar`, horizontal `Chip`s in `flex gap-2 overflow-x-auto`.
- **Grids** — cards in `grid grid-cols-2|3 gap-3 px-4`: product tiles, award `Medal`s (locked ones greyed), category tiles with an emoji.
- **Promo card** — one per screen at most: a `Hero` card (e.g. premium, a streak milestone) with a line and a chevron.
- **Overlays** — `Sheet`, `Actions` (edit/delete menus), `Dialog` (confirm), `Toast` (undo), `Notification`, `Popover`; kept closed at first render, opened from state.
- **Forms** — `List strong inset` of `ListInput` with `media` icons and `label`s, `Stepper`, `Range`, `Radio`, `Checkbox`, colour dots for a choice; one `Button large rounded` to submit.
- **Chat** — `Messages`, `Message` (sent/received), `Messagebar`.
- Other Konsta parts worth reaching for: `Fab` (a create button on a list), `Chip`, `Badge` (counts on a bell), `Progressbar`, `Card` with `header`/`footer`, `MenuList`, `Table` (dense numbers), `Glass` (a floating glass surface over imagery).

## First-run screens

- **Onboarding** is one screen with 2–3 slides in `useState`: art (upper half), a 34px bold two-line title, a 17px line at 60% opacity, `Dots`, `Button large rounded` Continue / Get started, "Already have an account? Log in". Each slide's art is composed, never clip art, and shows this app's own thing: a mini version of its main card (a gradient card with a balance, a product tile with a price, a lesson card with XP), a stack of two tilted cards, a grid of tinted shapes filling up, a big emoji on a `Medal` inside a `Glow`. `Rings` only for an app that tracks progress. Three slides, three different compositions. Add `vs-float` to the art.
- **Sign up / Log in**: title + one line, Apple (black) and Google (grey) buttons side by side, an "or" divider, `List strong inset` of `ListInput`s with icons, the primary button, a link to the other screen. Forgot password: a big emoji or icon, a title, one field, one button.

## Motion

Entrance: `vs-rise` on cards and tiles with `style={{ animationDelay: `${i * 60}ms` }}` for a stagger; `vs-float` on onboarding art; `vs-bounce` when something is checked; `CountUp` for hero numbers; `Confetti run={…}` when the last item is completed. Kit figures animate themselves.

## Craft

- One idea per screen and one primary action. Large title for tabs, 17px body, 13–15px secondary at 55–70% opacity, 8-pt spacing, `px-4` gutters, 20–28px corner radii on cards.
- Tap targets ≥ 44px. No horizontal overflow: long titles `truncate`, grids fit 390px.
- Lucide icons `w-6 h-6` in bars, `w-4 h-4`–`w-5 h-5` in rows and tiles.

## Traps the judge keeps finding

- `BlockTitle` is a sibling placed before its `List` / `Block` / grid — never inside a `Block` (nested, it overlaps the card under it).
- `ListItem` and `ListInput` live only inside a `List`. A `ListItem link` draws its own chevron — never add a `ChevronRight`.
- A bottom action bar (`fixed bottom-0`) belongs on pushed screens only; on a tab screen the tab bar covers it — put the button in the flow, or `fixed bottom-24`. A page with a fixed bar gets bottom padding (`pb-40`) so its last row stays visible.
- The navbar's large title and a `Searchbar` do not share a row: a search goes in `subnavbar` or in the first `Block` under the title.
- The same thing keeps its colour and its icon on every screen (a card is not blue on Home and black on Cards).
- A figure on a gradient or dark card is white; yellow and light-green text on white is unreadable — use them as fills, not text.
- Placeholder people are invented names, never the reader's own.

## Output

Reply with the file only, inside one fenced block:

```jsx
…the component…
```

Nothing before or after the block.
