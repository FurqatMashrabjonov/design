// Shared by the planner (names it saves) and the canvas (names it shows): pure, no imports.

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
