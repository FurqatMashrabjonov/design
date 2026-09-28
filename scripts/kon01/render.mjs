// KON-01 harness — write out/<name>.html (import map → runtime), serve it, frame it in <iframe sandbox="allow-scripts">
// and screenshot with headless Chrome. A screen is RENDERED when the frame reported no error and #root has painted elements.
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { RUNTIME } from './compile.mjs'

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const W = 390, H = 844
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }
const run = promisify(execFile)

/** Static server: `/rt/*` → the runtime build, `/*` → the out dir. CORS * because the sandboxed frame has an opaque origin. */
export function serve(outDir) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const path = decodeURIComponent(url.pathname)
    // /slow?ms=N answers after N ms: an <img src="/slow"> in the host holds its load event, so --dump-dom waits in real time.
    if (path === '/slow') return setTimeout(() => res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }).end(), Math.min(10000, Number(url.searchParams.get('ms')) || 0))
    // `lucide-react/icons/bell` (lucide's real subpath, kept in the compiled JS) maps to /rt/icons/bell — served as bell.js.
    const file = path.startsWith('/rt/') ? join(RUNTIME, path.slice(4)) + (extname(path) ? '' : '.js') : join(outDir, path)
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
      res.end(body)
    } catch {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }).end()
    }
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ port: server.address().port, close: () => server.close() })))
}

const IMPORT_MAP = { imports: { react: '/rt/react.js', 'react/jsx-runtime': '/rt/jsx-runtime.js', 'react-dom/client': '/rt/react-dom-client.js', 'konsta/react': '/rt/konsta.js', '@od/kit': '/rt/kit.js', 'lucide-react/icons/': '/rt/icons/' } }

/** The screen document. The glue collects errors (window error/unhandledrejection/console.error) and reports to the host after 1.5 s. */
export function screenHtml(name, css, { dark = false, accent = '#e0532f' } = {}) {
  return `<!doctype html><html lang="en" class="vs-static${dark ? ' dark' : ''}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script type="importmap">${JSON.stringify(IMPORT_MAP)}</script>
<link rel="stylesheet" href="/rt/runtime.css"><style>${css}</style>
<script>var __odErrors=[];addEventListener('error',function(e){__odErrors.push(e.message||('failed to load '+(e.target&&(e.target.src||e.target.href))))},true);addEventListener('unhandledrejection',function(e){__odErrors.push(String(e.reason&&e.reason.message||e.reason))});var __ce=console.error;console.error=function(){__odErrors.push([].slice.call(arguments).map(String).join(' ').slice(0,300));__ce.apply(console,arguments)};
setTimeout(function(){parent.postMessage({od:1,name:${JSON.stringify(name)},errors:__odErrors,painted:document.getElementById('root').querySelectorAll('*').length},'*')},1500)</script>
</head><body><div id="root"></div>
<script type="module">import Screen from './${name}.js'; import { mount } from '@od/kit'; mount(Screen, ${JSON.stringify({ dark, accent })})</script>
</body></html>`
}

/** The host: a sandboxed frame (no allow-same-origin) and the frame's report copied into #od-status for --dump-dom.
 *  Real time, not --virtual-time-budget: virtual time never advances timers inside a sandboxed (opaque-origin, out-of-process)
 *  frame — measured 2026-09-28, even a bare setTimeout there never fired — so the /slow image holds the host's load event
 *  for 2.5 s and the frame reports at 1.5 s. Import maps and module scripts work unchanged inside the sandbox. */
const hostHtml = (port, name) => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#fff}iframe{display:block;border:0;width:${W}px;height:${H}px}img{position:absolute;left:-9px}</style>
<iframe sandbox="allow-scripts" src="http://127.0.0.1:${port}/${name}.html?screen=1"></iframe><pre id="od-status"></pre><img src="/slow?ms=2500" width="1" height="1">
<script>addEventListener('message',function(e){if(e.data&&e.data.od)document.getElementById('od-status').textContent=JSON.stringify(e.data)})</script>`

/** Renders one compiled screen → { rendered, painted, errors, png }. */
export async function renderScreen(outDir, port, name, js, css, opts) {
  await writeFile(join(outDir, `${name}.js`), js)
  await writeFile(join(outDir, `${name}.html`), screenHtml(name, css, opts))
  await writeFile(join(outDir, `${name}.host.html`), hostHtml(port, name))
  const png = join(outDir, `${name}.png`)
  const dom = await chrome([`--window-size=${W},${H}`, `--screenshot=${png}`, '--dump-dom', `http://127.0.0.1:${port}/${name}.host.html`])
  const m = dom.match(/<pre id="od-status">([\s\S]*?)<\/pre>/)
  const status = m && m[1].trim() ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : { errors: ['the frame never reported'], painted: 0 }
  return { rendered: status.errors.length === 0 && status.painted > 0, painted: status.painted, errors: status.errors, png }
}

/** Headless Chrome; returns stdout (the DOM when --dump-dom is passed), taken at the page's load event. No --user-data-dir:
 *  with one, Chrome 152 on macOS dumps the DOM and then never exits (measured 2026-09-28, any path); without it each process
 *  gets an ephemeral profile and six run side by side. */
export async function chrome(args) {
  const { stdout } = await run(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-gpu', ...args], { maxBuffer: 64 << 20, timeout: 60000 })
  return stdout
}
