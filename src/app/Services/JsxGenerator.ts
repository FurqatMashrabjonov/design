import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { completeJSON, jsonOnly, streamCompletion, type LlmUsage, type RefImage } from './LlmService'
import { REF_IMAGE_NOTE } from '@/lib/ref-images'
import type { AppLook } from './ScreenDocument'
import { parseAppTheme, parseStyleName, seededPick, styleColors, type AppStyle, type AppTheme } from '@/lib/app-theme'

// KON-00: an app is planned once (screens, tabs, accent, the data every screen shares) and each screen is
// one Konsta component written from the skill, the Konsta API reference, the kit reference and one finished
// example screen. Nothing else steers the look: Konsta draws iOS, the model only composes it.

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
let system: string | null = null
/** The screen writer's system prompt: skill + kit + HIG cards + one pattern per Konsta part (OVL-01) + the reference (generated from Konsta's types). */
export function screenSystem(): string {
  return (system ??= [read('skills/mobile-screen-jsx/SKILL.md').replace(/^---[\s\S]*?---\n/, ''), read('konsta/KIT.md'), read('konsta/USAGE.md'), read('konsta/PATTERNS.md'), read('konsta/REFERENCE.md')].join('\n\n'))
}
// One finished screen per kind of screen (konsta/examples): what the model copies is how it is built.
const examples = new Map<string, string>()
const example = (name: ExampleName) => examples.get(name) ?? (examples.set(name, read(`konsta/examples/${name}.jsx`)), examples.get(name)!)

export const TAB_ICONS = ['House', 'Search', 'Heart', 'User', 'CircleUser', 'Settings', 'Bell', 'Calendar', 'ChartColumn', 'ListChecks', 'ShoppingBag', 'ShoppingCart', 'MessageCircle', 'Map', 'Compass', 'Wallet', 'CreditCard', 'BookOpen', 'Dumbbell', 'Utensils', 'Music', 'Play', 'Camera', 'Image', 'Star', 'Bookmark', 'Inbox', 'Layers', 'Grid2x2', 'Sparkles', 'Activity', 'Target', 'Plane', 'Ticket', 'Users', 'Briefcase', 'GraduationCap', 'Leaf', 'Droplets', 'Footprints', 'Moon', 'Sun', 'Wind', 'Timer', 'Clock', 'Headphones', 'Trophy', 'Newspaper', 'Mic', 'Video', 'Gift', 'Car', 'PawPrint', 'Baby', 'Flame', 'Brain']

export type Kind = 'tab' | 'push' | 'modal' | 'first-run'
export type PlannedScreen = { id: string; name: string; kind: Kind; tab?: string; parent?: string; spec: string; asked?: boolean }
export type AppPlan = { appName: string; summary: string; accent: string; style: AppStyle; palette: Record<string, string>; tabs: AppLook['tabs']; screens: PlannedScreen[]; data: string; onboarding?: Onboarding }

/**
 * ONB-01: how the first-run screen is built. With one example every app opened on the same carousel (7 of 7 on the
 * thm01b eval, whatever the style). Each layout has its own finished example (konsta/examples/onboarding-*.jsx);
 * the code picks one per app from those that suit its style (seededPick), and the screen brief names it.
 */
