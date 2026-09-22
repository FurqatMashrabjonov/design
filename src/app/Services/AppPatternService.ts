import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// App-type patterns (app-patterns/<type>.json): the screens and flows a kind of app usually needs —
// a food-delivery app has tracking, a bank ends a transfer on a result screen. The brief is matched
// to one type in code before planning, and only that pattern goes into the planner's request, as a
// default the brief overrides. A brief that matches nothing gets no pattern.

const DIR = join(process.cwd(), 'app-patterns')

export type AppPattern = {
  id: string
  /** Tie-break: lower wins, so the specific type (food-delivery) beats the general one (commerce). */
  priority: number
  match: string[]
  loop: string
  screens: { name: string; archetype: string }[]
  flows: string[]
  data: string
  pitfalls: string[]
}

let all: AppPattern[] | null = null
const load = (): AppPattern[] =>
  (all ??= existsSync(DIR)
    ? readdirSync(DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as AppPattern)
        .sort((a, z) => a.priority - z.priority)
    : [])

// Uzbek is written with several apostrophes (oʻ, o’, o'); they must compare equal.
const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ’‘`]/g, "'")
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// A keyword matches at the start of a word. Short ones must also end there ("card" is not "cardio");
// longer ones may continue, which covers inflections ("тренировки", "restaurants").
const matcher = (k: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(norm(k))}${k.length < 5 ? '(?![\\p{L}\\p{N}])' : ''}`, 'u')

export const AppPatternService = {
  all: load,

  /** The best-matching type for a brief, or null. Phrases count double; ties go to the more specific type. */
  classify(brief: string): AppPattern | null {
    const text = norm(brief)
    let best: { p: AppPattern; score: number } | null = null
    for (const p of load()) {
      const score = p.match.reduce((n, k) => n + (matcher(k).test(text) ? (k.includes(' ') ? 2 : 1) : 0), 0)
      if (score > 0 && (!best || score > best.score)) best = { p, score }
    }
    return best?.p ?? null
  },

  /** What the planner reads: a few lines, framed as a default the brief overrides. */
  brief(p: AppPattern): string {
    return [
      `APP TYPE PATTERN (${p.id}) — only for what the brief leaves open. Every requested screen keeps a screen of its own; never drop, merge or replace one to fit this pattern. Use the typical screens only to fill the remaining slots.`,
      `Core loop: ${p.loop}`,
      `Typical screens: ${p.screens.map((s) => `${s.name} (${s.archetype})`).join('; ')}.`,
      `Typical flows: ${p.flows.join(' | ')}.`,
      `Typical data: ${p.data}.`,
      `Do not miss: ${p.pitfalls.join('; ')}.`,
    ].join('\n')
  },
}
