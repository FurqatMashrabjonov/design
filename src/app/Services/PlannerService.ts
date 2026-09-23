import { AppPatternService } from './AppPatternService.ts'
import { completeJSON, type LlmUsage } from './LlmService.ts'
import { ICON_NAMES, isActionIcon, resolveIcon } from './ShellService.ts'
import { readProposal, type ProposedPalette } from '../../lib/palette.ts'

// What a screen is *for*. The vocabulary is closed so code can reason about a plan: pick a blueprint,
// check that the brief's screens are covered, measure plans in the eval.
export const ARCHETYPES = ['dashboard', 'feed', 'list', 'detail', 'search', 'form', 'checkout', 'result', 'stats', 'profile', 'settings', 'chat', 'player', 'map', 'camera', 'calendar', 'notifications', 'onboarding', 'auth', 'paywall'] as const
export type Archetype = (typeof ARCHETYPES)[number]

const PLANNER_PROMPT = `You are a principal product designer planning a coherent multi-screen app from a brief, for the platform given (mobile or desktop).

Work in this order.

1. REQUESTED. List every screen the brief asks for, in the brief's own words, as "requested". A vague brief ("todo app") requests nothing: return [].
2. SCREENS. Plan 4 to 6 screens. Every requested screen gets a screen of its own — they come first. Only if fewer than 5 were requested, add the screens the core task still needs (the detail, the editor, the result), and only then supporting ones (profile, settings). Each screen lists the indexes of the requested items it delivers in "covers".
3. NAVIGATION. Bottom tabs (mobile) or sidebar items (desktop): 2 to 5 destinations, one word each. A tab exists only if one of your screens is its root. Tabs are destinations, never actions.
4. TYPES. A screen is a "root-tab" (THE one primary view of a tab; give it that tab's activeTabId), a "detail-view" (opened by tapping something inside another screen; names its parentScreen) or a "modal-flow" (a step of a focused task: checkout, compose, onboarding; names its parentScreen). An item's detail, an editor, a form, a result, a confirmation, a tracking view are never root-tab.
5. SPEC. For each screen: its archetype, the user's goal in one sentence, the ONE primary action, 3 to 6 sections from top to bottom (each a short phrase naming the content, e.g. "Order summary with item thumbnails"), and "linksTo": the other screens a tap on this screen opens.
6. PALETTE. Invent the colours for THIS app, as hex. "bg" is the page, "surface" is cards on it, "fg" is body text, "accent" is the one brand colour. Choose from the whole spectrum — terracotta, ochre, moss, plum, sand, teal — and let the subject decide: a habit tracker is not a bank. Do not reach for indigo, violet or a generic blue unless the brief asks. "radius" is sharp, soft, round or pill. "character" is three or four words. Pick for character, not for safety: contrast is repaired afterwards in code, so a pale or vivid choice is allowed. If the brief says dark, night, sleep, focus or cinema, make "bg" dark and the accent vivid.
7. DATA. "entities": the real things this app is about — 1 to 3 kinds, 4 to 6 items each, with 2 to 5 short fields. Concrete, specific, mutually consistent (prices, times, counts that make sense together). Every screen will draw from exactly this data, so an item shown in a list is the same item, with the same values, on its detail screen. Write names and values in the brief's language.

Respond with JSON only, exactly this shape:
{
  "appName": "Short product name, 1-3 words",
  "appType": "one of: fitness, health, fintech, commerce, marketplace, food-delivery, food, travel, booking, social, learning, productivity, media, other",
  "summary": "One or two sentences: what the app does and for whom",
  "tags": ["3 to 6 short tags"],
  "requested": ["restaurant feed with categories", "dish detail with add-ons", "cart and checkout"],
  "navigation": { "type": "bottom-tabs", "tabs": [ { "id": "home", "label": "Home", "icon": "home" }, { "id": "orders", "label": "Orders", "icon": "receipt" } ] },
  "palette": { "accent": "#c05e3c", "bg": "#faf6f2", "surface": "#ffffff", "fg": "#2b2422", "radius": "round", "character": "warm, appetising, hand-made" },
  "entities": [
    { "kind": "Dish", "items": [ { "name": "Pad Thai", "fields": { "price": "$16.50", "restaurant": "Bangkok Garden", "rating": "4.8", "time": "25 min" } } ] }
  ],
  "screens": [
    {
      "name": "Home",
      "archetype": "feed",
      "screenType": "root-tab",
      "activeTabId": "home",
      "covers": [0],
      "userGoal": "Find something to eat tonight",
      "primaryAction": "Open a restaurant",
      "sections": ["Delivery address and search", "Cuisine chips", "Featured restaurants with photos", "Popular dishes nearby"],
      "linksTo": ["Dish Detail"],
      "description": "What this screen shows and does, specific enough to design from"
    },
    {
      "name": "Dish Detail",
      "archetype": "detail",
      "screenType": "detail-view",
      "parentScreen": "Home",
      "covers": [1],
      "userGoal": "Decide on a dish and customise it",
      "primaryAction": "Add to cart",
      "sections": ["Dish photo", "Name, price and rating", "Add-ons with prices", "Quantity and add-to-cart bar"],
      "linksTo": ["Cart"],
      "description": "…"
    }
  ]
}
"archetype" is ONLY one of: ${ARCHETYPES.join(', ')}.
Tab "icon" is ONLY one of: ${ICON_NAMES.join(', ')}.
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
  archetype: Archetype
  userGoal: string
  primaryAction: string
  sections: string[]
  linksTo: string[]
  covers: number[]
}

/** The things an app is about, with concrete values every screen shares. */
export type Entity = { kind: string; items: { name: string; fields: Record<string, string> }[] }

export type Plan = {
  appName: string
  appType: string
  summary: string
  tags: string[]
  requested: string[]
  /** Requested screens no planned screen claims to deliver — the input to one repair round. */
  uncovered: string[]
  /** True when the repair round ran and its plan was kept (agent log). */
  repaired?: boolean
  navigation: AppNavigation
  /**
   * Colours invented for this app (GQ-10). Absent when the model returned none or returned
   * something unreadable — the caller then falls back to a curated design system, which is what
   * every app used before this field existed.
   */
  palette?: ProposedPalette
  entities: Entity[]
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

  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const list = (v: unknown, max: number, each: number) => (Array.isArray(v) ? v.map((x) => text(x, each)).filter(Boolean).slice(0, max) : [])

  const requested = list(plan.requested, 6, 120)
  const appName = text(plan.appName, 60)
  // Names, parents and links all pass through the same cleaner so a link still finds its screen.
  const title = (v: unknown) => screenTitle(text(v, 60), appName)
  const drafted: PlannedScreen[] = plan.screens.slice(0, MAX_SCREENS).map((s: Record<string, unknown>, idx: number) => {
    const name = title(s?.name) || `Screen ${idx + 1}`
    const screenType = s?.screenType === 'detail-view' || s?.screenType === 'modal-flow' ? s.screenType : 'root-tab'
    return {
      name,
      description: text(s?.description, 500),
      screenType,
      activeTabId: s?.activeTabId ? String(s.activeTabId) : undefined,
      parentScreen: title(s?.parentScreen) || undefined,
      archetype: (ARCHETYPES as readonly string[]).includes(String(s?.archetype)) ? (s.archetype as Archetype) : inferArchetype(name, screenType),
      userGoal: text(s?.userGoal, 160),
      primaryAction: text(s?.primaryAction, 80),
      sections: list(s?.sections, 7, 120),
      linksTo: list(s?.linksTo, 6, 60).map((l) => title(l)).filter(Boolean),
      covers: Array.isArray(s?.covers) ? [...new Set(s.covers.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < requested.length))] : [],
    }
  })

  const screens = settleScreens(drafted, navigation, text(plan.appName, 60))

  const covered = new Set(screens.flatMap((s) => s.covers))
  return {
    appName: text(plan.appName, 60) || 'Untitled',
    appType: text(plan.appType, 30) || 'other',
    summary: text(plan.summary, 400),
    tags: list(plan.tags, 6, 30),
    requested,
    uncovered: requested.filter((_, i) => !covered.has(i)),
    navigation,
    // Left undefined rather than patched up when the model returns junk: a palette that half
    // parsed would be worse than the curated system it replaces.
    palette: readProposal(plan.palette) ?? undefined,
    entities: parseEntities(plan.entities),
    screens,
  }
}

export const MAX_SCREENS = 6

/**
 * A screen's name without the app's name in it. The planner writes "Habit Detail — Streakly" and
 * "Streakly — Achievements", and the injected header then drew that whole string at 34px over the
 * habit's own name — the judge flagged it on both runs. The app's name belongs to the app, not to
 * the screen. "Today — Streakly habit tracker" also loses its tail: the tail starts with the app.
 */
export function screenTitle(name: string, appName: string): string {
  const clean = name.replace(/\s+/g, ' ').trim()
  if (!appName) return clean
  const app = appName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sep = '\\s*[—–:|/-]\\s*'
  const out = clean
    .replace(new RegExp(`^${app}${sep}`, 'i'), '')
    .replace(new RegExp(`${sep}${app}\\b.*$`, 'i'), '')
    .replace(new RegExp(`\\s*\\(${app}\\)\\s*`, 'i'), ' ')
    .replace(new RegExp(`^${app}\\s+(?=\\S)`, 'i'), '')
    .trim()
  return out || clean
}

/** Slots, links and tabs made consistent with each other — after parsing, and again after trimming. */
/**
 * Applies the person's edits to a planned screen list (CHAT-08): screens they removed are gone,
 * renames are kept, and the slots, links and tabs are made true again. Only names change and only
 * planned screens survive, so an edited plan is still the planner's plan.
 */
export function editPlan(plan: Plan, edits: { keep?: number[]; names?: Record<number, string> }): Plan {
  const keep = new Set(edits.keep ?? plan.screens.map((_, i) => i))
  const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 60) : '')
  const kept = plan.screens
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => keep.has(i))
    .map(({ s, i }) => ({ ...s, name: clean(edits.names?.[i]) || s.name }))
  if (kept.length === 0) return plan
  const navigation = { ...plan.navigation, tabs: plan.navigation.tabs.map((t) => ({ ...t })) }
  const screens = settleScreens(kept, navigation, plan.appName)
  const covered = new Set(screens.flatMap((s) => s.covers))
  return { ...plan, navigation, screens, uncovered: plan.requested.filter((_, i) => !covered.has(i)) }
}

export function settleScreens(drafted: PlannedScreen[], navigation: AppNavigation, appName: string): PlannedScreen[] {
  const screens = assignScreenSlots(drafted, navigation)
  // A link only means something if it names another screen of this plan.
  for (const s of screens) {
    s.linksTo = [...new Set(s.linksTo.map((l) => screens.find((o) => o.name.toLowerCase() === l.toLowerCase() && o.name !== s.name)?.name).filter((n): n is string => Boolean(n)))]
  }
  // A tab nobody can open is a dead end in a prototype. Keep the bar the plan asked for only when
  // pruning would leave fewer than two tabs.
  const live = navigation.tabs.filter((t) => screens.some((s) => s.screenType === 'root-tab' && s.activeTabId === t.id))
  if (live.length >= 2) navigation.tabs = live
  alignTabLabels(screens, navigation, appName)
  return screens
}

// GQ-06: "presented on two smartphone screens", "3 ta ekran", "4 экрана". A brief that counts its
// screens gets that many — the ones it asked for first — not the planner's usual five or six.
const COUNT_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, bir: 1, ikki: 2, uch: 3, "to'rt": 4, besh: 5, olti: 6 }
export function screenCountAsked(brief: string): number | null {
  const t = brief.toLowerCase().replace(/[ʻʼ’‘`]/g, "'")
  const m =
    t.match(/\b(\d|one|two|three|four|five|six)\s+(?:[a-z-]+\s+){0,2}screens?\b/) ??
    t.match(/(\d|bir|ikki|uch|to'rt|besh|olti)\s*(?:ta\s+)?(?:[a-z']+\s+)?ekran/) ??
    t.match(/(\d)\s+(?:[а-я]+\s+)?экран/)
  if (!m) return null
  const n = COUNT_WORDS[m[1]!] ?? Number(m[1])
  return n >= 1 && n <= MAX_SCREENS ? n : null
}

