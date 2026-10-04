// Launch posts for X, Threads and Instagram from one project, in the brand's one style (ink, lime, Instrument
// type, the Screenspell lockup): three 16:9 images (the app and its prompt, iOS beside Android, light beside dark)
// and a five-slide 9:16 Instagram set (key content inside the middle 3:4, which the profile grid shows), drawn at 2× from the project's own screens. Used by the `social-posts` skill.
//
//   node --env-file=.env --import ./scripts/alias-hook.mjs scripts/social-posts.ts --project <id>
//        [--prompt "cleaned-up prompt"] [--count 8] [--edited yes|no] [--out docs/brand/posts/<name>]
//   add --share to turn on the project's public preview link and print it with a ?ref= per platform
//   … scripts/social-posts.ts --share-url https://screenspell.app/s/<token> --prompt "…" [--count 8] [--no-intro]
//        # from a public preview (production): no database; shots through /api/thumb with the share token;
//        # also x-4-devices.png — the preview page itself on the iPhone and the Galaxy it draws
//   … scripts/social-posts.ts --brief "one sentence" [--email owner@…]   # plan a new app first (a real generation,
//        on the default model, owned by the admin so it shows on their dashboard), then draw its posts
//
// Honest by default: the quote is the project's first message, the count is the screens the plan drew, and the
// copy says when the screens were edited afterwards. Needs Postgres, the local Google Chrome and macOS `sips`.
import fs from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'


const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined }
const REPO = process.cwd()
const TMP = fs.mkdtempSync(join(tmpdir(), 'od-posts-'))
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
type Look = 'light' | 'android' | 'dark'
// Headless Chrome with a virtual time budget sometimes stays open after it has written its output; past the time
// limit what it wrote is kept (a dumped page on stdout, a screenshot on disk).
// Asynchronous, so the harness server below can answer the Chrome it starts.
const chrome = (args: string[]): Promise<string> =>
  new Promise((ok) => execFile(CHROME_BIN, args, { encoding: 'utf8', timeout: 45_000, maxBuffer: 20 << 20 }, (_e, stdout) => ok(String(stdout ?? ''))))
// What the rest of the script needs from an app, wherever its screens come from.
let appName = '', prompt = '', count = 0, edited = false, projectId: string | undefined, shareBase: string | undefined
let order: { id: string; name: string }[] = []
let intro: string | undefined, roots: string[] = []
let shoot: (id: string, tag: string, look: Look) => Promise<void>
let devices: { file: string; label: string; ratio: number }[] = []

