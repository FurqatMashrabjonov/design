import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'
import { computeMetrics, diffMetrics, jaccard, structureShingles, visibleText } from './metrics.ts'
import { abHtml, compareHtml, sheetHtml, FRAME, type BriefResult } from './sheet.ts'

// EVAL-01: the brief set is fixed and every brief is runnable.
const briefs: { id: string; brief: string; designSystem: string; kind?: string; lang?: string; appType: string; expect: string[] }[] =
  JSON.parse(readFileSync('eval/briefs.json', 'utf8'))
// 25 original briefs, plus 3 (GQ-06) that count their screens / pick "auto" (GQ-03).
assert.equal(briefs.length, 28)
assert.equal(new Set(briefs.map((b) => b.id)).size, 28, 'brief ids are unique')
assert.equal(briefs.filter((b) => b.kind === 'vague').length, 5)
assert.equal(briefs.filter((b) => b.lang).length, 3)
assert.ok(new Set(briefs.map((b) => b.appType)).size >= 10, 'at least 10 app types')
for (const b of briefs) {
  assert.match(b.id, /^[a-z0-9-]+$/, `${b.id}: id is used as a file name`)
  assert.ok(b.designSystem === 'auto' || existsSync(`design-systems/${b.designSystem}/tokens.css`), `${b.id}: unknown design system ${b.designSystem}`)
  assert.ok(b.brief.length > 0 && b.brief.length <= 4000, `${b.id}: brief length`)
  assert.ok(b.expect.length > 0, `${b.id}: expected archetypes listed`)
}

// EVAL-02: the sheet frames every screen at phone width, sandboxed, and escapes model-written text.
const run: BriefResult[] = [
  {
    id: 'a',
    brief: 'todo <b>app</b>',
    designSystem: 'minimal',
    appName: 'Task"Flow',
    ms: 51000,
    errors: ['2: Model returned incomplete HTML'],
    screens: [{ file: 'screens/a-0.html', name: '<script>x</script>', screenType: 'root-tab', ms: 20000, chars: 29800 }],
  },
]
const sheet = sheetHtml('now', run)
assert.ok(sheet.includes(`width:${FRAME.width}px`) && FRAME.width === 390, 'screens render at 390px')
assert.ok(sheet.includes('sandbox="allow-scripts"') && !sheet.includes('allow-same-origin'), 'generated HTML stays sandboxed')
assert.ok(sheet.includes('src="screens/a-0.html"'))
assert.ok(!sheet.includes('<script>x</script>') && !sheet.includes('<b>app</b>'), 'model text is escaped')
assert.ok(sheet.includes('Model returned incomplete HTML'), 'errors are shown')

const cmp = compareHtml('now', run, 'before', [{ ...run[0], screens: [{ ...run[0].screens[0], file: 'screens/a-0.html' }] }])
assert.ok(cmp.includes('src="../before/screens/a-0.html"') && cmp.includes('src="screens/a-0.html"'), 'both runs side by side')
assert.ok(compareHtml('now', run, 'before', []).includes('no previous run'))

// EVAL-04: the A/B page hides which run is which and only pairs briefs both runs produced.
const two: BriefResult[] = ['a', 'b', 'c', 'd'].map((id) => ({ ...run[0], id }))
const ab = abHtml('now', two, 'before', [...two.slice(0, 3), { ...two[3], screens: [] }])
assert.equal(ab.match(/<section /g)?.length, 3, 'a brief with no screens on one side is not rated')
assert.ok(!/<(b|span|h1|p)[^>]*>[^<]*(now|before)/.test(ab), 'run labels never appear as visible text')
const sides = Object.values(JSON.parse(ab.match(/CUR = (\{.*?\})\n/)![1]))
assert.ok(sides.includes('A') && sides.includes('B'), 'the current run is not always the same letter')
assert.ok(ab.includes('localStorage') && ab.includes('try {'), 'votes persist, and storage failures are tolerated')

// EVAL-03: metrics are deterministic and catch the known failure modes.
const circle = '<svg data-od-icon width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'
const pageA = `<!doctype html><html><head><title>Lesson complete — Duo</title><style>.x{color:red}</style></head><body><main><section><h2>Lesson complete</h2><p>streak for Maya Chen</p><ul><li>a</li><li>b</li></ul></section></main><nav data-od-shell="bottom-nav">${circle}</nav></body></html>`
const pageB = `<!doctype html><html><body><main><section><h2>Balance</h2><p>Hello Timur</p><ul><li>a</li><li>b</li></ul></section></main></body></html>`
const pageC = `<!doctype html><html><body><header><img src="x"><h1>Feed</h1></header><article><figure><img src="y"><figcaption>z</figcaption></figure></article></body></html>`
assert.ok(!visibleText(pageA).includes('color:red') && visibleText(pageA).includes('Lesson complete'))
assert.ok(jaccard(structureShingles(pageA), structureShingles(pageB)) > jaccard(structureShingles(pageA), structureShingles(pageC)), 'same skeleton scores higher than a different one')
assert.equal(jaccard(structureShingles(pageB), structureShingles(pageB)), 1)

const scr = (briefId: string, designSystem: string, screenType: string, html: string, name = 'Feed') => ({ briefId, designSystem, name, screenType, ms: 1000, html })
const m = computeMetrics(
  [scr('cal', 'duolingo', 'root-tab', pageA, 'Cal — Profile'), scr('cal', 'duolingo', 'root-tab', pageC), scr('bank', 'minimal', 'root-tab', pageB, 'Profile'), scr('bank', 'minimal', 'detail-view', pageC)],
  [5000, 7000],
  1,
  { calls: 2, promptTokens: 1_000_000, cachedTokens: 0, completionTokens: 0 },
)
assert.equal(m.bugs.brandLeakScreens, 1, 'design system brand in copy is a leak')
assert.equal(m.bugs.fallbackIcons, 1)
assert.equal(m.bugs.defaultPersonaBriefs, 1)
assert.equal(m.bugs.rootTabShare, 0.75)
assert.equal(m.bugs.briefsWithoutDetail, 1)
assert.equal(m.sameness.pairs, 4, 'only cross-brief pairs are compared')
assert.equal(m.sameness.sameKindPairs, 1, 'profile vs profile across apps')
assert.ok(m.sameness.sameKindMean > m.sameness.crossBriefMean)
assert.equal(m.usage?.estCostUsd, 0.27)
assert.equal(computeMetrics([scr('x', 'stripe', 'root-tab', '<body><p>Pay with Stripe</p></body>')], [1], 0).bugs.brandLeakScreens, 0, 'a brand in ordinary copy is not a leak')
assert.deepEqual(diffMetrics({ a: { b: 1, c: 2 } }, { a: { b: 1, c: 3 }, d: 4 }), ['a.c: 2 → 3', 'd: — → 4'])

console.log('ok')

// GQ-08: the judge's reply parser and rubric
{
  const { parseJudgement, RUBRIC, PAIRWISE } = await import('./judge.ts')
  assert.deepEqual(parseJudgement<{ coherence: number }>('```json\n{"coherence": 4}\n```'), { coherence: 4 }, 'a fenced reply parses')
  assert.equal(parseJudgement('no json here'), null)
  assert.equal(parseJudgement('{broken'), null)
  for (const k of ['hierarchy', 'spacing', 'polish', 'fidelity', 'overall', 'coherence']) assert.ok(RUBRIC.includes(k), `the rubric scores ${k}`)
  assert.ok(RUBRIC.includes('"competent but generic" is a 3'), 'the rubric anchors generic output at 3')
  assert.ok(PAIRWISE.includes('"winner":"A"|"B"|"tie"'))
}
