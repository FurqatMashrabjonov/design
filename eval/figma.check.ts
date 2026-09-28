// FIG-10/11: how much of a screen reaches Figma. Stored screens of an eval run are opened in headless Chrome
// inside a parent page that asks the kit for its layer tree (od:serialize), the way the canvas does; the tree
// is checked against the screen's source and written out as the SVG that "Copy to Figma" puts on the clipboard.
//
//   node --import ./scripts/alias-hook.mjs eval/figma.check.ts [run-label]     (default: eval/out/BEST)
import assert from 'node:assert'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'
import { screenDocument } from '@/app/Services/ScreenDocument'
import { RUNTIME_DIR } from '@/app/Services/ScreenCompiler'
import { parseTree, type ODNode, type ODTree } from '@/lib/figma-serialize'
import { odToSvg } from '@/lib/figma-svg'
import { mapLimit } from '@/app/Services/Pool'
import { ImageCache } from '@/app/Models/ImageCache'

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const label = process.argv[2] ?? readFileSync('eval/out/BEST', 'utf8').trim()
const dir = resolve('eval/out', label)
const results = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8')).results as { id: string; screens: { slug: string; built: boolean; crashed?: boolean }[] }[]
const out = join(dir, 'figma')
mkdirSync(out, { recursive: true })

// The photos the run found (eval/run.ts keeps them in eval/photo-cache.json), so photo slots render as photos.
if (existsSync('eval/photo-cache.json')) for (const r of JSON.parse(readFileSync('eval/photo-cache.json', 'utf8')) as { query: string; url: string; avgColor: string | null }[]) await ImageCache.save(r.query, r.url, r.avgColor)

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
  const page = pages.get(url)
  if (!page) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page)
})
await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
const port = (server.address() as { port: number }).port

// The parent: frames the screen as tall as its content (as the canvas does), asks for the tree, prints it.
const harness = (src: string) => `<!doctype html><body style="margin:0"><iframe id="f" src="${src}" style="width:390px;height:844px;border:0"></iframe><pre id="out"></pre>
<script>
const f = document.getElementById('f')
addEventListener('message', (e) => {
  if (e.source !== f.contentWindow) return
  if (e.data?.type === 'od:height') f.style.height = e.data.height + 'px'
  if (e.data?.type === 'od:serialized') document.getElementById('out').textContent = JSON.stringify(e.data)
})
f.onload = () => setTimeout(() => f.contentWindow.postMessage({ type: 'od:serialize', requestId: 'x' }, '*'), 1500)
</script></body>`

function dumpDom(url: string): Promise<string> {
  return new Promise((ok) => {
    const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--window-size=600,900', '--virtual-time-budget=8000', '--dump-dom', url], { stdio: ['ignore', 'pipe', 'ignore'] })
    let dom = ''
    child.stdout.on('data', (d) => (dom += d))
    const kill = setTimeout(() => child.kill('SIGKILL'), 45_000)
    child.on('close', () => (clearTimeout(kill), ok(dom)))
  })
}

const all = (n: ODNode, f: (n: ODNode) => void) => (f(n), n.children?.forEach((c) => all(c, f)))
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

type Row = { screen: string; texts: number; images: number; photosInSource: number; icons: number; named: number; flex: number; frames: number; svgKb: number; error?: string }
const jobs = results.flatMap((r) => r.screens.filter((s) => s.built && !s.crashed).map((s) => ({ brief: r.id, slug: s.slug })))
const plans = new Map(results.map((r) => [r.id, JSON.parse(readFileSync(join(dir, r.id, 'plan.json'), 'utf8'))]))
const rows: Row[] = await mapLimit(jobs, 4, async ({ brief, slug }) => {
  const source = readFileSync(join(dir, brief, `${slug}.jsx`), 'utf8')
  const plan = plans.get(brief)
  const doc = await screenDocument(source, { accent: plan.accent ?? '#5e5ce6', dark: false, platform: 'ios', tabs: plan.tabs ?? [] }, { slug })
  pages.set(`/s/${brief}/${slug}`, doc.replaceAll('/api/rt', `http://127.0.0.1:${port}/api/rt`))
  pages.set(`/h/${brief}/${slug}`, harness(`/s/${brief}/${slug}`))
  const dom = await dumpDom(`http://127.0.0.1:${port}/h/${brief}/${slug}`)
  const raw = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1] ?? ''
  const screen = `${brief}/${slug}`
  const reply = raw ? JSON.parse(decode(raw)) : null
  const tree: ODTree | null = parseTree(reply?.tree)
  if (!tree) return { screen, texts: 0, images: 0, photosInSource: 0, icons: 0, named: 0, flex: 0, frames: 0, svgKb: 0, error: reply?.error ?? 'no tree' }
  const row = { screen, texts: 0, images: 0, photosInSource: (source.match(/<Photo\b/g) ?? []).length, icons: 0, named: 0, flex: 0, frames: 0, svgKb: 0 }
  all(tree.root, (n) => {
    if (n.type === 'text') row.texts++
    if (n.type === 'image') row.images++
    if (n.type === 'svg' && n.name.startsWith('Icon')) row.icons++
    if (n.type === 'frame') row.frames++
    if (n.layout) row.flex++
    if (/^(Navbar|Tab bar|Row|Photo|Card|Button|Ring|Rings|Chart|Segmented|Section title|List|Block|Chip|Toggle|Heatmap|Meter)/.test(n.name)) row.named++
  })
  const svg = odToSvg(tree)
  writeFileSync(join(out, `${brief}-${slug}.svg`), svg)
  row.svgKb = Math.round(svg.length / 1024)
  return row
})
server.close()

console.table(rows.map((r) => ({ ...r, error: r.error?.slice(0, 40) })))
const ok = rows.filter((r) => !r.error)
const sum = (k: keyof Row) => ok.reduce((a, r) => a + (r[k] as number), 0)
const summary = { screens: rows.length, serialised: ok.length, textsPerScreen: +(sum('texts') / Math.max(1, ok.length)).toFixed(1), namedPerScreen: +(sum('named') / Math.max(1, ok.length)).toFixed(1), flexShare: +(sum('flex') / Math.max(1, sum('frames'))).toFixed(2), photosInTree: sum('images'), photosInSource: sum('photosInSource') }
console.log(JSON.stringify(summary))
writeFileSync(join(out, 'summary.json'), JSON.stringify({ summary, rows }, null, 2))
// Every screen that renders must come back as a tree with its text, and every <Photo> as an image layer.
assert.equal(ok.length, rows.length, `every screen serialises (${rows.filter((r) => r.error).map((r) => `${r.screen}: ${r.error}`).join('; ')})`)
assert.ok(ok.every((r) => r.texts > 0), 'every screen has text layers')
assert.ok(summary.photosInTree >= summary.photosInSource, 'every photo slot reaches the tree')
console.log(`ok — SVGs in ${out}`)
process.exit(0)
