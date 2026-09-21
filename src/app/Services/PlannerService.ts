import { completeJSON } from './LlmService.ts'
import { ICON_NAMES, isActionIcon, resolveIcon } from './ShellService.ts'

const PLANNER_PROMPT = `You are a principal product designer scoping a coherent multi-screen app from a one-line brief.
Given the brief and platform (mobile or desktop), design a unified app architecture with 3 to 5 screens and a SHARED global navigation shell.

Rules:
1. For mobile: define a bottom-tabs navigation with 3 to 5 clear tabs (e.g. Home, Search, Stats, Profile). Tabs are destinations, never actions. Labels are one word.
2. For desktop: define sidebar navigation items.
3. Every screen is either a "root-tab" (the one primary view of a tab, drawn with the shared tab bar) or a "detail-view" (pushed from another screen, drawn with a back button and no tab bar). Use "modal-flow" for a step of a focused task such as checkout or onboarding.
4. A tab has EXACTLY ONE root-tab screen; give it that tab's activeTabId. Anything reached by tapping something inside a screen — an item's detail, an editor, a form, a result, a confirmation, a checkout step — is a detail-view and names its parentScreen.
5. A good app plan is not five tabs: include the detail screens where the core task actually happens.

Respond with JSON only, exactly this shape:
{
  "appName": "Short product name, 2-4 words",
  "summary": "One or two sentences describing the app and visual direction",
  "tags": ["3 to 6 short tags, e.g. mobile, fintech, dark"],
  "navigation": {
    "type": "bottom-tabs",
    "tabs": [
      { "id": "home", "label": "Home", "icon": "home" },
      { "id": "search", "label": "Search", "icon": "search" },
      { "id": "stats", "label": "Stats", "icon": "bar-chart-2" },
      { "id": "profile", "label": "Profile", "icon": "user" }
    ]
  },
  "screens": [
    {
      "name": "Screen name",
      "description": "What this screen shows and does, specific enough to design from",
      "screenType": "root-tab",
      "activeTabId": "home"
    },
    {
      "name": "Item Detail",
      "description": "What opens when an item on the first screen is tapped",
      "screenType": "detail-view",
      "parentScreen": "Screen name"
    }
  ]
}
Tab icons: choose "icon" ONLY from this list — ${ICON_NAMES.join(', ')}.
Set "isAction": true on at most one tab, and only when the app's core loop is capturing something (camera, scan, mic); that tab is drawn as a raised centre button.
No prose outside the JSON.`

export type AppNavTab = {
  id: string
  label: string
  icon: string
  isAction?: boolean
}

export type AppNavigation = {
  type: 'bottom-tabs' | 'sidebar' | 'header-nav'
  tabs: AppNavTab[]
}

export type PlannedScreen = {
  name: string
  description: string
  screenType: 'root-tab' | 'detail-view' | 'modal-flow'
  activeTabId?: string
  parentScreen?: string
}

export type Plan = {
  appName: string
  summary: string
  tags: string[]
  navigation: AppNavigation
  screens: PlannedScreen[]
}

// Exported for tests — no network. Throws on malformed/empty output; callers decide whether to retry.
export function parsePlan(raw: string): Plan {
  const plan = JSON.parse(raw)
  if (!Array.isArray(plan.screens) || plan.screens.length === 0) throw new Error('Planner returned no screens')

  // Parse or fallback navigation shell
  let navigation: AppNavigation
  if (plan.navigation && Array.isArray(plan.navigation.tabs) && plan.navigation.tabs.length >= 2) {
    navigation = {
      type: plan.navigation.type === 'sidebar' ? 'sidebar' : 'bottom-tabs',
      tabs: plan.navigation.tabs.slice(0, 5).map((t: Record<string, unknown>, idx: number) => {
        const label = String(t.label || `Tab ${idx + 1}`)
        const icon = resolveIcon(String(t.icon ?? ''), label)
        return { id: String(t.id || `tab-${idx}`), label, icon, isAction: Boolean(t.isAction) && isActionIcon(icon) }
      }),
    }
    // One raised button at most — a second one would fight it for the centre.
    const firstAction = navigation.tabs.findIndex((t) => t.isAction)
    navigation.tabs.forEach((t, i) => (t.isAction = i === firstAction))
  } else {
    // Generate default tabs from first few screens
    navigation = {
      type: 'bottom-tabs',
      tabs: [
        { id: 'home', label: 'Home', icon: 'home' },
        { id: 'search', label: 'Search', icon: 'search' },
        { id: 'activity', label: 'Activity', icon: 'activity' },
        { id: 'profile', label: 'Profile', icon: 'user' },
      ],
    }
  }

  const screens: PlannedScreen[] = plan.screens.slice(0, 5).map((s: Record<string, unknown>, idx: number) => ({
    name: String(s?.name ?? `Screen ${idx + 1}`).slice(0, 60),
    description: String(s?.description ?? '').slice(0, 500),
    screenType: s?.screenType === 'detail-view' || s?.screenType === 'modal-flow' ? s.screenType : 'root-tab',
    activeTabId: s?.activeTabId ? String(s.activeTabId) : undefined,
    parentScreen: s?.parentScreen ? String(s.parentScreen) : undefined,
  }))

  return {
    appName: String(plan.appName ?? 'Untitled').slice(0, 60),
    summary: String(plan.summary ?? '').slice(0, 400),
    tags: Array.isArray(plan.tags) ? plan.tags.slice(0, 6).map(String) : [],
    navigation,
    screens: assignScreenSlots(screens, navigation),
  }
}

