import type { AppNavTab, AppNavigation } from './PlannerService.ts'
import { ICON_PATHS } from './shell-icons.ts'

// ponytail: a flat synonym table, no fuzzy matching — extend it when the eval's fallbackIcons counter moves.
export const ICON_SYNONYMS: Record<string, string> = {
  house: 'home', feed: 'home', main: 'home', dashboard: 'grid', overview: 'grid', apps: 'grid',
  profile: 'user', person: 'user', account: 'user', me: 'user', avatar: 'user', friends: 'users', community: 'users', social: 'users', team: 'users', people: 'users',
  stats: 'bar-chart-2', statistics: 'bar-chart-2', analytics: 'bar-chart-2', chart: 'bar-chart-2', 'bar-chart': 'bar-chart-2', insights: 'bar-chart-2', reports: 'bar-chart-2', progress: 'trending-up', graph: 'line-chart',
  explore: 'compass', discover: 'compass', browse: 'compass', find: 'search',
  cart: 'shopping-cart', basket: 'shopping-cart', bag: 'shopping-bag', shop: 'store', orders: 'package', delivery: 'truck',
  chat: 'message-circle', chats: 'message-circle', messages: 'message-circle', message: 'message-circle', inbox: 'inbox',
  notifications: 'bell', notification: 'bell', alerts: 'bell', favorites: 'heart', favourites: 'heart', likes: 'heart', saved: 'bookmark', bookmarks: 'bookmark',
  add: 'plus', create: 'plus', new: 'plus', compose: 'edit', write: 'pencil', record: 'mic', voice: 'mic', microphone: 'mic', photo: 'camera', snap: 'camera', scanner: 'scan',
  location: 'map-pin', places: 'map-pin', nearby: 'map-pin', navigation: 'compass', trips: 'plane', travel: 'plane', flights: 'plane', hotels: 'bed', rides: 'car',
  today: 'calendar', schedule: 'calendar', planner: 'calendar', appointments: 'calendar', bookings: 'ticket', tickets: 'ticket', recent: 'history', activity: 'activity',
  workout: 'dumbbell', workouts: 'dumbbell', training: 'dumbbell', fitness: 'dumbbell', run: 'footprints', steps: 'footprints', food: 'utensils', meals: 'utensils', meal: 'utensils', recipes: 'utensils', restaurant: 'utensils', nutrition: 'leaf',
  learn: 'book-open', lessons: 'book-open', courses: 'graduation-cap', practice: 'target', goals: 'target', habits: 'check-circle', tasks: 'check-square', todo: 'check-square', todos: 'check-square', notes: 'file-text', documents: 'file-text', files: 'folder',
  money: 'wallet', payments: 'credit-card', cards: 'credit-card', pay: 'credit-card', transactions: 'receipt', budget: 'pie-chart', savings: 'piggy-bank', invest: 'trending-up', portfolio: 'pie-chart',
  cog: 'settings', gear: 'settings', preferences: 'settings', more: 'more-horizontal', rewards: 'gift', achievements: 'trophy', leaderboard: 'trophy', badges: 'award', streak: 'flame',
  playlists: 'library', songs: 'music', listen: 'headphones', podcasts: 'headphones', videos: 'video', watch: 'play', photos: 'image', gallery: 'image', sleep: 'moon', meditate: 'wind', breathe: 'wind', health: 'heart', doctors: 'stethoscope', medicine: 'pill', security: 'shield', help: 'help-circle', support: 'help-circle', ai: 'sparkles', assistant: 'sparkles', news: 'newspaper', articles: 'newspaper', jobs: 'briefcase', work: 'briefcase',
}

export const ICON_NAMES = Object.keys(ICON_PATHS)

// Only a capture action earns the raised centre button; a tab bar is for navigation (Apple HIG, tab bars).
const ACTION_ICONS = new Set(['camera', 'scan', 'scan-line', 'qr-code', 'mic'])
export const isActionIcon = (icon: string) => ACTION_ICONS.has(icon)

/** Maps whatever the planner wrote to an icon we can draw: exact name, then a synonym of the name, then of the tab label. */
export function resolveIcon(name: string, label = ''): string {
  const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const lookup = (key: string) => (ICON_PATHS[key] ? key : ICON_SYNONYMS[key])
  const n = words(name)
  for (const candidate of [n, n.replace(/-(outline|icon|fill|line|alt|2)$/, ''), ...n.split('-'), ...words(label).split('-')]) {
    const hit = candidate && candidate !== 'circle' && lookup(candidate)
    if (hit) return hit
  }
  return 'grid' // a neutral glyph reads as "a section"; a bare circle reads as a bug
}

export const NAV_HEIGHT = 64
export const HEADER_HEIGHT = 56
/** Body clearance under an edge-to-edge bar — nav height plus breathing room. */
export const NAV_CLEARANCE = 88

