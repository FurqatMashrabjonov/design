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

  /** The pattern as brief text — a few lines, so it fits next to the plan's own sections. */
  brief(id: string): string {
    const b = BlueprintService.find(id)
    if (!b) return ''
    return [
      `Screen pattern (${b.id}): ${b.layout}`,
      `It must show: ${b.sections.required.join('; ')}.`,
      `Primary action placement: ${b.primaryAction.note}`,
      `Avoid: ${b.avoid.join('; ')}.`,
    ].join('\n')
  },
}
