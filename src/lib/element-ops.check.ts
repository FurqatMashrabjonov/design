import assert from 'node:assert'
import { attr, findById, ownTextRanges, parseTree, textOf } from './html-tree.ts'
import { applyEdits, parseAffects, parseEdits } from './screen-patch.ts'
import { annotateElements, describeElement, duplicateElement, elementInfo, ElementOpError, isTextEditable, moveElement, removeElement, setElementText, setImageQuery } from './element-ops.ts'

// --- tree ---
{
  const html = `<!doctype html><html><head><style>div>p{}</style><script>if (a<b) document.write("<div>")</script></head><body><ul><li>One<li>Two</ul><svg><path d="M0"/></svg><img src="x"><p>Hi <b>there</b></p><!-- <p>no</p> --></body></html>`
  const root = parseTree(html)
  const body = root.children[0].children[1]
  assert.equal(body.tag, 'body')
  assert.deepEqual(body.children.map((c) => c.tag), ['ul', 'svg', 'img', 'p'], 'raw text, comments and voids do not create elements')
  const ul = body.children[0]
  assert.equal(html.slice(ul.start, ul.end), '<ul><li>One<li>Two</ul>')
  // No implicit-close rules: an unclosed <li> contains the next one, and both end at </ul>.
  assert.equal(html.slice(ul.children[0].start, ul.children[0].end), '<li>One<li>Two', 'lenient with unclosed tags')
  assert.equal(html.slice(ul.children[0].children[0].start, ul.children[0].children[0].end), '<li>Two')
  assert.equal(body.children[1].children[0].tag, 'path', 'self-closed children')
  const p = body.children[3]
  assert.equal(textOf(html, p), 'Hi there')
  assert.deepEqual(ownTextRanges(html, p).map(([a, b]) => html.slice(a, b)), ['Hi '])
  assert.equal(attr(parseTree('<a href=x data-on>').children[0], 'data-on'), '')
  assert.equal(attr(parseTree(`<a title='q"z'>`).children[0], 'title'), 'q"z')
}

// --- annotation ---
const screen = `<!doctype html><html><head><title>Home</title></head><body>
<header data-od-id="header"><h1>Good evening, Mei</h1></header>
<main>
  <div class="card featured"><img data-od-img="pad thai" src="https://images.pexels.com/1.jpeg" data-od-img-resolved alt="Pad Thai"><p>Pad Thai <span class="price">$12.99</span></p></div>
  <button class="btn"><i data-lucide="plus"></i> Add to cart</button>
  <p id="note">Free delivery over $20</p>
  <div class="wrap"><span>plain</span></div>
</main>
<nav data-od-shell="bottom-nav"><a data-od-tab="home"><svg data-od-icon></svg><span>Home</span></a></nav>
</body></html>`

