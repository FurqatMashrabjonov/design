// npm run eval -- [--only id,id] [--limit n] [--concurrency n] [--label name] [--no-shot] [--no-add] [--from run] [--briefs=file]
// --from <run> skips generation and rebuilds metrics and sheets for an existing run (after a metrics change).
// Generates every brief in eval/briefs.json through the real PlanController, in a throwaway database,
// and writes eval/out/<label>/{index.html, compare.html, ab.html, results.json, metrics.json, screens/, sheet-N.png}.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { computeMetrics, diffMetrics, type ScreenInput, type Usage } from './metrics.ts'
import { abHtml, compareHtml, sheetHtml, FRAME, type BriefResult } from './sheet.ts'

// Which model drew the run. A Claude Code run (LLM_PROVIDER=claude-cli, the developer's own
// subscription) is only ever compared with other Claude runs: its numbers say how a code change
// moves quality, not what DeepSeek users get, so the result is re-checked on DeepSeek before launch.
const PROVIDER = process.env.LLM_PROVIDER === 'claude-cli' ? `claude-cli${process.env.CLAUDE_CLI_MODEL ? `:${process.env.CLAUDE_CLI_MODEL}` : ''}` : 'deepseek'
const providerOf = (d: string) => {
  try {
    return (JSON.parse(readFileSync(join(OUT_ROOT, d, 'run.json'), 'utf8')) as { provider: string }).provider
  } catch {
    return 'deepseek' // runs from before run.json existed were all DeepSeek
  }
}
if (PROVIDER !== 'deepseek') console.log(`[eval] provider ${PROVIDER} — compared only with runs on the same provider`)

type Brief = { id: string; brief: string; designSystem: string; expect?: string[] }

const { values: args } = parseArgs({
  options: {
    only: { type: 'string' },
    limit: { type: 'string' },
    // A one-off comparison set, so it does not change the eval's own baseline of 36 briefs.
    briefs: { type: 'string' },
    // Briefs in flight. One brief already runs three screens at once, and DeepSeek caps a low-balance
    // account at five concurrent requests — a higher value here turned into 429s on the baseline run.
    concurrency: { type: 'string', default: '1' },
    from: { type: 'string' },
    label: { type: 'string' },
    'no-shot': { type: 'boolean', default: false },
    'no-add': { type: 'boolean', default: false },
  },
})

const OUT_ROOT = resolve('eval/out')
const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')
const label = args.from ?? (args.label ? `${stamp}-${args.label.replace(/[^\w-]/g, '')}` : stamp)
const outDir = join(OUT_ROOT, label)
mkdirSync(join(outDir, 'screens'), { recursive: true })

// Must be set before the first import of database/connection.
process.env.DB_PATH = join(outDir, 'eval.db')
const { Project } = await import('@/app/Models/Project')
const { Screen } = await import('@/app/Models/Screen')
const { PlanController } = await import('@/app/Http/Controllers/PlanController')
const { GenerateController } = await import('@/app/Http/Controllers/GenerateController')
const { mapLimit } = await import('@/app/Services/Pool')
const { DesignSystemService } = await import('@/app/Services/DesignSystemService')
const { AppPatternService } = await import('@/app/Services/AppPatternService')
const { onLlmUsage } = await import('@/app/Services/LlmService')

let usage: Usage = { calls: 0, promptTokens: 0, cachedTokens: 0, completionTokens: 0 }
onLlmUsage((u) => {
  usage.calls++
  usage.promptTokens += u.promptTokens
  usage.cachedTokens += u.cachedTokens
  usage.completionTokens += u.completionTokens
})
const screenInputs: ScreenInput[] = []

// --briefs points at another file, so a one-off comparison set does not change the eval's own
// baseline (the 36 briefs every run is measured against).
const briefsFile = args.briefs ?? 'eval/briefs.json'
let briefs: Brief[] = JSON.parse(readFileSync(briefsFile, 'utf8'))
if (args.only) briefs = briefs.filter((b) => args.only!.split(',').includes(b.id))
if (args.limit) briefs = briefs.slice(0, Number(args.limit))
if (briefs.length === 0) throw new Error('No briefs selected')

