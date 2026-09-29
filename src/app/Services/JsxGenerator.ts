import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { completeJSON, jsonOnly, streamCompletion, type LlmUsage } from './LlmService'
import type { AppLook } from './ScreenDocument'
import { parseAppTheme, type AppTheme } from '@/lib/app-theme'

// KON-00: an app is planned once (screens, tabs, accent, the data every screen shares) and each screen is
// one Konsta component written from the skill, the Konsta API reference, the kit reference and one finished
// example screen. Nothing else steers the look: Konsta draws iOS, the model only composes it.

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
let system: string | null = null
/** The screen writer's system prompt: skill + kit + Konsta reference (the reference is generated from Konsta's types). */
export function screenSystem(): string {
  return (system ??= [read('skills/mobile-screen-jsx/SKILL.md').replace(/^---[\s\S]*?---\n/, ''), read('konsta/KIT.md'), read('konsta/USAGE.md'), read('konsta/REFERENCE.md')].join('\n\n'))
}
// One finished screen per kind of screen (konsta/examples): what the model copies is how it is built.
const examples = new Map<string, string>()
const example = (name: 'dashboard' | 'onboarding' | 'detail' | 'list') => examples.get(name) ?? (examples.set(name, read(`konsta/examples/${name}.jsx`)), examples.get(name)!)

export const TAB_ICONS = ['House', 'Search', 'Heart', 'User', 'CircleUser', 'Settings', 'Bell', 'Calendar', 'ChartColumn', 'ListChecks', 'ShoppingBag', 'ShoppingCart', 'MessageCircle', 'Map', 'Compass', 'Wallet', 'CreditCard', 'BookOpen', 'Dumbbell', 'Utensils', 'Music', 'Play', 'Camera', 'Image', 'Star', 'Bookmark', 'Inbox', 'Layers', 'Grid2x2', 'Sparkles', 'Activity', 'Target', 'Plane', 'Ticket', 'Users', 'Briefcase', 'GraduationCap', 'Leaf', 'Droplets', 'Footprints']

export type Kind = 'tab' | 'push' | 'modal' | 'first-run'
export type PlannedScreen = { id: string; name: string; kind: Kind; tab?: string; parent?: string; spec: string; asked?: boolean }
export type AppPlan = { appName: string; summary: string; accent: string; palette: Record<string, string>; tabs: AppLook['tabs']; screens: PlannedScreen[]; data: string }

export const PLANNER = `You plan a phone app (iOS) that will be drawn screen by screen with Konsta UI, at the level of a top App Store app. Reply with JSON only:
{"appName": string, "summary": "one sentence", "accent": "#rrggbb (one confident accent that suits the app)",
 "palette": {"camelCaseName": "#rrggbb", …} — 3–6 vivid, distinct colours, one per thing the app tracks or sorts by, named after that thing (steps/water/sleep, food/drinks/dessert, income/rent/fun — never a quality like consistency or motivation); iOS system hues read well (#ff9f0a #0a84ff #30d158 #bf5af2 #ff375f #5e5ce6 #64d2ff #ffd60a),
 "tabs": [{"id": "kebab-id", "label": "One word", "icon": one of ${TAB_ICONS.join(', ')}}],
 "screens": [{"id": "kebab-id", "name": "Screen title", "kind": "tab"|"push"|"modal"|"first-run", "asked": true if the brief names this screen or its job, "tab": "tab id (kind tab only)", "parent": "screen id it opens from (push/modal)", "spec": "2–4 sentences: what the screen shows top to bottom — its hero (a ring, a big figure, a gradient card, a chart), its sections, its one primary action — and which screens its rows and buttons open (by id)"}],
 "data": "every piece of content the screens share, as compact lines: people, items with their numbers, dates, prices, and for each item its emoji and palette colour name, and for anything shown as a picture (dishes, products, places, rooms, courses, posts) photo: "2–4 English words the photo shows" — real-sounding, rich enough to fill the screens. Every fact has one value for the whole app, written once here: the person (name, level, XP, rank, streak, balance), and the state each flow shares — the cart's items and quantities, the stay being booked with its dates and guests, the order being tracked, today's lesson — so cart, checkout and confirmation show the same items and the same total, and home, profile and leaderboard the same XP and rank"}
Rules: 3–5 tabs, exactly one screen of kind "tab" per tab (its id may equal the tab id). 6–8 screens in all: every screen the brief asks for (marked asked) first, then the ones that make the app whole. Dates are around today (given below): this week, yesterday, next Friday — never a past year. A consumer app (health, habits, food, social, learning, shopping, travel, finance for people) opens with one "first-run" onboarding screen (2–3 slides inside it) unless the brief says otherwise; add a sign-up first-run screen only if the brief mentions accounts. appName is an original, ownable name — never an existing product or brand (not Strava, Duolingo, Revolut…). Every push/modal screen names a parent that exists. Ids are unique kebab-case. Keep the brief's language for copy if it is not English.`

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'screen'