export function trimToBrief(plan: Plan, brief: string): Plan {
  const n = screenCountAsked(brief)
  if (!n || plan.screens.length <= n) return plan
  // Screens that cover a requested one first (in the order they were asked for), then the rest.
  const firstCover = (s: PlannedScreen) => (s.covers.length ? Math.min(...s.covers) : Infinity)
  const ranked = plan.screens.map((s, i) => ({ s, i })).sort((a, z) => firstCover(a.s) - firstCover(z.s) || a.i - z.i)
  const keep = new Set(ranked.slice(0, n).map((r) => r.i))
  const kept = plan.screens.filter((_, i) => keep.has(i)).map((s) => ({ ...s }))
  const navigation = { ...plan.navigation, tabs: plan.navigation.tabs.map((t) => ({ ...t })) }
  const screens = settleScreens(kept, navigation, plan.appName)
  const covered = new Set(screens.flatMap((s) => s.covers))
  return { ...plan, navigation, screens, uncovered: plan.requested.filter((_, i) => !covered.has(i)) }
}


// Section words, grouped by what a tab is for. A screen and its tab may use different words of one
// group ("Today" on "Home", "Order Tracking" on "Orders"); words from two groups are a contradiction.
const SECTION_GROUPS: Record<string, string[]> = {
  home: ['home', 'today', 'feed', 'dashboard', 'overview'],
  search: ['search', 'explore', 'discover', 'browse'],
  cart: ['cart', 'basket', 'bag', 'checkout'],
  profile: ['profile', 'account'],
  orders: ['order', 'orders', 'purchases', 'tracking', 'deliveries'],
  stats: ['stats', 'statistics', 'progress', 'analytics', 'insights', 'history', 'reports'],
  messages: ['messages', 'chat', 'chats', 'inbox', 'dms'],
  saved: ['saved', 'favorites', 'favourites', 'wishlist', 'library'],
  notifications: ['notifications', 'alerts'],
  settings: ['settings', 'preferences'],
  wallet: ['wallet', 'cards', 'payments'],
}
// Singular and plural count as one word ("Notification Settings" is on the "Notifications" tab).
const wordsOf = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map((w) => w.replace(/s$/, ''))
const groupsOf = (words: string[]) => Object.entries(SECTION_GROUPS).filter(([, g]) => g.some((x) => words.includes(x.replace(/s$/, '')))).map(([g]) => g)

