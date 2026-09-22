// GQ-08: a visual judge for an eval run. The deterministic metrics cannot see taste: a run can get
// lint-clean and still look generic. This renders every screen (with its project's theme, as users
// see it), shows each app's screens to a vision model with a fixed rubric, and — with --vs — asks
// which of two runs is better for the same brief, in random order.
//
//   node --import ./eval/alias-hook.mjs eval/judge.ts <run-label> [--vs <other-label>] [--concurrency 3]
//
// Local only: it runs on the developer's Claude Code login (`claude -p`), like LLM_PROVIDER=claude-cli.
// Scores are written to eval/out/<run>/judge.json. Judge runs are compared only with judge runs.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import Database from 'better-sqlite3'
import { applyThemeOverride, parseTheme } from '../src/lib/theme-override.ts'
import type { BriefResult } from './sheet.ts'

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
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

function ask(system: string, prompt: string, cwd: string): Promise<string> {
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

/** Screenshots of a run's screens, themed as the product renders them. Headless Chrome on macOS will
 *  not open a window narrower than 500px, so each 390px screen is framed on a grey canvas. */
function shoot(label: string): { brief: BriefResult; shots: string[] }[] {
  const dir = join(OUT_ROOT, label)
  const results: BriefResult[] = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'))
  const db = existsSync(join(dir, 'eval.db')) ? new Database(join(dir, 'eval.db'), { readonly: true }) : null
  const shots = join(dir, 'judge')
  mkdirSync(shots, { recursive: true })
  return results.map((r) => {
    const themeJson = (db?.prepare('SELECT theme FROM projects WHERE name = ?').get(r.appName ?? '') as { theme?: string } | undefined)?.theme
    const theme = parseTheme(themeJson ?? null)
    const files = r.screens.map((s, i) => {
      const base = `${r.id}-${i}`
      const png = join(shots, `${base}.png`)
      if (!existsSync(png)) {
        writeFileSync(join(shots, `${base}.html`), applyThemeOverride(readFileSync(join(dir, s.file), 'utf8'), theme))
        writeFileSync(join(shots, `${base}.frame.html`), `<body style="margin:0;background:#d9d9de"><iframe src="${base}.html" sandbox="allow-scripts" style="display:block;margin:0 auto;width:390px;height:844px;border:0;background:#fff"></iframe></body>`)
        execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--window-size=500,844', '--virtual-time-budget=10000', `--screenshot=${png}`, pathToFileURL(join(shots, `${base}.frame.html`)).href], { stdio: 'ignore', timeout: 60000 })
      }
      return png
    })
    return { brief: r, shots: files }
  })
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0)

async function main() {
  const { values: args, positionals } = parseArgs({ allowPositionals: true, options: { vs: { type: 'string' }, concurrency: { type: 'string', default: '3' } } })
  const label = positionals[0] ?? readdirSync(OUT_ROOT).sort().at(-1)!
  const n = Number(args.concurrency)
  const runs = shoot(label)
  console.log(`[judge] ${label}: ${runs.reduce((k, r) => k + r.shots.length, 0)} screens in ${runs.length} apps`)

  const judged = await pool(runs, n, async ({ brief, shots }) => {
    if (!shots.length) return null
    const prompt = `Brief: ${brief.brief}\n\nRead each screenshot below (one phone screen each, on a grey canvas — ignore the canvas), then score them.\n${shots.map((p) => `- ${p}`).join('\n')}`
    const j = parseJudgement<Omit<BriefJudgement, 'id'>>(await ask(RUBRIC, prompt, join(OUT_ROOT, label, 'judge')).catch(() => ''))
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
        const flip = Math.random() < 0.5 // the judge must not learn which side is new
        const [a, b] = flip ? [other.get(brief.id)!, shots] : [shots, other.get(brief.id)!]
        const prompt = `Brief: ${brief.brief}\n\nSet A (read each):\n${a.map((p) => `- ${p}`).join('\n')}\n\nSet B (read each):\n${b.map((p) => `- ${p}`).join('\n')}`
        const j = parseJudgement<{ winner: string; margin: string; reason: string }>(await ask(PAIRWISE, prompt, OUT_ROOT).catch(() => ''))
        if (!j) return null
        // Report from this run's side: "this" won, "other" won, or a tie.
        const winner = j.winner === 'tie' ? 'tie' : (j.winner === 'A') !== flip ? 'this' : 'other'
        return { id: brief.id, winner, margin: j.margin, reason: j.reason }
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
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
