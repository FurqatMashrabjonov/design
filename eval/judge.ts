// A visual judge for an eval run (eval/run.ts). Metrics cannot see taste: this shows each app's screenshots
// to a vision model with a fixed rubric, and — with --vs — asks which of two runs is better for the same brief.
//
//   node --import ./scripts/alias-hook.mjs eval/judge.ts <run-label> [--vs <other-label>|best] [--concurrency 3] [--best]
//
// A pairwise verdict is asked twice, once in each order, and counts only when both agree — a judge prefers
// whichever set it read first or last. `--vs best` compares with eval/out/BEST; `--best` records this run
// there when it did not lose. Local only: it runs on the developer's Claude Code login (`claude -p`).
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const OUT_ROOT = resolve('eval/out')

export const RUBRIC = `You are a senior product designer judging generated mobile app screens against the bar of the best work on Dribbble and in shipped top-100 apps. Be strict and consistent: "competent but generic" is a 3, not a 4.

Score each screen 1-5 on:
- hierarchy: one clear focal point, obvious primary action, headings and data read in the right order.
- spacing: consistent rhythm, alignment and padding; nothing cramped, no dead gaps, nothing cut off or overflowing.
- polish: considered type scale, colour, depth and detail; would pass a design review. Photos and icons look intentional.
- fidelity: does what the brief asks — its screens, content, colours and mood.
- overall: your overall judgement of the screen.
Anchors: 5 = could be a top Dribbble shot; 4 = strong, shippable; 3 = correct but generic or uneven; 2 = visibly flawed; 1 = broken.
Also score the whole app 1-5 for coherence (one design language, one navigation, the same data across screens).
Each screenshot shows only the first 844px of the screen (one phone viewport). Content that continues under the bottom tab bar or past the bottom edge scrolls — it is not cut off and is not an issue. Text clipped at the right edge of a horizontal row (chips, carousels) is a scroll row, not a bug, unless it is clearly broken.
List at most 3 concrete issues per screen, each naming the element ("the cart thumbnails are stretched full width").
Reply with JSON only: {"screens":[{"file":"...","hierarchy":n,"spacing":n,"polish":n,"fidelity":n,"overall":n,"issues":["..."]}],"coherence":n,"app_overall":n}`

export const PAIRWISE = `You are a senior product designer. Two sets of generated screens were made from the same brief. Judge which set is the better app design overall: quality, polish, fidelity to the brief, coherence. Reply with JSON only: {"winner":"A"|"B"|"tie","margin":"slight"|"clear","reason":"one sentence"}`

type ScreenScore = { file: string; hierarchy: number; spacing: number; polish: number; fidelity: number; overall: number; issues: string[] }
type BriefJudgement = { id: string; screens: ScreenScore[]; coherence: number; app_overall: number }

/** Pulls the first JSON object out of a model reply (it sometimes wraps it in a code fence). */
export function parseJudgement<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as T
  } catch {
    return null
  }
}

/** One question to the local Claude Code login; the reply text. Shared with judge-project.ts. */
export function ask(system: string, prompt: string, cwd: string): Promise<string> {
  const args = ['-p', '--output-format', 'json', '--tools', 'Read', '--allowedTools', 'Read', '--system-prompt', system, '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence', '--disable-slash-commands']
  if (process.env.JUDGE_MODEL) args.push('--model', process.env.JUDGE_MODEL)
  return new Promise((ok, fail) => {
    const child = spawn(process.env.CLAUDE_CLI_BIN || 'claude', [...args, prompt], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.on('error', fail)
    child.on('close', () => {
      try {
        ok(String(JSON.parse(out).result ?? ''))
      } catch {
        fail(new Error(`claude returned no result: ${out.slice(0, 200)}`))
      }
    })
  })
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i]!)
    }
  }))
  return out
}

/** Each brief's screenshots (eval/run.ts wrote them beside metrics.json), in canvas order. */
function shoot(label: string): { brief: { id: string; brief: string }; shots: string[] }[] {
  const dir = join(OUT_ROOT, label)
  const results = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8')).results as { id: string; brief: string; screens: { slug: string; built: boolean }[] }[]
  return results.map((r) => ({ brief: r, shots: r.screens.filter((s) => s.built && existsSync(join(dir, r.id, `${s.slug}.png`))).map((s) => join(dir, r.id, `${s.slug}.png`)) }))
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0)