async function runBrief(b: Brief): Promise<BriefResult> {
  const started = Date.now()
  const projectId = crypto.randomUUID()
  // "auto" briefs go through the same choice the product makes (GQ-03).
  const designSystem = b.designSystem === 'auto' ? DesignSystemService.autoFor(b.brief, AppPatternService.classify(b.brief)?.id, projectId) : b.designSystem
  b.designSystem = designSystem
  Project.create({ id: projectId, name: b.id, designSystem, device: 'mobile' })

  const res = await PlanController.stream(
    new Request('http://eval/api/generate-plan', { method: 'POST', body: JSON.stringify({ projectId, brief: b.brief }) }),
  )
  const result: BriefResult = { id: b.id, brief: b.brief, designSystem: b.designSystem, ms: 0, screens: [], errors: [] }
  if (!res.ok || !res.body) {
    result.errors.push(`HTTP ${res.status}: ${await res.text()}`)
    return result
  }

  // ndjson events; screen_delta carries the whole text so far, so only its arrival time matters here.
  const startedAt = new Map<number, number>()
  const tookMs = new Map<string, number>()
  let buf = ''
  for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop()!
    for (const line of lines.filter(Boolean)) {
      const ev = JSON.parse(line)
      if (ev.type === 'plan') {
        result.appName = ev.appName
        result.plan = {
          archetypes: (ev.screens ?? []).map((x: { archetype?: string }) => x.archetype ?? ''),
          requested: ev.requested ?? [],
          uncovered: ev.uncovered ?? [],
          tabs: ev.navigation?.tabs?.length ?? 0,
          entityItems: (ev.entities ?? []).flatMap((e: { items: { name: string }[] }) => e.items.map((it) => it.name)),
        }
      }
      else if (ev.type === 'screen_start') startedAt.set(ev.index, Date.now())
      else if (ev.type === 'screen_done') tookMs.set(ev.screenId, Date.now() - (startedAt.get(ev.index) ?? started))
      else if (ev.type === 'screen_error') result.errors.push(`${ev.index}: ${ev.message}`)
      else if (ev.type === 'error') result.errors.push(ev.message)
    }
  }

  // The second way screens are made: a vague follow-up in the chat. It used to lose the app entirely.
  const planned = new Set(Screen.forProject(projectId).map((s) => s.id))
  if (planned.size > 0 && !args['no-add']) {
    const t0 = Date.now()
    const add = await GenerateController.stream(
      new Request('http://eval/api/generate', { method: 'POST', body: JSON.stringify({ projectId, prompt: "yana bitta ekran qo'sh" }) }),
    )
    const text = await add.text()
    const failed = text.match(/<!--GEN_ERROR:([\s\S]*?)-->/)?.[1] ?? (add.ok ? '' : text)
    if (failed) result.errors.push(`added: ${failed.trim().slice(0, 200)}`)
    for (const s of Screen.forProject(projectId)) if (!planned.has(s.id)) tookMs.set(s.id, Date.now() - t0)
  }

  // x is assigned by plan order, so it restores the planner's sequence; an added screen lands last.
  // A failed screen keeps a row (so the app can retry it) but has nothing to show or measure.
  const rows = Screen.forProject(projectId).filter((s) => s.html).sort((a, z) => a.x - z.x)
  rows.forEach((s, i) => {
    const file = `screens/${b.id}-${i}.html`
    writeFileSync(join(outDir, file), s.html)
    const ms = tookMs.get(s.id) ?? 0
    const added = !planned.has(s.id)
    result.screens.push({ file, name: s.name, screenType: s.screenType, ms, chars: s.html.length, added })
    screenInputs.push({ briefId: b.id, designSystem: b.designSystem, name: s.name, screenType: s.screenType, ms, html: s.html, added })
  })
  result.ms = Date.now() - started
  console.log(`${b.id}: ${result.screens.length} screens, ${(result.ms / 1000).toFixed(0)}s${result.errors.length ? `, ${result.errors.length} errors` : ''}`)
  return result
}

let results: BriefResult[]
if (args.from) {
  results = JSON.parse(readFileSync(join(outDir, 'results.json'), 'utf8'))
  for (const r of results)
    for (const s of r.screens)
      screenInputs.push({ briefId: r.id, designSystem: r.designSystem, name: s.name, screenType: s.screenType, ms: s.ms, added: s.added, html: readFileSync(join(outDir, s.file), 'utf8') })
  const old = JSON.parse(readFileSync(join(outDir, 'metrics.json'), 'utf8')).usage
  if (old) usage = { calls: old.calls, promptTokens: old.promptTokens, cachedTokens: old.cachedTokens, completionTokens: old.completionTokens }
} else {
  results = await mapLimit(briefs, Number(args.concurrency), runBrief)
  writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2))
}

const loadRun = (d: string): BriefResult[] => JSON.parse(readFileSync(join(OUT_ROOT, d, 'results.json'), 'utf8'))
const inputsOf = (d: string, rs: BriefResult[]): ScreenInput[] =>
  rs.flatMap((r) => r.screens.map((s) => ({ briefId: r.id, designSystem: r.designSystem, name: s.name, screenType: s.screenType, ms: s.ms, added: s.added, html: readFileSync(join(OUT_ROOT, d, s.file), 'utf8') })))

// "Before" is the earlier run that drew the most of these briefs (newest on a tie). Runs are usually
// --only subsets, so both sides are cut down to the briefs they share before anything is compared.
const drew = new Set(results.filter((r) => r.screens.length).map((r) => r.id))
const overlap = (d: string) => (existsSync(join(OUT_ROOT, d, 'results.json')) && providerOf(d) === PROVIDER ? loadRun(d).filter((r) => r.screens.length && drew.has(r.id)).length : 0)
const prevLabel = readdirSync(OUT_ROOT)
  .filter((d) => d < label && overlap(d) > 0)
  .sort((a, z) => overlap(a) - overlap(z) || a.localeCompare(z))
  .pop()

