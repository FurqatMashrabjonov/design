import assert from 'node:assert'
import { attr, findById, ownTextRanges, parseTree, textOf } from './html-tree.ts'
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

console.log('ok')
