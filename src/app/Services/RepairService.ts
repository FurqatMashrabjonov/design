// GQ-41: one repair pass for a freshly drawn screen, driven by what the linter found on it.
//
// The linter already knows, rule by rule, what is wrong with a screen (a tracked-out caps eyebrow,
// monospace on prices, a dimmed block, an undefined token…) and until now it only logged it. Those
// findings are exactly the kind of feedback a repair needs: named, located, with a sample. So they
// go back to the model once, as a rubric, and it answers by parts — element edits (lib/screen-patch)
// and, for findings that live in the stylesheet, rule edits by selector — never a redraw. The result
// is kept only if it lints better than what it replaces; otherwise the first drawing stands.
import { annotateElements } from '../../lib/element-ops.ts'
import { applyCssEdits, applyEdits, parseCssEdits, parseEdits } from '../../lib/screen-patch.ts'
import type { Finding } from '../../lib/design-lint.ts'
import { streamCompletion, type LlmUsage } from './LlmService.ts'

/** On for the planned run once the eval says so; GEN_REPAIR=0/1 overrides for an A/B. */
export const repairEnabled = () => process.env.GEN_REPAIR === '1'

export const REPAIR_MODE = `# Repairing a screen you just drew — this replaces the output contract above

A reviewer checked the screen below and listed concrete problems. Fix exactly those problems and nothing else: the layout, content, data and look stay as they are.

Answer only with edit blocks, no prose and no full document:
- Change a CSS rule of the page's own <style>: <css selector=".exact-selector">the rule's complete new declarations</css>
- Delete a CSS rule: <css selector=".exact-selector" op="delete"></css>
- Replace an element: <edit target="the-data-od-id">the element's complete new HTML, same tag and same data-od-id</edit>

Rules:
1. Fix a problem where it lives: a rule in the stylesheet with <css>, text or markup with <edit>. Use the selector exactly as it is written in the page.
2. Keep every value that is not part of a problem (sizes, spacing, colours, copy). Use only var(--…) tokens that the page already uses.
3. How to fix the usual problems:
   - caps-eyebrow: set the label in sentence case at the body size, weight 600, no letter-spacing (text-transform:none).
   - mono-for-data: use var(--font-body) (or the display face for big figures); keep font-variant-numeric:tabular-nums.
   - opacity-dimmed-text: remove the opacity and colour the text with var(--muted) instead.
   - middle-dot-meta: keep the one or two facts that decide and drop the rest.
   - identical-card-stack: turn the run of identical cards into a list of rows, or lead it with one wide card.
   - accent-energy-mismatch: follow the finding (more or less var(--accent) on the primary action, active state and one highlight).
   - undefined-token: use the nearest token the page defines.
4. Never touch the injected tab bar or header.`

export type RepairResult = { html: string; applied: string[]; skipped: string[] }

/** Worse findings weigh more, so a repair that trades an error for a warning still counts as better. */
export const findingScore = (fs: Finding[]) => fs.reduce((n, f) => n + (f.severity === 'error' ? 3 : 1), 0)

export async function repairScreen(
  html: string,
  findings: Finding[],
  opts: { system: string; signal?: AbortSignal; onUsage?: (u: LlmUsage) => void },
): Promise<RepairResult | null> {
  if (!findings.length) return null
  const base = annotateElements(html)
  const rubric = findings.map((f) => `- ${f.rule}: ${f.message}${f.samples.length ? `\n  Where: ${f.samples.slice(0, 4).map((s) => JSON.stringify(s)).join(', ')}` : ''}`).join('\n')
  const user = `Problems found on this screen:\n${rubric}\n\nThe screen:\n\`\`\`html\n${base}\n\`\`\``
  let text = ''
  for await (const d of streamCompletion(`${opts.system}\n\n---\n\n${REPAIR_MODE}`, user, opts.signal, opts.onUsage, undefined, 'edit')) text += d
  const edits = parseEdits(text)
  const css = parseCssEdits(text)
  if (!edits.length && !css.length) return null
  const byParts = edits.length ? applyEdits(base, edits) : { html: base, applied: [], skipped: [] }
  const byRules = applyCssEdits(byParts.html, css)
  const applied = [...byParts.applied.map((a) => `${a.op} ${a.target}`), ...byRules.applied]
  if (!applied.length) return null
  return { html: byRules.html, applied, skipped: [...byParts.skipped, ...byRules.skipped] }
}
