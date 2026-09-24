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
  nova: 'consumer', airbnb: 'consumer', nike: 'consumer', spotify: 'consumer', shopify: 'consumer', apple: 'consumer',
  elegant: 'consumer', claude: 'consumer', tesla: 'consumer',
  duolingo: 'playful', doodle: 'playful', retro: 'playful', bento: 'playful',
  midnight: 'bold', neon: 'bold', brutalist: 'bold', neobrutalism: 'bold', glassmorphism: 'bold', dashboard: 'bold',
}

// GQ-29: a system whose identity IS its chrome pins the shape outright rather than drawing from a
// character set. Lumen is iOS 26: its bar floats, is inset and is glass, and a roulette that can
// land on the flat edge-to-edge `bar` throws the system away — which is exactly what happened on
// its first run, where not one screen showed the material the system exists for.
const PINNED_BY_SYSTEM: Record<string, NavStyle> = { lumen: 'island' }

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
  const pinned = opts.designSystem && PINNED_BY_SYSTEM[opts.designSystem]
  if (pinned) return pinned
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
  // A floating bar (GQ-18) sits 21px up and is up to 64px tall, plus air: the judge saw a pill
  // covering list content on nearly every screen when this was +24.
  return style === 'bar' ? NAV_CLEARANCE : NAV_CLEARANCE + 40
}

