import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { completeJSON, jsonOnly, streamCompletion, type LlmUsage, type RefImage } from './LlmService'
import { REF_IMAGE_NOTE } from '@/lib/ref-images'
import { iconKey } from '@/lib/app-icon'
import { STILL } from '../../../runtime/emoji-codes.js'
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
export type AppPlan = { appName: string; summary: string; accent: string; style: AppStyle; palette: Record<string, string>; tabs: AppLook['tabs']; screens: PlannedScreen[]; data: string; onboarding?: Onboarding; store?: string; icon?: string; category?: AppCategory }

/**
 * ONB-01: how the first-run screen is built. With one example every app opened on the same carousel (7 of 7 on the
 * thm01b eval, whatever the style). Each layout has its own finished example (konsta/examples/onboarding-*.jsx);
 * the code picks one per app from those that suit its style (seededPick), and the screen brief names it.
 */
export const ONBOARDINGS = {
  slides: 'two or three slides inside the one screen: art for each — a kit `Doodle` scene that fits the slide (ILL-01) or a figure composed from the kit that shows the app\'s own thing — a two-line title, one line, pager Dots, Continue.',
  photo: 'one full-bleed Photo of the app\'s world under a dark gradient, the promise as a big title and one line over it, one button and a small log-in link. No slides, no dots.',
  quiz: 'a short personal question flow (two or three questions in this one screen, a Meter for progress on top): each question is three or four large tappable option cards with an emoji Tile; Continue is enabled once one is chosen. Ask what this app really needs to know (a goal, a level, a time, a preference).',
  value: 'a kit `Doodle` scene that fits the app at the top (`className="w-60 mx-auto"`, ILL-01), the app\'s promise as a big title, then three benefit rows (a tinted icon, a headline, one line each), one primary button and a small terms line. One calm page — no slides.',
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
type ExampleName = 'dashboard' | 'detail' | 'list' | 'sheet' | 'paywall' | 'onboarding' | `onboarding-${Exclude<Onboarding, 'slides'>}` | `${'home' | 'list' | 'detail'}-${string}`

export const PLANNER = `You plan a phone app (iOS) that will be drawn screen by screen with Konsta UI, at the level of a top App Store app. Reply with JSON only:
{"appName": string, "summary": "one sentence", "category": what kind of app it is — "photo" (places, food, homes, products, events: chosen by their pictures), "money" (banking, budgets, payments, investing), "health" (fitness, habits, sleep, meditation, tracking the body), "social" (feeds, friends, communities, dating), "work" (tasks, notes, calendars, tools) or "learn" (courses, languages, books, podcasts, music), "icon": "one emoji that is the app's mark on its home-screen icon and splash (its subject: 🏃 a running app, 🌿 calm wellness, 🍜 food delivery)",
 "style": the look of top apps like this one — "clean" (finance, productivity, booking, utilities, news), "midnight" (dark and premium: fitness, training, sleep, investing, nightlife), "vivid" (bold and playful: food delivery, learning, habits, kids, games, social fun), "soft" (calm and warm: meditation, wellness, journaling, reading, parenting, mental health) or "editorial" (photo-led and typographic: travel, fashion, recipes, lifestyle, events); pick what the brief's audience would expect, and if the brief names a look (dark, minimal, playful, cozy, luxury) follow it,
 "palette": ["camelCaseName", …] — 2–4 names, one per main thing the app tracks or sorts by (top apps use two to four colours, not a rainbow), named after that thing (steps/water/sleep, food/drinks/dessert, income/rent/fun — never a quality like consistency or motivation); the host colours them,
 "tabs": [{"id": "kebab-id", "label": "One word", "icon": one of ${TAB_ICONS.join(', ')}}],
 "screens": [{"id": "kebab-id", "name": "Screen title", "kind": "tab"|"push"|"modal"|"first-run", "asked": true if the brief names this screen or its job, "tab": "tab id (kind tab only)", "parent": "screen id it opens from (push/modal)", "spec": "2–4 sentences: what the screen shows top to bottom — its hero (a ring, a big figure, a gradient card, a chart), its sections, its one primary action — and what every control does: the screen it opens (by id), the sheet, action sheet or dialog it opens on this screen, or what it changes in the app's data (add, edit, delete, check off, log, join, save a setting)"}],
 "data": "every piece of content the screens share, as compact lines: people, items with their numbers, dates, prices, and for each item its emoji and palette colour name, and for anything shown as a picture (dishes, products, places, rooms, courses, posts) photo: "2–4 English words the photo shows", and for every person (the user, friends, hosts, couriers, coaches, reviewers) photo: "portrait" plus who they look like ("portrait smiling young woman", "portrait bearded man outdoors") — real-sounding, rich enough to fill the screens. Every fact has one value for the whole app, written once here: the person (name, level, XP, rank, streak, balance), and the state each flow shares — the cart's items and quantities, the stay being booked with its dates and guests, the order being tracked, today's lesson — so cart, checkout and confirmation show the same items and the same total, and home, profile and leaderboard the same XP and rank"}
Rules: 3–5 tabs, exactly one screen of kind "tab" per tab (its id may equal the tab id). 8–12 screens in all — a complete app a person could use from first launch to settings, nothing cut: every screen the brief asks for (marked asked) first, then the ones that make it whole (a detail for what each list shows, history or stats, notifications, settings with real options). If the brief says how many screens, plan exactly that many. Dates are around today (given below): this week, yesterday, next Friday — never a past year. A consumer app (health, habits, food, social, learning, shopping, travel, finance for people) opens with one "first-run" onboarding screen unless the brief says otherwise — its spec says what it promises and what it asks or shows; its layout is chosen later; it ends on signing in (the host draws the buttons), so add no separate sign-up screen. A consumer app also has one "modal" screen with id "paywall" — its premium plan, opened from the profile or from a feature it unlocks — named after the app ("Pacewell Premium"). appName is an original, ownable name — never an existing product or brand (not Strava, Duolingo, Revolut…). Quick tasks — add, log, edit, filter, pick, share, confirm a delete — are not screens: each is a sheet, action sheet or dialog inside the screen it starts from, named in that screen's spec. "modal" is only for a full-screen flow over the app (the paywall, a camera, checkout); "push" for places you go deeper. Every push/modal screen names a parent that exists. Ids are unique kebab-case. Keep the brief's language for copy if it is not English.`

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

/** FUN-03: a complete app is up to twelve screens (it was eight, which cut the details, settings and history a real
 *  app has); a brief that says how many it wants ("an app with 4 screens") gets exactly that many. */
export const MAX_SCREENS = 12
/** CLR-01: Konsta's iOS primary; generation uses only it unless GEN_COLORS=1 brings back the styles' own colours. */
export const KONSTA_ACCENT = '#007aff'
const defaultColorOnly = () => process.env.GEN_COLORS !== '1'
export function askedCount(brief: string): number | undefined {
  const m = /\b(\d{1,2})\s*(?:-\s*)?(?:screens?|pages?|ekran|sahifa)/i.exec(brief)
  const n = m ? Number(m[1]) : NaN
  return n >= 1 && n <= MAX_SCREENS ? n : undefined
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'screen'

/** The plan is a contract: vocabulary closed, one tab screen per tab, parents that exist, at most 8 screens —
 *  and when there are more, what the brief asked for stays (HIG-17: a checkout or a tracking screen used to be cut
 *  because the eight slots went to onboarding and the tabs first). */
/** ICO-01: the plan's icon, kept only when it is one emoji the Fluent set draws (else the icon is the initial). */
function iconOf(raw: unknown): string | undefined {
  const m = typeof raw === 'string' ? raw.trim().match(/^\p{Extended_Pictographic}[\p{Extended_Pictographic}\u200d\ufe0f\u{1f3fb}-\u{1f3ff}]*/u) : null
  return m && STILL.has(iconKey(m[0])) ? m[0] : undefined
}

export function parsePlan(json: string, fallbackName: string, seed?: string, max = MAX_SCREENS): AppPlan {
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
  const MAX = Math.max(1, Math.min(MAX_SCREENS, max))
  const drop = (s: PlannedScreen) => (screens = screens.filter((x) => x !== s))
  // PRM-02: the paywall is kept like a screen the brief asked for — it is half of what a top app's flow shows.
  const keep = (s: PlannedScreen) => s.asked || /^(paywall|premium|upgrade)/.test(s.id)
  for (const s of [...screens].reverse()) if (screens.length > MAX && (s.kind === 'push' || s.kind === 'modal') && !keep(s) && !screens.some((x) => x.parent === s.id)) drop(s)
  for (const s of [...screens].reverse()) if (screens.length > MAX && s.kind === 'tab' && !s.asked && screens.filter((x) => x.kind === 'tab').length > Math.min(3, MAX) && !screens.some((x) => x.parent === s.id)) drop(s)
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
  const keys = Object.keys(given).filter((k) => /^[a-z][a-zA-Z0-9]{0,19}$/.test(k)).slice(0, 4) // PAL-02: four colours at most
  // CLR-01 (the owner's call, 2026-10-07): for now an app is drawn in Konsta's own colour and look — iOS blue on the
  // Clean surfaces — and the person picks another in the Style & colour panel. Every palette name is the accent
  // itself (a CSS variable), so changing the accent there recolours the whole app. The styles and their colour sets
  // (THM-01, PAL-01/02) stay in the code for when generation picks colours again.
  if (seed && defaultColorOnly()) return { appName: String(raw.appName || fallbackName).slice(0, 40), summary: String(raw.summary ?? '').slice(0, 300), accent: KONSTA_ACCENT, style: 'clean', palette: Object.fromEntries(keys.map((k) => [k, 'var(--color-primary)'])), tabs: liveTabs, screens, data: String(raw.data ?? '').slice(0, 6000), onboarding: onboardingFor('clean', seed), icon: iconOf((raw as { icon?: unknown }).icon), category: categoryOf((raw as { category?: unknown }).category) }
  const colors = seed ? styleColors(style, keys, seed) : null
  const palette = colors ? colors.palette : Object.fromEntries(keys.filter((k) => /^#[0-9a-f]{6}$/i.test(String(given[k]))).map((k) => [k, String(given[k]).toLowerCase()]))
  return { appName: String(raw.appName || fallbackName).slice(0, 40), summary: String(raw.summary ?? '').slice(0, 300), accent: colors?.accent ?? accent, style, palette, tabs: liveTabs, screens, data: String(raw.data ?? '').slice(0, 6000), ...(seed && { onboarding: onboardingFor(style, seed) }), icon: iconOf((raw as { icon?: unknown }).icon), category: categoryOf((raw as { category?: unknown }).category) }
}

export async function planApp(brief: string, fallbackName: string, onUsage: (u: LlmUsage) => void, signal?: AbortSignal, seed?: string, images?: RefImage[]): Promise<AppPlan> {
  const today = new Date().toISOString().slice(0, 10)
  const count = askedCount(brief)
  const once = async () => parsePlan(await completeJSON(PLANNER, `Brief: ${brief}\nToday: ${today}${count ? `\nScreens: exactly ${count}.` : ''}${images?.length ? '\nReference image attached: choose the style that matches its look, and let its screens shape which screens this app has.' : ''}`, 8000, onUsage, images, signal, 'plan'), fallbackName, seed, count)
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
  s.kind === 'tab' ? `tab screen — AppTabbar active="${s.tab}"` : s.kind === 'first-run' ? 'first-run screen — no navbar, no tab bar; its last step ends on <SignInButtons onApple onGoogle onEmail /> from the kit (each goes on into the app with nav.reset to the first tab), not on a lone Continue' : s.kind === 'modal' ? `modal — drawn as an open page Sheet (className "h-[calc(100%-3rem)]") over the dimmed page; closing it is nav.pop() (back to ${s.parent}); no tab bar` : `${s.kind} — back goes to ${s.parent}; no tab bar`

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
const C = ${JSON.stringify(plan.palette ?? {})}${Object.values(plan.palette ?? {}).every((v) => v === 'var(--color-primary)') ? `
# COLOUR — one colour: every entry above is the accent, which the person chooses later. Use it for actions, selection, progress and one hero figure; everything else is neutral (bg-page, bg-card, the label colours). No other colours, no rainbow of tiles, no coloured gradients; tint(C.x) for a soft wash behind an icon is fine.` : ''}

${plan.store ? storeSection(plan.store) : `# APP DATA — the only source for names, numbers and dates\n${plan.data}`}`
}

/** FUN-01: every screen gets the app's store and how to use it — it replaces APP DATA, because data pasted into each
 *  screen is data each screen keeps to itself. */
const storeSection = (store: string) => `# APP STORE — the app's data and every change a person can make, shared by all its screens
\`\`\`js
${store.trim()}
\`\`\`
Read the app with \`const { …state, …derived, …actions } = useStore()\` (from '@od/kit'): one object with the state's keys, the derived values and the actions. A derived written \`(state) => …\` is a value (\`completedToday\`); one written \`(state, id) => …\` is called with the item (\`streakOf(h.id)\`). Never copy the store's data into the screen — every list, name, number and date comes from it, so all the screens agree. Every control that changes the app calls an action (\`toggleHabit(h.id)\`, \`addHabit({ … })\`) — this screen and every other one update by themselves. useState is only for what this screen alone holds: which sheet or dialog is open, a form's fields before Save, a segmented control. If the screen needs a value the store does not have, compute it from the store's state.`

/**
 * FUN-01: the app's data layer, written once after the plan and before any screen: one plain module every screen
 * reads and changes through useStore(). Checked by compileStore (no imports, no browser APIs), one retry with its errors.
 */
export const STORE_SYSTEM = `You write the data layer of a phone app: one plain JavaScript module, store.js. Every screen of the app reads and changes the app through it, so what one screen changes every other screen shows. The screens are written after you, from the plan, and can only use what you export.

Export exactly these three (no imports, no default export):
export const initial = { … } — everything the app knows when it first opens, as plain data (strings, numbers, booleans, arrays, objects; dates as 'YYYY-MM-DD' strings, times as 'HH:MM'). Take every person, item, number and date from the plan's data, and keep its emoji, its palette colour name (the key of the app's palette, as a string) and its photo query in a \`photo\` field. Every item has a stable string id. Include the history a screen draws from (the last weeks of logs, past orders, messages), the signed-in person and their settings, and flags for flows (onboarded, premium).
export const actions = { name(state, ...args) { … } } — every change a person can make anywhere in the app, read from each screen's spec: add, edit, delete, toggle, check off, log, rate, join, follow, save a setting, finish onboarding, sign in, subscribe, reset. Each changes \`state\` in place (it is a copy) and may return a value. New ids: \`Date.now().toString(36)\`.
export const derived = { name: (state) => value } — every value shown on a screen that comes from the data rather than being stored: today's items, progress, streaks, totals, counts, averages, the week's chart, a leaderboard's order. Compute them so they move when the data changes (a streak counts the days in the logs; today's progress counts today's check-ins). A value for one item takes it as a second argument — \`streakOf: (state, id) => …\` — and a screen calls it \`streakOf(h.id)\`; every other derived is a plain value (\`completedToday\`, not \`completedToday()\`).

Today is given below; "today" in the data is that date. Names are camelCase; no name is both a state key and a derived or action name. Pure functions only: no fetch, storage, timers or window. Write it compact and complete (aim for 120–260 lines). Reply with the module in one \`\`\`js block.`

export async function writeStore(plan: AppPlan, onUsage: (u: LlmUsage) => void, signal?: AbortSignal): Promise<string> {
  const { compileStore } = await import('./ScreenCompiler')
  const today = new Date().toISOString().slice(0, 10)
  const brief = `App: ${plan.appName} — ${plan.summary}
Today: ${today}
Palette keys: ${Object.keys(plan.palette ?? {}).join(', ') || '(none)'}
Screens (id — name — kind: spec):
${plan.screens.map((s) => `- ${s.id} — ${s.name} — ${s.kind}: ${s.spec}`).join('\n')}

# THE PLAN'S DATA
${plan.data}

Write store.js now.`
  const write = async (user: string) => {
    let out = ''
    for await (const d of streamCompletion(STORE_SYSTEM, user, signal, onUsage, undefined, 'plan')) out += d
    return ((out.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/) ?? [null, out])[1] ?? '').trim() + '\n'
  }
  // Three attempts, each told what the checker refused: an app without its store falls back to screens that each
  // keep their own copy of the data, which is the one failure that breaks "every screen knows the others".
  let src = ''
  let errors: string[] = []
  for (let attempt = 0; attempt < 3; attempt++) {
    src = await write(attempt === 0 ? brief : `${brief}\n\n# YOUR LAST ATTEMPT DID NOT BUILD\n\`\`\`js\n${src}\`\`\`\nThe checker said: ${errors.join('; ')}\nWrite the whole module again with those fixed.`)
    const built = compileStore(src)
    if (built.ok) return src
    errors = built.errors
  }
  throw new Error(`The app's store did not build: ${errors.join('; ').slice(0, 300)}`)
}

/** The example that shows how this kind of screen is built: the app's first tab is its dashboard. */
/** EXM-01: what kind of app it is, so its home tab is built from a finished home of that kind (each written from the
 *  structure of real top apps, our look and data). A category with no home example yet keeps the dashboard. */
export const APP_CATEGORIES = ['photo', 'money', 'health', 'social', 'work', 'learn'] as const
export type AppCategory = (typeof APP_CATEGORIES)[number]
const HOME_EXAMPLES: Partial<Record<AppCategory, ExampleName>> = { photo: 'home-photo', money: 'home-finance', social: 'home-social', work: 'home-work', learn: 'home-learn' }
const LIST_EXAMPLES: Partial<Record<AppCategory, ExampleName>> = { photo: 'list-photo', money: 'list-finance', health: 'list-health', social: 'list-social', work: 'list-work', learn: 'list-learn' }
const DETAIL_EXAMPLES: Partial<Record<AppCategory, ExampleName>> = { photo: 'detail-photo', money: 'detail-finance', health: 'detail-health', social: 'detail-social', work: 'detail-work', learn: 'detail-learn' }
// A screen about the person or the app (profile, settings, alerts, money flows) keeps the general examples; a list of the
// things the app is about, and the page of one of them, take the kind's own.
const ABOUT_ME = /\b(profile|account|settings?|preferences|notifications?|inbox|messages?|me|you)\b/i
const FLOW = /\b(checkout|cart|basket|payment|pay|confirm|confirmation|review|edit|add|new|create|filter|onboarding|welcome|premium|subscription|help|support|send|transfer|request|top ?up|deposit|withdraw|exchange|invest|buy|sell|log|timer|player|session player|start|lesson|quiz|exercise|practice|flashcards?)\b/i
const RESULTS = /\b(results?|search|browse|nearby|category|categories|all|list|collection|wishlist|saved|transactions|history|activity|statements?|workouts?|sessions|runs|awards?|achievements?|friends|followers|following|members|people|communities|groups|courses|classes|library|topics|catalog(?:ue)?|projects|notes|tasks|pages|documents|files|events|boards)\b/i
const categoryOf = (raw: unknown): AppCategory | undefined => (APP_CATEGORIES as readonly string[]).includes(String(raw)) ? (raw as AppCategory) : undefined

export function exampleFor(plan: AppPlan, s: PlannedScreen): ExampleName {
  if (s.kind === 'first-run') { const o = onboardingOf(plan); return o === 'slides' ? 'onboarding' : `onboarding-${o}` }
  const kind = plan.category
  const words = `${s.name} ${s.id.replace(/-/g, ' ')}`
  if (s.kind === 'tab') {
    if (s.tab === plan.tabs[0]?.id) return (kind && HOME_EXAMPLES[kind]) || ('dashboard' as const)
    return (kind && !ABOUT_ME.test(words) && LIST_EXAMPLES[kind]) || ('list' as const)
  }
  // In a social app another person's page (a profile, a creator, a host) is the detail, not a screen about me.
  if (s.kind === 'push' && kind === 'social' && /\b(profile|creator|host|seller|member|friend|user|author)\b/i.test(words) && !FLOW.test(words)) return 'detail-social'
  if (s.kind === 'push' && kind && !ABOUT_ME.test(words) && !FLOW.test(words)) {
    if (RESULTS.test(words) && LIST_EXAMPLES[kind]) return LIST_EXAMPLES[kind]!
    if (DETAIL_EXAMPLES[kind]) return DETAIL_EXAMPLES[kind]!
  }
  if (s.kind === 'modal') return /^(paywall|premium|upgrade)/.test(s.id) || /premium|subscription|paywall/i.test(s.name) ? ('paywall' as const) : ('sheet' as const)
  return 'detail' as const
}

/**
 * KIT-21: the kit's blocks (KIT-20) are offered by the code, one screen at a time — listed for every screen, the model
 * used them on 3–4 of 61 and the judge preferred the run without them; matched on a screen's spec, they landed on 1 in
 * 1.1 screens (a week strip on a profile and a leaderboard) and lost again. A screen whose name says it does what a
 * block does gets that block (two at most) in its own brief, with how to call it; nothing else changes.
 */
export const BLOCK_HINTS: { block: string; name: RegExp; spec?: RegExp; skip?: RegExp; kinds?: Kind[]; use: string }[] = [
  { block: 'MonthCalendar', name: /\b(dates?|calendar|reserv|appointment|when)\b/i, kinds: ['push', 'modal'], use: "`MonthCalendar({ mode: 'single' | 'range', value, onChange, month?: Date, min?: Date, today?, marks?: ['YYYY-MM-DD'] })` — the month grid to pick a day or a stay; range `value` is `{ start, end }`. Put it inside a `<Block strong inset>` (on a sheet, a `<Block>`)." },
  { block: 'WeekStrip', name: /^(today|home|my day|schedule|plan)\b/i, spec: /\b(habits?|workouts?|classes|routine|meals|sessions|doses|medication)\b/i, kinds: ['tab'], use: "`WeekStrip({ value: Date, onChange, today?, marks?: ['YYYY-MM-DD'] })` — one 7-day strip under the title to switch days; dots on days with activity. Put it inside a `<Block strong inset>` (it has no padding of its own), once." },
  // KIT-26: a map of places with prices goes before the route map.
  { block: 'PriceMap', name: /\b(maps?|nearby)\b/i, spec: /\b(stays?|homes?|rentals?|hotels?|prices?|apartments?|places to stay|listings?)\b/i, use: "`PriceMap({ pins: [{ id, price }], currency: '€', value, onSelect, height = 320, children })` — the places with their prices on the pins; keep the chosen id in useState and put its card (photo, name, rating, price, opening its detail) in `children`." },
  { block: 'RouteMap', name: /\b(maps?|tracking|track|routes?|on (its|the) way|delivery|run|ride|walk|directions|nearby)\b/i, use: "`RouteMap({ height = 220, route: 'line' | 'loop', progress?: 0–1 (where the courier or runner is now), pins?: [{ label, kind: 'start' | 'end' }], color?, seed?, children? })` — a drawn map with the route; never an empty box or a stock photo for a map. `children` sit at its bottom (a glass card with the distance or the ETA)." },
  // KIT-25: before StepTimeline — a tracking screen gets the map and the live card (it carries the steps itself).
  { block: 'LiveETA', name: /\b(tracking|track|on (its|the) way|arriving|delivery status|your ride)\b/i, use: "`LiveETA({ minutes, status: 'Arriving at 19:42', progress: 0–1, steps?: ['Confirmed', 'Preparing', 'On the way', 'Delivered'], courier: { name, photo, vehicle }, onCall, onMessage })` — the live delivery card under the map; wire onCall and onMessage (a Toast or a Sheet)." },
  { block: 'StepTimeline', name: /\b(track(ing)?|order status|on (its|the) way|delivery|itinerary)\b/i, use: "`StepTimeline({ steps: [{ title, time, detail?, status: 'done' | 'current' | 'upcoming' }] })` — the steps of an order, a delivery or a trip, inside a `<Block strong inset>`." },
  { block: 'Rating', name: /\b(reviews|ratings?)\b/i, use: "`RatingSummary({ value, dist: [5★, 4★, 3★, 2★, 1★ counts] })` for the score and its bars, and `Rating({ value, count? })` for stars on each review." },
  { block: 'Rating', name: /\b(detail|stay|restaurant|product|place|hotel)\b/i, spec: /\breviews\b/i, kinds: ['push'], use: "`Rating({ value, count })` for the score under the title (\"4.8 · 312 reviews\")." },
  { block: 'Carousel', name: /^(explore|discover|home|shop|browse)\b/i, spec: /\b(featured|trending|popular|recommended|drops?|picks)\b/i, kinds: ['tab'], use: "`Carousel({ items, renderItem: (item, i) => <PhotoCard q={item.photo} color={C.x} title={item.name} meta={item.where} badge={item.tag} /> })` — one row of snap cards for the featured items, the next peeking, page dots." },
  { block: 'SwipeRow', name: /\b(inbox|messages|notifications|tasks|to-?dos?|reminders)\b/i, kinds: ['tab', 'push'], use: "`SwipeRow({ children, right: [{ label: 'Archive', icon: Archive, color: '#ff9f0a', onClick }, { label: 'Delete', icon: Trash2, color: '#ff3b30', onClick }] })` — each row of the list, inside a `List strong inset`, swipes to its actions." },
  { block: 'Stories', name: /^(feed|home|friends)\b/i, spec: /\b(stories|friends|following)\b/i, kinds: ['tab'], use: "`Stories({ items: [{ id, name, color, seen? }], me?: { name, color } })` — story rings across the top of the feed; a tap on a ring opens `StoryViewer({ opened, stories: [{ photo, author: { name, photo }, time, text }], start: index, onClose })` (mount it once, `opened` in useState)." },
  { block: 'AvatarStack', name: /\b(club|group|event|challenge|squad|meetup)\b/i, use: "`AvatarStack({ people: [{ name, color }], max = 4, size = 36 })` beside a line like \"Maya, Sam and 12 others are going\"." },
  { block: 'CodeInput', name: /\b(verify|verification|code|otp)\b/i, use: '`CodeInput({ length: 6, value, onChange, error? })` — the one-time code, with "Resend code" under it.' },
  // KIT-24: the first wave of premium parts, offered by the screen's name like the rest.
  { block: 'Donut', name: /\b(spending|insights?|budgets?|breakdown|analytics|portfolio|macros|nutrition|categories)\b/i, use: "`Donut({ segments: [{ label, value, color? }], size = 180, legend?: true, currency?: '$', children })` — the categories as one ring; `children` is the total in the middle; leave segment colours out and they are the accent in lighter steps. Inside a `<Block strong inset>`." },
  { block: 'BankCard', name: /\b(cards?|wallet|accounts?)\b/i, use: "`BankCard({ label, balance, name, number, expiry, brand: 'visa' | 'mastercard', color?, color2?, frozen?, onClick? })` — the payment card drawn (chip, masked number a tap reveals, network) in `<div className=\"px-4\">`; never a plain coloured box for a card." },
  { block: 'AmountPad', name: /\b(send|transfer|pay|top ?up|request money|amount|deposit|withdraw)\b/i, skip: /\b(review|confirm\w*|receipt|success|done|history)\b/i, kinds: ['push', 'modal'], use: "`AmountPad({ value, onChange, currency = '$', note? })` — the big amount and its keypad; `value` is a string in useState ('0'), the primary button under it is disabled while it is '0' and sends it through the store's action." },
  { block: 'CollapsingHeader', name: /\b(stay|hotel|restaurant|property|listing|place|recipe|destination|event|album|artist|venue|tour|trip)\b/i, kinds: ['push'], use: "`CollapsingHeader({ photo: 'what it shows', title, subtitle?, height = 320, onBack: nav.pop, actions?: [<Share className=\"w-5 h-5\" />, <Heart className=\"w-5 h-5\" />], children? })` — first inside `<Page>` and no `<Navbar>`: the full-bleed photo with the title over it, folding into a bar with the title as the page scrolls; it draws the title and the back button, so the content under it starts with the next thing (host, price, details)." },
  { block: 'MediaPlayer', name: /\b(player|now playing|listen|episode|track)\b/i, use: "`MediaPlayer({ photo: 'artwork', title, artist, duration: seconds, position?: seconds, playing, onToggle })` — the whole player (artwork, title and artist, scrubber, ±15 s, play/pause): it draws the title and artist itself, so write them nowhere else on the screen; keep `playing` in the store so the rest of the app knows." },
  { block: 'MenuSections', name: /\b(menu|restaurant|catalog(ue)?)\b/i, kinds: ['push', 'tab'], use: "`MenuSections({ sections: [{ id, title, content: <List strong inset className=\"!my-0\">…rows…</List> }] })` — the menu in sections under a tab row that sticks under the navbar and follows the scroll; each row adds to the cart through the store." },
  { block: 'Podium', name: /\b(leaderboard|league|rankings?|top players)\b/i, use: "`Podium({ people: [{ name, photo, value }], unit: 'XP' })` — the top three on steps (the first three of the sorted list); the rest of the board is a `List strong inset` under it starting at 4." },
  // KIT-25 wave 2a.
  { block: 'PlanCompare', name: /\b(paywall|premium|upgrade|membership|subscription|plus|pro plan)\b/i, use: "`PlanCompare({ plans: ['Free', 'Premium'], rows: [{ label, free: true | false | 'text', pro: true | false | 'text' }] })` — 4–6 rows of what the plan adds, under the art; the plan cards and the trial button stay below it." },
  { block: 'SizePicker', name: /\b(product|item|sneakers?|shoes?|dress|jacket|shirt)\b/i, kinds: ['push', 'modal'], use: "`SizePicker({ sizes: ['7', '7.5', { label: '8.5', soldOut: true }, …], value, onChange })` — the size grid; keep the size in useState and put it in the add-to-bag button and action." },
  { block: 'SwatchPicker', name: /\b(product|item|sneakers?|shoes?|dress|jacket|shirt)\b/i, kinds: ['push', 'modal'], use: "`SwatchPicker({ colors: [{ name, color }], value, onChange })` — the colours with the chosen one named; it changes the product photo's query when the data has one per colour." },
  { block: 'Ticket', name: /\b(tickets?|boarding|pass|booking confirmed|booking confirmation|you'?re going|e-?ticket)\b/i, skip: /\border\b/i, use: "`Ticket({ from: { code, city, time }, to: { code, city, time }, rows: [{ label, value }] (up to 6), code: 'the booking reference' })` — the ticket with its real QR code (or `title` instead of from/to for an event)." },
  { block: 'BreathTimer', name: /\b(breathe|breathing|breath)\b/i, use: "`BreathTimer({ inhale: 4, hold: 4, exhale: 6, rounds: 6 })` — the breathing circle that grows, holds and shrinks with the instruction inside; it starts on tap." },
  { block: 'FeedPost', name: /^(feed|home|community|activity|explore)\b/i, spec: /\b(posts?|friends|runs?|photos|shares?|followers?)\b/i, kinds: ['tab'], use: "`FeedPost({ author: { name, photo }, time, photo: 'what it shows', text, likes, comments, liked, onLike, onComment, onShare, stats?: [{ label, value }] })` — each post in the feed, in `space-y-4`; liked and likes come from the store and onLike calls its action." },
  // KIT-26 wave 2b.
  { block: 'AchievementUnlock', name: /\b(awards?|achievements?|badges?|milestones?|trophies)\b/i, use: "`AchievementUnlock({ opened, emoji, title, detail, color, onClose, onShare })` — the moment an award is won, opened from the award's tile (and after the action that earns one); the awards themselves are a grid of `Medal({ emoji, color, size: 64, locked })`." },
  { block: 'MoodPicker', name: /\b(check-?in|mood|journal|how are you|feelings?)\b/i, use: "`MoodPicker({ value: 1–5, onChange: (value, label) => … })` — five faces for how the person feels; keep the value in useState and save it with the store's action." },
  { block: 'WheelPicker', name: /\b(reminders?|alarms?|set (a )?time|schedule|bedtime|wake)\b/i, kinds: ['push', 'modal'], use: "`WheelPicker({ columns: [['1', …, '12'], ['00', '05', …, '55'], ['AM', 'PM']], value: ['7', '30', 'AM'], onChange })` — the iOS wheel for a time; keep the value in useState and show it in the save button." },
  { block: 'Accordion', name: /\b(faq|help|support)\b/i, use: '`Accordion({ items: [{ title, body }], single: true, defaultOpen: [0] })` — questions that open to their answer.' },
]

/** The kit blocks a screen's own job asks for — matched on its name (the spec mentions too much), two at most. KIT-24:
 *  matching the plan id too (restaurant-menu, stay-detail, player) offered three times the blocks and lost twice
 *  (kit24b 2–3–3, kit24c rubric 3.00 → 2.93, coherence down), against name alone (kit24 4–2–2, 3.00 → 3.10). */
export function blocksFor(s: Pick<PlannedScreen, 'name' | 'spec' | 'kind'>): typeof BLOCK_HINTS {
  const hits = BLOCK_HINTS.filter((b) => (!b.kinds || b.kinds.includes(s.kind)) && b.name.test(s.name) && !b.skip?.test(s.name) && (!b.spec || b.spec.test(s.spec)))
  return hits.filter((b, i) => hits.findIndex((x) => x.block === b.block) === i).slice(0, 2)
}

const blockLines = (s: PlannedScreen) => {
  const hints = blocksFor(s)
  return hints.length ? `\nBuild these parts with the kit's ready-made blocks (import from '@od/kit'; do not write your own): ${hints.map((h) => h.use).join(' ')}` : ''
}

export function screenBrief(plan: AppPlan, s: PlannedScreen): string {
  return `${appContext(plan)}

# THIS SCREEN
Screen id: ${s.id} — ${s.name} — ${kindLine(s)}
${s.spec}${s.kind === 'first-run' ? `\nLayout: ${ONBOARDINGS[onboardingOf(plan)]} Build it this way, whatever the spec above implies.` : ''}${blockLines(s)}

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

/** LEAN-01: a fix as edits, not the whole file again. A rewrite repeated the full screen (~3.5k output tokens) to change a
 *  few lines; about a third of an app's output went to that. The model answers with SEARCH/REPLACE blocks. */
export const PATCH_RULES = `Reply with only the edits, nothing else — no prose, no whole file. Each edit:
<<<<<<< SEARCH
(lines copied exactly from the file, enough to be unique)
=======
(the lines that replace them)
>>>>>>> REPLACE
Use as many edits as the fixes need. A new import is an edit to the import lines.`

export async function writePatch(user: string, onUsage: (u: LlmUsage) => void, signal?: AbortSignal, site: 'screen' | 'edit' = 'screen'): Promise<string> {
  let out = ''
  for await (const d of streamCompletion(screenSystem(), user, signal, onUsage, undefined, site)) out += d
  return out
}

/** The model's edits applied to the file, or null if any of them does not match exactly once (then the caller asks for the
 *  whole file instead). The edits are the model's own; this only places them. */
export function applyPatch(source: string, reply: string): string | null {
  const blocks = [...reply.matchAll(/<{7} SEARCH\n([\s\S]*?)\n={7}\n([\s\S]*?)\n?>{7} REPLACE/g)]
  if (!blocks.length) return null
  let out = source
  for (const [, search, replace] of blocks) {
    const at = out.indexOf(search!)
    if (!search!.trim() || at < 0 || out.indexOf(search!, at + 1) >= 0) return null
    out = out.slice(0, at) + replace! + out.slice(at + search!.length)
  }
  return out
}

/** The app's look for a frame: accent, light/dark and platform from the project's theme (a frame URL may
 *  override them — themeFromQuery), tabs from its navigation. */
export function appLook(project: { theme: string | null; navigation: string | null; plan?: string | null }, override?: Partial<AppTheme>): AppLook {
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
  const store = parseAppPlan(project.plan ?? null)?.store
  return { accent: theme.accent, dark: theme.dark, platform: theme.platform, style: theme.style, tabs, ...(store ? { store } : {}) }
}

export const parseAppPlan = (json: string | null): AppPlan | null => {
  try { const p = JSON.parse(json ?? 'null'); return p && Array.isArray(p.screens) && typeof p.data === 'string' ? (p as AppPlan) : null } catch { return null }
}