async function main() {
  const { values: args, positionals } = parseArgs({ allowPositionals: true, options: { vs: { type: 'string' }, concurrency: { type: 'string', default: '3' }, best: { type: 'boolean', default: false } } })
  const label = positionals[0]!
  const bestFile = join(OUT_ROOT, 'BEST')
  if (args.vs === 'best') {
    if (!existsSync(bestFile)) throw new Error('No eval/out/BEST yet: judge a run with --best first')
    args.vs = readFileSync(bestFile, 'utf8').trim()
    console.log(`[judge] best so far: ${args.vs}`)
  }
  const n = Number(args.concurrency)
  const runs = shoot(label)
  console.log(`[judge] ${label}: ${runs.reduce((k, r) => k + r.shots.length, 0)} screens in ${runs.length} apps`)

  const judged = await pool(runs, n, async ({ brief, shots }) => {
    if (!shots.length) return null
    const prompt = `Brief: ${brief.brief}\n\nRead each screenshot below (one phone screen each), then score them.\n${shots.map((p) => `- ${p}`).join('\n')}`
    const j = parseJudgement<Omit<BriefJudgement, 'id'>>(await ask(RUBRIC, prompt, join(OUT_ROOT, label)).catch(() => ''))
    if (!j) console.warn(`[judge] ${brief.id}: no usable reply`)
    else console.log(`[judge] ${brief.id}: overall ${mean(j.screens.map((s) => s.overall))}, coherence ${j.coherence}`)
    return j ? { id: brief.id, ...j } : null
  })
  const ok = judged.filter((j): j is BriefJudgement => j !== null)
  const all = ok.flatMap((j) => j.screens)
  const summary = {
    screens: all.length,
    overall: mean(all.map((s) => s.overall)),
    hierarchy: mean(all.map((s) => s.hierarchy)),
    spacing: mean(all.map((s) => s.spacing)),
    polish: mean(all.map((s) => s.polish)),
    fidelity: mean(all.map((s) => s.fidelity)),
    coherence: mean(ok.map((j) => j.coherence)),
  }

  let pairwise: { id: string; winner: string; margin: string; reason: string }[] | undefined
  if (args.vs) {
    const other = new Map(shoot(args.vs).map((r) => [r.brief.id, r.shots]))
    const shared = runs.filter((r) => other.get(r.brief.id)?.length && r.shots.length)
    pairwise = (
      await pool(shared, n, async ({ brief, shots }) => {
        // Both orders; a side wins only when it wins in both, anything else is a tie.
        const once = async (flip: boolean) => {
          const [a, b] = flip ? [other.get(brief.id)!, shots] : [shots, other.get(brief.id)!]
          const prompt = `Brief: ${brief.brief}\n\nSet A (read each):\n${a.map((p) => `- ${p}`).join('\n')}\n\nSet B (read each):\n${b.map((p) => `- ${p}`).join('\n')}`
          const j = parseJudgement<{ winner: string; margin: string; reason: string }>(await ask(PAIRWISE, prompt, OUT_ROOT).catch(() => ''))
          if (!j) return null
          // From this run's side: "this" won, "other" won, or a tie.
          return { winner: j.winner === 'tie' ? 'tie' : (j.winner === 'A') !== flip ? 'this' : 'other', margin: j.margin, reason: j.reason }
        }
        const [x, y] = await Promise.all([once(false), once(true)])
        if (!x || !y) return null
        const winner = x.winner === y.winner ? x.winner : 'tie'
        const margin = winner === 'tie' ? (x.winner === y.winner ? 'tie' : 'split') : x.margin === 'clear' && y.margin === 'clear' ? 'clear' : 'slight'
        return { id: brief.id, winner, margin, reason: winner === 'other' ? y.reason : x.reason }
      })
    ).filter((x): x is NonNullable<typeof x> => x !== null)
  }

  const report = { label, vs: args.vs, model: process.env.JUDGE_MODEL || 'claude default', summary, briefs: ok, pairwise }
  writeFileSync(join(OUT_ROOT, label, 'judge.json'), JSON.stringify(report, null, 2))
  console.log(`\n[judge] ${label}: overall ${summary.overall} · hierarchy ${summary.hierarchy} · spacing ${summary.spacing} · polish ${summary.polish} · fidelity ${summary.fidelity} · coherence ${summary.coherence} (${summary.screens} screens)`)
  if (pairwise) {
    const won = pairwise.filter((p) => p.winner === 'this').length
    const tie = pairwise.filter((p) => p.winner === 'tie').length
    console.log(`[judge] vs ${args.vs}: won ${won}, tied ${tie}, lost ${pairwise.length - won - tie} of ${pairwise.length}`)
    for (const p of pairwise) console.log(`  ${p.id}: ${p.winner} (${p.margin}) — ${p.reason}`)
    // The other run's own scores, dimension by dimension, when it was judged too.
    const theirs = join(OUT_ROOT, args.vs!, 'judge.json')
    if (existsSync(theirs)) {
      const o = (JSON.parse(readFileSync(theirs, 'utf8')) as { summary: typeof summary }).summary
      const keys = ['overall', 'hierarchy', 'spacing', 'polish', 'fidelity', 'coherence'] as const
      console.log(`[judge] scores vs ${args.vs}: ${keys.map((k) => `${k} ${o[k]} → ${summary[k]}`).join(' · ')}`)
    }
  }
  if (args.best) {
    const lost = pairwise ? pairwise.filter((p) => p.winner === 'other').length : 0
    const won = pairwise ? pairwise.filter((p) => p.winner === 'this').length : 0
    if (!pairwise || won >= lost) {
      writeFileSync(bestFile, label + '\n')
      console.log(`[judge] ${label} is now eval/out/BEST`)
    } else console.log(`[judge] not recorded as best: lost ${lost}, won ${won}`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
