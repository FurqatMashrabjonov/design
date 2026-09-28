// KON eval: every brief in eval/briefs.json through the real PlanController (throwaway database), then
// each screen rendered in headless Chrome and measured. Writes eval/out/<label>/: <brief>/<slug>.png,
// metrics.json and index.html (a contact sheet with the numbers).
//   DB_FRESH=1 LLM_PROVIDER=claude-cli node --env-file=.env --import ./scripts/alias-hook.mjs eval/run.ts --label base
//   flags: --only id,id  --concurrency 2  --dark  --vs <label> (print metric deltas against an earlier run)
//          --reshoot (no generation: render the stored screens of --label again, e.g. after a kit fix)
import { AsyncLocalStorage } from 'node:async_hooks'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { PlanController } from '@/app/Http/Controllers/PlanController'
import { screenDocument } from '@/app/Services/ScreenDocument'
import { compileScreen, RUNTIME_DIR } from '@/app/Services/ScreenCompiler'
import { appLook } from '@/app/Services/JsxGenerator'
import { onLlmUsage } from '@/app/Services/LlmService'
import { mapLimit } from '@/app/Services/Pool'
import { ImageCache } from '@/app/Models/ImageCache'
import { sourceMetrics } from './metrics'

const { values: opt } = parseArgs({ options: { label: { type: 'string', default: new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') }, only: { type: 'string' }, concurrency: { type: 'string', default: '2' }, dark: { type: 'boolean', default: false }, vs: { type: 'string' }, reshoot: { type: 'boolean', default: false } } })
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = resolve('eval/out', opt.label!)
const briefs = (JSON.parse(readFileSync('eval/briefs.json', 'utf8')) as { id: string; brief: string }[]).filter((b) => !opt.only || opt.only.split(',').includes(b.id))

// Tokens per brief: the listener runs inside the brief's async context.
const ctx = new AsyncLocalStorage<string>()
const tokens: Record<string, { in: number; out: number; calls: number }> = {}
onLlmUsage((u) => {
  const id = ctx.getStore()
  if (!id) return
  const t = (tokens[id] ??= { in: 0, out: 0, calls: 0 })
  t.in += u.promptTokens
  t.out += u.completionTokens
  t.calls++
})

type ScreenResult = { slug: string; name: string; kind: string; built: boolean; crashed?: boolean; error?: string } & Partial<ReturnType<typeof sourceMetrics>>
type BriefResult = { id: string; brief: string; appName: string; seconds: number; planned: number; drawn: number; tokens: { in: number; out: number; calls: number }; screens: ScreenResult[] }

// The pages point at /api/rt/v<build>/…; a tiny server answers that from runtime/dist and serves the pages.
const pages = new Map<string, string>()
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]!)
  if (url.startsWith('/api/rt/')) {
    const rel = normalize(url.slice('/api/rt/'.length)).replace(/^(\.\.[/\\])+/, '').replace(/^v\d+\//, '')
    const file = join(RUNTIME_DIR, /\.\w+$/.test(rel) ? rel : `${rel}.js`)
    if (!existsSync(file)) return res.writeHead(404).end()
    res.writeHead(200, { 'content-type': file.endsWith('.css') ? 'text/css' : 'text/javascript', 'access-control-allow-origin': '*' })
    return res.end(readFileSync(file))
  }
  // Headless Chrome will not open a window narrower than ~500px, so the screen sits in a 390px frame.
  if (url === '/frame') return res.writeHead(200, { 'content-type': 'text/html' }).end(`<body style="margin:0;background:#000"><iframe src="${(req.url ?? '').split('src=')[1] ?? ''}" style="width:390px;height:844px;border:0;display:block"></iframe></body>`)
  const page = pages.get(url)
  if (!page) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page)
})
await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
const port = (server.address() as { port: number }).port

function shoot(url: string, png: string): Promise<boolean> {
  return new Promise((ok) => {
    const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=600,844', '--force-device-scale-factor=2', '--virtual-time-budget=5000', `--screenshot=${png}`, url], { stdio: 'ignore' })
    const kill = setTimeout(() => child.kill('SIGKILL'), 40_000)
    child.on('close', () => {
      clearTimeout(kill)
      if (!existsSync(png)) return ok(false)
      // Keep the frame only (390×844 at 2x, from the top-left corner).
      spawn('python3', ['-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]);im.crop((0,0,780,1688)).save(sys.argv[1])', png], { stdio: 'ignore' }).on('close', () => ok(true))
    })
  })
}

