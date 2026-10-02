// VID-01: the studio at work, recorded for real. A headless Chrome signs in as the admin (a magic link made here, its
// mail not sent), types a prompt on the dashboard and records the canvas as the plan and every screen are drawn, an
// edit in chat, then the preview's iOS/Android and light/dark switches. Frames come from Chrome's screencast with their
// timestamps; the film script (cut.mjs) speeds the waits up and says so on screen.
//
//   node --env-file=.env --import ./scripts/alias-hook.mjs scripts/video/record-studio.ts --prompt "…" \
//        [--edit "…"] [--origin http://localhost:3000] [--out <dir>]
//
// A real generation on the default model (about ten cents). The app it makes stays on the admin's dashboard.
import fs from 'node:fs'
import { join, resolve } from 'node:path'
// @ts-expect-error a plain .mjs helper
import { launch } from './cdp.mjs'

const arg = (k: string, d?: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d }
const ORIGIN = arg('origin', 'http://localhost:3000')!.replace(/\/$/, '')
const PROMPT = arg('prompt')
if (!PROMPT) throw new Error('--prompt is required')
const EDIT = arg('edit')
const OUT = resolve(arg('out', join('docs/brand/videos/raw', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')))!)
fs.mkdirSync(join(OUT, 'frames'), { recursive: true })

// A sign-in link for the admin, made the way the login page makes one, with the mail held back (the link is kept for
// development in devMail; nothing reaches the inbox).
const { auth, devMail } = await import('@/app/Services/AuthService')
const { setEmailTransport } = await import('@/app/Services/EmailService')
setEmailTransport(async () => ({ id: 'held' }))
const email = (process.env.ADMIN_EMAILS ?? '').split(',')[0]!.trim()
await auth.api.signInMagicLink({ body: { email, callbackURL: '/' }, headers: new Headers({ origin: ORIGIN }) })
const link = devMail.lastLink?.url
if (!link) throw new Error('No sign-in link was made')
const signIn = link.replace(/^https?:\/\/[^/]+/, ORIGIN)

const chrome = await launch()
const page = await chrome.open(null, { width: 1440, height: 810, scale: 2 })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (js: string, ms: number, what: string) => { const end = Date.now() + ms; while (Date.now() < end) { if (await page.eval(js).catch(() => false)) return; await sleep(500) } throw new Error(`Timed out waiting for ${what}`) }
await page.call('Page.navigate', { url: signIn })
await waitFor(`location.pathname === '/' && !!document.querySelector('textarea')`, 30_000, 'the dashboard')

// Frames with their timestamps, and the moments the cut needs (what happens when).
const frames: { file: string; t: number }[] = []
const marks: Record<string, number> = {}
let n = 0
page.on('Page.screencastFrame', async (p: { data: string; metadata: { timestamp: number }; sessionId: number }) => {
  const file = `${String(++n).padStart(5, '0')}.jpg`
  fs.writeFileSync(join(OUT, 'frames', file), Buffer.from(p.data, 'base64'))
  frames.push({ file, t: p.metadata.timestamp })
  await page.call('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {})
})
const mark = (name: string) => (marks[name] = Date.now() / 1000)
await page.call('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 })
await sleep(1200)

// Type the prompt like a person, then send it.
mark('typing')
await page.eval(`document.querySelector('textarea').focus()`)
for (const ch of PROMPT) { await page.call('Input.insertText', { text: ch }); await sleep(ch === ' ' ? 45 : 28) }
await sleep(700)
mark('send')
await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
await waitFor(`location.pathname.startsWith('/p/')`, 30_000, 'the canvas')
mark('canvas')
const projectId = await page.eval(`location.pathname.split('/')[2]`)
// Done when no frame is still drawing and the agent has answered (its reply names the app).
await waitFor(`!document.querySelector('.od-gen[data-show]') && /Here's|Here is/.test(document.body.innerText)`, 300_000, 'the plan to finish')
mark('drawn')
await sleep(2500)

if (EDIT) {
  // Select the first tab screen (the second frame: first-run comes first) and ask for a change.
  // The screen to edit is the first tab's (the app's home), found by its name in the plan; a frame is selected by a
  // click on the wrapper inside it (p.$projectId.tsx), so the click is dispatched on that frame's iframe's parent.
  const { Project } = await import('@/app/Models/Project')
  const { parseAppPlan } = await import('@/app/Services/JsxGenerator')
  const plan = parseAppPlan((await Project.find(projectId))?.plan ?? null)
  const home = plan?.screens.find((x) => x.kind === 'tab' && x.tab === plan.tabs[0]?.id)?.name ?? ''
  await page.eval(`(() => { const f = [...document.querySelectorAll('[data-canvas-viewport] .od-land')]; const el = f.find((x) => [...x.querySelectorAll('figcaption, span, p, div')].some((n) => n.children.length === 0 && n.textContent.trim() === ${JSON.stringify(home)})) ?? f[1] ?? f[0]; el?.querySelector('iframe')?.parentElement?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })) })()`)
  // Selected when the composer asks for a change; otherwise the message would add a screen instead, so stop.
  await waitFor(`/describe the change/i.test(document.querySelector('textarea')?.placeholder ?? '')`, 5_000, 'the frame to be selected')
  await sleep(900)
  await page.eval(`document.querySelector('textarea').focus()`)
  mark('edit')
  for (const ch of EDIT) { await page.call('Input.insertText', { text: ch }); await sleep(ch === ' ' ? 45 : 28) }
  await sleep(500)
  await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await sleep(1500)
  await waitFor(`!document.querySelector('.od-gen[data-show]') && /Updated/.test(document.body.innerText)`, 180_000, 'the edit')
  mark('edited')
  await sleep(2500)
}

// The preview: click through, then the platform and the mode.
await page.call('Page.navigate', { url: `${ORIGIN}/preview/${projectId}` })
await sleep(4000)
mark('preview')
const click = (title: string) => page.eval(`document.querySelector('[title="${title}"]')?.click()`)
await click('Next screen'); await sleep(1600)
await click('Next screen'); await sleep(1600)
mark('android'); await click('Show the app as Android (Material You)'); await sleep(2200)
mark('dark'); await click('Dark'); await sleep(2200)
await click('Show the app as iOS'); await sleep(1800)
mark('end')
await page.call('Page.stopScreencast')
await sleep(500)
fs.writeFileSync(join(OUT, 'take.json'), JSON.stringify({ origin: ORIGIN, projectId, prompt: PROMPT, edit: EDIT, frames, marks }, null, 2))
chrome.close()
console.log(JSON.stringify({ out: OUT, projectId, frames: frames.length, seconds: +(frames.at(-1)!.t - frames[0]!.t).toFixed(1), marks }))
process.exit(0)