/**
 * NAV-01: the shape of the bottom navigation. A tab bar is on every root screen, so its shape is
 * what dates an app: edge-to-edge with a hairline reads as 2019, a floating island as now.
 *  - `island`   a rounded panel inset from the edges, with labels (the default)
 *  - `pill`     a narrow centred pill, translucent, icons only
 *  - `contrast` a filled pill in the page's foreground colour — inverts itself on dark systems
 *  - `bar`      the edge-to-edge bar, kept for apps that want system chrome
 */
export type NavStyle = 'island' | 'pill' | 'contrast' | 'bar'

// The shape follows the app's character, not a coin toss. A chat or a banking app wears an
// edge-to-edge bar the way iOS Mail does — it reads as "tool", not as "old"; a food or travel app
// wears the floating island. Making every app an island was its own kind of sameness.
const NAV_SETS = {
  utility: ['bar', 'contrast', 'bar'],
  consumer: ['island', 'pill', 'island'],
  playful: ['island', 'contrast', 'pill'],
  bold: ['contrast', 'bar', 'pill'],
} as const satisfies Record<string, readonly NavStyle[]>
type NavCharacter = keyof typeof NAV_SETS

// The design system carries the strongest signal: it is the app's whole surface.
const BY_SYSTEM: Record<string, NavCharacter> = {
  slack: 'utility', notion: 'utility', 'linear-app': 'utility', github: 'utility', stripe: 'utility',
  material: 'utility', cal: 'utility', supabase: 'utility', vercel: 'utility', openai: 'utility',
  cursor: 'utility', raycast: 'utility', shadcn: 'utility', minimal: 'utility', intercom: 'utility',
  airbnb: 'consumer', nike: 'consumer', spotify: 'consumer', shopify: 'consumer', apple: 'consumer',
  elegant: 'consumer', claude: 'consumer', tesla: 'consumer',
  duolingo: 'playful', doodle: 'playful', retro: 'playful', bento: 'playful',
  midnight: 'bold', neon: 'bold', brutalist: 'bold', neobrutalism: 'bold', glassmorphism: 'bold', dashboard: 'bold',
}

// When the system says nothing, what the app is for does.
const BY_APP_TYPE: Record<string, NavCharacter> = {
  productivity: 'utility', fintech: 'utility', social: 'consumer', media: 'consumer',
  commerce: 'consumer', marketplace: 'consumer', 'food-delivery': 'consumer', food: 'consumer',
  travel: 'consumer', booking: 'consumer', learning: 'playful', health: 'playful', fitness: 'playful',
}

// FNV-1a, the same stable pick BlueprintService uses for layout variants: one app is coherent
// (every screen builds the same bar) and two apps rarely land on the same shape.
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}

/**
 * Which bar this app gets. Decided in code — never by the model: its character narrows the
 * candidates, the app's name picks one of them, so one app is consistent and two apps of the same
 * character still differ.
 */
export function navStyle(seed: string, opts: { tabCount?: number; appType?: string; designSystem?: string } = {}): NavStyle {
  const character = (opts.designSystem && BY_SYSTEM[opts.designSystem]) ?? (opts.appType && BY_APP_TYPE[opts.appType]) ?? null
  const set: readonly NavStyle[] = character ? NAV_SETS[character] : (['island', 'bar', 'pill', 'contrast'] as const)
  // Labels are what make a bar readable; with more than five tabs the narrow pill cannot fit them,
  // so a crowded bar keeps only the shapes that work without labels.
  const styles = (opts.tabCount ?? 4) > 5 ? set.filter((x) => x !== 'island') : set
  const pool = styles.length ? styles : set
  return pool[hash(`${seed.trim().toLowerCase()}|nav`) % pool.length]!
}

/** NAV-03: how much room the page must leave under the bar. A floating bar sits above the edge. */
export function navClearance(style: NavStyle): number {
  return style === 'bar' ? NAV_CLEARANCE : NAV_CLEARANCE + 24
}

