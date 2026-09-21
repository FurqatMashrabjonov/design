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
/** Body clearance under the fixed bottom nav — nav height plus breathing room. */
export const NAV_CLEARANCE = 88

export function iconSvg(name: string, size = 22): string {
  const body = ICON_PATHS[name] ?? ICON_PATHS.circle
  // data-od-icon marks shell glyphs as canonical so the linter doesn't report them as
  // hand-drawn icons that should have been lucide.
  return `<svg data-od-icon width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

function tabHtml(tab: AppNavTab, isActive: boolean): string {
  const label = escapeHtml(tab.label)
  if (tab.isAction) {
    // The action button is already accent-filled, so its active state reads as a ring
    // rather than a color change — without it an action-tab screen shows no active tab.
    const ring = isActive ? ';box-shadow:var(--elev-raised),0 0 0 3px var(--bg),0 0 0 5px var(--accent)' : ';box-shadow:var(--elev-raised)'
    const current = isActive ? ' aria-current="page"' : ''
    return `<a href="#" data-od-tab="${escapeHtml(tab.id)}"${current} aria-label="${label}" style="flex:1;display:flex;align-items:flex-start;justify-content:center;text-decoration:none"><span style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;margin-top:-16px;border-radius:9999px;background:var(--accent);color:var(--accent-on)${ring}">${iconSvg(tab.icon, 24)}</span></a>`
  }
  const color = isActive ? 'var(--accent)' : 'var(--meta)'
  const current = isActive ? ' aria-current="page"' : ''
  return `<a href="#" data-od-tab="${escapeHtml(tab.id)}"${current} style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:44px;text-decoration:none;color:${color}">${iconSvg(tab.icon)}<span style="font-size:11px;font-weight:500;letter-spacing:0.01em">${label}</span></a>`
}

/**
 * The shared bottom tab bar, rendered identically on every root-tab screen.
 * Only the active tab's color and aria-current differ between screens.
 */
export function buildBottomNav(nav: AppNavigation, activeTabId?: string): string {
  const tabs = nav.tabs.map((t) => tabHtml(t, t.id === activeTabId)).join('')
  return `<nav data-od-id="bottom-nav" data-od-shell="bottom-nav" style="position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:stretch;justify-content:space-around;box-sizing:content-box;height:${NAV_HEIGHT}px;padding-bottom:env(safe-area-inset-bottom);background:var(--surface);border-top:1px solid var(--border)">${tabs}</nav>`
}

/** The shared detail-screen header: back button, title, optional trailing action slot. */
export function buildDetailHeader(title: string, parentLabel: string): string {
  return `<header data-od-id="screen-header" data-od-shell="detail-header" style="position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:4px;height:${HEADER_HEIGHT}px;padding:0 8px;background:var(--surface);border-bottom:1px solid var(--border)"><button type="button" data-od-back="${escapeHtml(parentLabel)}" aria-label="Back to ${escapeHtml(parentLabel)}" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;color:var(--fg);background:none;border:0;cursor:pointer">${iconSvg('chevron-left', 24)}</button><h1 style="font-size:17px;font-weight:600;color:var(--fg);margin:0;letter-spacing:-0.01em">${escapeHtml(title)}</h1></header>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