const errorCount = results.reduce((n, r) => n + r.errors.length, 0)
const expectOf = Object.fromEntries((JSON.parse(readFileSync(briefsFile, 'utf8')) as Brief[]).map((b) => [b.id, b.expect ?? []]))
const planInputs = (rs: BriefResult[]) => rs.flatMap((r) => (r.plan ? [{ briefId: r.id, expect: expectOf[r.id] ?? [], ...r.plan }] : []))
const metrics = computeMetrics(screenInputs, results.map((r) => r.ms), errorCount, usage, planInputs(results))

// EYE-05: the render audit belongs in the run's own numbers. Until now it lived in a separate
// script nobody ran, so the eval reported lint.cleanShare 0.65 on a run where only a quarter of the
// screens were clean in a real browser — we were tuning a number that does not see overlap, a 43px
// tap target or text that lost its contrast to an opacity. Headless Chrome, at phone size, on the
// screens this run just drew. Set OD_SKIP_AUDIT=1 to skip it while iterating.
if (!process.env.OD_SKIP_AUDIT) {
  try {
    const { auditHtml } = await import('./audit.ts')
    const byRule: Record<string, number> = {}
    let withFindings = 0
    for (const s of screenInputs) {
      const findings = auditHtml(s.html)
      if (findings.length) withFindings++
      for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1
    }
    const n = screenInputs.length
    ;(metrics as Record<string, unknown>).audit = { cleanShare: n ? Number(((n - withFindings) / n).toFixed(3)) : 0, byRule }
  } catch (e) {
    console.warn('[audit] skipped:', (e as Error).message)
  }
}
writeFileSync(join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2))
writeFileSync(join(outDir, 'run.json'), JSON.stringify({ provider: PROVIDER }))

let delta: string[] = []
if (prevLabel) {
  const before = loadRun(prevLabel).filter((r) => r.screens.length && drew.has(r.id))
  const shared = new Set(before.map((r) => r.id))
  const after = results.filter((r) => shared.has(r.id))
  const measure = (rs: BriefResult[], inputs: ScreenInput[]) => computeMetrics(inputs, rs.map((r) => r.ms), rs.reduce((n, r) => n + r.errors.length, 0), undefined, planInputs(rs))
  delta = diffMetrics(measure(before, inputsOf(prevLabel, before)), measure(after, screenInputs.filter((s) => shared.has(s.briefId))))
  delta.unshift(`(${shared.size} shared briefs)`)
}

writeFileSync(join(outDir, 'index.html'), sheetHtml(label, results, metrics, delta))
if (prevLabel) {
  const prev = loadRun(prevLabel)
  writeFileSync(join(outDir, 'compare.html'), compareHtml(label, results, prevLabel, prev))
  writeFileSync(join(outDir, 'ab.html'), abHtml(label, results, prevLabel, prev))
}

// Screenshots for reading a run without a browser. Five briefs per image: one page with a hundred
// live iframes never finished rendering in headless Chrome. The window is wide, so Chrome's 500px
// minimum width never bites.
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PER_SHOT = 5
if (!args['no-shot'] && existsSync(CHROME)) {
  for (let i = 0; i < results.length; i += PER_SHOT) {
    const part = results.slice(i, i + PER_SHOT)
    const n = i / PER_SHOT + 1
    const pagePath = join(outDir, `sheet-${n}.html`)
    writeFileSync(pagePath, sheetHtml(`${label} · ${n}`, part))
    const cols = Math.max(...part.map((r) => r.screens.length), 1)
    const width = Math.max(600, 48 + cols * (FRAME.width * FRAME.scale + 12))
    const height = 80 + part.length * (FRAME.height * FRAME.scale + 110)
    try {
      execFileSync(
        CHROME,
        ['--headless=new', '--hide-scrollbars', `--window-size=${width},${height}`, '--virtual-time-budget=10000', `--screenshot=${join(outDir, `sheet-${n}.png`)}`, pathToFileURL(pagePath).href],
        { stdio: 'ignore', timeout: 90_000 },
      )
    } catch (e) {
      console.warn(`sheet-${n}.png failed: ${e instanceof Error ? e.message.split('\n')[0] : e}`)
    }
  }
} else if (!args['no-shot']) {
  console.warn(`Chrome not found at ${CHROME}; skipped screenshots (set CHROME_PATH).`)
}

const failed = results.filter((r) => r.errors.length > 0 || r.screens.length === 0).length
console.log(`\n${outDir}/index.html${prevLabel ? `  (compare.html vs ${prevLabel})` : ''}`)
console.log(`${results.length} briefs, ${metrics.screens} screens, ${failed} with errors`)
console.log(JSON.stringify(metrics, null, 2))
if (delta.length) console.log(`\nvs ${prevLabel}:\n  ${delta.join('\n  ')}`)
process.exit(0)
