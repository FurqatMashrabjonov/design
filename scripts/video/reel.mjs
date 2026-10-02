// VID-01: a 9:16 reel (TikTok, Reels, Shorts) of one app from its public preview: the prompt types itself, then the
// app's real screens play inside the studio's iPhone (films/device.js), then the end card. 15.5 s, silent — the
// platform's own music is added when posting.
//
//   node scripts/video/reel.mjs --share-url https://screenspell.app/s/<token> --prompt "…" [--out reel.mp4]
//        [--sub "iOS + Android · light + dark"] [--tag "One minute."] [--dark]
import fs from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { launch } from './cdp.mjs'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d }
const share = new URL(arg('share-url') ?? '')
const PROMPT = arg('prompt')
if (!PROMPT) throw new Error('--prompt is required')
const token = share.pathname.split('/').filter(Boolean).pop()
const origin = share.origin
const DARK = process.argv.includes('--dark')

// The screens a visitor sees, in plan order: the preview is walked with "Next screen".
const chrome = await launch()
const view = await chrome.open(`${origin}/s/${token}`, { width: 1440, height: 900 })
await new Promise((r) => setTimeout(r, 6000))
const seen = new Map(); let names = []
for (let i = 0; i < 14; i++) {
  const got = await view.eval(`(() => { const t = [...document.querySelectorAll('[title]')].map((e) => e.getAttribute('title')); const a = t.indexOf('Previous screen'), b = t.indexOf('Next screen'); return { names: a >= 0 && b > a ? t.slice(a + 1, b) : [], frames: [...document.querySelectorAll('iframe')].map((f) => ({ src: f.getAttribute('src') ?? '', title: f.getAttribute('title') ?? '' })) } })()`)
  if (got.names.length) names = got.names
  for (const f of got.frames) { const id = /api\/thumb\/([0-9a-f-]{36})/.exec(f.src)?.[1]; if (id) seen.set(id, f.title) }
  if (names.length && seen.size >= names.length) break
  await view.eval(`document.querySelector('[title="Next screen"]')?.click()`)
  await new Promise((r) => setTimeout(r, 900))
}
chrome.close()
const order = (names.length ? names : [...seen.values()]).map((n) => [...seen].find(([, t]) => t === n)?.[0]).filter(Boolean)
if (order.length < 4) throw new Error(`Found ${order.length} screens; a reel needs four`)
const src = (id) => `/api/thumb/${id}?t=${token}`
const count = Number(arg('count', order.length))
const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][count] ?? String(count)
const oneSentence = !/[.!?]\s+\S/.test(PROMPT.replace(/[.!?]\s*$/, ''))
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const typed = PROMPT.length > 140 ? PROMPT.slice(0, 137) + '…' : PROMPT
const per = Math.max(14, Math.min(30, Math.round(3200 / typed.length))) // the typing takes about 3 s whatever its length

const film = fs.readFileSync(new URL('./films/reel.html', import.meta.url), 'utf8')
  .replaceAll('{{KICKER}}', oneSentence ? 'I typed one sentence…' : 'I typed one prompt…')
  .replaceAll('{{PROMPT}}', JSON.stringify(typed))
  .replaceAll('{{PER}}', String(per))
  .replaceAll('{{HEAD}}', `${words} screens.`)
  .replaceAll('{{TAG}}', esc(arg('tag', 'One minute.')))
  .replaceAll('{{SUB}}', esc(arg('sub', 'iOS + Android · light + dark')))
  .replaceAll('{{DARK}}', DARK ? '1' : '0')
  .replaceAll('{{MAIN}}', [order[0], order[1], order[2], order[3]].map(src).join(','))
  .replaceAll('{{LEFT}}', src(order[2]))
  .replaceAll('{{RIGHT}}', src(order[3]))
const tmp = join(fs.mkdtempSync(join(tmpdir(), 'od-reel-')), 'reel.html')
fs.writeFileSync(tmp, film)
const out = resolve(arg('out', 'reel.mp4'))
const r = spawnSync('node', [new URL('./render.mjs', import.meta.url).pathname, tmp, '--origin', origin, '--size', '1080x1920', '--seconds', '15.5', '--warm', '10', '--out', out], { stdio: 'inherit' })
process.exit(r.status ?? 1)