/** The plan is a contract: vocabulary closed, one tab screen per tab, parents that exist, at most 8 screens —
 *  and when there are more, what the brief asked for stays (HIG-17: a checkout or a tracking screen used to be cut
 *  because the eight slots went to onboarding and the tabs first). */
export function parsePlan(json: string, fallbackName: string): AppPlan {
  const raw = JSON.parse(jsonOnly(json)) as Partial<AppPlan> & { screens?: Partial<PlannedScreen>[]; tabs?: Partial<AppLook['tabs'][number]>[] }
  const tabs = (raw.tabs ?? []).slice(0, 5).map((t) => ({ id: slug(String(t.id ?? t.label ?? 'tab')), label: String(t.label ?? t.id ?? 'Tab').slice(0, 16), icon: TAB_ICONS.includes(String(t.icon)) ? String(t.icon) : 'House' }))
  const seen = new Set<string>()
  let screens: PlannedScreen[] = (raw.screens ?? []).map((s) => {
    let id = slug(String(s.id ?? s.name ?? 'screen'))
    while (seen.has(id)) id += '-2'
    seen.add(id)
    const kind: Kind = (['tab', 'push', 'modal', 'first-run'] as const).includes(s.kind as Kind) ? (s.kind as Kind) : 'push'
    return { id, name: String(s.name ?? id).slice(0, 60), kind, tab: s.tab ? slug(String(s.tab)) : undefined, parent: s.parent ? slug(String(s.parent)) : undefined, spec: String(s.spec ?? '').slice(0, 800), asked: (s as { asked?: unknown }).asked === true }
  })
  // One tab screen per tab: the first claim wins, a tab with none gets its first unclaimed screen.
  const byTab = new Map<string, PlannedScreen>()
  for (const s of screens) {
    if (s.kind !== 'tab') continue
    const t = s.tab && tabs.some((x) => x.id === s.tab) ? s.tab : tabs.find((x) => !byTab.has(x.id))?.id
    if (!t || byTab.has(t)) { s.kind = 'push'; s.tab = undefined; continue }
    s.tab = t
    byTab.set(t, s)
  }
  const tabbed = tabs.filter((t) => byTab.has(t.id))
  for (const s of screens) if ((s.kind === 'push' || s.kind === 'modal') && (!s.parent || !seen.has(s.parent))) s.parent = byTab.get(tabbed[0]?.id ?? '')?.id ?? screens[0]?.id
  screens = [...screens.filter((s) => s.kind === 'first-run'), ...tabbed.map((t) => byTab.get(t.id)!), ...screens.filter((s) => s.kind === 'push' || s.kind === 'modal')]
  // Over eight: drop what the brief did not ask for — pushed screens first (last planned first), then a tab and its
  // screen, never below three tabs and never the first-run screen.
  const MAX = 8
  const drop = (s: PlannedScreen) => (screens = screens.filter((x) => x !== s))
  for (const s of [...screens].reverse()) if (screens.length > MAX && (s.kind === 'push' || s.kind === 'modal') && !s.asked && !screens.some((x) => x.parent === s.id)) drop(s)
  for (const s of [...screens].reverse()) if (screens.length > MAX && s.kind === 'tab' && !s.asked && screens.filter((x) => x.kind === 'tab').length > 3 && !screens.some((x) => x.parent === s.id)) drop(s)
  screens = screens.slice(0, MAX)
  const kept = new Set(screens.map((s) => s.tab).filter(Boolean))
  const liveTabs = tabbed.filter((t) => kept.has(t.id))
  if (!screens.length) throw new Error('The plan had no screens')
  const accent = /^#[0-9a-f]{6}$/i.test(String(raw.accent)) ? String(raw.accent) : '#5e5ce6'
  // The palette is pasted into every screen as code, so only identifiers and hex colours pass.
  const palette = Object.fromEntries(Object.entries(raw.palette && typeof raw.palette === 'object' ? raw.palette : {}).filter(([k, v]) => /^[a-z][a-zA-Z0-9]{0,19}$/.test(k) && /^#[0-9a-f]{6}$/i.test(String(v))).slice(0, 6).map(([k, v]) => [k, String(v).toLowerCase()]))
  return { appName: String(raw.appName || fallbackName).slice(0, 40), summary: String(raw.summary ?? '').slice(0, 300), accent, palette, tabs: liveTabs, screens, data: String(raw.data ?? '').slice(0, 6000) }
}

export async function planApp(brief: string, fallbackName: string, onUsage: (u: LlmUsage) => void, signal?: AbortSignal): Promise<AppPlan> {
  const today = new Date().toISOString().slice(0, 10)
  const once = async () => parsePlan(await completeJSON(PLANNER, `Brief: ${brief}\nToday: ${today}`, 4000, onUsage, undefined, signal, 'plan'), fallbackName)
  // A plan that does not parse draws nothing at all (1 of 16 DeepSeek plans on 2026-09-29, not reproducible), and
  // a plan is cheap, so it gets one more try.
  try {
    return await once()
  } catch (e) {
    if (signal?.aborted) throw e
    return once()
  }
}

const kindLine = (s: PlannedScreen) =>
  s.kind === 'tab' ? `tab screen — AppTabbar active="${s.tab}"` : s.kind === 'first-run' ? 'first-run screen — no navbar, no tab bar' : `${s.kind} — back goes to ${s.parent}; no tab bar`

/** What every screen of the app is told about the app. */
export function appContext(plan: AppPlan): string {
  return `App: ${plan.appName} — ${plan.summary}
Screens in this app (id — name — kind): ${plan.screens.map((s) => `${s.id} — ${s.name} — ${kindLine(s)}`).join('; ')}
Tab ids for AppTabbar: ${plan.tabs.map((t) => t.id).join(', ') || '(none)'}. The accent is set by the host (text-primary / bg-primary).
The app's palette — paste this line at the top of the file unchanged and colour each thing with its entry:
const C = ${JSON.stringify(plan.palette ?? {})}

# APP DATA — the only source for names, numbers and dates
${plan.data}`
}

/** The example that shows how this kind of screen is built: the app's first tab is its dashboard. */
export function exampleFor(plan: AppPlan, s: PlannedScreen) {
  if (s.kind === 'first-run') return 'onboarding' as const
  if (s.kind === 'tab') return s.tab === plan.tabs[0]?.id ? ('dashboard' as const) : ('list' as const)
  return 'detail' as const
}

export function screenBrief(plan: AppPlan, s: PlannedScreen): string {
  return `${appContext(plan)}

# THIS SCREEN
Screen id: ${s.id} — ${s.name} — ${kindLine(s)}
${s.spec}

# A finished screen from a different app, at the quality bar
Copy how it is built — its composition, colour, emoji, motion and how it uses Konsta and the kit — never its words, data or palette.
\`\`\`jsx
${example(exampleFor(plan, s))}
\`\`\`

Write the ${s.name} screen now.`
}

export function editBrief(plan: AppPlan | null, s: { name: string; slug: string | null }, source: string, instruction: string): string {
  return `${plan ? appContext(plan) + '\n\n' : ''}# THE SCREEN AS IT IS — ${s.name}${s.slug ? ` (id ${s.slug})` : ''}
\`\`\`jsx
${source}
\`\`\`

# CHANGE
${instruction}

Rewrite the whole file with that change and nothing else changed. Keep its data, navigation and structure unless the change asks otherwise.`
}

/** The component in a reply: the first fenced block, or the whole reply when there is none. */
export const extractJsx = (text: string) => ((text.match(/```(?:jsx|tsx|js|javascript)?\s*\n([\s\S]*?)```/) ?? [null, text])[1] ?? '').trim() + '\n'

export async function writeScreen(user: string, onUsage: (u: LlmUsage) => void, signal?: AbortSignal, site: 'screen' | 'edit' = 'screen'): Promise<string> {
  let out = ''
  for await (const d of streamCompletion(screenSystem(), user, signal, onUsage, undefined, site)) out += d
  return extractJsx(out)
}

/** The app's look for a frame: accent, light/dark and platform from the project's theme (a frame URL may
 *  override them — themeFromQuery), tabs from its navigation. */
export function appLook(project: { theme: string | null; navigation: string | null }, override?: Partial<AppTheme>): AppLook {
  const theme = { ...parseAppTheme(project.theme), ...override }
  let tabs: AppLook['tabs'] = []
  try {
    const n = JSON.parse(project.navigation ?? 'null')
    if (n && Array.isArray(n.tabs)) tabs = n.tabs.filter((t: { id?: unknown }) => typeof t?.id === 'string').map((t: { id: string; label?: string; icon?: string }) => ({ id: t.id, label: String(t.label ?? t.id), icon: TAB_ICONS.includes(String(t.icon)) ? String(t.icon) : 'House' }))
  } catch {}
  return { accent: theme.accent, dark: theme.dark, platform: theme.platform, tabs }
}

export const parseAppPlan = (json: string | null): AppPlan | null => {
  try { const p = JSON.parse(json ?? 'null'); return p && Array.isArray(p.screens) && typeof p.data === 'string' ? (p as AppPlan) : null } catch { return null }
}
