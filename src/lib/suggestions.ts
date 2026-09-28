// Next-step suggestions shown above the prompt. Worked out from what the project already contains,
// so they are always true: a tab nobody designed, a link that leads to a screen that does not exist.
export type SuggestScreen = { name: string; x: number; screenType: string | null; activeTabId: string | null; html: string }

export function suggestions(screens: SuggestScreen[], tabs: { id: string; label: string }[], max = 3): string[] {
  const drawn = screens.filter((s) => s.html).sort((a, z) => a.x - z.x) // canvas order is plan order
  if (drawn.length === 0) return []
  const out: string[] = []

  for (const t of tabs) {
    if (!drawn.some((s) => s.screenType === 'root-tab' && s.activeTabId === t.id)) out.push(`Design the ${t.label} tab`)
  }

  const home = drawn.find((s) => s.screenType === 'root-tab') ?? drawn[0]
  out.push(`Show the empty state of “${home.name}”`)
  // GQ-38: most apps now open with one — offer it only to an app that has none.
  if (!drawn.some((s) => /onboard|welcome|get started|intro/i.test(s.name))) out.push('Add an onboarding screen')
  return [...new Set(out)].slice(0, max)
}
