// Launch posts for X, Threads and Instagram from one project, in the brand's one style (ink, lime, Instrument
// type, the Screenspell lockup): three 16:9 images (the app and its prompt, iOS beside Android, light beside dark)
// and a five-slide 4:5 carousel, drawn at 2× from the project's own screens. Used by the `social-posts` skill.
//
//   node --env-file=.env --import ./scripts/alias-hook.mjs scripts/social-posts.ts --project <id>
//        [--prompt "cleaned-up prompt"] [--count 8] [--edited yes|no] [--out docs/brand/posts/<name>]
//
// Honest by default: the quote is the project's first message, the count is the screens the plan drew, and the
// copy says when the screens were edited afterwards. Needs Postgres, the local Google Chrome and macOS `sips`.
import fs from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

process.env.SHOT_SCALE = '2' // RenderAudit reads it when it loads
process.env.SCREEN_SHOTS = '0'
const { sql } = await import('drizzle-orm')
const { all, one } = await import('@/database/query')
const { ShotService } = await import('@/app/Services/ShotService')
const { screenshotScreen } = await import('@/app/Services/RenderAudit')
const { parseAppPlan } = await import('@/app/Services/JsxGenerator')

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined }
const projectId = arg('project')
if (!projectId) throw new Error('--project <id> is required')
const REPO = process.cwd()
const project = await one<{ name: string; plan: string | null }>(sql`SELECT name, plan FROM projects WHERE id = ${projectId}`)
const plan = parseAppPlan(project.plan)
if (!plan) throw new Error('This project has no plan')
const screens = await all<{ slug: string; html: string }>(sql`SELECT slug, html FROM screens WHERE project_id = ${projectId} AND deleted_at IS NULL AND html <> ''`)
const bySlug = new Map(screens.map((s) => [s.slug, s.html]))
const firstAsk = await all<{ text: string }>(sql`SELECT text FROM messages WHERE project_id = ${projectId} AND role = 'user' ORDER BY created_at LIMIT 1`)
const later = await one<{ n: number }>(sql`SELECT count(*)::int AS n FROM messages WHERE project_id = ${projectId} AND role = 'user' AND kind IN ('edit', 'element', 'regenerate')`)
const prompt = (arg('prompt') ?? firstAsk[0]?.text ?? '').trim()
const count = Number(arg('count') ?? plan.screens.filter((s) => bySlug.has(s.id)).length)
const edited = arg('edited') ? arg('edited') === 'yes' : later.n > 0
const slug = (project.name || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const OUT = arg('out') ?? join('docs/brand/posts', slug)
const TMP = fs.mkdtempSync(join(tmpdir(), 'od-posts-'))
fs.mkdirSync(OUT, { recursive: true })

// Which screens: the first-run screen, then each tab's root in tab order.
const roots = plan.tabs.map((t) => plan.screens.find((s) => s.kind === 'tab' && s.tab === t.id)?.id).filter((id): id is string => !!id && bySlug.has(id))
const intro = plan.screens.find((s) => s.kind === 'first-run' && bySlug.has(s.id))?.id
const pick = [...(intro ? [intro] : []), ...roots]
if (pick.length < 3) throw new Error(`Need at least three drawn screens, found ${pick.length}`)
const [a, b, c] = pick
const home = roots[0] ?? b, last = roots[roots.length - 1] ?? c, third = roots[1] ?? c

const look = (await ShotService.lookOf(projectId))!
const shoot = async (id: string, tag: string, l: typeof look) => {
  const png = await screenshotScreen(bySlug.get(id)!, l, id)
  if (!png) throw new Error('No Chrome for screenshots')
  fs.writeFileSync(join(TMP, `${id}${tag}.png`), png)
}
for (const id of new Set([a, b, c, home, last, third, ...pick.slice(0, 4)])) await shoot(id, '', look)
await shoot(home, '-android', { ...look, platform: 'material' })
for (const id of new Set([last, third])) await shoot(id, '-dark', { ...look, dark: true })

// The one style.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const INK = '#1a1511', LIME = '#c6f648', PAPER = '#f3f1ec', MUTED = '#a39d8f'
const NM = join(REPO, 'node_modules')
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
const mark = fs.readFileSync(join(REPO, 'docs/brand/lockup-on-dark.svg'), 'utf8').replace('<svg ', '<svg style="height:34px;width:auto;display:block" ')
const css = `<style>@font-face{font-family:IS;src:url(file://${NM}/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2)}@font-face{font-family:ISerif;font-style:italic;src:url(file://${NM}/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2)}
em{font-family:ISerif;font-style:italic;font-weight:400;letter-spacing:0;position:relative}em:after{content:'';position:absolute;left:0;right:0;bottom:.04em;height:.14em;background:${LIME};z-index:-1}
.pill{display:inline-block;font:600 18px IS;color:${INK};background:${LIME};border-radius:999px;padding:6px 16px}</style>`
// A screen's picture ends in an empty strip below ~765 css px (KON-10's framing); a first-run screen's button sits lower.
const phone = (f: string, w: number, extra = '') => `<div style="width:${w}px;height:${Math.round(w * (f === intro ? 800 : 765) / 390)}px;border:${Math.round(w / 32)}px solid #2b2521;border-radius:${Math.round(w / 8.5)}px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.5);flex:none;${extra}"><img src="file://${TMP}/${f}.png" style="width:100%;display:block"></div>`
const labelled = (f: string, w: number, label: string) => `<div style="display:flex;flex-direction:column;align-items:center;gap:18px">${phone(f, w)}<span class="pill">${label}</span></div>`
const row = (items: string[], x: number, y: number, gap = 26) => `<div style="position:absolute;left:${x}px;top:${y}px;display:flex;gap:${gap}px;align-items:flex-start">${items.join('')}</div>`
const head = (title: string, sub: string) => `<div style="position:absolute;left:90px;top:200px;max-width:600px">${mark}<div style="margin-top:36px;font-size:60px;line-height:1.06;font-weight:600;letter-spacing:-.02em">${title}</div><div style="margin-top:18px;font-size:22px;line-height:1.4;color:${MUTED}">${sub}</div></div>`
function png(name: string, w: number, h: number, inner: string) {
  const html = join(TMP, `${name}.html`), file = join(OUT, `${name}.png`)
  fs.writeFileSync(html, `<!doctype html><html><head>${css}</head><body style="margin:0;height:100vh;display:grid;place-items:center"><div style="position:relative;isolation:isolate;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(circle at 70% 40%, rgba(198,246,72,.13), transparent 60%) ${INK};font-family:IS;color:${PAPER}">${inner}</div></body></html>`)
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', '--allow-file-access-from-files', `--window-size=${w},${h + 200}`, `--screenshot=${join(REPO, file)}`, `file://${html}`], { stdio: 'ignore' })
  execFileSync('sips', ['--cropToHeightWidth', String(h * 2), String(w * 2), file], { stdio: 'ignore' }) // sips crops around the centre
}

const numberWord = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][count] ?? String(count)
const N = numberWord[0].toUpperCase() + numberWord.slice(1)
const quote = `“${esc(prompt.length > 150 ? prompt.slice(0, 147) + '…' : prompt)}”${edited ? ' Then a few edits in chat.' : ''}`
png('x-1-hero', 1600, 900, head(`One sentence.<br><em>${N} screens.</em>`, quote) + row([phone(a, 240, 'margin-top:90px'), phone(b, 240, 'margin-top:20px'), phone(c, 240, 'margin-top:60px')], 790, 40))
png('x-2-ios-android', 1600, 900, head('Same app.<br><em>Native on both.</em>', 'One design, drawn as iOS and as Android (Material You) — switch with one tap.') + row([labelled(home, 290, 'iOS'), labelled(`${home}-android`, 290, 'Android')], 820, 110, 50))
png('x-3-light-dark', 1600, 900, head('Light <em>and</em> dark.<br>Both included.', 'Every screen comes in both. Pick a style and the colours follow everywhere.') + row([labelled(last, 290, 'Light'), labelled(`${last}-dark`, 290, 'Dark')], 820, 110, 50))
png('ig-1', 1080, 1350, `<div style="position:absolute;left:80px;top:90px;right:80px">${mark}<div style="margin-top:40px;font-size:84px;line-height:1.02;font-weight:600;letter-spacing:-.03em">One sentence.<br><em>${N} screens.</em></div><div style="margin-top:22px;font-size:28px;color:${MUTED}">Swipe to see the app →</div></div>` + row([phone(home, 330, 'transform:rotate(-7deg)'), phone(third, 330, 'transform:rotate(6deg);margin-top:50px')], 150, 560, 50))
png('ig-2', 1080, 1350, `<div style="position:absolute;left:80px;top:90px;font-size:56px;font-weight:600;letter-spacing:-.02em">The whole flow,<br><em>designed.</em></div>` + row(pick.slice(0, 3).map((f, i) => phone(f, 290, `margin-top:${40 + i * 70}px`)), 60, 300, 20))
png('ig-3', 1080, 1350, `<div style="position:absolute;left:80px;top:90px;font-size:56px;font-weight:600;letter-spacing:-.02em">iOS <em>and</em> Android.</div>` + row([labelled(home, 420, 'iOS'), labelled(`${home}-android`, 420, 'Android')], 90, 280, 60))
png('ig-4', 1080, 1350, `<div style="position:absolute;left:80px;top:90px;font-size:56px;font-weight:600;letter-spacing:-.02em">Light <em>and</em> dark.</div>` + row([labelled(third, 420, 'Light'), labelled(`${third}-dark`, 420, 'Dark')], 90, 280, 60))
png('ig-5', 1080, 1350, `<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center"><div>${mark.replace('height:34px', 'height:60px;margin:0 auto')}<div style="margin-top:50px;font-size:72px;line-height:1.05;font-weight:600;letter-spacing:-.03em">Describe an app.<br>Get <em>every screen.</em></div><div style="margin-top:30px;font-size:30px;color:${MUTED}">Beta opens soon — follow to get in first.</div></div></div>`)

fs.rmSync(TMP, { recursive: true })
console.log(JSON.stringify({ out: OUT, app: plan.appName, prompt, count, edited, screens: { hero: [a, b, c], iosAndroid: home, lightDark: [last, third] } }))
process.exit(0)