/** Whether the rendered screen shows the crash notice (kit Crash boundary or a module that failed to load). */
function crashed(url: string): Promise<boolean> {
  return new Promise((ok) => {
    const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=4000', '--dump-dom', url], { stdio: ['ignore', 'pipe', 'ignore'] })
    let dom = ''
    child.stdout.on('data', (d) => (dom += d))
    const kill = setTimeout(() => child.kill('SIGKILL'), 40_000)
    child.on('close', () => (clearTimeout(kill), ok(dom.includes('data-od-crash'))))
  })
}

/** The pages of a brief's stored screens; the look comes from its plan (accent, tabs). */
async function addPages(id: string, slug: string, source: string, plan: { accent?: string; tabs?: unknown }) {
  for (const dark of opt.dark ? [false, true] : [false]) {
    const look = appLook({ theme: JSON.stringify({ accent: plan.accent }), navigation: JSON.stringify({ tabs: plan.tabs ?? [] }) }, { dark })
    pages.set(`/${id}/${slug}${dark ? '-dark' : ''}.html`, await screenDocument(source, look, { slug }))
  }
}

async function runBrief(b: { id: string; brief: string }): Promise<BriefResult> {
  const projectId = `eval-${b.id}`
  await Project.create({ id: projectId, name: 'Untitled', designSystem: 'konsta', device: 'mobile' })
  const t0 = Date.now()
  await ctx.run(b.id, async () => {
    const res = await PlanController.stream(new Request('http://eval/api', { method: 'POST', body: JSON.stringify({ projectId, brief: b.brief }) }))
    await res.text()
  })
  const seconds = +((Date.now() - t0) / 1000).toFixed(1)
  const project = (await Project.find(projectId))!
  const plan = project.plan ? JSON.parse(project.plan) : { screens: [] }
  const rows = (await Screen.forProject(projectId)).sort((a, z) => a.x - z.x)
  const dir = join(OUT, b.id)
  mkdirSync(dir, { recursive: true })
  const screens: ScreenResult[] = []
  for (const s of rows) {
    const slug = s.slug ?? s.id
    const kind = plan.screens.find((p: { id: string }) => p.id === slug)?.kind ?? ''
    if (!s.html) {
      screens.push({ slug, name: s.name, kind, built: false, error: s.error ?? 'empty' })
      continue
    }
    writeFileSync(join(dir, `${slug}.jsx`), s.html)
    const built = (await compileScreen(s.html)).ok
    screens.push({ slug, name: s.name, kind, built, ...sourceMetrics(s.html) })
    await addPages(b.id, slug, s.html, plan)
  }
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan, null, 2))
  return { id: b.id, brief: b.brief, appName: project.name, seconds, planned: plan.screens.length, drawn: rows.filter((r) => r.html).length, tokens: tokens[b.id] ?? { in: 0, out: 0, calls: 0 }, screens }
}

function summary(results: BriefResult[]) {
  const all = results.flatMap((r) => r.screens)
  const ok = all.filter((s) => s.built)
  const mean = (k: keyof ReturnType<typeof sourceMetrics>) => +(ok.reduce((a, s) => a + ((s[k] as number) ?? 0), 0) / Math.max(1, ok.length)).toFixed(2)
  return {
    briefs: results.length,
    screens: all.length,
    buildRate: +(ok.length / Math.max(1, all.length)).toFixed(3),
    secondsPerApp: +(results.reduce((a, r) => a + r.seconds, 0) / Math.max(1, results.length)).toFixed(1),
    outTokensPerScreen: Math.round(results.reduce((a, r) => a + r.tokens.out, 0) / Math.max(1, all.length)),
    konsta: mean('konsta'), photos: mean('photos'), kitFigures: mean('kitFigures'), emoji: mean('emoji'), colors: mean('colors'), gradients: mean('gradients'), nav: mean('nav'), motion: mean('motion'), hardWhite: mean('hardWhite'), chars: mean('chars'),
    crashRate: +(ok.filter((s) => s.crashed).length / Math.max(1, ok.length)).toFixed(3),
    // HIG-10: lint findings left after its fixes — per screen, and which rules.
    hig: mean('hig'),
    adHocText: mean('adHocText'),
    namedText: mean('namedText'),
    higByRule: ok.flatMap((s) => s.higRules ?? []).reduce<Record<string, number>>((m, r) => ((m[r] = (m[r] ?? 0) + 1), m), {}),
    firstRun: results.filter((r) => r.screens.some((s) => s.kind === 'first-run')).length,
  }
}

