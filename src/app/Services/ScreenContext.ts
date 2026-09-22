import type { AppNavigation, Entity, PlannedScreen } from './PlannerService.ts'
import { buildBottomNav, buildDetailHeader, HEADER_HEIGHT, NAV_CLEARANCE, NAV_HEIGHT } from './ShellService.ts'
import type { ShellParts } from '../../lib/screen-normalizer.ts'
import { BlueprintService } from './BlueprintService.ts'

// What one screen needs to know about the app it belongs to. Shared by the planned run
// (PlanController) and by adding a screen to an existing app (GenerateController): the second
// path used to send the bare prompt, so "add another screen" drew a different app with its own nav.

export type ScreenSlot = {
  /** Known up front for a planned screen; an added screen is titled by the model, so it is absent. */
  name?: string
  screenType: 'root-tab' | 'detail-view' | 'modal-flow'
  activeTabId?: string
  parentScreen?: string
}

export type ExistingScreen = { name: string; screenType: string; activeTabId: string | null }

const tabLabels = (nav: AppNavigation) => nav.tabs.map((t) => t.label).join(', ')
const activeLabel = (slot: ScreenSlot, nav: AppNavigation) => nav.tabs.find((t) => t.id === slot.activeTabId)?.label ?? slot.name ?? ''

export function shellContract(slot: ScreenSlot, nav: AppNavigation, isMobile: boolean): string {
  if (!isMobile) {
    return `SIDEBAR CONTRACT
1. Render the shared sidebar with EXACTLY these items in this order: [${tabLabels(nav)}].
2. The active item is "${activeLabel(slot, nav)}"; every other item is muted.
3. Never invent, rename, drop, or reorder items.`
  }
  if (slot.screenType === 'root-tab') {
    return `SHELL CONTRACT — the shared chrome is injected for you
1. A shared ${NAV_HEIGHT}px bottom tab bar ([${tabLabels(nav)}]) is added to your page automatically AFTER you finish.
2. Do NOT render a bottom nav, tab bar, or floating action button yourself — a second one will collide with it.
3. This screen is the "${activeLabel(slot, nav)}" tab; the injected bar highlights it.
4. End your page content with ${NAV_CLEARANCE}px of bottom padding so nothing hides behind the bar.`
  }
  const title = slot.name ? `the title "${slot.name}"` : `this screen's title`
  return `SHELL CONTRACT — the shared chrome is injected for you
1. A shared ${HEADER_HEIGHT}px top header (back button + ${title}) is added to your page automatically AFTER you finish.
2. Do NOT render your own top header, back button, or page-title bar.
3. Do NOT render a bottom tab bar — this is a pushed detail screen.
4. Start your content directly below where that header sits.`
}

// Mobile shells are assembled in code so every screen gets byte-identical markup.
// Desktop has no sidebar builder yet, so it stays on the prose contract.
export function shellPartsFor(slot: ScreenSlot, nav: AppNavigation, isMobile: boolean, title: string): ShellParts {
  if (!isMobile) return {}
  return slot.screenType === 'root-tab'
    ? { nav: buildBottomNav(nav, slot.activeTabId) }
    : { header: buildDetailHeader(title, slot.parentScreen ?? 'Home') }
}

export function screenBrief(p: { app: string; screenNames: string[]; contract: string; digest: string; heading: string; description: string; content?: string; data?: string }): string {
  return [
    `App: ${p.app}`,
    `Other screens in this app: ${p.screenNames.join(', ')}`,
    p.content ? `\n${p.content}` : '',
    p.data ? `\n${p.data}` : '',
    '',
    `# ${p.contract}`,
    p.digest
      ? `\n# HOUSE STYLE\nThe anchor screen of this app was already designed. Reuse these exact component styles — same radii, same spacing rhythm, same card treatment:\n\`\`\`css\n${p.digest}\n\`\`\``
      : '',
    `\n## ${p.heading}`,
    p.description,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Where a screen added to an existing app belongs. It fills an empty tab only when the request
 * names that tab; otherwise it is a detail screen pushed from the first tab — a second root screen
 * on an occupied tab would give the tab bar two screens claiming the same highlight.
 */
export function slotForAddedScreen(prompt: string, nav: AppNavigation, existing: ExistingScreen[]): ScreenSlot {
  const taken = new Set(existing.filter((s) => s.screenType === 'root-tab').map((s) => s.activeTabId))
  const wanted = nav.tabs.find((t) => !taken.has(t.id) && new RegExp(`(?<![\\w-])${t.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i').test(prompt))
  if (wanted) return { screenType: 'root-tab', activeTabId: wanted.id }
  const home = existing.find((s) => s.screenType === 'root-tab') ?? existing[0]
  return { screenType: 'detail-view', parentScreen: home?.name }
}

/** The navigation saved with a planned project; null for single-screen projects or unreadable JSON. */
export function parseNavigation(json: string | null | undefined): AppNavigation | null {
  try {
    const nav = JSON.parse(json ?? 'null')
    return nav && Array.isArray(nav.tabs) && nav.tabs.length >= 2 ? (nav as AppNavigation) : null
  } catch {
    return null
  }
}

/**
 * The app's data model, as every screen sees it. One list feeds every screen, so "Pad Thai $16.50"
 * on the feed is "Pad Thai $16.50" on its detail screen and in the cart.
 */
export function dataBlock(entities: Entity[]): string {
  if (entities.length === 0) return ''
  const lines = entities.map((e) => `${e.kind}:\n${e.items.map((it) => `- ${it.name}${Object.keys(it.fields).length ? ` — ${Object.entries(it.fields).map(([k, v]) => `${k}: ${v}`).join('; ')}` : ''}`).join('\n')}`)
  return `# APP DATA — the only source for these things
Wherever this screen shows one of these, use its exact name and values; when it needs more of the same kind, add items that fit beside them. Never rename, re-price or contradict an item below.
${lines.join('\n')}`
}

/** A planned screen's spec, written so the drawing model composes a decided screen instead of deciding one. */
export function screenSpec(s: PlannedScreen): string {
  return [
    s.description,
    s.userGoal && `\nUser goal: ${s.userGoal}`,
    s.primaryAction && `Primary action (the one filled button, within thumb reach): ${s.primaryAction}`,
    s.sections.length > 0 && `Sections, top to bottom:\n${s.sections.map((x, i) => `${i + 1}. ${x}`).join('\n')}`,
    s.linksTo.length > 0 && `Taps that open another screen: put data-od-link="<exact screen name>" on the element that opens it. Targets from this screen: ${s.linksTo.map((l) => `"${l}"`).join(', ')}.`,
    // The archetype's structural pattern (blueprints/<archetype>.json); the plan's sections above say what content fills it.
    s.archetype && BlueprintService.brief(s.archetype) && `\n${BlueprintService.brief(s.archetype)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** What Project.plan holds; tolerant of nulls and of JSON written by an older version. */
export function parseStoredPlan(json: string | null | undefined): { summary: string; appType: string; entities: Entity[] } | null {
  try {
    const p = JSON.parse(json ?? 'null')
    if (!p || typeof p !== 'object') return null
    return { summary: typeof p.summary === 'string' ? p.summary : '', appType: typeof p.appType === 'string' ? p.appType : 'other', entities: Array.isArray(p.entities) ? p.entities : [] }
  } catch {
    return null
  }
}