export const ONBOARDINGS = {
  slides: 'two or three slides inside the one screen: art composed from the kit that shows the app\'s own thing, a two-line title, one line, pager Dots, Continue.',
  photo: 'one full-bleed Photo of the app\'s world under a dark gradient, the promise as a big title and one line over it, one button and a small log-in link. No slides, no dots.',
  quiz: 'a short personal question flow (two or three questions in this one screen, a Meter for progress on top): each question is three or four large tappable option cards with an emoji Tile; Continue is enabled once one is chosen. Ask what this app really needs to know (a goal, a level, a time, a preference).',
  value: 'the app\'s promise as a big title, then three benefit rows (a tinted icon, a headline, one line each), one primary button and a small terms line. One calm page — no slides.',
  showcase: 'a collage of three tilted mini cards that preview the app\'s own screens (its hero figure, a chart, a streak or list row), built from the kit, then a bold two-line title and one button.',
} as const
export type Onboarding = keyof typeof ONBOARDINGS
/** The layouts each style allows: three, so apps of one style still differ. */
const ONBOARDING_BY_STYLE: Record<AppStyle, Onboarding[]> = {
  clean: ['value', 'quiz', 'showcase'],
  midnight: ['showcase', 'photo', 'quiz'],
  vivid: ['slides', 'quiz', 'showcase'],
  soft: ['photo', 'slides', 'value'],
  editorial: ['photo', 'value', 'showcase'],
}
export const onboardingFor = (style: AppStyle, seed: string): Onboarding => seededPick(ONBOARDING_BY_STYLE[style], seed, 'onboarding')
/** A stored plan's layout; plans from before ONB-01 (or a stray value) are the carousel. */
const onboardingOf = (plan: AppPlan): Onboarding => (plan.onboarding && plan.onboarding in ONBOARDINGS ? plan.onboarding : 'slides')
type ExampleName = 'dashboard' | 'detail' | 'list' | 'sheet' | 'onboarding' | `onboarding-${Exclude<Onboarding, 'slides'>}`

export const PLANNER = `You plan a phone app (iOS) that will be drawn screen by screen with Konsta UI, at the level of a top App Store app. Reply with JSON only:
{"appName": string, "summary": "one sentence",
 "style": the look of top apps like this one — "clean" (finance, productivity, booking, utilities, news), "midnight" (dark and premium: fitness, training, sleep, investing, nightlife), "vivid" (bold and playful: food delivery, learning, habits, kids, games, social fun), "soft" (calm and warm: meditation, wellness, journaling, reading, parenting, mental health) or "editorial" (photo-led and typographic: travel, fashion, recipes, lifestyle, events); pick what the brief's audience would expect, and if the brief names a look (dark, minimal, playful, cozy, luxury) follow it,
 "palette": ["camelCaseName", …] — 3–6 names, one per thing the app tracks or sorts by, named after that thing (steps/water/sleep, food/drinks/dessert, income/rent/fun — never a quality like consistency or motivation); the host colours them,
 "tabs": [{"id": "kebab-id", "label": "One word", "icon": one of ${TAB_ICONS.join(', ')}}],
 "screens": [{"id": "kebab-id", "name": "Screen title", "kind": "tab"|"push"|"modal"|"first-run", "asked": true if the brief names this screen or its job, "tab": "tab id (kind tab only)", "parent": "screen id it opens from (push/modal)", "spec": "2–4 sentences: what the screen shows top to bottom — its hero (a ring, a big figure, a gradient card, a chart), its sections, its one primary action — and which screens its rows and buttons open (by id)"}],
 "data": "every piece of content the screens share, as compact lines: people, items with their numbers, dates, prices, and for each item its emoji and palette colour name, and for anything shown as a picture (dishes, products, places, rooms, courses, posts) photo: "2–4 English words the photo shows" — real-sounding, rich enough to fill the screens. Every fact has one value for the whole app, written once here: the person (name, level, XP, rank, streak, balance), and the state each flow shares — the cart's items and quantities, the stay being booked with its dates and guests, the order being tracked, today's lesson — so cart, checkout and confirmation show the same items and the same total, and home, profile and leaderboard the same XP and rank"}
Rules: 3–5 tabs, exactly one screen of kind "tab" per tab (its id may equal the tab id). 6–8 screens in all: every screen the brief asks for (marked asked) first, then the ones that make the app whole. Dates are around today (given below): this week, yesterday, next Friday — never a past year. A consumer app (health, habits, food, social, learning, shopping, travel, finance for people) opens with one "first-run" onboarding screen unless the brief says otherwise — its spec says what it promises and what it asks or shows; its layout is chosen later; add a sign-up first-run screen only if the brief mentions accounts. appName is an original, ownable name — never an existing product or brand (not Strava, Duolingo, Revolut…). Use "modal" for the app's quick tasks — add or log something, filter, pick, check out, share, an award or a receipt (it shows as a sheet over its parent); "push" for places you go deeper. Every push/modal screen names a parent that exists. Ids are unique kebab-case. Keep the brief's language for copy if it is not English.`

