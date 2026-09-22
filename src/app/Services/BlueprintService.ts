import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Screen archetype blueprints (blueprints/<id>.json, one per planner archetype): the structure a
// kind of screen needs — what it must show, where its primary action lives, the mistakes that make
// it look generated. The planner picks the archetype; this puts the matching pattern into that
// screen's brief, so a "detail" screen gets a sticky bottom bar because the pattern says so, not
// because the model happened to remember.

const DIR = join(process.cwd(), 'blueprints')

export type Blueprint = {
  id: string
  purpose: string
  layout: string
  sections: { required: string[]; optional: string[] }
  primaryAction: { placement: 'bottom-bar' | 'inline' | 'header' | 'none'; note: string }
  avoid: string[]
  hig: string[]
  /** 2–3 structurally different layouts for the same sections (VAR-02). */
  variants?: { id: string; layout: string }[]
}

// FNV-1a: a stable pick from a string, the same on every run and machine.
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}

const cache = new Map<string, Blueprint | null>()

export const BlueprintService = {
  find(id: string): Blueprint | null {
    if (!/^[a-z-]{2,30}$/.test(id)) return null
    if (!cache.has(id)) {
      const path = join(DIR, `${id}.json`)
      cache.set(id, existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Blueprint) : null)
    }
    return cache.get(id)!
  },

  /**
   * Which layout variant an app uses for an archetype. Seeded by the app (its name), so every
   * screen of one archetype in one app shares a layout — the app stays coherent — while other apps
   * land on other layouts, which is what keeps different apps from looking the same.
   */
  variant(id: string, seed: string): { id: string; layout: string } | null {
    const vs = BlueprintService.find(id)?.variants ?? []
    return vs.length ? vs[hash(`${seed.trim().toLowerCase()}|${id}`) % vs.length] : null
  },

  /** The pattern as brief text — a few lines, so it fits next to the plan's own sections. */
  brief(id: string, seed?: string): string {
    const b = BlueprintService.find(id)
    if (!b) return ''
    const v = seed ? BlueprintService.variant(id, seed) : null
    return [
      v ? `Screen pattern (${b.id}, layout ${v.id}): ${v.layout} Use this layout, not the most common one.` : `Screen pattern (${b.id}): ${b.layout}`,
      `It must show: ${b.sections.required.join('; ')}.`,
      `Primary action placement: ${b.primaryAction.note}`,
      `Avoid: ${b.avoid.join('; ')}.`,
    ].join('\n')
  },
}