mkdirSync(OUT, { recursive: true })
// Photos found in earlier runs are kept in a file: every run has a throwaway database, and Pexels allows 200 lookups an hour.
const PHOTO_CACHE = resolve('eval/photo-cache.json')
if (existsSync(PHOTO_CACHE)) for (const r of JSON.parse(readFileSync(PHOTO_CACHE, 'utf8')) as { query: string; url: string; avgColor: string | null }[]) await ImageCache.save(r.query, r.url, r.avgColor)
const results: BriefResult[] = opt.reshoot
  ? await (async () => {
      // Every brief stays in the run; --only limits which are rendered again.
      const prev = JSON.parse(readFileSync(join(OUT, 'metrics.json'), 'utf8')).results as BriefResult[]
      for (const r of prev.filter((x) => !opt.only || opt.only.split(',').includes(x.id))) {
        const plan = JSON.parse(readFileSync(join(OUT, r.id, 'plan.json'), 'utf8'))
        for (const s of r.screens) if (s.built) await addPages(r.id, s.slug, readFileSync(join(OUT, r.id, `${s.slug}.jsx`), 'utf8'), plan)
      }
      return prev
    })()
  : await mapLimit(briefs, Number(opt.concurrency), async (b) => {
      const r = await runBrief(b)
      console.log(`${b.id}: ${r.appName} — ${r.drawn}/${r.planned} screens, ${r.seconds}s, ${r.tokens.out} out tokens`)
      return r
    })
// Screenshots after every brief is drawn, four Chromes at a time.
const shots = results.filter((r) => !opt.only || opt.only.split(',').includes(r.id)).flatMap((r) => r.screens.filter((s) => s.built).flatMap((s) => (opt.dark ? ['', '-dark'] : ['']).map((d) => ({ id: r.id, file: `${s.slug}${d}` }))))
await mapLimit(shots, 4, (s) => shoot(`http://127.0.0.1:${port}/frame?src=/${s.id}/${s.file}.html?static`, join(OUT, s.id, `${s.file}.png`)))
await mapLimit(results.filter((r) => !opt.only || opt.only.split(',').includes(r.id)).flatMap((r) => r.screens.filter((s) => s.built).map((s) => ({ r, s }))), 4, async ({ r, s }) => (s.crashed = await crashed(`http://127.0.0.1:${port}/${r.id}/${s.slug}.html?static`)))
server.close()

writeFileSync(PHOTO_CACHE, JSON.stringify(await ImageCache.all()))
const sum = summary(results)
writeFileSync(join(OUT, 'metrics.json'), JSON.stringify({ label: opt.label, provider: process.env.LLM_PROVIDER ?? 'deepseek', at: new Date().toISOString(), summary: sum, results }, null, 2))
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset=utf-8><title>eval ${esc(opt.label!)}</title>
<body style="margin:0;padding:24px;background:#18181b;color:#e4e4e7;font:13px -apple-system,system-ui">
<h1 style="font-size:20px">${esc(opt.label!)}</h1><pre style="color:#a1a1aa">${esc(JSON.stringify(sum))}</pre>
${results.map((r) => `<h2 style="font-size:15px;margin:28px 0 4px">${esc(r.appName)} <span style="color:#71717a;font-weight:400">— ${esc(r.brief)} · ${r.seconds}s</span></h2>
<div style="display:flex;gap:12px;overflow-x:auto;padding:8px 0">${r.screens.map((s) => `<figure style="margin:0;flex:none;width:260px"><div style="width:260px;height:563px;border-radius:24px;overflow:hidden;background:#27272a">${s.built ? `<img src="${r.id}/${s.slug}.png" width=260>` : `<p style="padding:16px;color:#f87171">${esc(s.error ?? 'did not build')}</p>`}</div><figcaption style="margin-top:6px">${esc(s.name)} <span style="color:#71717a">${s.crashed ? '<b style="color:#f87171">CRASH</b> · ' : ''}${s.kind} · ${s.konsta ?? 0} konsta · ${s.kitFigures ?? 0} fig · ${s.emoji ?? 0} emoji · ${s.colors ?? 0} col</span></figcaption></figure>`).join('')}</div>`).join('')}`)
console.log(JSON.stringify(sum))
if (opt.vs) {
  const prev = JSON.parse(readFileSync(resolve('eval/out', opt.vs, 'metrics.json'), 'utf8')).summary as Record<string, number>
  for (const [k, v] of Object.entries(sum)) console.log(`${k.padEnd(20)} ${String(prev[k]).padStart(8)} → ${v}`)
}
console.log(`open ${join(OUT, 'index.html')}`)
process.exit(0)