// A tab icon the set does not have used to become House — a Sleep tab drew the same house as Today. The label
// says what the tab is; failing that, the first fallback no other tab wears.
const ICON_BY_LABEL: [RegExp, string][] = [
  [/sleep|night|dream|rest/i, 'Moon'], [/breath|calm|relax/i, 'Wind'], [/focus|timer|pomodoro/i, 'Timer'], [/meditat|mind/i, 'Sparkles'],
  [/home|today|feed/i, 'House'], [/explore|discover|browse/i, 'Compass'], [/search|find/i, 'Search'], [/saved|favou?rite|wishlist|like/i, 'Heart'],
  [/stat|insight|progress|report|analytic/i, 'ChartColumn'], [/profile|account|^me$|you/i, 'CircleUser'], [/setting/i, 'Settings'],
  [/learn|lesson|course|read|librar/i, 'BookOpen'], [/plan|calendar|schedule/i, 'Calendar'], [/cart|bag|shop|store/i, 'ShoppingBag'],
  [/order|deliver/i, 'Inbox'], [/wallet|money|card|budget|spend/i, 'Wallet'], [/chat|message/i, 'MessageCircle'], [/map|trip|travel/i, 'Map'],
  [/music|listen|podcast|player/i, 'Headphones'], [/workout|train|fitness|gym/i, 'Dumbbell'], [/league|rank|leader|award/i, 'Trophy'],
  [/news/i, 'Newspaper'], [/task|todo|habit|check/i, 'ListChecks'], [/notif|alert/i, 'Bell'], [/photo|camera|scan/i, 'Camera'],
]
const FALLBACK_ICONS = ['Sparkles', 'Star', 'Layers', 'Grid2x2', 'Target', 'Bookmark']
export function tabIcon(icon: unknown, label: string, used: Set<string>): string {
  if (TAB_ICONS.includes(String(icon)) && !used.has(String(icon))) return String(icon)
  const byLabel = ICON_BY_LABEL.find(([re, i]) => re.test(label) && !used.has(i))?.[1]
  if (byLabel) return byLabel
  if (TAB_ICONS.includes(String(icon))) return String(icon) // a repeat the label cannot improve on
  return FALLBACK_ICONS.find((i) => !used.has(i)) ?? 'House'
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'screen'

/** The plan is a contract: vocabulary closed, one tab screen per tab, parents that exist, at most 8 screens —
 *  and when there are more, what the brief asked for stays (HIG-17: a checkout or a tracking screen used to be cut
 *  because the eight slots went to onboarding and the tabs first). */
export function parsePlan(json: string, fallbackName: string, seed?: string): AppPlan {
  const raw = JSON.parse(jsonOnly(json)) as Partial<AppPlan> & { screens?: Partial<PlannedScreen>[]; tabs?: Partial<AppLook['tabs'][number]>[] }
  const usedIcons = new Set<string>()
  const tabs = (raw.tabs ?? []).slice(0, 5).map((t) => {
    const label = String(t.label ?? t.id ?? 'Tab').slice(0, 16)
    const icon = tabIcon(t.icon, label, usedIcons)
    usedIcons.add(icon)
    return { id: slug(String(t.id ?? t.label ?? 'tab')), label, icon }
  })
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
  // THM-01: the style is one of five; the palette is names (an old plan's {name: hex} still reads). With a seed the
  // colours are the code's, from the style's sets (styleColors); without one, what the plan carried.
  const style = parseStyleName((raw as { style?: unknown }).style)
  const given: Record<string, unknown> = Array.isArray(raw.palette) ? Object.fromEntries((raw.palette as unknown[]).map((k) => [String(k), ''])) : raw.palette && typeof raw.palette === 'object' ? raw.palette : {}
  const keys = Object.keys(given).filter((k) => /^[a-z][a-zA-Z0-9]{0,19}$/.test(k)).slice(0, 6)
  const colors = seed ? styleColors(style, keys, seed) : null
  const palette = colors ? colors.palette : Object.fromEntries(keys.filter((k) => /^#[0-9a-f]{6}$/i.test(String(given[k]))).map((k) => [k, String(given[k]).toLowerCase()]))
  return { appName: String(raw.appName || fallbackName).slice(0, 40), summary: String(raw.summary ?? '').slice(0, 300), accent: colors?.accent ?? accent, style, palette, tabs: liveTabs, screens, data: String(raw.data ?? '').slice(0, 6000), ...(seed && { onboarding: onboardingFor(style, seed) }) }
}

export async function planApp(brief: string, fallbackName: string, onUsage: (u: LlmUsage) => void, signal?: AbortSignal, seed?: string, images?: RefImage[]): Promise<AppPlan> {
  const today = new Date().toISOString().slice(0, 10)
  const once = async () => parsePlan(await completeJSON(PLANNER, `Brief: ${brief}\nToday: ${today}${images?.length ? '\nReference image attached: choose the style that matches its look, and let its screens shape which screens this app has.' : ''}`, 4000, onUsage, images, signal, 'plan'), fallbackName, seed)
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
  s.kind === 'tab' ? `tab screen — AppTabbar active="${s.tab}"` : s.kind === 'first-run' ? 'first-run screen — no navbar, no tab bar' : s.kind === 'modal' ? `modal — drawn as an open page Sheet (className "h-[calc(100%-3rem)]") over the dimmed page; closing it is nav.pop() (back to ${s.parent}); no tab bar` : `${s.kind} — back goes to ${s.parent}; no tab bar`

/**
 * THM-01: what each style asks of a screen. The host sets the surfaces, corners and fonts (runtime/kit/styles.js);
 * the card says how to compose on them — the part only the model can do. Onboarding's tone is part of it; its layout
 * is ONB-01's (ONBOARDINGS), because five styles with one onboarding layout were still five of the same app.
 */
export const STYLE_CARDS: Record<AppStyle, string> = {
  clean: `Clean — the grouped iOS look of a finance or productivity app: bg-page with bg-card rounded-card groups and List strong inset rows; generous white space; the accent only for actions and selection; palette colours as small marks (rings, dots, tinted tiles), never as big fills. Onboarding (its layout is given separately): light and quiet, with the app's own thing as the art.`,
  midnight: `Midnight — a dark, premium app (the host runs it in dark mode): near-black page, bg-card rounded-card panels on it, big bold white numbers (text-figure), and colour only where it matters — one ring, one bar, one streak in the accent or a palette colour, glowing on black; moody full-bleed photos with text over a dark gradient; no pastel, no light washes. Onboarding (its layout is given separately): black, colour glowing on it, a bold title.`,
  vivid: `Vivid — bold and playful, like a food or learning app: the page is a light wash of the accent; big Hero blocks in the accent and palette colours carry the content (today's goal, the streak, categories), chunky rounded shapes (rounded-card is 24px), large emoji or icons on tinted tiles, large rounded buttons, a cheerful voice. Onboarding (its layout is given separately): full colour, big emoji or composed art, short punchy titles.`,
  soft: `Soft — calm and warm, like a meditation or wellness app: a cream page (bg-page), soft bg-card rounded-card panels without hard borders, the palette as gentle washes (tint) rather than strong fills, rounded type (the host sets it), lots of air, one gentle illustration or photo per screen, a quiet voice; no loud gradients, no dense tables. Onboarding (its layout is given separately): calm, airy, a quiet title, one soft button.`,
  editorial: `Editorial — photo-led and typographic, like a travel or lifestyle app: large display titles (the host sets a serif for text-large-title, text-title1/2 and text-figure), full-width photos with the title over a dark gradient, few boxes — sections separated by space and hairlines (border-line) rather than cards, captions in text-footnote, the accent used sparingly for actions. Onboarding (its layout is given separately): photo-led, a big serif title, one button.`,
}

/** What every screen of the app is told about the app. */
export function appContext(plan: AppPlan): string {
  return `App: ${plan.appName} — ${plan.summary}
Screens in this app (id — name — kind): ${plan.screens.map((s) => `${s.id} — ${s.name} — ${kindLine(s)}`).join('; ')}
Tab ids for AppTabbar: ${plan.tabs.map((t) => t.id).join(', ') || '(none)'}. The accent is set by the host (text-primary / bg-primary).
# STYLE — ${STYLE_CARDS[parseStyleName(plan.style)]}
The app's palette — paste this line at the top of the file unchanged and colour each thing with its entry:
const C = ${JSON.stringify(plan.palette ?? {})}

# APP DATA — the only source for names, numbers and dates
${plan.data}`
}

/** The example that shows how this kind of screen is built: the app's first tab is its dashboard. */
export function exampleFor(plan: AppPlan, s: PlannedScreen): ExampleName {
  if (s.kind === 'first-run') { const o = onboardingOf(plan); return o === 'slides' ? 'onboarding' : `onboarding-${o}` }
  if (s.kind === 'tab') return s.tab === plan.tabs[0]?.id ? ('dashboard' as const) : ('list' as const)
  return s.kind === 'modal' ? ('sheet' as const) : ('detail' as const)
}

export function screenBrief(plan: AppPlan, s: PlannedScreen): string {
  return `${appContext(plan)}

# THIS SCREEN
Screen id: ${s.id} — ${s.name} — ${kindLine(s)}
${s.spec}${s.kind === 'first-run' ? `\nLayout: ${ONBOARDINGS[onboardingOf(plan)]} Build it this way, whatever the spec above implies.` : ''}

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

/** REG-02: change one element. The model answers with that element alone; the code splices it into the file, so
 *  the rest of the screen cannot drift. */
export function elementBrief(plan: AppPlan | null, s: { name: string; slug: string | null }, source: string, element: string, instruction: string): string {
  return `${plan ? appContext(plan) + '\n\n' : ''}# THE SCREEN — ${s.name}${s.slug ? ` (id ${s.slug})` : ''}
\`\`\`jsx
${source}
\`\`\`

# THE ONE ELEMENT TO CHANGE
\`\`\`jsx
${element}
\`\`\`

# CHANGE
${instruction}

Reply with only the new version of that one element, as a single JSX element in one \`\`\`jsx block — not the file, no imports, no other elements. It replaces exactly that element in the file, so use only variables, data and components the file already has (or Konsta, @od/kit and lucide-react components, which are imported for you).`
}

/** The component in a reply: the first fenced block, or the whole reply when there is none. */
export const extractJsx = (text: string) => ((text.match(/```(?:jsx|tsx|js|javascript)?\s*\n([\s\S]*?)```/) ?? [null, text])[1] ?? '').trim() + '\n'

export async function writeScreen(user: string, onUsage: (u: LlmUsage) => void, signal?: AbortSignal, site: 'screen' | 'edit' = 'screen', images?: RefImage[]): Promise<string> {
  let out = ''
  for await (const d of streamCompletion(screenSystem(), images?.length ? user + REF_IMAGE_NOTE : user, signal, onUsage, images, site)) out += d
  return extractJsx(out)
}

/** The app's look for a frame: accent, light/dark and platform from the project's theme (a frame URL may
 *  override them — themeFromQuery), tabs from its navigation. */
export function appLook(project: { theme: string | null; navigation: string | null }, override?: Partial<AppTheme>): AppLook {
  const theme = { ...parseAppTheme(project.theme), ...override }
  let tabs: AppLook['tabs'] = []
  try {
    const n = JSON.parse(project.navigation ?? 'null')
    // The same icon rule as parsePlan, at read time, so an app planned before it (two houses) draws right too.
    const used = new Set<string>()
    if (n && Array.isArray(n.tabs)) tabs = n.tabs.filter((t: { id?: unknown }) => typeof t?.id === 'string').map((t: { id: string; label?: string; icon?: string }) => {
      const label = String(t.label ?? t.id)
      const icon = tabIcon(t.icon, label, used)
      used.add(icon)
      return { id: t.id, label, icon }
    })
  } catch {}
  return { accent: theme.accent, dark: theme.dark, platform: theme.platform, style: theme.style, tabs }
}

export const parseAppPlan = (json: string | null): AppPlan | null => {
  try { const p = JSON.parse(json ?? 'null'); return p && Array.isArray(p.screens) && typeof p.data === 'string' ? (p as AppPlan) : null } catch { return null }
}
