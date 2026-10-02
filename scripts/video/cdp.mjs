// A headless Chrome driven over its DevTools protocol with Node's own WebSocket — the one helper the video scripts
// share. `open(url)` gives a page: `call(method, params)`, `on(event, fn)`, `eval(js)`; `close()` ends Chrome.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export async function launch() {
  const profile = fs.mkdtempSync(join(tmpdir(), 'od-cdp-'))
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--disable-site-isolation-trials', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  const wsUrl = await new Promise((ok, no) => {
    let buf = ''
    chrome.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) ok(m[1]) })
    setTimeout(() => no(new Error('Chrome did not start')), 15000)
  })
  const ws = new WebSocket(wsUrl)
  await new Promise((ok) => (ws.onopen = ok))
  let seq = 0
  const pending = new Map(), listeners = []
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) { const { ok, no } = pending.get(msg.id); pending.delete(msg.id); msg.error ? no(new Error(`${msg.error.message}`)) : ok(msg.result) }
    else if (msg.method) for (const l of listeners) if (l.method === msg.method && (!l.sessionId || l.sessionId === msg.sessionId)) l.fn(msg.params, msg.sessionId)
  }
  const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++seq; pending.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params, sessionId })) })

  async function open(url, { width = 1920, height = 1080, scale = 1 } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const call = (m, p) => send(m, p, sessionId)
    const on = (method, fn) => listeners.push({ method, fn, sessionId })
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false })
    await call('Page.enable'); await call('Runtime.enable')
    if (url) await call('Page.navigate', { url })
    const evaluate = async (expression) => {
      const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
      return r.result?.value
    }
    return { call, on, eval: evaluate, sessionId, targetId }
  }
  // Chrome may still be writing its profile as it exits; a leftover temp folder is not worth failing a take over.
  const close = () => { try { ws.close() } catch {} chrome.kill(); try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch {} }
  return { open, send, close }
}
