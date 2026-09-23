import type { Entity } from './PlannerService.ts'
import { resolveIcon } from './ShellService.ts'

// GQ-16: the house style as markup, not as CSS. Sibling screens used to get the anchor screen's
// first 1200 characters of CSS — `* {box-sizing}`, `body`, `.today-page`, `.greeting-name` — and the
// card, the row and the button never made the cut, so every screen re-invented them (four of six
// screens in one run used no kit class at all and wrote 12–32 KB of their own CSS). A model copies
// an example far more reliably than it follows a list of class names, so the sheet below is the
// kit's components already filled with this app's data: paste, change the words, keep the build.
// It is assembled in code, so every screen of an app — including one added later — gets the same
// sheet, and the anchor-first round trip is no longer needed.

/** The sheet must stay small: KIT-05 showed that more material in the prompt lowers quality. */
export const SHEET_BUDGET = 2600

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

type Item = { name: string; fields: Record<string, string> }

/** The first kind with items, else a neutral placeholder so the sheet still shows the build. */
function sample(entities: Entity[]): { kind: string; items: Item[] } {
  const e = entities.find((x) => x.items.length > 0)
  if (e) return { kind: e.kind, items: e.items.slice(0, 2) }
  return { kind: 'Items', items: [{ name: 'First item', fields: { detail: 'Today' } }, { name: 'Second item', fields: { detail: 'Yesterday' } }] }
}

const firstField = (it: Item): [string, string] | undefined => Object.entries(it.fields).find(([, v]) => v)
const rest = (it: Item) => Object.entries(it.fields).slice(1).map(([, v]) => v).filter(Boolean).slice(0, 2).join(' · ')

// No data-od-link in the sheet: the screen's spec names its real targets, and a placeholder gets copied.
function row(it: Item, kind: string): string {
  // resolveIcon answers 'grid' when nothing in the words matches; then the kind gets a try.
  const byName = resolveIcon('', it.name)
  const icon = byName !== 'grid' ? byName : resolveIcon('', kind)
  const trail = firstField(it)
  const sub = rest(it) || (trail ? trail[0] : kind)
  return `<a class="od-row od-row--chevron"><span class="od-row__lead"><i data-lucide="${icon}"></i></span><span class="od-row__body"><span class="od-row__title">${esc(clip(it.name, 40))}</span><span class="od-row__sub">${esc(clip(sub, 48))}</span></span><span class="od-row__trail">${esc(clip(trail?.[1] ?? '', 16))}</span></a>`
}

/**
 * This app's components, as the markup every screen pastes. Data comes from the plan's entities,
 * so the sheet's rows are the app's own rows; the styling comes from the kit (`kit/od-kit.css`),
 * injected when a page uses an `od-` class, and from the design tokens — never from the sheet.
 */
export function componentSheet(entities: Entity[]): string {
  const { kind, items } = sample(entities)
  const it = items[0]!
  const stat = firstField(it)
  const parts = [
    `<!-- Section -->\n<div class="od-section"><div class="od-section__head"><h2 class="od-section__title">${esc(clip(kind, 30))}</h2><button class="od-section__link">See all</button></div></div>`,
    `<!-- List: one row per item, same build on every screen -->\n<div class="od-list">${items.map((x) => row(x, kind)).join('')}</div>`,
    `<!-- Card with a figure; od-bento for a tile grid (first tile wide) -->\n<div class="od-bento"><div class="od-card od-bento__wide"><div class="od-stat"><span class="od-stat__label">${esc(clip(stat?.[0] ?? 'This week', 24))}</span><span class="od-stat__value">${esc(clip(stat?.[1] ?? '12', 14))}</span><span class="od-stat__delta od-stat__delta--up">+2 vs last week</span></div><div data-od-chart="sparkline" data-values="3,4,4,5,6,6,7" style="height:48px"></div></div><div class="od-card"><div class="od-stat"><span class="od-stat__label">${esc(clip(kind, 20))}</span><span class="od-stat__value">${entities.reduce((n, e) => n + e.items.length, 0) || 4}</span></div></div><div class="od-card od-card--glass"><div class="od-stat"><span class="od-stat__label">Best</span><span class="od-stat__value">30</span></div></div></div>`,
    `<!-- Actions: one filled button per screen; icon buttons for the rest -->\n<button class="od-btn od-btn--block">Continue</button> <button class="od-btn od-btn--secondary">Secondary</button> <button class="od-icon-btn" aria-label="Add"><i data-lucide="plus"></i></button>`,
    `<!-- Filters and inputs -->\n<div class="od-carousel"><button class="od-chip is-active">All</button><button class="od-chip">${esc(clip(kind, 20))}</button><button class="od-chip">Recent</button></div>\n<div class="od-search"><i data-lucide="search"></i><input placeholder="Search ${esc(clip(kind.toLowerCase(), 20))}"></div>\n<div class="od-row"><span class="od-row__body"><span class="od-row__title">Reminders</span><span class="od-row__sub">Daily at 9:00</span></span><input type="checkbox" class="od-switch" role="switch" checked></div>`,
  ]
  const sheet = parts.join('\n')
  return sheet.length > SHEET_BUDGET ? sheet.slice(0, SHEET_BUDGET) : sheet
}