export function iconSvg(name: string, size = 22): string {
  const body = ICON_PATHS[name] ?? ICON_PATHS.circle
  // data-od-icon marks shell glyphs as canonical so the linter doesn't report them as
  // hand-drawn icons that should have been lucide.
  // GQ-20: the stroke follows the design system (--icon-stroke, as lucide's createIcons already
  // does for in-page icons), so a 1.75 system does not get a heavier glyph in its own tab bar.
  return `<svg data-od-icon width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="stroke-width:var(--icon-stroke, 2)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
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
  // GQ-18: on a floating bar, Search is not one tab among the others — it is its own round
  // island to the right, the way iOS 26 draws it. Still a tab underneath (same data-od-tab, same
  // active state), so the prototype bridge and the shell contract do not change.
  if ((style === 'island' || style === 'pill') && (tab.icon === 'search' || /^search$/i.test(tab.label))) {
    const glass = 'background:color-mix(in oklab, var(--surface) 78%, transparent);backdrop-filter:blur(var(--od-blur-nav, 18px)) saturate(1.4);-webkit-backdrop-filter:blur(var(--od-blur-nav, 18px)) saturate(1.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 10px 30px -12px rgba(0,0,0,.38),0 2px 6px -2px rgba(0,0,0,.12),0 0 0 1px color-mix(in oklab, var(--fg) 8%, transparent)'
    const tint = isActive ? 'color:var(--accent)' : 'color:var(--fg)'
    return `<a href="#" data-od-tab="${escapeHtml(tab.id)}" data-od-search="1"${current} aria-label="${label}" style="position:absolute;right:-70px;top:0;width:58px;height:58px;border-radius:9999px;display:flex;align-items:center;justify-content:center;text-decoration:none;${tint};${glass}">${iconSvg(tab.icon, 24)}</a>`
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
  // GQ-18, from the iOS 26 bar: the floating shapes sit 21px in from the edges, and the glass is a
  // blur plus a one-pixel light along the top edge — the highlight is what reads as a material
  // rather than a tinted rectangle. Glass stays on the navigation layer only; content never gets it.
  // How much of the surface the panel keeps is the system's call: at 78% the panel is nearly
  // opaque, which is right for a system that only wants a floating shape, and wrong for one whose
  // identity is the material — glass that nothing shows through is just a rounded rectangle.
  const glass = `background:color-mix(in oklab, var(--surface) var(--od-nav-tint, 78%), transparent);backdrop-filter:blur(var(--od-blur-nav, 18px)) saturate(1.4);-webkit-backdrop-filter:blur(var(--od-blur-nav, 18px)) saturate(1.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),${lift}`
  const box: Record<NavStyle, string> = {
    island: `left:21px;right:21px;bottom:21px;height:${NAV_HEIGHT}px;border-radius:28px;${glass}`,
    pill: `left:50%;transform:translateX(-50%);bottom:21px;height:58px;padding-left:6px;padding-right:6px;border-radius:9999px;${glass}`,
    contrast: `left:16px;right:16px;bottom:14px;height:60px;border-radius:9999px;background:var(--fg);color:var(--bg);box-shadow:${lift}`,
    bar: `left:0;right:0;bottom:0;height:${NAV_HEIGHT}px;background:var(--surface);border-top:1px solid var(--border)`,
  }
  const floating = style === 'island' || style === 'pill'
  return `<nav data-od-id="bottom-nav" data-od-shell="bottom-nav" data-od-nav="${style}" style="${base};${box[style]}">${tabs}${floating ? NAV_ICON_STYLE + NAV_COLLAPSE_SCRIPT : ''}</nav>`
}

// GQ-20: the active tab's glyph is duotone — its closed shapes take a light fill of the tab's own
// colour — and it draws itself in when the screen opens, the way SF Symbols 7 does. Scoped to the
// bar with an id selector so no page CSS is touched; off entirely under reduced motion.
const NAV_ICON_STYLE = `<style data-od-shell="nav-icons">[data-od-id="bottom-nav"] [aria-current=page] svg{fill:color-mix(in oklab, currentColor var(--od-icon-duotone, 14%), transparent)}@media (prefers-reduced-motion: no-preference){[data-od-id="bottom-nav"] [aria-current=page] svg path,[data-od-id="bottom-nav"] [aria-current=page] svg circle,[data-od-id="bottom-nav"] [aria-current=page] svg polyline,[data-od-id="bottom-nav"] [aria-current=page] svg line{stroke-dasharray:60;stroke-dashoffset:60;animation:od-draw 260ms ease-out forwards}@keyframes od-draw{to{stroke-dashoffset:0}}[data-od-id="bottom-nav"] [aria-current=page] > span{animation:od-pop 320ms var(--ease-spring, cubic-bezier(.34,1.3,.64,1)) both}@keyframes od-pop{from{transform:scale(.82)}to{transform:scale(1)}}}</style>`

// The bar minimises while the person reads and comes back when they look for it: scrolling down
// past a few pixels hides every tab but the active one, scrolling up restores them. Lives inside
// the <nav> so a re-normalised screen replaces it together with the bar. No transition when the
// person asked for reduced motion.
const NAV_COLLAPSE_SCRIPT = `<script data-od-shell="nav-collapse">(function(){var nav=document.currentScript.parentNode,last=window.scrollY,ticking=false,collapsed=false;var quiet=matchMedia('(prefers-reduced-motion: reduce)').matches;var tabs=[].slice.call(nav.querySelectorAll('[data-od-tab]'));tabs.forEach(function(t){if(!quiet)t.style.transition='opacity 160ms ease, max-width 200ms ease';t.style.overflow='hidden'});function set(c){if(c===collapsed)return;collapsed=c;tabs.forEach(function(t){var active=t.getAttribute('aria-current')==='page'||t.getAttribute('data-od-search')==='1';if(c&&!active){t.style.opacity='0';t.style.maxWidth='0';t.style.padding='0'}else{t.style.opacity='';t.style.maxWidth='';t.style.padding=''}})}addEventListener('scroll',function(){if(ticking)return;ticking=true;requestAnimationFrame(function(){var y=window.scrollY;if(y>last+6&&y>48)set(true);else if(y<last-6||y<=24)set(false);last=y;ticking=false})},{passive:true})})()</script>`

/** The shared detail-screen header: back button, title, optional trailing action slot. */
export function buildDetailHeader(title: string, parentLabel: string): string {
  // GQ-19, the iOS 26 navigation bar: two rows — back button and a small title that starts
  // invisible, then the large title in the display face — and no hairline. Scrolling collapses
  // the large row and fades the small title in; the edge is a blur with a soft line, not a border.
  // Everything lives inside the <header> so a re-normalised screen replaces it whole.
  const t = escapeHtml(title)
  const back = escapeHtml(parentLabel)
  const glass = 'background:color-mix(in oklab, var(--surface) 84%, transparent);backdrop-filter:blur(var(--od-blur-nav, 18px)) saturate(1.4);-webkit-backdrop-filter:blur(var(--od-blur-nav, 18px)) saturate(1.4)'
  return `<header data-od-id="screen-header" data-od-shell="detail-header" style="position:sticky;top:0;z-index:30;${glass};box-shadow:0 1px 0 transparent"><div style="display:flex;align-items:center;gap:4px;height:${HEADER_HEIGHT}px;padding:0 8px"><button type="button" data-od-back="${back}" aria-label="Back to ${back}" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;color:var(--fg);background:none;border:0;cursor:pointer;flex:none">${iconSvg('chevron-left', 24)}</button><span data-od-title="small" style="flex:1;text-align:center;font-size:17px;font-weight:600;color:var(--fg);letter-spacing:-0.01em;opacity:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:44px">${t}</span></div><div data-od-title="large" style="padding:0 20px 12px;max-height:72px;overflow:hidden"><h1 style="font:400 34px/1.1 var(--font-display, inherit);letter-spacing:-0.02em;color:var(--fg);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</h1></div>${HEADER_COLLAPSE_SCRIPT}</header>`
}

const HEADER_COLLAPSE_SCRIPT = `<script data-od-shell="header-collapse">(function(){var h=document.currentScript.parentNode,big=h.querySelector('[data-od-title=large]'),small=h.querySelector('[data-od-title=small]'),ticking=false,on=false;var quiet=matchMedia('(prefers-reduced-motion: reduce)').matches;if(!quiet){big.style.transition='max-height 200ms ease, opacity 160ms ease, padding 200ms ease';small.style.transition='opacity 160ms ease';h.style.transition='box-shadow 200ms ease'}function set(c){if(c===on)return;on=c;big.style.maxHeight=c?'0':'';big.style.opacity=c?'0':'';big.style.paddingBottom=c?'0':'';small.style.opacity=c?'1':'0';h.style.boxShadow=c?'0 1px 0 var(--border-soft, var(--border))':'0 1px 0 transparent'}addEventListener('scroll',function(){if(ticking)return;ticking=true;requestAnimationFrame(function(){set(window.scrollY>28);ticking=false})},{passive:true})})()</script>`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