/**
 * GQ-05: a planner can claim a tab for an unrelated screen ("Cart" on the "Profile" tab), and the
 * bar then lights "Profile" on the cart. When the screen's name belongs to one section group and
 * its tab to another, the tab takes the screen's section word and an icon for it. Synonyms within a
 * group, and names in other scripts, are left alone.
 */
export function alignTabLabels(screens: PlannedScreen[], navigation: AppNavigation, appName = '') {
  const app = new Set(wordsOf(appName)) // "Nova Wallet — Portfolio" is about the portfolio, not a wallet tab
  for (const tab of navigation.tabs) {
    const root = screens.find((s) => s.screenType === 'root-tab' && s.activeTabId === tab.id)
    if (!root || tab.isAction) continue
    const w = wordsOf(root.name).filter((x) => !app.has(x))
    const tabGroups = groupsOf(wordsOf(`${tab.label} ${tab.id}`))
    const screenGroups = groupsOf(w)
    if (!tabGroups.length || !screenGroups.length || screenGroups.some((g) => tabGroups.includes(g))) continue
    const word = SECTION_GROUPS[screenGroups[0]!]!.find((x) => w.includes(x.replace(/s$/, '')))!
    tab.label = word[0]!.toUpperCase() + word.slice(1)
    tab.icon = resolveIcon(word, word)
  }
}

