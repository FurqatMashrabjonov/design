import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, normalize } from 'node:path'
import { RUNTIME_DIR } from '@/app/Services/ScreenCompiler'
import { screenDocument, type AppLook } from '@/app/Services/ScreenDocument'
import { FRAME_SIZE } from '@/canvas'
import { parseAudit, type AuditFinding } from '@/lib/render-audit'

// KON-13: a drawn screen is opened in headless Chrome before anyone sees it, and the kit measures it
// (lib/render-audit.ts). Pages are served from a private server on 127.0.0.1, by a random token, with the
// runtime next to them. The model's code runs there, in Chrome's process sandbox, under a CSP that allows no
// network at all except Pexels photos — the compiler's banned identifiers (fetch, storage…) are the first wall,
// this is the second, and the page holds nothing but its own code. The frame is not a sandboxed iframe: under
// --dump-dom an opaque-origin frame never ran its modules (measured 2026-09-28). Without Chrome (CHROME_PATH)
// nothing is rendered (the repair then works from the lint alone); RENDER_AUDIT=0 turns the repair off (the eval
// still measures).
//
// ponytail: one Chrome process per screen (~1-2 s, in parallel with the other screens); a long-lived browser
// over CDP if generation volume makes the spawns show up.

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const { width: W, height: H } = FRAME_SIZE.mobile

/**
 * Every headless Chrome this server starts (render checks and pictures) waits for one of CHROME_MAX slots: each is
 * ~200-400 MB for a second or three, and without a cap ten users planning at once (four screens each) would start
 * forty. Past the cap a check waits its turn — generation slows, the server does not fall over.
 * ponytail: one long-lived browser with a tab per job (CDP) when the queue shows up in generation times.
 */
const CHROME_MAX = Math.max(1, Number(process.env.CHROME_MAX) || 3)
let chromes = 0
const queue: (() => void)[] = []
async function withChrome<T>(fn: () => Promise<T>): Promise<T> {
  if (chromes >= CHROME_MAX) await new Promise<void>((go) => queue.push(go))
  chromes++
  try {
    return await fn()
  } finally {
    chromes--
    queue.shift()?.()
  }
}

/** Whether generation checks and repairs what it draws (without Chrome the check is the lint alone). */
export const repairOn = () => process.env.RENDER_AUDIT !== '0'

type Local = { origin: string; pages: Map<string, string> }
let local: Promise<Local> | null = null

