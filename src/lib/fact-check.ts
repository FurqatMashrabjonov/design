// FCT-01: the number a screen shows next to a unit (640 XP, a 5-day streak) must be one APP DATA has,
// or one made from two of them (160 of 200 XP → 40 to go). The judge's most repeated complaint was the same fact
// with two values across screens (145 XP here, 170 there). Nothing is changed in the source: a mismatch is a
// finding for the model's one repair (drawScreen), with the values APP DATA does have.
import type { LintFinding } from './jsx-lint'

// Only the person's own facts the judge kept catching: XP and a streak. Distances, steps and points were tried and
// mostly flagged honest numbers APP DATA never lists (a club's weekly kilometres, other people's runs).
const UNITS: [string, RegExp, number][] = [
  ['XP', /\bXP\b/i, 10],
  ['day streak', /-?\s?days?\s+streak|day streak/i, 1],
]

const NUM = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)/
const num = (s: string) => Number(s.replace(/,/g, ''))

/** Every value written with `unit` in a text: "640 XP", "+40 XP", "5-day streak", "7,240 steps". */
function valuesWith(text: string, unit: RegExp): number[] {
  const out: number[] = []
  const re = new RegExp(`${NUM.source}\\s*-?\\s*(?=(${unit.source}))`, 'gi')
  for (const m of text.matchAll(re)) out.push(num(m[1]!))
  // "160 of 200 XP", "160/200 XP": the first number is in that unit too.
  const pair = new RegExp(`${NUM.source}\\s*(?:of|/)\\s*${NUM.source}\\s*-?\\s*(?=(${unit.source}))`, 'gi')
  for (const m of text.matchAll(pair)) out.push(num(m[1]!))
  return out
}

/** What a reader sees: string literals and JSX text, not imports, class names or style objects. */
function visibleText(source: string): string {
  const body = source.replace(/^import[^\n]*\n/gm, '')
  const strings = [...body.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]!).filter((t) => !/^[\w:\-/[\]!.#% ]*$/.test(t) || /\d/.test(t))
  const jsxText = [...body.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]!)
  return [...strings, ...jsxText].join(' \n ')
}

export function factFindings(source: string, data: string | undefined, max = 3): LintFinding[] {
  if (!data) return []
  const seen = visibleText(source)
  const out: LintFinding[] = []
  for (const [name, unit, least] of UNITS) {
    const allowed = [...new Set(valuesWith(data, unit))]
    if (!allowed.length) continue
    const ok = new Set(allowed)
    for (const a of allowed) for (const b of allowed) { ok.add(a + b); ok.add(Math.abs(a - b)) }
    const wrong = [...new Set(valuesWith(seen, unit))].filter((v) => v >= least && !ok.has(v))
    for (const v of wrong) {
      if (out.length >= max) return out
      out.push({ rule: 'fact-mismatch', message: `This screen shows ${v.toLocaleString('en-US')} ${name}, a value APP DATA does not have (it has ${allowed.slice(0, 6).map((x) => x.toLocaleString('en-US')).join(', ')}). Every screen shows the same facts: use APP DATA's value.` })
    }
  }
  return out
}

/** The APP DATA block a screen brief carries (appContext), or undefined. */
export const appDataOf = (brief: string) => /# APP DATA[^\n]*\n([\s\S]*?)(?=\n# |$)/.exec(brief)?.[1]
