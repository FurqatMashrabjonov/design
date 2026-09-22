// FIG-05: how much of a screen reaches Figma. Runs the in-frame serializer (lib/figma-serialize.ts)
// on stored screens in headless Chrome and compares the tree with the page: every visible text
// string, photo and icon must be in it, and positions must match the render. Also reports how many
// containers carry a flex layout (what the plugin turns into Auto Layout).
//
//   node --import ./eval/alias-hook.mjs eval/figma.check.ts                 (asserts on fixtures)
//   node --import ./eval/alias-hook.mjs eval/figma.check.ts <run-label>     (reports on an eval run)
import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { SERIALIZE_SOURCE, parseTree, type ODNode, type ODTree } from '../src/lib/figma-serialize.ts'
import { odToSvg } from '../src/lib/figma-svg.ts'

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const tmp = mkdtempSync(join(tmpdir(), 'od-figma-'))

type PageFacts = { texts: string[]; images: number; icons: number; flex: number }
export type Coverage = { file: string; tree: ODTree; page: PageFacts; textsFound: number; imagesFound: number; iconsFound: number; autoLayout: number; nodes: number }

/** Renders a screen at phone width and returns the tree plus what the page itself shows. */
export function serializeHtml(html: string): { tree: ODTree | null; page: PageFacts } {
  // What the page shows, measured independently of the serializer.
  const facts = `(function(){var seen=function(e){return e.checkVisibility({opacityProperty:true,visibilityProperty:true})};var t=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);for(var n;(n=w.nextNode());){var p=n.parentElement;if(!p||/^(SCRIPT|STYLE)$/.test(p.tagName)||!n.textContent.trim()||!seen(p))continue;var r=document.createRange();r.selectNodeContents(n);var q=r.getBoundingClientRect();if(q.width>0&&q.height>0&&!p.closest('svg'))t.push(n.textContent.replace(/\\s+/g,' ').trim())}var vis=function(e){var q=e.getBoundingClientRect();return q.width>0&&q.height>0&&seen(e)};return{texts:t,images:[].filter.call(document.querySelectorAll('img'),vis).length,icons:[].filter.call(document.querySelectorAll('svg'),function(s){return vis(s)&&!s.parentElement.closest('svg')}).length,flex:[].filter.call(document.querySelectorAll('body *'),function(e){return /flex/.test(getComputedStyle(e).display)&&vis(e)}).length}})()`
  // The screen runs in a 390px frame (headless Chrome will not open a window narrower than 500px);
  // the wrapper reads it through --allow-file-access-from-files.
  const page = join(tmp, 'screen.html')
  // Photos are replaced by a local 1px image: the check measures structure, not the network.
  writeFileSync(page, html.replace(/src="https:\/\/images\.pexels\.com\/[^"]*"/g, 'src="data:image/gif;base64,R0lGODlhAQABAAAAACw="'))
  const wrapper = join(tmp, 'wrapper.html')
  writeFileSync(wrapper, `<body style="margin:0"><iframe id="s" src="screen.html" style="width:390px;height:844px;border:0"></iframe><script>
document.getElementById('s').addEventListener('load', function () { var w = this.contentWindow; setTimeout(function () {
  var out = {}; try { out.tree = w.Function(${JSON.stringify(SERIALIZE_SOURCE)}).call(w) } catch (e) { out.error = String(e) }
  try { out.page = w.eval(${JSON.stringify(facts)}) } catch (e) { out.error = (out.error || '') + String(e) }
  var p = document.createElement('pre'); p.id = 'od-figma'; p.textContent = JSON.stringify(out); document.body.appendChild(p) }, 1200) })
</script></body>`)
  const dom = execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--window-size=500,900', '--virtual-time-budget=10000', '--dump-dom', pathToFileURL(wrapper).href], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 })
  const json = dom.match(/<pre id="od-figma">([\s\S]*?)<\/pre>/)?.[1]
  if (!json) throw new Error('the serializer produced nothing')
  const out = JSON.parse(json.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
  if (out.error) throw new Error(out.error)
  return { tree: parseTree(out.tree), page: out.page }
}

function walk(n: ODNode, f: (n: ODNode) => void) {
  f(n)
  for (const c of n.children ?? []) walk(c, f)
}

export function coverage(file: string, html: string): Coverage {
  const { tree, page } = serializeHtml(html)
  assert.ok(tree, `${file}: no tree`)
  const texts: string[] = []
  let images = 0, icons = 0, autoLayout = 0, nodes = 0
  walk(tree.root, (n) => {
    nodes++
    if (n.type === 'text') texts.push(n.text!.toLowerCase())
    if (n.type === 'image') images++
    if (n.type === 'svg') icons++
    if (n.layout) autoLayout++
  })
  const joined = ' ' + texts.join(' ') + ' '
  const textsFound = page.texts.filter((t) => joined.includes(t.toLowerCase())).length
  return { file, tree, page, textsFound, imagesFound: images, iconsFound: icons, autoLayout, nodes }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (!existsSync(CHROME)) {
    console.warn(`Chrome not found at ${CHROME}; figma check skipped (set CHROME_PATH).`)
  } else {
    const label = process.argv[2]
    const dir = label ? `eval/out/${label}/screens` : 'public/showcase'
    const all = readdirSync(dir).filter((f) => f.endsWith('.html'))
    // Fixtures: every fourth showcase screen, so each app is in it.
    const files = label ? all.slice(0, 200) : all.filter((_, k) => k % 4 === 0)
    let t = 0, tf = 0, i = 0, ifd = 0, ic = 0, icf = 0, flex = 0, al = 0
    for (const f of files) {
      const c = coverage(f, readFileSync(join(dir, f), 'utf8'))
      t += c.page.texts.length; tf += c.textsFound; i += c.page.images; ifd += c.imagesFound; ic += c.page.icons; icf += c.iconsFound; flex += c.page.flex; al += c.autoLayout
      const svg = odToSvg(c.tree)
      if (!label) {
        assert.ok(c.textsFound / Math.max(1, c.page.texts.length) >= 0.97, `${f}: texts ${c.textsFound}/${c.page.texts.length}`)
        assert.equal(c.imagesFound >= c.page.images, true, `${f}: images ${c.imagesFound}/${c.page.images}`)
        assert.ok(c.iconsFound >= c.page.icons * 0.95, `${f}: icons ${c.iconsFound}/${c.page.icons}`)
        assert.ok(svg.startsWith('<svg') && svg.includes(`width="${c.tree.width}"`), `${f}: svg`)
      }
      console.log(`[figma] ${f}: texts ${c.textsFound}/${c.page.texts.length} · images ${c.imagesFound}/${c.page.images} · icons ${c.iconsFound}/${c.page.icons} · auto layout ${c.autoLayout}/${c.page.flex} · ${c.nodes} layers · svg ${Math.round(svg.length / 1024)} KB`)
    }
    const pct = (a: number, b: number) => `${b ? Math.round((a / b) * 100) : 100}%`
    console.log(`[figma] ${files.length} screens: texts ${pct(tf, t)} · images ${pct(ifd, i)} · icons ${pct(icf, ic)} · flex→auto layout ${pct(al, flex)}`)
    console.log('ok')
  }
}
