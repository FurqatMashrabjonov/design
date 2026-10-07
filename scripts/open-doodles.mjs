// ILL-01: Pablo Stanley's Open Doodles (CC0, opendoodles.com) as kit modules — runtime/doodles/<scene>.js, each the
// drawing's inner SVG with its ink as currentColor and its one accent as var(--od-doodle-accent), cropped to the
// drawing (its bounding box, measured in headless Chrome). Loaded one at a time by the kit's <Doodle>.
//   node scripts/open-doodles.mjs      (needs network, npx and Chrome; the output is committed)
import { execSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SKIP = new Set(['bikini', 'zombieing', 'moshing']) // off-brief for app screens
const RENAME = { Doggie: 'dog' }
const tmp = mkdtempSync(join(tmpdir(), 'od-doodles-'))
const raw = join(tmp, 'raw'), min = join(tmp, 'min')
mkdirSync(raw); mkdirSync(min)

const page = execSync('curl -sL https://www.opendoodles.com/').toString()
const urls = [...new Set(page.match(/opendoodles\.s3[^"' ]+\.svg/g))]
for (const u of urls) execSync(`curl -sL -o "${join(raw, u.split('/').pop())}" "https://${u}"`)
execSync(`npx -y svgo@3 -q -f "${raw}" -o "${min}" --precision=1 --multipass`)

const inner = (f) => readFileSync(join(min, f), 'utf8').trim().replace(/^<svg[^>]*>|<\/svg>$/g, '')
const files = readdirSync(min).filter((f) => f.endsWith('.svg') && !SKIP.has(f.slice(0, -4)))
writeFileSync(join(tmp, 'b.html'), `<body>${files.map((f) => `<svg id="${f.slice(0, -4)}" width="1024" height="768" viewBox="0 0 1024 768">${inner(f)}</svg>`).join('')}<script>document.body.dataset.b = JSON.stringify(Object.fromEntries([...document.querySelectorAll('svg')].map((s) => { const b = s.getBBox(); return [s.id, [b.x, b.y, b.width, b.height].map(Math.round)] })))</script></body>`)
const dom = spawnSync(CHROME, ['--headless=new', '--dump-dom', `file://${join(tmp, 'b.html')}`]).stdout.toString()
const boxes = JSON.parse(dom.match(/data-b="([^"]*)"/)[1].replaceAll('&quot;', '"'))

rmSync('runtime/doodles', { recursive: true, force: true })
mkdirSync('runtime/doodles')
const scenes = []
for (const f of files) {
  const id = f.slice(0, -4), scene = RENAME[id] ?? id
  const [x, y, w, h] = boxes[id], pad = 8
  const body = inner(f).replace(/fill="#000(000)?"/gi, 'fill="currentColor"').replace(/fill="#(FF5678|CF536D)"/gi, 'style="fill:var(--od-doodle-accent)"')
  writeFileSync(`runtime/doodles/${scene}.js`, `// Open Doodles by Pablo Stanley, CC0 (opendoodles.com).\nexport const viewBox = '${x - pad} ${y - pad} ${w + 2 * pad} ${h + 2 * pad}'\nexport default ${JSON.stringify(body)}\n`)
  scenes.push(scene)
}
rmSync(tmp, { recursive: true, force: true })
console.log(`${scenes.length} scenes → runtime/doodles: ${scenes.sort().join(', ')}`)