const a1 = annotateElements(screen)
assert.equal(annotateElements(a1), a1, 'idempotent: the browser and the server arrive at the same ids')
const ids = [...a1.matchAll(/data-od-id="([^"]+)"/g)].map((m) => m[1])
assert.deepEqual(ids, ['header', 'h1-1', 'main-1', 'card-1', 'img-1', 'p-1', 'price-1', 'button-1', 'p-2'])
assert.ok(!/<nav data-od-shell[^]*data-od-id/.test(a1.slice(a1.indexOf('<nav data-od-shell'))), 'shell markup is left byte-identical')
assert.ok(!a1.includes('<i data-lucide="plus" data-od-id'), 'icons are not selectable')
assert.ok(!a1.includes('class="wrap" data-od-id'), 'a plain wrapper div is not selectable')
assert.equal(a1.replace(/ data-od-id="[^"]+"/g, ''), screen.replace(/ data-od-id="[^"]+"/g, ''), 'only attributes are added')
assert.deepEqual([...annotateElements('<p data-od-id="p-1">a</p><p>b</p>').matchAll(/data-od-id="([^"]+)"/g)].map((m) => m[1]), ['p-1', 'p-2'], 'new ids never collide with saved ones')
assert.equal(annotateElements('<section data-od-id="hero">a</section><section data-od-id="hero">b</section><section data-od-id="hero-2">c</section>'), '<section data-od-id="hero">a</section><section data-od-id="hero-1">b</section><section data-od-id="hero-2">c</section>', 'a duplicated id is renumbered on the later element, never clashing with a saved one')
assert.equal(annotateElements('<section data-od-id="Hero Section!">a</section><div data-od-id="">b</div>'), '<section data-od-id="hero-section-1">a</section><div data-od-id="div-1">b</div>', 'ids that are not plain tokens are renamed deterministically')
assert.ok(annotateElements('<img src="a"/>').includes('<img src="a" data-od-id="img-1"/>'), 'self-closed tags keep their slash')

const el = (id: string) => findById(parseTree(a1), id)!
assert.equal(describeElement(a1, el('button-1')), 'Button “Add to cart”')
assert.equal(describeElement(a1, el('img-1')), 'Image “Pad Thai”')
assert.equal(describeElement(a1, el('card-1')), 'Card “Pad Thai $12.99”')
assert.equal(describeElement(a1, el('h1-1')), 'Heading “Good evening, Mei”')
assert.equal(describeElement(annotateElements('<p>This sentence is far too long for a label</p>'), parseTree(annotateElements('<p>This sentence is far too long for a label</p>')).children[0]), 'Text “This sentence is far too lo…”')

// --- editing text ---
assert.ok(isTextEditable(a1, el('button-1')), 'text beside an icon is editable')
assert.ok(!isTextEditable(a1, el('p-1')), 'text split with a nested element is not: the person would retype text that lives elsewhere')
assert.ok(!isTextEditable(a1, el('img-1')))
const t = setElementText(a1, 'button-1', 'Order <now> & pay')
assert.equal(t.before, 'Add to cart')
assert.ok(t.html.includes('<button class="btn" data-od-id="button-1"><i data-lucide="plus"></i> Order &lt;now&gt; &amp; pay</button>'), 'the icon stays, the text is escaped')
assert.equal(t.html.replace(/<button[^]*?<\/button>/, ''), a1.replace(/<button[^]*?<\/button>/, ''), 'nothing else changes')
assert.throws(() => setElementText(a1, 'p-1', 'x'), ElementOpError)
assert.throws(() => setElementText(a1, 'button-1', '   '), /empty/)
assert.throws(() => setElementText(a1, 'nope', 'x'), /no longer on this screen/)
assert.throws(() => setElementText(a1, 'button-1', 'x'.repeat(501)), /too long/)

// --- structure ---
const removed = removeElement(a1, 'p-2')
assert.ok(!removed.includes('Free delivery') && !removed.includes('\n\n  <div class="wrap">'), 'removed with its line')
assert.throws(() => removeElement(a1, 'main-1'), /main container/)

const dup = duplicateElement(a1, 'button-1')
assert.equal((dup.match(/Add to cart/g) ?? []).length, 2)
const dupIds = [...dup.matchAll(/data-od-id="([^"]+)"/g)].map((m) => m[1])
assert.equal(new Set(dupIds).size, dupIds.length, 'the copy gets fresh ids')
assert.ok(dup.includes('</button>\n  <button class="btn" data-od-id="button-2">'), 'placed right after, on its own line')

const up = moveElement(a1, 'button-1', 'up')
assert.ok(up.indexOf('Add to cart') < up.indexOf('class="card featured"'), 'moved above the card')
assert.equal(moveElement(up, 'button-1', 'down'), a1, 'down undoes up')
assert.throws(() => moveElement(a1, 'card-1', 'up'), /already first/)
assert.throws(() => moveElement(a1, 'h1-1', 'down'), /already last/)

const photo = setImageQuery(a1, 'img-1', 'green curry, top view!')
assert.ok(photo.includes('<img alt="Pad Thai" data-od-id="img-1" data-od-img="green curry, top view">'), 'an empty slot again, with the new description')
assert.throws(() => setImageQuery(a1, 'button-1', 'x'), /Only photos/)
assert.throws(() => setImageQuery(annotateElements('<img data-od-avatar="Mei Tanaka" src="a">'), 'img-1', 'x'), /Only photos/)

assert.deepEqual(elementInfo(a1, 'img-1'), { label: 'Image “Pad Thai”', textEditable: false, isPhoto: true, photoQuery: 'pad thai' })
assert.equal(elementInfo(a1, 'button-1').textEditable, true)

// --- editing a whole screen by parts (EDT-19) ---
{
  const reply = `Sure! Here are the changes.
<edit target="button-1"><button class="btn" data-od-id="button-1"><i data-lucide="bag"></i> Checkout</button></edit>
<edit target="p-2" op="delete"></edit>
<edit after="card-1">
\`\`\`html
<p class="promo">Free delivery tonight</p>
\`\`\`
</edit>
<edit before="h1-1"><span>Hi</span></edit>
<edit target="card-1"><div>whole card</div></edit>
<edit target="p-1"><p>inside the card</p></edit>
<edit target="nowhere"><p>x</p></edit>
<edit target="h1-1" op="delete"></edit>`
  const edits = parseEdits(reply)
  assert.deepEqual(edits.map((e) => `${e.op}:${e.target}${e.where ? ':' + e.where : ''}`), ['replace:button-1', 'delete:p-2', 'insert:card-1:after', 'insert:h1-1:before', 'replace:card-1', 'replace:p-1', 'replace:nowhere', 'delete:h1-1'])
  assert.equal(edits[2].html, '<p class="promo">Free delivery tonight</p>', 'a fenced body is unwrapped')

  const r = applyEdits(a1, edits)
  assert.deepEqual(r.applied.map((x) => x.target), ['button-1', 'p-2', 'card-1', 'h1-1', 'card-1', 'h1-1'], 'inserting before an element and deleting it do not clash')
  assert.deepEqual(r.skipped, ['replace p-1: overlaps another change', 'replace nowhere: not on this screen'], 'an edit inside a replaced element, or on a missing one, is skipped')
  assert.ok(r.html.includes('<i data-lucide="bag"></i> Checkout</button>') && !r.html.includes('Free delivery over'))
  assert.ok(r.html.includes('<div>whole card</div>\n<p class="promo">Free delivery tonight</p>'), 'an insertion after a replaced element lands after the new version')
  assert.ok(r.html.includes('<header data-od-id="header"><span>Hi</span>\n</header>'), 'inserted before the heading, which was then deleted')
  assert.equal(r.html.slice(r.html.indexOf('<nav data-od-shell')), a1.slice(a1.indexOf('<nav data-od-shell')), 'the shell and everything untouched is byte-identical')
  assert.deepEqual(applyEdits(a1, [{ op: 'replace', target: 'bottom-nav', html: 'x' }]).skipped, ['replace bottom-nav: not on this screen'])
  assert.deepEqual(parseEdits('<artifact title="x"><!doctype html></artifact>'), [], 'a full document is not an edit')
  assert.deepEqual(parseAffects('<affects>row-2, total-1,\n row-2 "bad id"</affects>'), ['row-2', 'total-1'])
  assert.deepEqual(parseAffects('no line'), [])
}


// --- lib/undo-stack.ts (EDT-12) ---
{
  const { UndoStack, messageStep, pairStep } = await import('./undo-stack.ts')
  const log: string[] = []
  const stack = new UndoStack()
  stack.record(pairStep(async () => log.push('undo a'), async () => log.push('redo a')))
  stack.record(pairStep(async () => log.push('undo b'), async () => log.push('redo b')))
  assert.equal(await stack.undo(), true)
  assert.equal(await stack.undo(), true)
  assert.equal(await stack.undo(), false, 'nothing left to undo')
  assert.equal(await stack.redo(), true)
  stack.record(pairStep(async () => log.push('undo c'), async () => log.push('redo c')))
  assert.equal(await stack.redo(), false, 'a new step clears the redo side')
  assert.equal(await stack.undo(), true)
  assert.deepEqual(log, ['undo b', 'undo a', 'redo a', 'undo c'])
  // a failing step is dropped and its error surfaces
  stack.record(pairStep(async () => { throw new Error('no') }, async () => {}))
  await assert.rejects(stack.undo(), /no/)
  assert.equal(stack.past.length, 1)
  // a message chain: undo reverts the message, redo reverts the revert
  const reverted: string[] = []
  const step = messageStep(async (id) => { reverted.push(id); return `rev(${id})` }, 'm1')
  await step.undo(); await step.redo(); await step.undo()
  assert.deepEqual(reverted, ['m1', 'rev(m1)', 'rev(rev(m1))'])
}

// --- canvas.ts framesIn (EDT-30 rubber band) ---
{
  const { framesIn } = await import('../canvas.ts')
  const frames = [
    { id: 'a', x: 0, y: 0, width: 100, height: 200 },
    { id: 'b', x: 150, y: 0, width: 100, height: 200 },
    { id: 'c', x: 300, y: 300, width: 100, height: 200 },
  ]
  assert.deepEqual(framesIn({ x: 50, y: 50, w: 150, h: 50 }, frames), ['a', 'b'], 'touching is enough')
  assert.deepEqual(framesIn({ x: 101, y: 0, w: 48, h: 10 }, frames), [], 'the gap between frames selects nothing')
  assert.deepEqual(framesIn({ x: 0, y: 0, w: 400, h: 500 }, frames), ['a', 'b', 'c'])
}

// --- lib/zip.ts and lib/export-app.ts (EXP-03) ---
{
  const { zip, crc32 } = await import('./zip.ts')
  const zlib = await import('node:zlib')
  const sample = new TextEncoder().encode('Déjà vu — ü')
  assert.equal(crc32(sample), zlib.crc32(sample), 'crc32 matches Node')
  const archive = zip([{ name: 'index.html', data: '<h1>hi</h1>' }, { name: 'screens/ünï.html', data: sample }])
  const dv = new DataView(archive.buffer)
  const end = archive.length - 22
  assert.equal(dv.getUint32(end, true), 0x06054b50, 'ends with the end-of-central-directory record')
  assert.equal(dv.getUint16(end + 10, true), 2, 'two entries')
  let at = dv.getUint32(end + 16, true)
  const names: string[] = []
  for (let i = 0; i < 2; i++) {
    assert.equal(dv.getUint32(at, true), 0x02014b50)
    const len = dv.getUint16(at + 28, true)
    const local = dv.getUint32(at + 42, true)
    assert.equal(dv.getUint32(local, true), 0x04034b50, 'each central entry points at its local header')
    names.push(new TextDecoder().decode(archive.subarray(at + 46, at + 46 + len)))
    at += 46 + len
  }
  assert.deepEqual(names, ['index.html', 'screens/ünï.html'])

  const { exportApp } = await import('./export-app.ts')
  const page = (body: string) => `<!doctype html><html><head><style>:root{--accent:#111}</style></head><body>${body}</body></html>`
  const files = exportApp(
    [
      { id: 'b', name: 'Dish Detail — GoBite', x: 500, screenType: 'detail-view', activeTabId: null, parentScreenName: 'Home', html: page('<button data-od-back="Home">‹</button>') },
      { id: 'a', name: 'Home', x: 0, screenType: 'root-tab', activeTabId: 'home', parentScreenName: null, html: page('<a data-od-link="Dish Detail">Pad Thai</a><a data-od-link="Dish &amp; Detail">x</a><nav><a data-od-tab="home">Home</a><a data-od-tab="orders">Orders</a></nav>') },
      { id: 'c', name: 'Home', x: 900, screenType: 'root-tab', activeTabId: 'orders', parentScreenName: null, html: page('orders') },
      { id: 'd', name: 'Failed', x: 1200, screenType: 'root-tab', activeTabId: null, parentScreenName: null, html: '' },
    ],
    { accent: '#2563eb' },
    'Go<Bite>',
  )
  assert.deepEqual(files.map((f) => f.name), ['index.html', 'screens/home.html', 'screens/dish-detail-gobite.html', 'screens/home-2.html'], 'canvas order, unique names, failed screens left out')
  assert.ok(files[0].data.includes('Go&lt;Bite&gt;') && files[0].data.includes('href="screens/dish-detail-gobite.html"'), 'the index lists every screen, escaped')
  const home = files[1].data
  assert.ok(home.includes('"Dish Detail":"dish-detail-gobite.html"'), 'a link resolves by planned name to the file')
  assert.ok(home.includes('"Dish & Detail":'), 'keys are decoded, as getAttribute returns them')
  assert.ok(home.includes('"orders":"home-2.html"') && home.includes('"home":"home.html"'), 'tabs resolve to their root screens')
  assert.ok(files[2].data.includes('"Home":"home.html"'), 'Back resolves to the parent')
  assert.ok(home.includes('#2563eb'), 'the theme is baked in')
  assert.deepEqual(exportApp([{ id: 'x', name: 'Café Menü', x: 0, screenType: 'root-tab', activeTabId: null, parentScreenName: null, html: page('') }, { id: 'y', name: 'Главная', x: 1, screenType: 'root-tab', activeTabId: null, parentScreenName: null, html: page('') }], null, 'A').map((f) => f.name), ['index.html', 'screens/cafe-menu.html', 'screens/screen.html'], 'file names are ASCII')
}

// --- lib/ds-sample.ts (THM-08) ---
{
  const { designSystemSample } = await import('./ds-sample.ts')
  const root = ':root {\n  --accent: #ff385c;\n  --bg: #fff;\n  --fg: #222;\n  --border: #ddd;\n  --radius-md: 8px;\n  --radius-pill: 9999px;\n}'
  const html = designSystemSample(root, ['https://fonts.googleapis.com/css2?family=Inter', 'https://evil.example/x.css'], 'Air<bnb>')
  assert.ok(html.includes('--accent: #ff385c'), 'the tokens are the page\'s own :root')
  assert.ok(html.includes('background:var(--accent)') && !html.includes('var(--success)'), 'a swatch per token the system defines, none for missing ones')
  assert.ok(html.includes('border-radius:var(--radius-pill)') && !html.includes('border-radius:var(--radius-lg)'), 'radii likewise')
  assert.ok(html.includes('fonts.googleapis.com') && !html.includes('evil.example'), 'only Google Fonts stylesheets are linked')
  assert.ok(html.includes('Air&lt;bnb&gt;'), 'the name is escaped')
  assert.ok(html.includes('class="cols"') && html.split('<section>').length === 3, 'THM-09: two columns, so the frame is wide and not mistaken for a screen')
  assert.ok(!/#[0-9a-f]{3,6}/i.test(html.replace(root, '').replace(/#fff\b/, '')), 'no colour is hardcoded outside the tokens (so the theme restyles everything)')
}

// --- lib/charts.ts (KIT-03) ---
{
  const { renderCharts } = await import('./charts.ts')
  const bar = renderCharts('<main><div data-od-chart="bar" data-values="2,4,8" data-labels="A,B,C" data-highlight="2"></div></main>')
  assert.ok(bar.includes('data-od-chart-rendered') && (bar.match(/<rect /g) ?? []).length === 3, 'one bar per value')
  assert.ok(bar.includes('height="100"') && bar.includes('height="50"') && bar.includes('height="25"'), 'bar heights follow the values (8 is the top)')
  assert.ok(/<rect [^>]*height="100"[^>]*fill="var\(--accent\)"/.test(bar) && bar.includes('transparent 72%'), 'the highlighted bar is full accent, the rest are tinted')
  assert.ok(bar.includes('>C</span>') && bar.includes('height:160px'), 'labels under the chart, default height')
  assert.equal(renderCharts(bar), bar, 'idempotent')
  const line = renderCharts('<div data-od-chart="area" data-values="10,20,15" style="height:90px"></div>')
  assert.ok(line.includes('M0 92 L50 8 L100 50') && line.includes('Z" fill=') && line.includes('height:90px'), 'line runs min→max across the box, area filled, the model\'s height kept')
  const ring = renderCharts('<div data-od-chart="ring" data-values="7.2" data-max="10" data-unit="k" data-labels="steps"></div>')
  assert.ok(ring.includes('stroke-dasharray="72 28"') && ring.includes('7.2k') && ring.includes('steps'), 'ring shows value / max')
  const donut = renderCharts('<div data-od-chart="donut" data-values="50,30,20" data-labels="Food,Rent,Fun &amp; &lt;b&gt;games"></div>')
  assert.ok(donut.includes('>50%<') && donut.includes('Fun &amp; &lt;b&gt;games<'), 'donut legend with shares, labels decoded once and escaped once')
  const heat = renderCharts('<div data-od-chart="heatmap" data-values="0,1,2,4,0,3,4,1" data-columns="4"></div>')
  assert.ok(heat.includes('repeat(4,1fr)') && (heat.match(/aspect-ratio:1/g) ?? []).length === 8 && heat.includes('background:var(--border)'), 'heatmap: one cell per day, empty days neutral')
  assert.ok(!heat.includes('height:0px'), 'a heatmap sizes itself')
  for (const bad of ['<div data-od-chart="pie3d" data-values="1,2"></div>', '<div data-od-chart="bar" data-values="5"></div>', '<div data-od-chart="bar" data-values="1,2"><span>x</span></div>'])
    assert.equal(renderCharts(bad), bad, `left as written: ${bad}`)
  assert.ok(!/<img/i.test(renderCharts('<div data-od-chart="bar" data-values="1,2" data-labels="&lt;img src=x onerror=alert(1)&gt;,b"></div>')), 'an encoded tag in a label stays text')
}

// --- lib/render-audit.ts (EYE-01): findings from a sandboxed page are validated ---
{
  const { parseAudit, AUDIT_SOURCE } = await import('./render-audit.ts')
  assert.deepEqual(parseAudit([{ rule: 'low-contrast', id: 'price-2', detail: '$4 2.1:1' }, { rule: 'evil', id: 'x' }, { rule: 'overlap', id: '<script>', detail: 7 }, null, 'x']), [
    { rule: 'low-contrast', id: 'price-2', detail: '$4 2.1:1' },
    { rule: 'overlap', id: null, detail: '' },
  ])
  assert.deepEqual(parseAudit('nope'), [])
  assert.equal(parseAudit(Array.from({ length: 99 }, () => ({ rule: 'overflow', id: 'a', detail: '' }))).length, 40, 'capped')
  assert.ok(AUDIT_SOURCE.includes('MIN_TARGET = 44') && AUDIT_SOURCE.includes('TEXT = 4.5'), 'the audit uses the HIG numbers')
  assert.doesNotThrow(() => new Function(AUDIT_SOURCE), 'the audit source is valid JavaScript')
  assert.deepEqual(parseAudit([{ rule: 'squeezed-text', id: 'title-3', detail: 'x' }]).map((f) => f.rule), ['squeezed-text'], 'GQ-01: a squeezed text column is a finding')
}

console.log('ok')
