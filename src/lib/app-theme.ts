// The app's own look — accent, light/dark and platform — stored in projects.theme and shared by the server
// (the screen's page) and the studio (the Theme panel, frame URLs). Not the studio's light/dark: that is the
// person's, this is the app's.
export type Platform = 'ios' | 'material'
export type AppTheme = { accent: string; dark: boolean; platform: Platform }

export const DEFAULT_THEME: AppTheme = { accent: '#5e5ce6', dark: false, platform: 'ios' }
const HEX = /^#[0-9a-f]{6}$/i

/** Validated at every boundary: anything unknown falls back to the default. */
export function parseAppTheme(input: unknown): AppTheme {
  let t: Record<string, unknown> = {}
  try {
    t = (typeof input === 'string' ? JSON.parse(input) : input) ?? {}
  } catch {}
  return {
    accent: typeof t.accent === 'string' && HEX.test(t.accent) ? t.accent.toLowerCase() : DEFAULT_THEME.accent,
    dark: t.dark === true,
    platform: t.platform === 'material' ? 'material' : 'ios',
  }
}

/** The query a frame asks for, so a change is a new URL (and never a stale cached page). */
export const themeQuery = (t: AppTheme) => `a=${t.accent.slice(1)}&p=${t.platform}${t.dark ? '&dark=1' : ''}`

/** A frame URL's theme: whatever it names wins over the stored one (the panel shows a change before it is saved). */
export function themeFromQuery(q: URLSearchParams, stored: AppTheme): AppTheme {
  const a = q.get('a')
  return {
    accent: a && HEX.test(`#${a}`) ? `#${a.toLowerCase()}` : stored.accent,
    dark: q.has('dark') ? q.get('dark') === '1' : stored.dark,
    platform: q.get('p') === 'material' ? 'material' : q.get('p') === 'ios' ? 'ios' : stored.platform,
  }
}

/** iOS system colours, the accents the Theme panel offers. */
export const ACCENTS = ['#007aff', '#5e5ce6', '#af52de', '#ff2d55', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#30b0c7', '#a2845e', '#1c1c1e']