function parseEntities(raw: unknown): Entity[] {
  if (!Array.isArray(raw)) return []
  const str = (v: unknown, max: number) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '')
  return raw
    .slice(0, 3)
    .map((e: Record<string, unknown>) => ({
      kind: str(e?.kind, 40),
      items: (Array.isArray(e?.items) ? e.items : [])
        .slice(0, 8)
        .map((it: Record<string, unknown>) => ({
          name: str(it?.name, 80),
          fields: Object.fromEntries(
            Object.entries(it?.fields && typeof it.fields === 'object' ? (it.fields as Record<string, unknown>) : {})
              .slice(0, 6)
              .map(([k, v]) => [str(k, 30), str(v, 80)] as const)
              .filter(([k, v]) => k && v),
          ),
        }))
        .filter((it) => it.name),
    }))
    .filter((e) => e.kind && e.items.length > 0)
}

// When the planner leaves the archetype out or invents one, the screen's name usually says it.
const ARCHETYPE_HINTS: [RegExp, Archetype][] = [
  [/check\s?out|cart|basket|payment|pay\b|order summary/i, 'checkout'],
  [/profile|account/i, 'profile'],
  [/setting|preference/i, 'settings'],
  [/search|explore|discover|browse|filter/i, 'search'],
  [/stat|analytic|insight|progress|report/i, 'stats'],
  [/chat|message|conversation|thread|inbox/i, 'chat'],
  [/map|track|route|nearby|location/i, 'map'],
  [/camera|scan/i, 'camera'],
  [/player|now playing|session|cooking mode|lesson|exercise/i, 'player'],
  [/calendar|schedule|itinerary|agenda/i, 'calendar'],
  [/notification|activity|alert/i, 'notifications'],
  [/onboard|welcome/i, 'onboarding'],
  [/sign ?in|log ?in|sign ?up|register/i, 'auth'],
  [/paywall|upgrade|premium|subscri/i, 'paywall'],
  [/result|complete|success|confirm|receipt|summary/i, 'result'],
  [/add|new|create|edit|compose|send|book|form/i, 'form'],
  [/feed|timeline|for you/i, 'feed'],
  [/home|today|dashboard|overview/i, 'dashboard'],
  [/detail/i, 'detail'],
]
export function inferArchetype(name: string, screenType: string): Archetype {
  return ARCHETYPE_HINTS.find(([re]) => re.test(name))?.[1] ?? (screenType === 'root-tab' ? 'list' : 'detail')
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

export async function planScreens(brief: string, device: string, onUsage?: (u: LlmUsage) => void): Promise<Plan> {
  // Only the pattern of the one app type the brief matches goes in (UX-02); none when nothing matches.
  const pattern = AppPatternService.classify(brief)
  const user = `Brief: ${brief}\nPlatform: ${device}${pattern ? `\n\n${AppPatternService.brief(pattern)}` : ''}`
  const raw = await completeJSON(PLANNER_PROMPT, user, PLAN_MAX_TOKENS, onUsage)
  const plan = trimToBrief(parsePlan(raw), brief)
  if (plan.uncovered.length === 0) return plan

  // One repair round. The model likes to spend its screens on Search / Profile / Settings and
  // quietly drop the checkout or the tracking screen the brief asked for.
  const repair = `${user}

Your previous plan:
${raw}

It leaves these requested screens without a screen of their own: ${plan.uncovered.map((r) => `"${r}"`).join(', ')}.
Return the full corrected JSON. Stay within ${MAX_SCREENS} screens: replace screens nobody asked for (profile, settings, search, notifications) before anything else. Keep "requested" unchanged and set "covers" truthfully.`
  try {
    const fixed = trimToBrief(parsePlan(await completeJSON(PLANNER_PROMPT, repair, PLAN_MAX_TOKENS, onUsage)), brief)
    return fixed.uncovered.length < plan.uncovered.length ? { ...fixed, repaired: true } : plan
  } catch {
    return plan
  }
}

// A v2 plan carries specs and data for up to six screens; 1024 tokens cut it off mid-JSON.
const PLAN_MAX_TOKENS = 4000

// One retry on malformed JSON or an empty screen list — DeepSeek's json_object mode guarantees syntax but not shape.
export async function planScreensWithRetry(brief: string, device: string, onUsage?: (u: LlmUsage) => void): Promise<Plan> {
  try {
    return await planScreens(brief, device, onUsage)
  } catch {
    return await planScreens(brief, device, onUsage)
  }
}
