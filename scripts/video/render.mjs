// VID-01: an HTML film rendered to MP4, frame by frame. The film is a page; every clock in it is ours — CSS animations
// are seeked, requestAnimationFrame, timers, performance.now and Date follow a virtual time — so each frame is exact
// and nothing stutters, however slow the machine. Live app screens play inside it: they are proxied from a Screenspell
// origin (local dev or production, through a share token) onto the film's own origin, so the same clock reaches them.
//
//   node scripts/video/render.mjs <film.html> --out out.mp4 [--origin http://localhost:3000] [--size 1920x1080]
//        [--fps 30] [--seconds 6] [--warm 3]
//
// Needs the local Google Chrome and ffmpeg. No npm packages: Chrome is driven over its DevTools protocol with Node's
// own WebSocket.
import fs from 'node:fs'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d }
const FILM = resolve(process.argv[2] ?? '')
if (!fs.existsSync(FILM)) throw new Error('usage: render.mjs <film.html> --out out.mp4')
const OUT = resolve(arg('out', 'film.mp4'))
const ORIGIN = arg('origin', 'http://localhost:3000').replace(/\/$/, '')
const [W, H] = arg('size', '1920x1080').split('x').map(Number)
const FPS = Number(arg('fps', 30)), SECONDS = Number(arg('seconds', 6)), WARM = Number(arg('warm', 3))
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// The clock every document of the film runs on. Injected first into the film and into every proxied page, so the
// app's own code (React, the kit's CountUp, Konsta) reads our time from its first line.
const CLOCK = `<script>(() => {
  let now = 0; const t0 = Date.now(); const realTimeout = setTimeout.bind(window)
  let rafs = [], timers = [], seq = 0
  performance.now = () => now
  const RealDate = Date
  window.Date = class extends RealDate { constructor(...a) { a.length ? super(...a) : super(t0 + now) } static now() { return t0 + now } }
  window.requestAnimationFrame = (cb) => (rafs.push({ id: ++seq, cb }), seq)
  window.cancelAnimationFrame = (id) => { rafs = rafs.filter((r) => r.id !== id) }
  window.setTimeout = (cb, ms = 0, ...a) => (timers.push({ id: ++seq, at: now + Math.max(0, ms), cb: () => cb(...a) }), seq)
  window.clearTimeout = (id) => { timers = timers.filter((t) => t.id !== id) }
  window.setInterval = (cb, ms = 0, ...a) => { const id = ++seq; const tick = () => { cb(...a); timers.push({ id, at: now + Math.max(1, ms), cb: tick }) }; timers.push({ id, at: now + Math.max(1, ms), cb: tick }); return id }
  window.clearInterval = window.clearTimeout
  // An animation is held from the first frame it is seen at (it starts at 0 there), then moved by each frame's step,
  // so what played in real time while the page loaded, or between two frames, never shows.
  const seen = new WeakSet()
  const seekAnimations = (dt) => { for (const a of document.getAnimations()) { if (!seen.has(a)) { seen.add(a); a.pause(); a.currentTime = 0; continue } a.currentTime = (a.currentTime ?? 0) + dt } }
  // Move this document (and its same-origin frames) to time t.
  window.__advance = async (t) => {
    const dt = t - now
    while (true) { const due = timers.filter((x) => x.at <= t).sort((a, b) => a.at - b.at)[0]; if (!due) break; timers = timers.filter((x) => x !== due); now = due.at; try { due.cb() } catch (e) { console.error(e) } }
    now = t
    const run = rafs; rafs = []; for (const r of run) { try { r.cb(now) } catch (e) { console.error(e) } }
    seekAnimations(dt)
    // A frame with data-start (ms) stays at its own time 0 until then, so a screen's entrance plays when it enters the shot.
    for (const f of document.querySelectorAll('iframe')) { try { await f.contentWindow.__advance?.(Math.max(0, t - Number(f.dataset.start ?? 0))) } catch {} }
    await new Promise((r) => realTimeout(r, 0)) // let React's scheduler commit
  }
})()</script>`

const inject = (html) => html.replace(/<head[^>]*>/i, (m) => m + CLOCK)
const server = http.createServer(async (req, res) => {
  const url = req.url ?? '/'
  if (url === '/' || url.startsWith('/film')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return res.end(inject(fs.readFileSync(FILM, 'utf8')))
  }
  if (url.startsWith('/local/')) { // the film's own assets (fonts, the lockup), from the repo
    const f = resolve(url.slice('/local/'.length).split('?')[0])
    if (!fs.existsSync(f)) return res.writeHead(404).end()
    const types = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2', mp3: 'audio/mpeg', css: 'text/css', js: 'text/javascript' }
    res.writeHead(200, { 'content-type': types[f.split('.').pop()] ?? 'application/octet-stream' }) // an <img> shows an SVG only with its type
    return res.end(fs.readFileSync(f))
  }
  // Everything else is the app: proxied, its sandbox header dropped (the film must reach its clock), HTML clocked.
  try {
    const r = await fetch(ORIGIN + url)
    const type = r.headers.get('content-type') ?? ''
    const body = Buffer.from(await r.arrayBuffer())
    res.writeHead(r.status, { 'content-type': type, 'access-control-allow-origin': '*' })
    res.end(type.includes('text/html') ? inject(body.toString('utf8')) : body)
  } catch (e) { res.writeHead(502).end(String(e)) }
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const port = server.address().port

// Chrome, driven over the DevTools protocol.
const profile = fs.mkdtempSync(join(tmpdir(), 'od-film-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--disable-site-isolation-trials', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
const wsUrl = await new Promise((ok, no) => { let buf = ''; chrome.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) ok(m[1]) }); setTimeout(() => no(new Error('Chrome did not start')), 15000) })
const browser = new WebSocket(wsUrl)
await new Promise((ok) => (browser.onopen = ok))
let id = 0
const pending = new Map()
browser.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { const { ok, no } = pending.get(msg.id); pending.delete(msg.id); msg.error ? no(new Error(msg.error.message)) : ok(msg.result) } }
const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const i = ++id; pending.set(i, { ok, no }); browser.send(JSON.stringify({ id: i, method, params, sessionId })) })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const page = (m, p) => send(m, p, sessionId)
await page('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await page('Page.enable')
await page('Runtime.enable')
await page('Page.navigate', { url: `http://127.0.0.1:${port}/film` })
await new Promise((r) => setTimeout(r, WARM * 1000)) // real time for the frames, fonts and photos to load
const evaluate = (expression) => page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })

// Frames into ffmpeg as PNGs on its stdin.
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] })
const frames = Math.round(SECONDS * FPS)
const started = Date.now()
for (let f = 0; f < frames; f++) {
  await evaluate(`window.__advance(${((f * 1000) / FPS).toFixed(3)})`)
  const { data } = await page('Page.captureScreenshot', { format: 'png', fromSurface: true })
  if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r))
  if (f % FPS === 0) process.stdout.write(`\r${f}/${frames} frames`)
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
console.log(`\r${frames} frames in ${((Date.now() - started) / 1000).toFixed(1)}s → ${OUT}`)
chrome.kill(); server.close(); browser.close()
fs.rmSync(profile, { recursive: true, force: true })
process.exit(0)
