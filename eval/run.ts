// npm run eval -- [--only id,id] [--limit n] [--concurrency n] [--label name] [--no-shot] [--from run]
// --from <run> skips generation and rebuilds metrics and sheets for an existing run (after a metrics change).
// Generates every brief in eval/briefs.json through the real PlanController, in a throwaway database,
// and writes eval/out/<label>/{index.html, compare.html, ab.html, results.json, metrics.json, screens/, sheet-N.png}.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { computeMetrics, diffMetrics, type Metrics, type ScreenInput, type Usage } from './metrics.ts'
import { abHtml, compareHtml, sheetHtml, FRAME, type BriefResult } from './sheet.ts'

type Brief = { id: string; brief: string; designSystem: string }

const { values: args } = parseArgs({
  options: {
    only: { type: 'string' },
    limit: { type: 'string' },
    // Briefs in flight. One brief already runs three screens at once, and DeepSeek caps a low-balance
    // account at five concurrent requests — a higher value here turned into 429s on the baseline run.
    concurrency: { type: 'string', default: '1' },
    from: { type: 'string' },
    label: { type: 'string' },
    'no-shot': { type: 'boolean', default: false },
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
const { mapLimit } = await import('@/app/Services/Pool')
const { onLlmUsage } = await import('@/app/Services/LlmService')

let usage: Usage = { calls: 0, promptTokens: 0, cachedTokens: 0, completionTokens: 0 }
onLlmUsage((u) => {
  usage.calls++
  usage.promptTokens += u.promptTokens
  usage.cachedTokens += u.cachedTokens
  usage.completionTokens += u.completionTokens
})
const screenInputs: ScreenInput[] = []

let briefs: Brief[] = JSON.parse(readFileSync('eval/briefs.json', 'utf8'))
if (args.only) briefs = briefs.filter((b) => args.only!.split(',').includes(b.id))
if (args.limit) briefs = briefs.slice(0, Number(args.limit))
if (briefs.length === 0) throw new Error('No briefs selected')

async function runBrief(b: Brief): Promise<BriefResult> {
  const started = Date.now()
  const projectId = crypto.randomUUID()
  Project.create({ id: projectId, name: b.id, designSystem: b.designSystem, device: 'mobile' })

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
      if (ev.type === 'plan') result.appName = ev.appName
      else if (ev.type === 'screen_start') startedAt.set(ev.index, Date.now())
      else if (ev.type === 'screen_done') tookMs.set(ev.screenId, Date.now() - (startedAt.get(ev.index) ?? started))
      else if (ev.type === 'screen_error') result.errors.push(`${ev.index}: ${ev.message}`)
      else if (ev.type === 'error') result.errors.push(ev.message)
    }
  }

  // x is assigned by plan order, so it restores the planner's sequence.
  const rows = Screen.forProject(projectId).sort((a, z) => a.x - z.x)
  rows.forEach((s, i) => {
    const file = `screens/${b.id}-${i}.html`
    writeFileSync(join(outDir, file), s.html)
    const ms = tookMs.get(s.id) ?? 0
    result.screens.push({ file, name: s.name, screenType: s.screenType, ms, chars: s.html.length })
    screenInputs.push({ briefId: b.id, designSystem: b.designSystem, name: s.name, screenType: s.screenType, ms, html: s.html })
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
      screenInputs.push({ briefId: r.id, designSystem: r.designSystem, name: s.name, screenType: s.screenType, ms: s.ms, html: readFileSync(join(outDir, s.file), 'utf8') })
  const old = JSON.parse(readFileSync(join(outDir, 'metrics.json'), 'utf8')).usage
  if (old) usage = { calls: old.calls, promptTokens: old.promptTokens, cachedTokens: old.cachedTokens, completionTokens: old.completionTokens }
} else {
  results = await mapLimit(briefs, Number(args.concurrency), runBrief)
  writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2))
}

// Newest earlier run that produced screens becomes the "before" row; a run that died on the API is skipped.
const producedScreens = (d: string) => {
  const p = join(OUT_ROOT, d, 'metrics.json')
  return existsSync(p) && JSON.parse(readFileSync(p, 'utf8')).screens > 0
}
const prevLabel = readdirSync(OUT_ROOT)
  .filter((d) => d < label && producedScreens(d))
  .sort()
  .pop()

const errorCount = results.reduce((n, r) => n + r.errors.length, 0)
const metrics = computeMetrics(screenInputs, results.map((r) => r.ms), errorCount, usage)
writeFileSync(join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2))
const prevMetricsPath = prevLabel && join(OUT_ROOT, prevLabel, 'metrics.json')
const prevMetrics: Metrics | undefined = prevMetricsPath && existsSync(prevMetricsPath) ? JSON.parse(readFileSync(prevMetricsPath, 'utf8')) : undefined
const delta = prevMetrics ? diffMetrics(prevMetrics, metrics) : []

writeFileSync(join(outDir, 'index.html'), sheetHtml(label, results, metrics, delta))
if (prevLabel) {
  const prev: BriefResult[] = JSON.parse(readFileSync(join(OUT_ROOT, prevLabel, 'results.json'), 'utf8'))
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
