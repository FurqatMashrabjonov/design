// Run with the alias hook (see package.json "check").
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { repairPartialHtml } from './partial-html.ts'
import { extractArtifact } from '../artifact.ts'
import { applyThemeOverride } from './theme-override.ts'

assert.equal(repairPartialHtml('Here is a complete, mobile-first HTML document'), '', 'a preamble alone shows nothing')
assert.equal(repairPartialHtml('<!doctype html><html><head><style>.a{color:red'), '<!doctype html><html><head></head><body></body></html>', 'an open <style> is dropped whole')
assert.equal(repairPartialHtml('<!doctype html><html><head></head><body><p>Hi</p><span class="pri'), '<!doctype html><html><head></head><body><p>Hi</p></body></html>', 'an unfinished tag is cut')
assert.equal(repairPartialHtml('<html><body><p>Fish &am'), '<html><body><p>Fish </body></html>', 'an unfinished entity is cut')
assert.ok(!repairPartialHtml('<html><body><p>a</p><script>document.querySelector(').includes('querySelector'), 'an open <script> is dropped whole')
assert.ok(repairPartialHtml('<html><head><style>.a{}</style><body><div>x</div>').endsWith('<div>x</div></body></html>'))

// Every prefix of two real streams renders no code as text, and a theme overlay lands inside the
// document rather than after it (the bug: our own script appended to a cut attribute).
const visibleText = (html: string) => html.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ')
const CODE = /addEventListener|querySelector|\{\s*[a-z-]+\s*:|:\s*var\(--|<\/?[a-z]+[\s>]/i
for (const f of ['feast-home-claude', 'feast-home-deepseek']) {
  const deltas: [number, string][] = JSON.parse(readFileSync(`eval/fixtures/streams/${f}.json`, 'utf8'))
  const full = deltas.map((d) => d[1]).join('')
  let shown = 0
  for (let p = 1; p <= 100; p++) {
    const cut = full.slice(0, Math.floor((full.length * p) / 100))
    const repaired = repairPartialHtml(extractArtifact(cut).html)
    if (!repaired) continue
    const themed = applyThemeOverride(repaired, { accent: '#eab308' })
    assert.ok(/<\/body>\s*<\/html>$/.test(themed), `${f} @${p}%: closed`)
    assert.ok((themed.match(/<style\b/gi) ?? []).length === (themed.match(/<\/style>/gi) ?? []).length, `${f} @${p}%: styles balanced`)
    assert.ok(!CODE.test(visibleText(themed)), `${f} @${p}%: no code in the visible text: ${visibleText(themed).match(CODE)?.[0]}`)
    if (/<body\b[^>]*>\s*<[a-z]/i.test(themed)) shown++
  }
  assert.ok(shown > 0, `${f}: some prefixes show content`)
}
console.log('ok')