function start(): Promise<Local> {
  local ??= new Promise((ok) => {
    const pages = new Map<string, string>()
    const server = createServer((req, res) => {
      const url = decodeURIComponent((req.url ?? '/').split('?')[0]!)
      if (url.startsWith('/api/rt/')) {
        const rel = normalize(url.slice('/api/rt/'.length)).replace(/^(\.\.[/\\])+/, '').replace(/^v\d+\//, '')
        const file = join(RUNTIME_DIR, /\.\w+$/.test(rel) ? rel : `${rel}.js`)
        if (!file.startsWith(RUNTIME_DIR) || !existsSync(file)) return res.writeHead(404).end()
        res.writeHead(200, { 'content-type': file.endsWith('.css') ? 'text/css' : 'text/javascript', 'access-control-allow-origin': '*' })
        return res.end(readFileSync(file))
      }
      const page = pages.get(url)
      if (!page) return res.writeHead(404).end()
      // The screen is in a sandboxed (opaque-origin) frame, so its own server is named rather than 'self'.
      const me = `http://${req.headers.host}`
      const csp = url.startsWith('/s/')
        ? `default-src 'none'; script-src ${me} 'unsafe-inline' 'unsafe-eval' blob:; style-src ${me} 'unsafe-inline'; font-src ${me} data:; img-src https://images.pexels.com data: blob:; connect-src 'none'; frame-src 'none'`
        : `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src ${me}`
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': csp }).end(page)
    })
    server.listen(0, '127.0.0.1', () => {
      server.unref()
      ok({ origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`, pages })
    })
  })
  return local
}

// The parent frames the screen a phone wide and as tall as its content (as the canvas does), then asks.
// HIG-16: the same page is measured as iOS, then switched to Material in place (od:look, as the canvas switches
// it) and measured again — one Chrome, two platforms; a Material-only problem is a real one (a searchbar that fits
// iOS and runs past the edge on Android).
const harness = (src: string, accent: string, dark: boolean) => `<!doctype html><body style="margin:0"><iframe id="f" src="${src}" style="width:${W}px;height:${H}px;border:0"></iframe><pre id="out"></pre>
<script>
const f = document.getElementById('f')
const got = {}
let platform = 'ios'
const ask = () => f.contentWindow.postMessage({ type: 'od:audit' }, '*')
addEventListener('message', (e) => {
  if (e.source !== f.contentWindow) return
  if (e.data?.type === 'od:height') f.style.height = Math.max(${H}, e.data.height) + 'px'
  if (e.data?.type !== 'od:audited') return
  got[platform] = e.data
  if (platform === 'ios') {
    platform = 'material'
    f.contentWindow.postMessage({ type: 'od:look', accent: ${JSON.stringify(accent)}, dark: ${dark}, platform: 'material' }, '*')
    setTimeout(ask, 1500)
  } else document.getElementById('out').textContent = JSON.stringify(got)
})
f.onload = () => setTimeout(ask, 1800)
</script></body>`

function dumpDom(url: string, signal?: AbortSignal): Promise<string> {
  return withChrome(() => new Promise((ok) => {
    const child = spawn(CHROME, ['--headless=new', '--disable-gpu', `--window-size=${W + 40},${H}`, '--virtual-time-budget=6000', '--dump-dom', url], { stdio: ['ignore', 'pipe', 'ignore'] })
    let dom = ''
    child.stdout.on('data', (d) => (dom += d))
    const kill = () => child.kill('SIGKILL')
    const timer = setTimeout(kill, 30_000)
    signal?.addEventListener('abort', kill, { once: true })
    child.on('close', () => (clearTimeout(timer), signal?.removeEventListener('abort', kill), ok(dom)))
  }))
}

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

/** What is wrong with a screen once it is drawn, or null when it could not be measured. */
export async function auditScreen(source: string, look: AppLook, slug: string, signal?: AbortSignal): Promise<AuditFinding[] | null> {
  if (!existsSync(CHROME)) return null
  const { origin, pages } = await start()
  const token = crypto.randomUUID()
  // In the app's own mode (a midnight app is measured dark), as iOS first.
  const doc = await screenDocument(source, { ...look, platform: 'ios' }, { slug })
  pages.set(`/s/${token}`, doc.replaceAll('/api/rt', `${origin}/api/rt`))
  // ?static: every entrance animation at its end, so the audit measures the settled screen.
  pages.set(`/h/${token}`, harness(`/s/${token}?static`, /^#[0-9a-f]{6}$/i.test(look.accent) ? look.accent : '#5e5ce6', look.dark === true))
  try {
    const dom = await dumpDom(`${origin}/h/${token}`, signal)
    const raw = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1]
    if (!raw) return null
    const reply = JSON.parse(decode(raw)) as Record<'ios' | 'material', { findings?: unknown; error?: unknown } | undefined>
    if (!reply.ios || reply.ios.error) return null
    const ios = parseAudit(reply.ios.findings)
    const seen = new Set(ios.map((f) => `${f.rule}|${f.where}`))
    // What only Android shows is said so: the model fixes it without breaking the iOS look.
    const android = reply.material && !reply.material.error ? parseAudit(reply.material.findings).filter((f) => !seen.has(`${f.rule}|${f.where}`)).map((f) => ({ ...f, where: `${f.where} on Android` })) : []
    return [...ios, ...android].slice(0, 12)
  } catch {
    return null
  } finally {
    pages.delete(`/s/${token}`)
    pages.delete(`/h/${token}`)
  }
}

/**
 * KON-10: the screen as a picture — the first phone-height of it, settled (?static), in the app's look — for the
 * places that only show it (dashboard cards, the chat's before/after), so they load an image instead of the whole
 * app. The same private server and Chrome as the audit; null without Chrome.
 */
/** What headless Chrome takes off the window's height for its own bars. */
const CHROME_BARS = 87
/** A card shows a phone ~112px wide (224 device pixels on a retina screen): 0.6 of a phone keeps it sharp there at a
 *  third of the bytes. */
const SHOT_SCALE = Number(process.env.SHOT_SCALE) || 0.6 // brand pictures take a sharper one

export async function screenshotScreen(source: string, look: AppLook, slug: string): Promise<Buffer | null> {
  if (!existsSync(CHROME)) return null
  const { origin, pages } = await start()
  const token = crypto.randomUUID()
  const out = join(tmpdir(), `od-shot-${token}.png`)
  pages.set(`/s/${token}`, (await screenDocument(source, look, { slug })).replaceAll('/api/rt', `${origin}/api/rt`))
  // Headless Chrome lays a page out at least 500px wide and 87px shorter than its window (measured 2026-09-30), so the
  // screen is framed at exactly a phone's size and the window is made taller by that much; the picture is then the
  // phone plus a strip below it, which the <img> crops (object-fit: cover, top).
  pages.set(`/h/${token}`, `<!doctype html><body style="margin:0;overflow:hidden"><iframe src="/s/${token}?static" style="width:${W}px;height:${H}px;border:0;display:block"></iframe></body>`)
  try {
    await withChrome(() => new Promise<void>((ok) => {
      const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${SHOT_SCALE}`, `--window-size=${W},${H + CHROME_BARS}`, '--virtual-time-budget=5000', `--screenshot=${out}`, `${origin}/h/${token}`], { stdio: 'ignore' })
      const timer = setTimeout(() => child.kill('SIGKILL'), 30_000)
      child.on('close', () => (clearTimeout(timer), ok()))
    }))
    return existsSync(out) ? readFileSync(out) : null
  } catch {
    return null
  } finally {
    pages.delete(`/s/${token}`)
    pages.delete(`/h/${token}`)
    rmSync(out, { force: true })
  }
}