export function iconSvg(name: string, size = 22): string {
  const body = ICON_PATHS[name] ?? ICON_PATHS.circle
  // data-od-icon marks shell glyphs as canonical so the linter doesn't report them as
  // hand-drawn icons that should have been lucide.
  return `<svg data-od-icon width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

function tabHtml(tab: AppNavTab, isActive: boolean, style: NavStyle): string {
  const label = escapeHtml(tab.label)
  const labelled = style === 'island' || style === 'bar'
  const inverted = style === 'contrast'
  const current = isActive ? ' aria-current="page"' : ''
  const grow = style === 'pill' || inverted ? 'padding:0 14px' : 'flex:1'
  if (tab.isAction) {
    // The action button is already accent-filled, so its active state reads as a ring
    // rather than a color change — without it an action-tab screen shows no active tab.
    // On the filled bar it takes the page's background instead, or it disappears into the fill.
    const fill = inverted ? 'background:var(--bg);color:var(--fg)' : 'background:var(--accent);color:var(--accent-on)'
    const ring = isActive ? `;box-shadow:var(--elev-raised),0 0 0 3px ${inverted ? 'var(--fg)' : 'var(--bg)'},0 0 0 5px var(--accent)` : ';box-shadow:var(--elev-raised)'
    return `<a href="#" data-od-tab="${escapeHtml(tab.id)}"${current} aria-label="${label}" style="${grow};display:flex;align-items:${labelled ? 'flex-start' : 'center'};justify-content:center;text-decoration:none"><span style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;${labelled ? 'margin-top:-16px;' : ''}border-radius:9999px;${fill}${ring}">${iconSvg(tab.icon, 24)}</span></a>`
  }
  const on = inverted ? 'var(--bg)' : 'var(--accent)'
  const off = inverted ? 'color-mix(in oklab, var(--bg) 60%, transparent)' : 'var(--meta)'
  const color = isActive ? on : off
  const inner = labelled
    ? `${iconSvg(tab.icon)}<span style="font-size:11px;font-weight:500;letter-spacing:0.01em">${label}</span>`
    : iconSvg(tab.icon, 24)
  // NAV-02: the active tab is a shape, not just a colour — a tinted pill where there are labels,
  // a dot under the icon where there are none. Colour alone is easy to miss at a glance.
  const pill = labelled && isActive ? ';background:color-mix(in oklab, var(--accent) 14%, transparent);border-radius:9999px;padding:6px 14px' : labelled ? ';padding:6px 14px' : ''
  const dot = !labelled && isActive ? `<span style="width:4px;height:4px;border-radius:9999px;background:${on}"></span>` : ''
  const ariaLabel = labelled ? '' : ` aria-label="${label}"`
  return `<a href="#" data-od-tab="${escapeHtml(tab.id)}"${current}${ariaLabel} style="${grow};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${labelled ? '4' : '5'}px;min-height:44px;text-decoration:none;color:${color}"><span style="display:flex;flex-direction:column;align-items:center;gap:4px${pill}">${inner}</span>${dot}</a>`
}

/**
 * The shared bottom tab bar, rendered identically on every root-tab screen.
 * Only the active tab's color and aria-current differ between screens.
 */
export function buildBottomNav(nav: AppNavigation, activeTabId?: string, style: NavStyle = 'island'): string {
  const tabs = nav.tabs.map((t) => tabHtml(t, t.id === activeTabId, style)).join('')
  const base = 'position:fixed;z-index:40;display:flex;align-items:stretch;justify-content:space-around;box-sizing:content-box;padding-bottom:env(safe-area-inset-bottom)'
  // A floating bar carries its own shadow instead of a hairline: a border on a rounded panel that
  // sits over content reads as a cut-out, and dark systems have no visible hairline anyway.
  // The hairline is what separates the panel on a dark system, where a shadow is invisible.
  const lift = '0 10px 30px -12px rgba(0,0,0,.38), 0 2px 6px -2px rgba(0,0,0,.12), 0 0 0 1px color-mix(in oklab, var(--fg) 8%, transparent)'
  const box: Record<NavStyle, string> = {
    island: `left:12px;right:12px;bottom:12px;height:${NAV_HEIGHT}px;border-radius:28px;background:var(--surface);box-shadow:${lift}`,
    pill: `left:50%;transform:translateX(-50%);bottom:14px;height:58px;padding-left:6px;padding-right:6px;border-radius:9999px;background:color-mix(in oklab, var(--surface) 84%, transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:${lift}`,
    contrast: `left:16px;right:16px;bottom:14px;height:60px;border-radius:9999px;background:var(--fg);color:var(--bg);box-shadow:${lift}`,
    bar: `left:0;right:0;bottom:0;height:${NAV_HEIGHT}px;background:var(--surface);border-top:1px solid var(--border)`,
  }
  return `<nav data-od-id="bottom-nav" data-od-shell="bottom-nav" data-od-nav="${style}" style="${base};${box[style]}">${tabs}</nav>`
}

/** The shared detail-screen header: back button, title, optional trailing action slot. */
export function buildDetailHeader(title: string, parentLabel: string): string {
  return `<header data-od-id="screen-header" data-od-shell="detail-header" style="position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:4px;height:${HEADER_HEIGHT}px;padding:0 8px;background:var(--surface);border-bottom:1px solid var(--border)"><button type="button" data-od-back="${escapeHtml(parentLabel)}" aria-label="Back to ${escapeHtml(parentLabel)}" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;color:var(--fg);background:none;border:0;cursor:pointer">${iconSvg('chevron-left', 24)}</button><h1 style="font-size:17px;font-weight:600;color:var(--fg);margin:0;letter-spacing:-0.01em">${escapeHtml(title)}</h1></header>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