const shareUrl = arg('share-url')
if (shareUrl) {
  // A public preview (SHR-02), e.g. the production site: no database, only what any visitor can open. The page lists
  // the screens in plan order (first-run first, then the tabs, then the rest); each is /api/thumb/<id>?t=<token>.
  const u = new URL(shareUrl)
  const token = u.pathname.split('/').filter(Boolean).pop()!
  shareBase = `${u.origin}/s/${token}?ref=`
  // The preview mounts a frame per screen as you move through it, so the page is opened over DevTools and walked
  // with "Next screen", collecting each frame; the pager's buttons give the names in plan order.
  // @ts-expect-error a plain .mjs helper
  const { launch } = await import('./video/cdp.mjs')
  const cdp = await launch()
  const view = await cdp.open(`${u.origin}${u.pathname}`, { width: 1440, height: 900 })
  await new Promise((r) => setTimeout(r, 6000))
  const seen = new Map<string, string>()
  let names: string[] = []
  for (let i = 0; i < 14; i++) {
    const got = (await view.eval(`(() => { const t = [...document.querySelectorAll('[title]')].map((e) => e.getAttribute('title')); const a = t.indexOf('Previous screen'), b = t.indexOf('Next screen'); return { names: a >= 0 && b > a ? t.slice(a + 1, b) : [], frames: [...document.querySelectorAll('iframe')].map((f) => ({ src: f.getAttribute('src') ?? '', title: f.getAttribute('title') ?? '' })) } })()`)) as { names: string[]; frames: { src: string; title: string }[] }
    if (got.names.length) names = got.names
    for (const f of got.frames) { const fid = /api\/thumb\/([0-9a-f-]{36})/.exec(f.src)?.[1]; if (fid) seen.set(fid, f.title) }
    if (names.length && seen.size >= names.length) break
    await view.eval(`document.querySelector('[title="Next screen"]')?.click()`)
    await new Promise((r) => setTimeout(r, 900))
  }
  const pairs = [...seen].map(([fid, title]) => ({ id: fid, name: title }))
  order = names.length ? names.map((n) => pairs.find((p) => p.name === n)).filter((x): x is { id: string; name: string } => !!x) : pairs
  for (const p of pairs) if (!order.includes(p)) order.push(p)
  if (order.length < 3) { cdp.close(); throw new Error(`The preview shows ${order.length} screens; it needs three`) }
  appName = arg('app') ?? (await (await fetch(`${u.origin}${u.pathname}`)).text()).match(/<title>([^<—]+)/)?.[1]?.trim() ?? 'App'
  // A visitor sees no plan: the first screen is taken as the first-run one unless --no-intro says it is a tab.
  intro = process.argv.includes('--no-intro') ? undefined : order[0]!.id
  roots = order.filter((x) => x.id !== intro).slice(0, 4).map((x) => x.id)
  prompt = (arg('prompt') ?? '').trim()
  if (!prompt) { cdp.close(); throw new Error('--prompt is required with --share-url (a visitor cannot see the chat)') }
  // The app on the devices the preview draws (PRV-01): the public page itself, opened once per device with the
  // device it remembers set beforehand, walked to the screen, and the drawn phone alone pictured on a clear
  // background — bezel, Dynamic Island or camera, status bar and home indicator exactly as a visitor sees them.
  const onDevice = async (device: string, id: string, file: string) => {
    const v = await cdp.open('', { width: 1100, height: 1250, scale: 2 })
    await v.call('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('od:preview-device', '${device}') } catch {}` })
    await v.call('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
    await v.call('Page.navigate', { url: `${u.origin}${u.pathname}` })
    await new Promise((r) => setTimeout(r, 6000))
    for (let i = 0; i < 14; i++) {
      if (await v.eval(`(document.querySelector('.od-preview-stage > iframe[data-state="shown"]')?.getAttribute('src') ?? '').includes('${id}')`)) break
      await v.eval(`document.querySelector('[title="Next screen"]')?.click()`)
      await new Promise((r) => setTimeout(r, 900))
    }
    await new Promise((r) => setTimeout(r, 3500)) // the screen's photos
    const clip = (await v.eval(`(() => {
      const phone = document.querySelector('.od-preview-stage')?.parentElement?.parentElement?.parentElement
      if (!phone) return null
      phone.firstElementChild.style.boxShadow = '0 0 0 1.5px #3b3936, inset 0 0 0 1px #2a2826'
      for (let el = phone; el.parentElement; el = el.parentElement) {
        el.parentElement.style.background = 'transparent'
        for (const sib of el.parentElement.children) if (sib !== el) sib.style.visibility = 'hidden'
      }
      document.documentElement.style.background = 'transparent'
      const r = phone.getBoundingClientRect()
      return { x: r.x - 6, y: r.y - 4, width: r.width + 12, height: r.height + 8 }
    })()`)) as { x: number; y: number; width: number; height: number } | null
    if (!clip) throw new Error(`The preview drew no ${device}`)
    await new Promise((r) => setTimeout(r, 400))
    const shot = (await v.call('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })) as { data: string }
    fs.writeFileSync(join(TMP, `${file}.png`), Buffer.from(shot.data, 'base64'))
    return clip.height / clip.width
  }
  try {
    devices = [
      { file: 'dev-iphone', label: 'iPhone 18 Pro Max', ratio: await onDevice('iphone-18-pro-max', roots[0]!, 'dev-iphone') },
      { file: 'dev-galaxy', label: 'Galaxy S26 Ultra', ratio: await onDevice('galaxy-s26-ultra', roots[roots.length - 1]!, 'dev-galaxy') },
    ]
  } catch (e) {
    console.error(`no device picture: ${(e as Error).message}`)
  }
  cdp.close()
  count = Number(arg('count') ?? order.length)
  edited = arg('edited') === 'yes'
  // The harness is served over http: a file:// page leaves a cross-origin iframe blank.
  const server = createServer((req, res) => {
    const f = join(TMP, (req.url ?? '/').slice(1).split('?')[0]!)
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return res.writeHead(404).end() // the browser asks for a favicon
    res.end(fs.readFileSync(f))
  })
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
  const port = (server.address() as { port: number }).port
  process.on('exit', () => server.close())
  shoot = async (id, tag, look) => {
    // Light is asked for, not assumed: a midnight app is stored dark, so its "light" shot came out dark too.
    const q = look === 'android' ? '&p=material&dark=0' : look === 'dark' ? '&dark=1' : '&dark=0'
    const html = join(TMP, `h-${id}${tag}.html`), file = join(TMP, `${id}${tag}.png`)
    fs.writeFileSync(html, `<!doctype html><body style="margin:0;overflow:hidden"><iframe src="${u.origin}/api/thumb/${id}?t=${token}&static${q}" style="width:390px;height:844px;border:0;display:block"></iframe></body>`)
    // Without site isolation off, headless Chrome's --screenshot leaves a cross-origin iframe blank.
    await chrome(['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', '--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process', `--user-data-dir=${join(TMP, `prof-${id}${tag}`)}`, '--window-size=390,844', '--virtual-time-budget=9000', `--screenshot=${file}`, `http://127.0.0.1:${port}/h-${id}${tag}.html`])
    if (!fs.existsSync(file)) throw new Error(`No picture of ${id}${tag}`)
  }
} else {
  process.env.SHOT_SCALE = '2' // RenderAudit reads it when it loads
  process.env.SCREEN_SHOTS = '0'
  const { sql } = await import('drizzle-orm')
  const { all, one } = await import('@/database/query')
  const { ShotService } = await import('@/app/Services/ShotService')
  const { screenshotScreen } = await import('@/app/Services/RenderAudit')
  const { parseAppPlan } = await import('@/app/Services/JsxGenerator')
  const { Project } = await import('@/app/Models/Project')
  const { PlanController } = await import('@/app/Http/Controllers/PlanController')
  projectId = arg('project')
  const brief = arg('brief')?.trim()
  if (brief) {
    // The same path the eval takes: a project, then the planner and every screen through PlanController.
    const email = (arg('email') ?? process.env.ADMIN_EMAILS?.split(',')[0] ?? '').trim().toLowerCase()
    const owner = (await all<{ id: string }>(sql`SELECT id FROM "user" WHERE lower(email) = ${email}`))[0]
    if (!owner) throw new Error(`No user with the email ${email || '(none)'} — pass --email`)
    projectId = crypto.randomUUID()
    await Project.create({ id: projectId, name: 'Untitled', designSystem: 'konsta', device: 'mobile', userId: owner.id })
    await (await PlanController.stream(new Request('http://posts/api', { method: 'POST', body: JSON.stringify({ projectId, brief }) }))).text()
    console.error(`planned ${projectId}`)
  }
  if (!projectId) throw new Error('--project <id>, --brief "…" or --share-url <link> is required')
  const pid = projectId
  const project = await one<{ name: string; plan: string | null }>(sql`SELECT name, plan FROM projects WHERE id = ${pid}`)
  const plan = parseAppPlan(project.plan)
  if (!plan) throw new Error('This project has no plan')
  const rows = await all<{ slug: string; html: string }>(sql`SELECT slug, html FROM screens WHERE project_id = ${pid} AND deleted_at IS NULL AND html <> ''`)
  const bySlug = new Map(rows.map((r) => [r.slug, r.html]))
  const firstAsk = await all<{ text: string }>(sql`SELECT text FROM messages WHERE project_id = ${pid} AND role = 'user' ORDER BY created_at LIMIT 1`)
  const later = await one<{ n: number }>(sql`SELECT count(*)::int AS n FROM messages WHERE project_id = ${pid} AND role = 'user' AND kind IN ('edit', 'element', 'regenerate')`)
  appName = plan.appName || project.name
  prompt = (arg('prompt') ?? firstAsk[0]?.text ?? '').trim()
  count = Number(arg('count') ?? plan.screens.filter((s) => bySlug.has(s.id)).length)
  edited = arg('edited') ? arg('edited') === 'yes' : later.n > 0
  // Which screens: the first-run screen, then each tab's root in tab order, then the rest.
  roots = plan.tabs.map((t) => plan.screens.find((s) => s.kind === 'tab' && s.tab === t.id)?.id).filter((id): id is string => !!id && bySlug.has(id))
  intro = plan.screens.find((s) => s.kind === 'first-run' && bySlug.has(s.id))?.id
  order = plan.screens.filter((s) => bySlug.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
  const look = (await ShotService.lookOf(pid))!
  shoot = async (id, tag, l) => {
    const png = await screenshotScreen(bySlug.get(id)!, l === 'android' ? { ...look, platform: 'material', dark: false } : l === 'dark' ? { ...look, dark: true } : { ...look, dark: false }, id)
    if (!png) throw new Error('No Chrome for screenshots')
    fs.writeFileSync(join(TMP, `${id}${tag}.png`), png)
  }
}
const slug = (appName || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const OUT = arg('out') ?? join('docs/brand/posts', slug)
fs.mkdirSync(OUT, { recursive: true })

const pick = [...(intro ? [intro] : []), ...roots]
if (pick.length < 3) throw new Error(`Need at least three drawn screens, found ${pick.length}`)
const [a, b, c] = pick
const home = roots[0] ?? b, last = roots[roots.length - 1] ?? c, third = roots[1] ?? c
// The canvas strip: every screen in a row, the way the canvas shows them (first-run, tabs, then the rest), at most six.
const strip = [...pick, ...order.map((s) => s.id).filter((id) => !pick.includes(id))].slice(0, 6)
const nameOf = (id: string) => order.find((s) => s.id === id)?.name ?? id
for (const id of new Set([a, b, c, home, last, third, ...strip])) await shoot(id, '', 'light')
await shoot(home, '-android', 'android')
for (const id of new Set([last, third, ...strip])) await shoot(id, '-dark', 'dark')

// The one style.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const INK = '#1a1511', LIME = '#c6f648', PAPER = '#f3f1ec', MUTED = '#a39d8f'
const NM = join(REPO, 'node_modules')
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
const mark = fs.readFileSync(join(REPO, 'docs/brand/lockup-on-dark.svg'), 'utf8').replace('<svg ', '<svg style="height:34px;width:auto;display:block" ')
const css = `<style>@font-face{font-family:IS;src:url(file://${NM}/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2)}@font-face{font-family:ISerif;font-style:italic;src:url(file://${NM}/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2)}
em{font-family:ISerif;font-style:italic;font-weight:400;letter-spacing:0;position:relative}em:after{content:'';position:absolute;left:0;right:0;bottom:.04em;height:.14em;background:${LIME};z-index:-1}
.pill{display:inline-block;font:600 18px IS;color:${INK};background:${LIME};border-radius:999px;padding:6px 16px}</style>`
// A local picture ends in an empty strip below ~765 css px (KON-10's framing; a first-run screen's button sits lower);
// a public preview's picture is the whole phone.
const shotHeight = (f: string) => (shareUrl ? 844 : f === intro ? 800 : 765)
const phone = (f: string, w: number, extra = '') => `<div style="width:${w}px;height:${Math.round(w * shotHeight(f.replace(/-(android|dark)$/, '')) / 390)}px;border:${Math.round(w / 32)}px solid #2b2521;border-radius:${Math.round(w / 8.5)}px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.5);flex:none;${extra}"><img src="file://${TMP}/${f}.png" style="width:100%;display:block"></div>`
const labelled = (f: string, w: number, label: string) => `<div style="display:flex;flex-direction:column;align-items:center;gap:18px">${phone(f, w)}<span class="pill">${label}</span></div>`
const row = (items: string[], x: number, y: number, gap = 26) => `<div style="position:absolute;left:${x}px;top:${y}px;display:flex;gap:${gap}px;align-items:flex-start">${items.join('')}</div>`
const head = (title: string, sub: string) => `<div style="position:absolute;left:90px;top:200px;max-width:600px">${mark}<div style="margin-top:36px;font-size:60px;line-height:1.06;font-weight:600;letter-spacing:-.02em">${title}</div><div style="margin-top:18px;font-size:22px;line-height:1.4;color:${MUTED}">${sub}</div></div>`
function png(name: string, w: number, h: number, inner: string, bg = `radial-gradient(circle at 70% 40%, rgba(198,246,72,.13), transparent 60%) ${INK}`, ink = PAPER) {
  const html = join(TMP, `${name}.html`), file = join(OUT, `${name}.png`)
  fs.writeFileSync(html, `<!doctype html><html><head>${css}</head><body style="margin:0;height:100vh;display:grid;place-items:center"><div style="position:relative;isolation:isolate;width:${w}px;height:${h}px;overflow:hidden;background:${bg};font-family:IS;color:${ink}">${inner}</div></body></html>`)
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', '--allow-file-access-from-files', `--window-size=${w},${h + 200}`, `--screenshot=${join(REPO, file)}`, `file://${html}`], { stdio: 'ignore' })
  execFileSync('sips', ['--cropToHeightWidth', String(h * 2), String(w * 2), file], { stdio: 'ignore' }) // sips crops around the centre
}

// "One sentence" only when it was one: a longer prompt is "One prompt".
const ONE = /[.!?]\s+\S/.test(prompt.replace(/[.!?]\s*$/, '')) ? 'prompt' : 'sentence'
const numberWord = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][count] ?? String(count)
const N = numberWord[0].toUpperCase() + numberWord.slice(1)
const quote = `“${esc(prompt.length > 150 ? prompt.slice(0, 147) + '…' : prompt)}”${edited ? ' Then a few edits in chat.' : ''}`
png('x-1-hero', 1600, 900, head(`One ${ONE}.<br><em>${N} screens.</em>`, quote) + row([phone(a, 240, 'margin-top:90px'), phone(b, 240, 'margin-top:20px'), phone(c, 240, 'margin-top:60px')], 790, 40))
png('x-2-ios-android', 1600, 900, head('Same app.<br><em>Native on both.</em>', 'One design, drawn as iOS and as Android (Material You) — switch with one tap.') + row([labelled(home, 290, 'iOS'), labelled(`${home}-android`, 290, 'Android')], 820, 110, 50))
png('x-3-light-dark', 1600, 900, head('Light <em>and</em> dark.<br>Both included.', 'Every screen comes in both. Pick a style and the colours follow everywhere.') + row([labelled(last, 290, 'Light'), labelled(`${last}-dark`, 290, 'Dark')], 820, 110, 50))
// The preview as a visitor opens it: the app on the phones the preview draws (a public preview only).
if (devices.length) {
  const dev = (d: (typeof devices)[number], w: number) => `<div style="display:flex;flex-direction:column;align-items:center;gap:18px"><img src="file://${TMP}/${d.file}.png" style="width:${w}px;height:${Math.round(w * d.ratio)}px;display:block;filter:drop-shadow(0 30px 40px rgba(0,0,0,.5))"><span class="pill">${d.label}</span></div>`
  png('x-4-devices', 1600, 900, head('Open the link.<br><em>Tap through it.</em>', 'A clickable prototype in the browser, on an iPhone or a Galaxy — or full screen on your own phone.') + row(devices.map((d, i) => dev(d, i ? 315 : 335)), 815, 70, 50))
}
// Instagram, 9:16 (1080×1920); the profile grid shows the middle 3:4, so titles start below y=250.
const igTitle = (t: string) => `<div style="position:absolute;left:80px;top:260px;right:80px;font-size:68px;line-height:1.05;font-weight:600;letter-spacing:-.02em">${t}</div>`
png('ig-1', 1080, 1920, `<div style="position:absolute;left:80px;top:260px;right:80px">${mark}<div style="margin-top:44px;font-size:96px;line-height:1.02;font-weight:600;letter-spacing:-.03em">One ${ONE}.<br><em>${N} screens.</em></div><div style="margin-top:26px;font-size:30px;line-height:1.35;color:${MUTED}">${quote}</div></div>` + row([phone(home, 380, 'transform:rotate(-7deg)'), phone(third, 380, 'transform:rotate(6deg);margin-top:60px')], 110, 860, 50))
png('ig-2', 1080, 1920, igTitle('The whole flow,<br><em>designed.</em>') + row(pick.slice(0, 3).map((f, i) => phone(f, 310, `margin-top:${i * 100}px`)), 45, 600, 15))
png('ig-3', 1080, 1920, igTitle('iOS <em>and</em> Android.') + row([labelled(home, 460, 'iOS'), labelled(`${home}-android`, 460, 'Android')], 60, 520, 40))
png('ig-4', 1080, 1920, igTitle('Light <em>and</em> dark.') + row([labelled(third, 460, 'Light'), labelled(`${third}-dark`, 460, 'Dark')], 60, 520, 40))
png('ig-5', 1080, 1920, `<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center"><div>${mark.replace('height:34px', 'height:64px;margin:0 auto')}<div style="margin-top:56px;font-size:84px;line-height:1.05;font-weight:600;letter-spacing:-.03em">Describe an app.<br>Get <em>every screen.</em></div><div style="margin-top:34px;font-size:34px;color:${MUTED}">Beta opens soon — follow to get in first.</div></div></div>`)
// LinkedIn and X, 1.91:1 — the screens on the canvas as the product shows them, each named above its frame.
for (const dark of [false, true]) {
  const W = 1600, H = 838, gap = 26, n = strip.length
  // phone() adds a bezel of w/32 on each side, so the outer width is w + 2·round(w/32)
  const w = Math.min(230, Math.floor((W - 160 - gap * (n - 1)) / n / (1 + 1 / 16)))
  const outer = w + 2 * Math.round(w / 32)
  const dots = dark ? 'rgba(243,241,236,.09)' : 'rgba(26,21,17,.13)'
  const label = (id: string) => `<div style="font:500 13px IS;color:${dark ? MUTED : '#6b665c'};margin:0 0 10px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${w}px">⠿ ${esc(nameOf(id))}</div>`
  const frames = strip.map((id) => `<div>${label(id)}${phone(dark ? `${id}-dark` : id, w, 'box-shadow:0 18px 40px rgba(0,0,0,.22)')}</div>`)
  const top = Math.max(40, Math.round((H - (w * Math.max(...strip.map(shotHeight))) / 390 - 30) / 2))
  const lock = dark ? mark : mark.replace(/#f3f1ec/gi, INK)
  png(`strip-${dark ? 'dark' : 'light'}`, W, H, row(frames, Math.round((W - (n * outer + (n - 1) * gap)) / 2), top, gap) + `<div style="position:absolute;right:36px;bottom:26px;opacity:.9">${lock.replace('height:34px', 'height:22px')}</div>`,
    `radial-gradient(${dots} 1.2px, transparent 1.2px) 0 0/22px 22px, ${dark ? INK : PAPER}`, dark ? PAPER : INK)
}

// The live preview: anyone with the link taps through the app (SHR-02). Each platform gets its own ref.
let links: Record<string, string> | undefined
if (shareBase || (process.argv.includes('--share') && projectId)) {
  const { ShareController } = await import('@/app/Http/Controllers/ShareController')
  const { DOMAIN } = await import('@/lib/brand')
  const base = shareBase ?? `https://${DOMAIN}/s/${(await ShareController.share({ id: projectId!, on: true })).token}?ref=`
  links = Object.fromEntries(['x', 'threads', 'linkedin', 'ig'].map((p) => [p, `${base}${p}-${slug}`.slice(0, base.length + 32)]))
}

fs.rmSync(TMP, { recursive: true })
console.log(JSON.stringify({ out: OUT, links, app: appName, prompt, count, edited, screens: { hero: [a, b, c], iosAndroid: home, lightDark: [last, third], strip } }))
process.exit(0)
