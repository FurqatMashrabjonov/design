import { completeJSON } from './LlmService.ts'
import { ICON_NAMES, isActionIcon, resolveIcon } from './ShellService.ts'

const PLANNER_PROMPT = `You are a principal product designer scoping a coherent multi-screen app from a one-line brief.
Given the brief and platform (mobile or desktop), design a unified app architecture with 3 to 5 screens and a SHARED global navigation shell.

Rules:
1. For mobile: define a bottom-tabs navigation with 3 to 5 clear tabs (e.g. Home, Search, Stats, Profile). Tabs are destinations, never actions. Labels are one word.
2. For desktop: define sidebar navigation items.
3. Every screen must declare whether it is a "root-tab" (primary tab view with the shared navigation bar) or a "detail-view" (child screen accessed from a parent, with a top back button).
4. If a screen is a "root-tab", specify which activeTabId it highlights.

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

  return {
    appName: String(plan.appName ?? 'Untitled').slice(0, 60),
    summary: String(plan.summary ?? '').slice(0, 400),
    tags: Array.isArray(plan.tags) ? plan.tags.slice(0, 6).map(String) : [],
    navigation,
    screens: plan.screens
      .slice(0, 5)
      .map((s: Record<string, unknown>, idx: number) => ({
        name: String(s?.name ?? `Screen ${idx + 1}`).slice(0, 60),
        description: String(s?.description ?? '').slice(0, 500),
        screenType: (s?.screenType === 'detail-view' || s?.screenType === 'modal-flow')
          ? s.screenType
          : 'root-tab',
        activeTabId: s?.activeTabId ? String(s.activeTabId) : navigation.tabs[idx % navigation.tabs.length]?.id,
        parentScreen: s?.parentScreen ? String(s.parentScreen) : undefined,
      })),
  }
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