/**
 * Makes the plan's screen types true. Left to the model, every screen came back "root-tab" — an
 * editor or a checkout step drawn with the tab bar, two screens lighting the same tab. Here a tab
 * keeps the first screen that claims it; every other screen becomes a detail view with a parent
 * that exists.
 */
export function assignScreenSlots(screens: PlannedScreen[], navigation: AppNavigation): PlannedScreen[] {
  const tabIds = new Set(navigation.tabs.map((t) => t.id))
  const rootOf = new Map<string, string>() // tab id -> screen name
  const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

  const out = screens.map((s) => ({ ...s }))
  // Pass 1: explicit, valid, first-come claims.
  for (const s of out) {
    if (s.screenType === 'root-tab' && s.activeTabId && tabIds.has(s.activeTabId) && !rootOf.has(s.activeTabId)) rootOf.set(s.activeTabId, s.name)
  }
  // Pass 2: a root screen without a usable tab takes a free one (named like it, else the next); one
  // whose tab is already taken, or with no tab left, is not a root screen.
  for (const s of out) {
    if (s.screenType !== 'root-tab' || (s.activeTabId && rootOf.get(s.activeTabId) === s.name)) continue
    const rival = s.activeTabId && rootOf.get(s.activeTabId)
    const open = navigation.tabs.filter((t) => !rootOf.has(t.id))
    const free = open.find((t) => words(s.name).some((w) => words(t.label).includes(w) || w === t.id.toLowerCase())) ?? open[0]
    if (free && !rival) {
      s.activeTabId = free.id
      rootOf.set(free.id, s.name)
    } else {
      s.screenType = 'detail-view'
      s.parentScreen = s.parentScreen ?? (rival || undefined)
      s.activeTabId = undefined
    }
  }
  // An app needs a way in.
  if (rootOf.size === 0 && out.length > 0) {
    out[0].screenType = 'root-tab'
    out[0].activeTabId = navigation.tabs[0].id
    out[0].parentScreen = undefined
    rootOf.set(navigation.tabs[0].id, out[0].name)
  }
  // Pass 3: every pushed screen has a parent that is a real, different screen.
  const firstRoot = out.find((s) => s.screenType === 'root-tab')!.name
  for (const s of out) {
    if (s.screenType === 'root-tab') {
      s.parentScreen = undefined
      continue
    }
    s.activeTabId = undefined
    const named = out.find((o) => o.name !== s.name && o.name.toLowerCase() === s.parentScreen?.toLowerCase())
    s.parentScreen = named?.name ?? firstRoot
  }
  return out
}

export async function planScreens(brief: string, device: string): Promise<Plan> {
  const raw = await completeJSON(PLANNER_PROMPT, `Brief: ${brief}\nPlatform: ${device}`)
  return parsePlan(raw)
}

// One retry on malformed JSON or an empty screen list — DeepSeek's json_object mode guarantees syntax but not shape.
export async function planScreensWithRetry(brief: string, device: string): Promise<Plan> {
  try {
    return await planScreens(brief, device)
  } catch {
    return await planScreens(brief, device)
  }
}
