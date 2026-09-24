import assert from 'node:assert'
import { DesignSystemService } from './DesignSystemService.ts'
import { SkillService } from './SkillService.ts'
import { composeSystemPrompt, composeElementEditPrompt } from './PromptComposer.ts'
import { annotateHtml } from '../../lib/element-annotator.ts'
import { extractElement, patchElement, listElementIds } from '../../lib/element-patcher.ts'
import { THRESHOLD, WEIGHTS } from './CritiqueService.ts'
import { clampFrameHeight, parseHeightMessage, pinViewportHeight, withHeightProbe, MAX_FRAME_HEIGHT } from '../../lib/frame-height.ts'

console.log('Testing Design Systems...')
const systems = DesignSystemService.list()
assert.ok(systems.length >= 30, `Expected at least 30 design systems, got ${systems.length}`)
assert.ok(DesignSystemService.exists('openai'), 'openai design system must exist')
assert.ok(DesignSystemService.exists('linear-app'), 'linear-app design system must exist')
assert.ok(DesignSystemService.exists('apple'), 'apple design system must exist')
assert.ok(DesignSystemService.exists('stripe'), 'stripe design system must exist')

// Test token CSS presence and prompt injection
const linearTokens = DesignSystemService.readTokensCss('linear-app')
assert.ok(linearTokens.length > 0, 'linear-app should have tokens.css')
const promptWithTokens = composeSystemPrompt('linear-app', 'desktop')
assert.ok(promptWithTokens.includes('Design tokens (CSS custom properties)'), 'Prompt must contain tokens')
assert.ok(promptWithTokens.includes('Element targeting'), 'Prompt must contain data-od-id instruction')

console.log('Testing Skills...')
const skills = SkillService.list()
assert.ok(skills.length >= 10, `Expected at least 10 skills, got ${skills.length}`)
assert.ok(SkillService.exists('frontend-design'), 'frontend-design skill must exist')
assert.ok(SkillService.exists('landing-page'), 'landing-page skill must exist')
assert.ok(SkillService.exists('dashboard'), 'dashboard skill must exist')
assert.ok(SkillService.exists('email-template'), 'email-template skill must exist')
assert.ok(SkillService.exists('pricing-page'), 'pricing-page skill must exist')

const landingPrompt = composeSystemPrompt('minimal', 'desktop', 'landing-page')
assert.ok(landingPrompt.includes('landing-page'), 'Prompt must resolve custom skill')

console.log('Testing Element Annotation & Patching...')
const rawHtml = `<!doctype html>
<html>
<body>
  <header class="navbar"><h1>Logo</h1></header>
  <section class="hero"><p>Welcome</p></section>
  <div class="pricing-card"><h3>$10</h3></div>
  <footer class="footer"><p>Bye</p></footer>
</body>
</html>`

const annotated = annotateHtml(rawHtml)
assert.ok(annotated.includes('data-od-id="navbar"'), 'header should get navbar id')
assert.ok(annotated.includes('data-od-id="hero"'), 'section should get hero id')
assert.ok(annotated.includes('data-od-id="footer"'), 'footer should get footer id')

const ids = listElementIds(annotated)
assert.ok(ids.includes('navbar'), 'navbar id listed')
assert.ok(ids.includes('hero'), 'hero id listed')

// Test element extraction
const heroHtml = extractElement(annotated, 'hero')
assert.ok(heroHtml !== null, 'Hero element must be extracted')
assert.ok(heroHtml!.includes('Welcome'), 'Extracted hero should contain content')

// Test element patching
const newHero = '<section class="hero" data-od-id="hero"><h2>Welcome to Next-Gen Design</h2></section>'
const patched = patchElement(annotated, 'hero', newHero)
assert.ok(patched.includes('Welcome to Next-Gen Design'), 'Patched HTML should contain new element')
assert.ok(patched.includes('data-od-id="navbar"'), 'Navbar must be untouched')
assert.ok(patched.includes('data-od-id="footer"'), 'Footer must be untouched')

// Test composeElementEditPrompt
const elementEditPrompt = composeElementEditPrompt('minimal', 'desktop', annotated, 'hero', heroHtml!, 'Make headline bolder')
assert.ok(elementEditPrompt.includes('data-od-id="hero"'), 'Prompt must specify target element id')
assert.ok(elementEditPrompt.includes('Return ONLY the updated element HTML'), 'Prompt must require scoped output')

console.log('Testing Critique Config...')
assert.equal(THRESHOLD, 8.0, 'Threshold must be 8.0')
const totalWeight = WEIGHTS.layout + WEIGHTS.brandCompliance + WEIGHTS.accessibility + WEIGHTS.copyQuality
assert.ok(Math.abs(totalWeight - 1.0) < 0.001, 'Weights must sum to 1.0')

console.log('Testing App Coherence & Navigation Shell...')
const { parsePlan } = await import('./PlannerService.ts')
const multiPlan = parsePlan(
  JSON.stringify({
    appName: 'SnapCal',
    summary: 'AI nutrition tracker',
    navigation: {
      type: 'bottom-tabs',
      tabs: [
        { id: 'home', label: 'Home', icon: 'home' },
        { id: 'snap', label: 'Snap', icon: 'camera', isAction: true },
        { id: 'stats', label: 'Stats', icon: 'bar-chart-2' },
        { id: 'profile', label: 'Profile', icon: 'user' },
      ],
    },
    screens: [
      { name: 'Home View', description: 'Dashboard', screenType: 'root-tab', activeTabId: 'home' },
      { name: 'Meal Analysis', description: 'Detail', screenType: 'detail-view', parentScreen: 'Home View' },
    ],
  })
)
assert.equal(multiPlan.navigation.tabs.length, 4, 'Must have 4 navigation tabs')
assert.equal(multiPlan.navigation.tabs[1].label, 'Snap', 'Action button tab present')
assert.equal(multiPlan.screens[0].screenType, 'root-tab', 'Screen 1 is root-tab')
assert.equal(multiPlan.screens[1].screenType, 'detail-view', 'Screen 2 is detail-view')

// Verify mobile-screen prompt includes app-consistency craft rules
const mobilePrompt = composeSystemPrompt('minimal', 'mobile')
assert.ok(mobilePrompt.includes('The SHELL CONTRACT wins'), 'Mobile prompt must tell the model not to draw injected chrome')
assert.ok(mobilePrompt.includes('HOUSE STYLE block'), 'Mobile prompt must contain the house-style rule')

console.log('Testing Token Coverage...')
for (const id of DesignSystemService.list().map((d) => d.id)) {
  assert.ok(DesignSystemService.readTokensCss(id).length > 0, `${id} must ship tokens.css`)
  const root = DesignSystemService.readTokensRoot(id)
  assert.ok(root.startsWith(':root {'), `${id} tokens must expose a :root block`)
  assert.ok(!root.includes('/*'), `${id} injected tokens must have comments stripped`)
  assert.ok(root.includes('--accent:'), `${id} must bind --accent`)

  // Text tokens must be legible on the surfaces they sit on. --meta is the one that used to fail:
  // 19 of 29 systems were under AA, and craft/mobile.md tells the model to use it for metadata, so
  // every generated screen inherited the defect. Measured here so it cannot come back.
  const hexOf = (v: string) => { const m = v.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i); if (!m) return null
    const h = m[1]!.length === 3 ? m[1]!.split('').map((c) => c + c).join('') : m[1]!
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) }
  const lumOf = (c: number[]) => { const [r, g, b] = c.map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! }
  const contrastOf = (a: number[], b: number[]) => { const [x, y] = [lumOf(a), lumOf(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05) }
  const tokenValue = (name: string) => { const m = root.match(new RegExp(`--${name}:\\s*([^;\\n]+)`)); return m ? hexOf(m[1]!) : null }
  for (const ink of ['fg', 'fg-2', 'muted', 'meta']) {
    const paint = tokenValue(ink)
    if (!paint) continue
    // EYE-06: --surface-warm is a surface too. 20 systems define it, od-kit.css paints .od-icon-btn
    // and the model's own chips with it, and it was never in this list — 16 ink/surface pairs sat
    // under AA behind that gap (a status tag measured 4.29:1 in the browser).
    for (const surfaceName of ['bg', 'surface', 'surface-warm']) {
      const surface = tokenValue(surfaceName)
      if (!surface) continue
      const r = contrastOf(paint, surface)
      assert.ok(r >= 4.5, `${id}: --${ink} on --${surfaceName} is ${r.toFixed(2)}:1 — a text token must clear AA (4.5:1)`)
    }
  }

  // EYE-05: --accent is a surface too — it is what a filled primary button is painted with, and
  // --accent-on is the label on it. The loop above only ever looked at --bg and --surface, so this
  // pair went unchecked and 12 of the 33 systems shipped an unreadable primary button (duolingo at
  // 2.09:1). The render audit reported the same number, 3.52:1, on six different screens in a row.
  const accent = tokenValue('accent')
  const accentOn = tokenValue('accent-on')
  if (accent && accentOn) {
    const r = contrastOf(accentOn, accent)
    assert.ok(r >= 4.5, `${id}: --accent-on on --accent is ${r.toFixed(2)}:1 — the primary button's label must clear AA (4.5:1)`)
  }

  // EYE-05: a brand colour used as text goes through its --od-*-text mix, which od-kit.css binds for
  // .od-tag, .od-stat__delta and the ghost button. That mix used to be one fixed 45% for all 33
  // systems — too weak for 15 of the 125 colour roles (duolingo's green delta read 3.30:1) and a
  // needless wash for the other 110. Each system now states the measured value; this holds it there.
  // EYE-06: a tag is the commonest home for these — od-kit.css paints .od-tag and .od-row__lead
  // with the role colour at 12-15% over the page, and the label sits on that tint, not on the bare
  // surface. A chip whose text passed on --surface measured 4.39:1 on its own tint in the browser,
  // so the tint is checked as a surface of its own.
  const blend = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i]! - x) * t))
  for (const role of ['accent', 'success', 'warn', 'danger']) {
    const paint = tokenValue(`od-${role}-text`)
    const base = tokenValue(role)
    if (!paint || !base) continue
    for (const surfaceName of ['bg', 'surface', 'surface-warm']) {
      const surface = tokenValue(surfaceName)
      if (!surface) continue
      for (const [where, under] of [[`--${surfaceName}`, surface], [`a ${role} tint over --${surfaceName}`, blend(surface, base, 0.15)]] as const) {
        const r = contrastOf(paint, under as number[])
        assert.ok(r >= 4.5, `${id}: --od-${role}-text on ${where} is ${r.toFixed(2)}:1 — a brand colour used as text must clear AA (4.5:1)`)
      }
    }
  }
}

// LLM-03: the spend log and the daily budget guard are only as honest as this table. DeepSeek
// bills peak at twice off-peak, so the clock is part of the price.
{
  const { PRICE, PRICE_PEAK, costOf, isPeak } = await import('./LlmService.ts')
  assert.equal(PRICE.input, 0.15, 'off-peak input is the list rate')
  assert.equal(PRICE.output, 0.6, 'off-peak output is the list rate')
  assert.equal(PRICE.cached, 0.003, 'a cache hit is nearly free — which is why the prompt is built to be cacheable')
  assert.equal(PRICE_PEAK.output, 1.2, 'peak is twice off-peak')
  // Monday 02:00 UTC is peak; Monday 12:00 and Saturday 02:00 are not.
  assert.equal(isPeak(new Date('2026-09-21T02:00:00Z')), true)
  assert.equal(isPeak(new Date('2026-09-21T07:30:00Z')), true)
  assert.equal(isPeak(new Date('2026-09-21T12:00:00Z')), false)
  assert.equal(isPeak(new Date('2026-09-19T02:00:00Z')), false, 'weekends are off-peak')
  const usage = { promptTokens: 100_000, cachedTokens: 60_000, completionTokens: 50_000 }
  const off = costOf(usage, new Date('2026-09-21T12:00:00Z'))
  const peak = costOf(usage, new Date('2026-09-21T02:00:00Z'))
  assert.ok(Math.abs(off - (40_000 * 0.15 + 60_000 * 0.003 + 50_000 * 0.6) / 1e6) < 1e-9, 'off-peak cost is the arithmetic')
  assert.ok(Math.abs(peak - off * 2) < 1e-9, 'the same call costs twice as much at peak')
}

console.log('Testing Navigation Shell Builder...')
const { buildBottomNav, buildDetailHeader, NAV_CLEARANCE, navStyle, navClearance } = await import('./ShellService.ts')
const navA = buildBottomNav(multiPlan.navigation, 'home')
const navB = buildBottomNav(multiPlan.navigation, 'stats')
assert.ok(navA.includes('data-od-shell="bottom-nav"'), 'Nav carries a shell marker')
// The active tab is a colour AND a shape (NAV-02), so both are erased before the two are compared.
const sameShell = (html: string) =>
  html
    .replace(/var\(--od-accent-text, var\(--accent\)\)|var\(--accent\)|var\(--meta\)/g, 'C')
    .replace(/ aria-current="page"/g, '')
    .replace(/;background:color-mix\(in oklab, C 14%, transparent\);border-radius:9999px/g, '')
    .replace(/<span style="width:4px[^>]*><\/span>/g, '')
assert.equal(sameShell(navA), sameShell(navB), 'Two root-tab navs may differ ONLY in which tab is active')

// NAV-01: the shape of the bar is decided in code, per app, and every screen of that app repeats it.
{
  const seeds = ['Verdant', 'SnapCal', 'GoBite', 'Momentum', 'Lumen', 'Ledger', 'Nimbus', 'Atlas']
  const picked = seeds.map((s) => navStyle(s))
  assert.deepEqual(picked, seeds.map((s) => navStyle(s)), 'the pick is stable for a name')
  assert.ok(new Set(picked).size > 1, 'different apps land on different bars')
  // The shape follows the app's character: a tool wears the edge-to-edge bar, a consumer app the
  // island. Forcing one shape on every app was its own kind of sameness.
  const utility = seeds.map((s) => navStyle(s, { designSystem: 'slack' }))
  assert.ok(utility.includes('bar'), 'a utility system can wear the edge-to-edge bar')
  assert.ok(!utility.includes('island'), 'a utility system does not wear the island')
  const consumer = seeds.map((s) => navStyle(s, { designSystem: 'airbnb' }))
  assert.ok(consumer.every((p) => p === 'island' || p === 'pill'), 'a consumer system floats')
  assert.ok(new Set(consumer).size > 1, 'two consumer apps still differ')
  assert.equal(navStyle('Ledger', { appType: 'fintech' }), navStyle('Ledger', { appType: 'fintech' }), 'the app type decides when the system says nothing')
  assert.notEqual(navStyle('Ledger', { designSystem: 'airbnb' }), navStyle('Ledger', { designSystem: 'slack' }), 'character changes the answer')
  assert.ok(navStyle('Crowded', { tabCount: 7, designSystem: 'airbnb' }) !== 'island', 'a crowded bar drops the labels rather than truncating them')
  for (const style of ['island', 'pill', 'contrast', 'bar'] as const) {
    const html = buildBottomNav(multiPlan.navigation, 'home', style)
    assert.ok(html.includes(`data-od-nav="${style}"`), `${style}: the shape is marked`)
    assert.ok(html.includes('position:fixed'), `${style}: the bar is pinned`)
    assert.ok(!/bg-white|#fff\b/i.test(html), `${style}: no hardcoded light surface`)
    assert.ok(!/class="/.test(html), `${style}: inline styles only`)
    const labelled = style === 'island' || style === 'bar'
    assert.equal(html.includes('>Home</span>'), labelled, `${style}: labels only where there is room`)
    if (!labelled) assert.ok(html.includes('aria-label="Home"'), `${style}: an icon-only tab still says what it is`)
    // NAV-03: a floating bar stands above the screen edge, so the page must leave more room.
    assert.ok(navClearance(style) >= NAV_CLEARANCE, `${style}: clearance covers the bar`)
  }
  assert.ok(navClearance('island') > navClearance('bar'), 'a floating bar needs more clearance than an edge-to-edge one')
}
assert.ok(!navA.includes('bg-white'), 'Nav must not hardcode a light surface')
// Tailwind is the model's choice, not ours — a screen written in plain CSS has no utility
// classes, and a class-styled shell collapsed into an unpositioned block off the bottom.
assert.ok(!/class="/.test(navA), 'Nav layout must be inline styles, not Tailwind classes')
assert.ok(!/class="/.test(buildDetailHeader('X', 'Home')), 'Header layout must be inline styles')
assert.ok(navA.includes('position:fixed'), 'Nav pins itself without relying on a CSS framework')
for (const tab of multiPlan.navigation.tabs) {
  const marks = buildBottomNav(multiPlan.navigation, tab.id).match(/aria-current="page"/g) ?? []
  assert.equal(marks.length, 1, `Exactly one tab is active for "${tab.id}" (action tabs included)`)
}
assert.ok(buildDetailHeader('Meal Analysis', 'Home').includes('Back to Home'), 'Detail header labels its back target')

console.log('Testing Screen Normalizer...')
const { normalizeScreen, extractRootBlock, parseDeclarations } = await import(
  '../../lib/screen-normalizer.ts'
)
const minimalTokens = DesignSystemService.readTokensRoot('minimal')

// Two screens that drifted the way parallel samples actually drift: different accent hex,
// different hand-drawn nav markup.
const driftedA = `<!doctype html><html><head><style>:root{--accent:#6366f1;--bg:#fff;--card-pad:20px}</style></head><body><main>A</main><nav class="fixed bottom-0 inset-x-0 bg-white/95 h-16"><a>Home</a></nav></body></html>`
const driftedB = `<!doctype html><html><head><style>:root{--accent:#4f46e5;--bg:#fefefe}</style></head><body><nav class="flex gap-2" data-od-id="filters"><a>All</a></nav><main>B</main></body></html>`

const shellA = { nav: buildBottomNav(multiPlan.navigation, 'home') }
const shellB = { nav: buildBottomNav(multiPlan.navigation, 'home') }
const normA = normalizeScreen(driftedA, { tokensCss: minimalTokens, shell: shellA, navClearance: NAV_CLEARANCE })
const normB = normalizeScreen(driftedB, { tokensCss: minimalTokens, shell: shellB, navClearance: NAV_CLEARANCE })

const accentOf = (html: string) => parseDeclarations(extractRootBlock(html)!).get('--accent')
assert.equal(accentOf(normA), '#2952cc', 'Invented indigo is overwritten by the design system accent')
assert.equal(accentOf(normA), accentOf(normB), 'Both screens resolve to the same accent')
assert.ok(normA.includes('--card-pad: 20px'), 'Extra custom properties the model invented survive')
assert.ok(normA.includes('data-od-shell="bottom-nav"'), 'Hand-drawn bottom nav is replaced by the shell')
assert.ok(!normA.includes('bg-white/95'), 'The hardcoded white bar is gone')
assert.ok(normB.includes('data-od-id="filters"'), 'An in-page filter nav is NOT clobbered')
assert.ok(normB.includes('data-od-shell="bottom-nav"'), 'A missing nav is injected')
assert.ok(
  normA.includes(`padding-bottom: ${NAV_CLEARANCE}px !important`),
  'Body clearance is forced so content cannot hide under the bar',
)


console.log('Testing Font Pipeline...')
for (const d of DesignSystemService.list()) {
  const urls = DesignSystemService.readFontUrls(d.id)
  const root = DesignSystemService.readTokensRoot(d.id)
  assert.ok(!root.includes('@import'), `${d.id}: @import must not reach the prompt`)
  assert.ok(!/\n/.test(root.match(/--font-body: ([^;]+)/)?.[1] ?? ''), `${d.id}: font stack must be one line`)
  for (const u of urls) {
    assert.ok(u.startsWith('https://fonts.googleapis.com/css2?'), `${d.id}: unexpected font url ${u}`)
    // Every family the system pays to download must actually appear in a stack.
    for (const [, fam] of u.matchAll(/family=([^:&]+)/g)) {
      const name = decodeURIComponent(fam).replace(/\+/g, ' ')
      assert.ok(root.includes(name), `${d.id}: loads "${name}" but never references it`)
    }
  }
}
const fontless = normalizeScreen('<html><head><link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet"></head><body>x</body></html>', {
  fontUrls: ['https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap'],
})
assert.ok(fontless.includes('Poppins'), "The design system's font is injected")
assert.ok(!fontless.includes('family=Inter"'), "The model's own font link is stripped")
assert.equal(DesignSystemService.readIconStroke('midnight'), 1.5, 'midnight overrides icon stroke')
assert.equal(DesignSystemService.readIconStroke('minimal'), 2, 'systems without an override use lucide default')

console.log('Testing Icon Normalizer...')
const { normalizeIcons, LUCIDE_CDN } = await import('../../lib/screen-normalizer.ts')
const mixed = '<body><svg stroke-width="1.5"></svg><svg stroke-width="2.5"></svg><circle stroke-width="11"/><i data-lucide="flame"></i></body>'
const icons = normalizeIcons(mixed, 2)
assert.equal((icons.match(/stroke-width="2"/g) ?? []).length, 2, 'Icon-weight strokes are unified')
assert.ok(icons.includes('stroke-width="11"'), 'A progress ring stroke is left alone')
assert.ok(icons.includes(LUCIDE_CDN), 'Lucide is booted when the page uses data-lucide')
assert.ok(!normalizeIcons('<body><svg stroke-width="2"></svg></body>', 2).includes(LUCIDE_CDN), 'No lucide payload when unused')

console.log('Testing Design Lint...')
const { lintScreen, autofixScreen } = await import('../../lib/design-lint.ts')
const sloppy = `<html><head><style>:root{--accent:#2952cc}</style></head><body>
<h2>Fast 🚀</h2><p style="font-family: 'Inter', sans-serif">Lorem ipsum dolor sit amet</p>
<div style="color:#6366f1">10x faster</div><span>var</span><em style="color:var(--nope)">x</em></body></html>`
const rules = lintScreen(sloppy).map((f) => f.rule)
for (const r of ['ai-indigo-accent', 'filler-copy', 'invented-metrics', 'emoji-as-icon', 'hardcoded-font-family', 'undefined-token']) {
  assert.ok(rules.includes(r), `lint must flag ${r} (got: ${rules.join(', ')})`)
}
const fixed = autofixScreen(sloppy)
assert.ok(!fixed.includes('#6366f1'), 'Indigo is rewritten to the accent token')
assert.ok(fixed.includes('font-family: var(--font-body)'), 'Literal font stack is tokenised')
assert.ok(fixed.includes("--accent:#2952cc"), 'The canonical token block is left intact')
assert.ok(lintScreen(autofixScreen(fixed)).every((f) => f.rule !== 'ai-indigo-accent'), 'Autofix is idempotent')
// KIT-04: a [placeholder] from a kit sketch must never reach a screen
assert.deepEqual(lintScreen('<html><body><p class="od-card__title">[name]</p><img data-od-img="[subject]" alt=""></body></html>').find((f) => f.rule === 'kit-placeholder')?.samples, ['[name]', '[subject]'])
assert.ok(!lintScreen('<html><head><style>[data-od-tab]{x:1}</style></head><body><p>Step [1] of 3</p><script>const a = [x]</script></body></html>').some((f) => f.rule === 'kit-placeholder'), 'CSS attribute selectors, numbers in brackets and script arrays are not placeholders')
// HIG-03 / EYE-03: platform minimums, checked and fixed in code
const small = `<html><head><style>:root{--text-xs:10px}.cap{font-size:9px}.hide{font-size:0px}.ok{font-size:12px}</style></head><body><span style="font-size: 8.5px">a</span><b class="text-[10px]">b</b><button class="x"><i data-lucide="x"></i></button><button>Save</button></body></html>`
const tiny = lintScreen(small).find((f) => f.rule === 'tiny-text')
assert.ok(tiny && tiny.samples.includes('9px') && tiny.samples.includes('8.5px') && tiny.samples.includes('10px'), 'text under 11px is flagged')
assert.ok(!tiny!.samples.includes('0px'), 'font-size 0 hides text on purpose and is not flagged')
const big = autofixScreen(small)
assert.ok(big.includes('.cap{font-size:11px}') && big.includes('font-size: 11px') && big.includes('text-[11px]'), 'tiny text is raised to 11px')
assert.ok(big.includes('--text-xs:10px') && big.includes('font-size:0px') && big.includes('font-size:12px'), 'the token block, hidden text and legal sizes are untouched')
assert.ok(!lintScreen(big).some((f) => f.rule === 'tiny-text'), 'after the fix nothing is flagged')
assert.equal((big.match(/data-od-hit-area/g) ?? []).length, 1, 'icon buttons get one hit-area rule')
assert.ok(big.includes('width:max(100%,44px)'), 'the hit area is at least 44px and never shrinks a larger button')
assert.equal(autofixScreen(big), big, 'the whole autofix is idempotent')
assert.ok(!autofixScreen('<html><head></head><body><p>no buttons</p></body></html>').includes('data-od-hit-area'), 'no rule when there is no button')
const badged = autofixScreen('<html><head><style>.bell::after{content:"";width:8px;height:8px}</style></head><body><button class="bell"><i data-lucide="bell"></i></button></body></html>')
assert.ok(badged.includes('button:not(.bell)'), 'a button whose class already has an ::after (a badge) keeps it')
// The target is given by a pseudo-element, never by growing the button: a 44px min-height inside a
// 44px segmented rail pushed the active pill out of its own track.
assert.ok(!/min-height:\s*44px/.test(big), 'the fix never inflates the drawn box')
{
  const plain = autofixScreen('<html><head></head><body><button class="seg">All</button></body></html>')
  assert.ok(plain.includes('data-od-hit-area') && plain.includes('width:max(100%,44px)'), 'a short text button gets the same invisible target as an icon button')
}

// A ring must not add a centre the page already draws — two labels in one circle is what the eye
// catches first (found on a real generated screen: "8 lessons" over "of 12 / lessons done").
{
  const { renderCharts } = await import('../../lib/charts.ts')
  const own = '<html><head><style>.hero__ring-center{position:absolute;inset:0;display:flex}</style></head><body><div class="hero__ring" data-od-chart="ring" data-values="8" data-max="12" data-labels="lessons"></div><div class="hero__ring-center"><span>of 12</span></div></body></html>'
  const drawn = renderCharts(own)
  assert.ok(drawn.includes('stroke-dasharray'), 'the arc is still drawn')
  assert.ok(!drawn.includes('font-variant-numeric:tabular-nums'), 'but not a second centre label')
  const alone = renderCharts('<html><body><div data-od-chart="ring" data-values="8" data-max="12" data-labels="lessons"></div></body></html>')
  assert.ok(alone.includes('>8<') && alone.includes('lessons'), 'a ring with no centre of its own still shows its number')
  // A ring sized by aspect-ratio used to grow wider than the column it was given and cover the text
  // beside it, and a long centre label ran out of the circle. Both are bounded now.
  assert.ok(alone.includes('max-width:100%'), 'the ring cannot grow past its own column')
  assert.ok(alone.includes('overflow:hidden'), 'the centre is clipped to the circle')
  const wordy = renderCharts('<html><body><div data-od-chart="ring" data-values="2" data-max="6" data-labels="habits completed today"></div></body></html>')
  // The slot keeps its own attributes; what must not appear is the label drawn inside the circle.
  assert.ok(!/<span style="font-size:11px[^>]*>habits completed today</.test(wordy), 'a label too long for a circle belongs beside it, not in it')
  assert.ok(alone.includes('<span style="font-size:11px'), 'a short label still sits under the number')
}

// IMG-02: a reference picture decides the look. The model reads the picture; the choice of system
// is arithmetic here, so the same picture always lands on the same system. Before this, the system
// was chosen from the brief's words alone — and "same as in the image" has no words to go on, so a
// pink, chunky, playful reference came back as calm blue minimalism.
{
  const { matchSystem, themeFromReference } = await import('./DesignSystemService.ts')
  const { parseReferenceStyle, referenceBlock } = await import('./ReferenceService.ts')

  const pink = { accent: '#ff5fa2', background: '#ffffff', mood: ['bold', 'playful', 'energetic'], corners: 'round' as const, type: 'heavy' as const }
  const picked = matchSystem(pink)
  assert.ok(picked && DesignSystemService.exists(picked.id), 'a picture lands on a real system')
  assert.equal(matchSystem(pink)?.id, picked!.id, 'the same picture always lands on the same system')
  // Light against dark is the loudest signal: a dark picture must not come back as a white system.
  const darkPick = matchSystem({ accent: '#39ff88', background: '#0b0b10', mood: ['dark'], type: 'geometric' })!
  const darkBg = DesignSystemService.list().find((e) => e.id === darkPick.id)!.swatch.bg ?? '#ffffff'
  assert.ok(parseInt(darkBg.slice(1, 3), 16) < 90, `a dark reference must pick a dark system (got ${darkPick.id} on ${darkBg})`)
  assert.equal(matchSystem({ mood: ['bold'] }), null, 'no colour in the picture, no opinion about the system')

  // The theme carries the picture's own accent and corners, whatever system was matched.
  assert.deepEqual(themeFromReference(pink), { accent: '#ff5fa2', radius: 'round' })
  assert.deepEqual(themeFromReference({ accent: '#8a8a8a' }), {}, 'a grey is the picture having no accent — forcing it would drain the system')

  // What comes back from the model is parsed defensively; it is a model's JSON, not ours.
  const good = parseReferenceStyle('{"composition":"Rows stack under a title.","accent":"#FF5FA2","background":"#fff","corners":"round","type":"heavy","mood":["bold","playful"]}')
  assert.equal(good.accent, '#ff5fa2', 'hex is normalised')
  assert.equal(good.background, undefined, 'a three-digit hex is not the shape we asked for')
  assert.equal(good.corners, 'round')
  const junk = parseReferenceStyle('not json at all')
  assert.deepEqual(junk, { composition: '', mood: [] }, 'an unreadable reply is simply no reference')
  assert.equal(parseReferenceStyle('{"composition":"x","corners":"wobbly","type":"loud"}').corners, undefined, 'only the values we named')
  assert.equal(referenceBlock({ composition: '', mood: [] }), '', 'nothing read, nothing injected')
  assert.match(referenceBlock(good), /build the screens the way it is built/, 'the block says the picture is direction')
}

// DS-01: the automatic design system is a seeded pick from a few that suit the app type, not one
// fixed answer. Before this, every habit tracker came back in Notion and 21 of the 33 systems were
// unreachable without picking one by hand — and the picker is about to be taken off the composer.
{
  const brief = 'a habit tracker with streaks and reminders'
  const picks = new Set<string>()
  for (let i = 0; i < 40; i++) picks.add(DesignSystemService.autoFor(brief, 'productivity', `seed-${i}`))
  assert.ok(picks.size > 1, 'the same brief twice is not the same app twice')
  for (const id of picks) assert.ok(DesignSystemService.exists(id), `${id} must be a real system`)
  assert.equal(
    DesignSystemService.autoFor(brief, 'productivity', 'seed-7'),
    DesignSystemService.autoFor(brief, 'productivity', 'seed-7'),
    'the pick is stable for one project',
  )
  // A style the brief names still wins outright — that is the person speaking.
  assert.equal(DesignSystemService.autoFor('a minimal habit tracker', 'productivity', 'seed-1'), 'minimal')
  assert.equal(DesignSystemService.autoFor('a neon cyberpunk player', 'media', 'seed-1'), 'neon')
  assert.equal(DesignSystemService.autoFor('', null, 'seed-1'), 'minimal', 'nothing to go on falls back')
  // GQ-32: reach used to be the measure — how much of the catalogue the product could choose on its
  // own — and the answer became the problem. Thirty-one of the thirty-four are brand packages
  // written for websites, and picking widely among them is what made every app look differently
  // wrong. The automatic choice now draws only from the systems authored for a phone; the rest stay
  // reachable when the brief asks for them by name, which is the case this replaces reach with.
  const auto = new Set<string>()
  for (const type of ['fintech', 'food-delivery', 'commerce', 'marketplace', 'booking', 'travel', 'fitness', 'health', 'learning', 'media', 'productivity', 'social', 'habits'])
    for (let i = 0; i < 40; i++) auto.add(DesignSystemService.autoFor('x', type, `seed-${i}`))
  const mobileFirst = ['nova', 'lumen', 'graphite', 'ember', 'volt']
  for (const id of auto) assert.ok(mobileFirst.includes(id), `the automatic choice offered ${id}, which was not authored for a phone`)
  assert.equal(auto.size, mobileFirst.length, 'all three phone systems are reachable automatically')
  for (const type of ['fintech', 'habits', 'travel', 'media']) {
    const picks = new Set<string>()
    for (let i = 0; i < 40; i++) picks.add(DesignSystemService.autoFor('x', type, `seed-${i}`))
    assert.ok(picks.size >= 2, `${type}: two projects of one type can still differ (got ${picks.size})`)
  }
  // A brand is reached by naming it as a comparison, and only then: a bare mention must not count.
  assert.equal(DesignSystemService.autoFor('a notion-like notes app', 'productivity', 's'), 'notion')
  assert.equal(DesignSystemService.autoFor('stays app, like Airbnb', 'travel', 's'), 'airbnb')
  assert.equal(DesignSystemService.autoFor('linear-style issue tracker', 'productivity', 's'), 'linear-app')
  assert.ok(!['apple'].includes(DesignSystemService.autoFor('track my apple intake each day', 'health', 's')), 'a bare mention is not a comparison')
}

// GQ-09: no app type may be all-restraint. Of the 48 candidate slots only three were a high-energy
// system, and two types — productivity and marketplace — held four low-energy ones each, so a habit
// tracker came back grey whatever the seed did. That is a ceiling set by a table, not by the model:
// every type now offers at least one system that carries colour, and a habit tracker is its own
// type rather than a task manager with a different word on it.
{
  const { AppPatternService } = await import('./AppPatternService.ts')
  const types = (await import('node:fs')).readdirSync('app-patterns').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''))
  for (const type of types) {
    const picks = new Set<string>()
    for (let i = 0; i < 40; i++) picks.add(DesignSystemService.autoFor('x', type, `seed-${i}`))
    const energies = [...picks].map((id) => DesignSystemService.readColorEnergy(id))
    assert.ok(energies.some((e) => e !== 'low'), `${type}: every candidate is a low-energy system — this type can only ever come back grey`)
  }
  for (const brief of ['habit tracker app', 'odatlarni kuzatuvchi ilova', 'трекер привычек'])
    assert.equal(AppPatternService.classify(brief)?.id, 'habits', `"${brief}" is a habit app`)
  assert.equal(AppPatternService.classify('a todo and notes app')?.id, 'productivity', 'a task manager is still a task manager')
}

// LLM-02: reference pictures come from the browser, so what reaches the model is whatever survives
// this filter. The limits are a budget decision too — an image is prompt tokens and never a cache hit.
{
  const { parseRefImages, refImageNote, base64Bytes, MAX_REF_IMAGES } = await import('../../lib/ref-images.ts')
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  assert.equal(parseRefImages([png]).length, 1, 'a png data URL passes')
  assert.equal(parseRefImages([{ dataUrl: png }]).length, 1, 'either shape is accepted')
  assert.equal(parseRefImages([png, png, png]).length, MAX_REF_IMAGES, 'at most two ride one request')
  assert.deepEqual(parseRefImages('nope'), [], 'a non-array is not an attachment')
  assert.deepEqual(parseRefImages(['https://example.com/x.png']), [], 'a remote URL is not fetched on the model\'s behalf')
  assert.deepEqual(parseRefImages(['data:text/html;base64,PHNjcmlwdD4='], ), [], 'only image types')
  assert.deepEqual(parseRefImages(['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=']), [], 'no svg — it is a document, not a picture')
  const huge = `data:image/png;base64,${'A'.repeat(2_000_000)}`
  assert.deepEqual(parseRefImages([huge]), [], 'over the size limit is dropped, not sent')
  assert.ok(Math.abs(base64Bytes('AAAA') - 3) < 1, 'size is read from the string, not by decoding it')
  assert.equal(refImageNote(0), '', 'no picture, no note')
  assert.match(refImageNote(1), /direction — not its literal content/, 'the note says what the picture is for')
  assert.match(refImageNote(2), /^2 reference images/)
}

// QLT-06: the marks of a generated page. craft/mobile.md bans all three by name and the model
// produced them anyway on 28 apps, so the linter measures them now.
{
  const generated = '<html><head><style>.eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase}.meta{font-family:ui-monospace,monospace}</style></head><body><p class="eyebrow">FEATURED</p><h2>Pad Thai</h2><p class="meta">12 min · Easy · 4.8 · Vegan</p></body></html>'
  const rules = lintScreen(generated).map((f) => f.rule)
  for (const r of ['caps-eyebrow', 'mono-for-data', 'middle-dot-meta']) assert.ok(rules.includes(r), `lint must flag ${r} (got: ${rules.join(', ')})`)
  // An uppercase display headline is a design system doing its job, not a tell: 21 of the 33 ask for one.
  const nike = '<html><head><style>.h{font-size:32px;text-transform:uppercase;letter-spacing:.02em}</style></head><body><h1 class="h">RUN CLUB</h1><p>12 min · Easy</p></body></html>'
  assert.deepEqual(lintScreen(nike).map((f) => f.rule), [], 'a display headline and two facts are not tells')
  // The injected tab bar is ours and already canonical, and it is written in inline styles only
  // (the shell rule), so it can never raise a CSS-rule finding. Its text must not raise one either.
  const shellOnly = `<html><head></head><body>${buildBottomNav(multiPlan.navigation, 'home')}<p>Beef Burrito · 690 kcal · 31 g · 12 min</p></body></html>`
  const shellRules = lintScreen(shellOnly).map((f) => f.rule)
  assert.ok(!shellRules.includes('caps-eyebrow') && !shellRules.includes('mono-for-data'), 'the shell is not a tell')
}

// CRAFT-01: the craft rules that have one right answer live in code, as zero-specificity defaults.
{
  const craft = autofixScreen('<html><head><style>.a{x:1}</style></head><body><h1>Title</h1><p>Body</p></body></html>')
  assert.equal((craft.match(/data-od-craft/g) ?? []).length, 1, 'one craft sheet')
  assert.ok(craft.includes('font-variant-numeric:tabular-nums'), 'numbers line up in columns')
  assert.ok(craft.includes(':where(h1,h2,h3){text-wrap:balance}') && craft.includes('text-wrap:pretty'), 'headings balance, body copy gets orphan control')
  assert.ok(craft.includes(':focus-visible{outline:2px solid var(--accent)'), 'keyboard focus is visible')
  assert.ok(craft.includes('scale(.96)') && craft.includes('prefers-reduced-motion:no-preference'), 'press feedback, and only when motion is welcome')
  assert.ok(craft.includes('color-mix(in oklab, var(--fg) 10%, transparent)'), 'a resolved photo gets an edge')
  assert.ok(/:where\(/.test(craft) && !craft.includes('!important'), 'craft defaults never outrank the page')
  assert.equal(autofixScreen(craft), craft, 'the craft sheet is added once')
  assert.ok(craft.indexOf('data-od-craft') < craft.indexOf('</head>'), 'the sheet lives in the head')
}

// KIT-01: the shared component sheet — tokens only, every component sampled, injected only when used
{
  const { readFileSync } = await import('node:fs')
  const { KitService } = await import('./KitService.ts')
  const { KIT_SAMPLES } = await import('../../../kit/samples.ts')
  const { normalizeKit } = await import('../../lib/screen-normalizer.ts')
  const raw = readFileSync('kit/od-kit.css', 'utf8')
  const css = KitService.css()
  assert.ok(!css.includes('/*'), 'comments are stripped before injection')
  const hexes = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0].toLowerCase())
  assert.ok(hexes.every((h) => h === '#fff'), `only white (text on danger, switch knob) may be literal: ${[...new Set(hexes)].join(' ')}`)
  const defined = new Set([...raw.matchAll(/\.(od-[a-z0-9_-]+)/g)].map((m) => m[1]))
  const used = new Set(KIT_SAMPLES.flatMap((x) => [...x.html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/))).filter((c) => c.startsWith('od-')))
  for (const c of used) assert.ok(defined.has(c), `sample uses ${c}, which the kit does not define`)
  const blocks = [...defined].map((c) => c.split('__')[0].split('--')[0])
  for (const b of new Set(blocks)) assert.ok([...used].some((u) => u.startsWith(b)), `kit block ${b} has no sample in the gallery`)
  assert.ok(new Set(blocks).size >= 30, `about thirty components (${new Set(blocks).size})`)

  const page = '<html><head><title>x</title><style>.card{}</style></head><body><div class="od-card">x</div></body></html>'
  const once = normalizeKit(page, css)
  assert.ok(once.indexOf('data-od-kit') < once.indexOf('.card{}'), 'the kit comes before the page styles, so the page can override it')
  assert.equal(normalizeKit(once, css), once, 'idempotent')
  assert.equal(normalizeKit('<html><head></head><body><div class="card">x</div></body></html>', css).includes('data-od-kit'), false, 'no od- class, no sheet')
  assert.equal(normalizeKit('<html><head></head><body><div class="food-card">x</div></body></html>', css).includes('data-od-kit'), false, '"food-card" is not an od- class')
  assert.ok(!normalizeKit(once.replace('class="od-card"', 'class="card"'), css).includes('data-od-kit'), 'a sheet is removed once nothing uses it')
  const restyled = normalizeKit('<html><head><style>.od-btn{background:red}.od-row__lead, .od-kv:hover{x:1}.promo .od-btn{padding:0}.od-card.promo{margin:0}.mine{color:blue}@media (min-width:1px){.od-chip{x:2}}</style></head><body><div class="od-card promo">x</div></body></html>', css)
  const own = restyled.replace(/<style data-od-kit>[\s\S]*?<\/style>/, '')
  assert.ok(!own.includes('background:red') && !own.includes('x:1') && !own.includes('x:2'), 'page rules that restyle kit classes are dropped (also inside @media)')
  assert.ok(own.includes('.promo .od-btn{padding:0}') && own.includes('.od-card.promo{margin:0}') && own.includes('.mine{color:blue}'), 'composition and the page\'s own classes stay')
}

console.log('Testing Prototype Navigation...')
// Mirrors navigateToTab / navigateBack in routes/p.$projectId.tsx: every tab the shell
// renders must resolve to a screen, or a preview click-through hits a dead end.
const navScreens = multiPlan.screens.map((s, i) => ({
  id: `s${i}`,
  name: s.name,
  screenType: s.screenType,
  activeTabId: s.activeTabId ?? null,
  parentScreenName: s.parentScreen ?? null,
}))
const navRoots = navScreens.filter((s) => s.screenType === 'root-tab' && s.activeTabId)
for (const tab of multiPlan.navigation.tabs) {
  const target = navRoots.find((s) => s.activeTabId === tab.id)
  // The planner rotates unassigned screens through the tab list, so not every tab must
  // have a screen — but any tab that does must resolve to exactly one.
  if (target) assert.equal(navRoots.filter((s) => s.activeTabId === tab.id).length, 1, `tab ${tab.id} is claimed twice`)
}
const detail = navScreens.find((s) => s.screenType === 'detail-view')
assert.ok(detail, 'fixture has a detail screen')
assert.ok(
  navScreens.some((s) => s.name === detail.parentScreenName),
  'a detail screen names a parent that exists, so Back resolves',
)
const detailHeader = buildDetailHeader(detail.name, detail.parentScreenName ?? 'Home')
assert.ok(detailHeader.includes(`data-od-back="${detail.parentScreenName}"`), 'Back button carries its target')
assert.ok(navA.includes('data-od-tab="home"'), 'Tabs carry ids the preview bridge can read')

console.log('Testing Preview Page Logic...')
const { orderScreens, screenForTab, screenForBack, withPreviewBridge } = await import('../../lib/preview-bridge.ts')
const pv = [
  { id: 'c', name: 'Stats', x: 2000, screenType: 'root-tab', activeTabId: 'stats', parentScreenName: null },
  { id: 'a', name: 'Home', x: 0, screenType: 'root-tab', activeTabId: 'home', parentScreenName: null },
  { id: 'd', name: 'Meal', x: 3000, screenType: 'detail-view', activeTabId: 'home', parentScreenName: 'Home' },
  { id: 'b', name: 'Scan', x: 1000, screenType: 'root-tab', activeTabId: 'scan', parentScreenName: null },
]
assert.deepEqual(orderScreens(pv).map((s) => s.id), ['a', 'b', 'c', 'd'], 'Preview steps through screens in planned left-to-right order')
assert.equal(screenForTab(pv, 'stats')?.id, 'c', 'A tab resolves to the root screen that claims it')
assert.equal(screenForTab(pv, 'home')?.id, 'a', 'A detail screen sharing a tab id never steals the tab')
assert.equal(screenForTab(pv, 'nope'), undefined, 'An unclaimed tab resolves to nothing rather than a wrong screen')
assert.equal(screenForBack(pv, 'Home')?.id, 'a', 'Back resolves to the named parent')
{
  const { screenByName, PREVIEW_BRIDGE } = await import('../../lib/preview-bridge.ts')
  const named = [
    { id: '1', name: 'GoBite — Restaurant Feed', x: 0, screenType: 'root-tab', activeTabId: 'home', parentScreenName: null },
    { id: '2', name: 'Dish Detail — GoBite', x: 1, screenType: 'detail-view', activeTabId: null, parentScreenName: 'Restaurant Feed' },
    { id: '3', name: 'Cart &amp; Checkout — GoBite', x: 2, screenType: 'modal-flow', activeTabId: null, parentScreenName: 'Dish Detail' },
    { id: '4', name: 'Orders', x: 3, screenType: 'root-tab', activeTabId: 'orders', parentScreenName: null },
  ]
  assert.equal(screenByName(named, 'Dish Detail')?.id, '2', 'a planned name is found inside the model\'s title')
  assert.equal(screenByName(named, 'Cart & Checkout')?.id, '3', 'entities and punctuation do not matter')
  assert.equal(screenByName(named, 'orders')?.id, '4')
  assert.equal(screenByName(named, 'Restaurant feed screen')?.id, '1', 'most of the wanted words is enough')
  assert.equal(screenByName(named, 'Live Tracking'), undefined, 'an undesigned screen resolves to nothing, never to a wrong screen')
  assert.equal(screenByName(named, ''), undefined)
  assert.equal(screenForBack(named, 'Restaurant Feed')?.id, '1', 'Back now finds a parent stored under a longer title')
  assert.ok(PREVIEW_BRIDGE.includes("closest('[data-od-link]')") && PREVIEW_BRIDGE.includes('od:navigate_link'))
}
assert.equal(screenForBack(pv, 'Missing')?.id, 'c', 'Back falls back to a root screen when the parent is gone')
assert.ok(withPreviewBridge('<html><body>x</body></html>').includes('od:navigate_tab'), 'Bridge is injected before </body>')

console.log('Testing Theme Override...')
const T = await import('../../lib/theme-override.ts')

// Nothing user-supplied may reach a stylesheet unvalidated.
const hostile = T.sanitizeTheme({
  accent: '#fff;}body{display:none}/*',
  radius: 'url(javascript:alert(1))',
  headingFont: 'Comic"};@import url(//evil.test/x.css)',
  bodyFont: 'not-a-real-font',
})
assert.deepEqual(hostile, {}, 'Hostile or unknown values are dropped, not escaped')
assert.deepEqual(T.sanitizeTheme('nope'), {}, 'A non-object theme is empty')
assert.deepEqual(T.sanitizeTheme({ accent: '#E11D48' }), { accent: '#e11d48' }, 'Accent is normalised to lowercase')
assert.deepEqual(T.parseTheme('{broken'), {}, 'Corrupt stored JSON falls back to no override')

const css = T.themeCss({ accent: '#e11d48', radius: 'soft', headingFont: 'fraunces', bodyFont: 'inter' })
assert.ok(css.includes('--accent:#e11d48'), 'Accent is overridden')
assert.ok(css.includes('--radius-md:16px'), 'Radius preset expands to the scale')
assert.ok(css.includes('--font-display:"Fraunces", Georgia'), 'Serif heading gets a serif fallback')
assert.ok(css.includes('--font-body:"Inter", -apple-system'), 'Sans body gets a sans fallback')
assert.equal(T.themeCss({}), '', 'An empty theme produces no CSS')
// THM-02 / THM-03: every colour token, a radius slider, squircle corners
assert.deepEqual(
  T.sanitizeTheme({ colors: { bg: '#0B0B0C', fg: 'red', 'x-evil': '#ffffff', border: '#e5e5e7' }, radiusPx: 99, shape: 'blob' }),
  { colors: { bg: '#0b0b0c', border: '#e5e5e7' }, radiusPx: 40 },
  'Only known colour tokens with hex values survive; the radius is clamped; an unknown shape is dropped',
)
assert.deepEqual(T.sanitizeTheme({ colors: { fg: 'nope' } }), {}, 'A colours object with nothing valid is dropped entirely')
const palette = T.themeCss({ colors: { bg: '#0b0b0c', 'fg-2': '#a1a1aa' } })
assert.ok(palette.includes('--bg:#0b0b0c') && palette.includes('--fg-2:#a1a1aa'), 'Each colour becomes its token')
assert.ok(T.themeCss({ radiusPx: 20, radius: 'sharp' }).includes('--radius-sm:12px;--radius-md:20px;--radius-lg:30px'), 'The slider scales sm/lg from md and wins over a preset')
assert.ok(T.themeCss({ radiusPx: 0 }).includes('--radius-md:0px'), 'Zero is a real radius, not "unset"')
const squircle = T.themeCss({ radiusPx: 12, shape: 'squircle' })
assert.ok(squircle.includes('--radius-md:12px;') && squircle.includes('@supports (corner-shape:squircle){:root{--radius-sm:11px;--radius-md:18px;--radius-lg:27px}*,*::before,*::after{corner-shape:squircle}}'), 'Squircle corners only where supported, with a larger radius; everyone else keeps round corners')

assert.equal(T.onAccent('#111113'), '#ffffff', 'Dark accent gets white text')
assert.equal(T.onAccent('#ffd23f'), '#111111', 'Light accent gets dark text (buttons stay legible)')
assert.ok(css.includes('--accent-on:#ffffff'), 'Contrast colour is set alongside the accent')

const base = '<html><head><style>:root{--accent:#2952cc}</style></head><body><p>x</p></body></html>'
assert.equal(T.applyThemeOverride(base, {}), base, 'No override leaves the screen untouched')
const themed = T.applyThemeOverride(base, { accent: '#e11d48', headingFont: 'fraunces' })
assert.ok(themed.indexOf('#2952cc') < themed.indexOf('--accent:#e11d48'), 'Override comes after the screen\'s own :root, so it wins the cascade')
assert.ok(themed.includes('family=Fraunces'), 'The chosen webfont is loaded')
assert.ok(!themed.includes('__od_theme_listener'), 'Static overlay carries no live listener (export stays clean)')
const live = T.withLiveTheme(base, {})
assert.ok(live.includes('__od_theme_listener'), 'Live overlay installs the listener even with no override yet')
assert.ok(live.includes("e.source !== window.parent"), 'Listener ignores messages that are not from the parent')
const msg = T.themeMessage({ accent: '#e11d48', bodyFont: 'inter' })
assert.ok(msg.fonts.every((u: string) => u.startsWith('https://fonts.googleapis.com/')), 'Live payload only names Google Fonts URLs')
for (const f of T.FONTS) assert.ok(T.fontUrl(f.id).includes('css2?family='), `${f.id} builds a fonts URL`)

console.log('Testing Editor Wiring...')
{
  // Every frame listens on the same window; a frame that answers another frame's message sends an
  // element edit to the wrong screen. Source text is checked because the component needs a browser.
  const { readFileSync: read } = await import('node:fs')
  const frame = read('src/ScreenFrame.tsx', 'utf8')
  const handler = frame.slice(frame.indexOf('function handleMessage'), frame.indexOf("window.addEventListener('message', handleMessage)"))
  assert.ok(/if \(e\.source !== iframeRef\.current\?\.contentWindow\) return/.test(handler), 'ScreenFrame must ignore messages that did not come from its own iframe')
  assert.ok(handler.indexOf('e.source !==') < handler.indexOf('od:select_element'), 'the source check comes before any message is acted on')

  const canvas = read('src/components/canvas/Canvas.tsx', 'utf8')
  assert.ok(/\[hasFrames, props\.fitKey\]/.test(canvas) && /fit\(1\)/.test(canvas), 'the canvas fits all frames when a project opens and when the set of screens changes')
  assert.ok(/if \(hasFrames && !userMoved\.current\) fit\(1\)/.test(canvas), 'it follows frames as they report their height, until the person moves the view')

  const controller = read('src/app/Http/Controllers/ScreenController.ts', 'utf8')
  assert.ok(/screenType: source\.screenType/.test(controller) && /parentScreenName: source\.parentScreenName/.test(controller), 'a duplicated detail screen stays a detail screen')
}

console.log('Testing LLM Stream Abort...')
{
  // A stand-in for DeepSeek: it streams one token, then hangs like a slow generation.
  // If the caller's signal never reaches fetch, the loop below would wait forever.
  const realFetch = globalThis.fetch
  const realKey = process.env.DEEPSEEK_API_KEY
  process.env.DEEPSEEK_API_KEY = 'test-key'
  let receivedSignal: AbortSignal | undefined
  let sentBody: Record<string, unknown> = {}
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    receivedSignal = init?.signal ?? undefined
    sentBody = JSON.parse(String(init?.body))
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n'))
        init?.signal?.addEventListener('abort', () => c.error(new DOMException('aborted', 'AbortError')))
      },
    })
    return new Response(body, { status: 200 })
  }) as typeof fetch
  try {
    const { streamCompletion } = await import('./LlmService.ts')
    const ctl = new AbortController()
    const seen: string[] = []
    const outcome = await Promise.race([
      (async () => {
        try {
          for await (const d of streamCompletion('sys', 'usr', ctl.signal)) {
            seen.push(d)
            ctl.abort() // the client disconnects right after the first token
          }
          return 'ended'
        } catch (e) {
          return (e as Error).name
        }
      })(),
      new Promise<string>((r) => setTimeout(() => r('HUNG'), 2000)),
    ])
    assert.ok(receivedSignal, "streamCompletion must pass the caller's signal to fetch")
    assert.deepEqual(seen, ['hi'], 'the first token arrived before the abort')
    assert.notEqual(outcome, 'HUNG', 'aborting must stop the stream instead of letting it run to completion')
    assert.ok(receivedSignal!.aborted, 'the upstream request was actually cancelled')
    // Model policy: V4 Flash, thinking off. Named directly, deepseek-flash thinks by default and bills for it.
    assert.equal(sentBody.model, process.env.DEEPSEEK_MODEL || 'deepseek-flash')
    assert.deepEqual(sentBody.thinking, { type: 'disabled' }, 'thinking is switched off explicitly')
  } finally {
    globalThis.fetch = realFetch
    if (realKey === undefined) delete process.env.DEEPSEEK_API_KEY
    else process.env.DEEPSEEK_API_KEY = realKey
  }
}
// An edit ties the response stream's cancellation to the upstream abort. A planned run does not
// (GQ-07: it outlives its page) — it is stopped through PlanRuns, and still passes its signal on.
for (const f of ['GenerateController', 'PlanController']) {
  const src = (await import('node:fs')).readFileSync(`src/app/Http/Controllers/${f}.ts`, 'utf8')
  if (f === 'GenerateController') assert.ok(/cancel\(\)\s*\{\s*abort\.abort\(\)/.test(src), `${f} must abort the LLM call when the client cancels`)
  else assert.ok(/const abort = PlanRuns\.start\(/.test(src) && !/cancel\(\)\s*\{\s*abort\.abort\(\)/.test(src), `${f} is stopped by Stop, not by a closed page`)
  assert.ok(/streamCompletion\(.*abort\.signal[,)]/.test(src), `${f} must pass abort.signal to streamCompletion`)
}

console.log('Testing Secrets Stay Server-Side...')
{
  const { readFileSync, readdirSync, statSync } = await import('node:fs')
  const { join } = await import('node:path')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(n) ? [p] : []
    })
  // Everything the browser can load: components, page routes, shared libs and top-level modules.
  // (routes/api and app/ are server-only; server functions are reached over RPC, not imported.)
  const browserReachable = [
    ...walk('src/components'),
    ...walk('src/lib'),
    ...readdirSync('src').filter((n) => /\.tsx?$/.test(n)).map((n) => join('src', n)),
    ...readdirSync('src/routes').filter((n) => /\.tsx$/.test(n)).map((n) => join('src/routes', n)),
  ].filter((f) => !f.endsWith('routeTree.gen.ts'))
  assert.ok(browserReachable.length > 10, 'the audit must actually cover the browser-facing files')
  for (const file of browserReachable) {
    const text = readFileSync(file, 'utf8')
    assert.ok(!text.includes('process.env'), `${file} is browser-reachable and must not read process.env`)
    assert.ok(!/DEEPSEEK/.test(text), `${file} is browser-reachable and must not mention provider keys`)
  }
}

console.log('Testing Generated-HTML Sandbox...')
// Generated screens contain model-written JavaScript. With allow-same-origin that script would
// run as our origin and could read the session cookie and call our API as the user.
const { readdirSync, statSync, readFileSync, existsSync } = await import('node:fs')
const { join: joinPath } = await import('node:path')
function walkSource(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = joinPath(dir, name)
    return statSync(full).isDirectory() ? walkSource(full) : /\.(tsx?|jsx?)$/.test(name) ? [full] : []
  })
}
const sourceFiles = walkSource('src')
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  if (file.endsWith('new-features.check.ts')) continue // this test names the forbidden values
  assert.ok(!text.includes('allow-same-origin'), `${file} must never grant allow-same-origin`)
  assert.ok(!/dangerouslySetInnerHTML/.test(text), `${file} must not inject generated HTML into the app document`)
  for (const m of text.matchAll(/<iframe\b[\s\S]*?\/>/g)) {
    assert.ok(/sandbox=["']allow-scripts["']/.test(m[0]), `${file}: every <iframe> must carry sandbox="allow-scripts" and nothing more`)
  }
}
const iframeCount = sourceFiles.reduce((n, f) => n + (readFileSync(f, 'utf8').match(/<iframe\b/g)?.length ?? 0), 0)
assert.ok(iframeCount >= 2, `expected the canvas and preview iframes to be audited, found ${iframeCount}`)

console.log('Testing Production Entry...')
const prodEntry = readFileSync('server.prod.mjs', 'utf8')
// `vite build` emits only a fetch handler; without this file nothing binds a port in production.
assert.ok(prodEntry.includes("from './dist/server/server.js'"), 'Prod entry loads the built fetch handler')
assert.ok(prodEntry.includes('serveStatic'), 'Prod entry serves the built client assets')
assert.ok(prodEntry.includes('process.env.PORT'), 'Port is configurable for the host')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
assert.ok(pkg.scripts.start?.includes('server.prod.mjs'), 'npm start runs the production entry')
assert.ok(existsSync('server.prod.mjs'), 'server.prod.mjs is present')

console.log('Testing Frame Height...')
{
  const DEVICE = 844

  // A number from the sandbox is untrusted: it decides layout, and it is written to the database.
  assert.strictEqual(clampFrameHeight(1986, DEVICE), 1986, 'a real content height passes through')
  assert.strictEqual(clampFrameHeight(400, DEVICE), DEVICE, 'a frame is never shorter than the device')
  assert.strictEqual(clampFrameHeight(999999, DEVICE), MAX_FRAME_HEIGHT, 'a runaway layout is capped')
  assert.strictEqual(clampFrameHeight(1200.6, DEVICE), 1201, 'heights are whole pixels')
  for (const bad of ['1200', NaN, Infinity, null, undefined, {}]) {
    assert.strictEqual(clampFrameHeight(bad, DEVICE), null, `${String(bad)} is not a height`)
  }

  assert.deepStrictEqual(
    parseHeightMessage({ type: 'od:frame_height', frameId: 'abc', height: 1500 }, DEVICE),
    { frameId: 'abc', height: 1500 },
    'a well-formed height message is accepted',
  )
  for (const bad of [
    { type: 'od:select_element', frameId: 'abc', height: 1500 },
    { type: 'od:frame_height', frameId: '', height: 1500 },
    { type: 'od:frame_height', frameId: 'abc', height: 'tall' },
    { type: 'od:frame_height', height: 1500 },
    'od:frame_height',
    null,
  ]) {
    assert.strictEqual(parseHeightMessage(bad, DEVICE), null, `must reject ${JSON.stringify(bad)}`)
  }

  // The ratchet this exists to prevent: a screen sized against the viewport would stretch to
  // whatever height the frame was just given, report that back, and never shrink again.
  const page = [
    '<html><head><style>body{min-height:100dvh}.hero{height:100vh}.sheet{max-height:100svh}</style></head>',
    '<body><p>The spec says 100vh here.</p><div style="min-height:100vh">panel</div></body></html>',
  ].join('')
  const pinned = pinViewportHeight(page)
  assert.ok(!/\b100(d|s|l)?vh\b/.test(pinned.match(/<style[\s\S]*?<\/style>/)![0]), 'no viewport height units survive in CSS')
  assert.ok(!/style="min-height:100vh"/.test(pinned), 'style attributes are pinned too')
  assert.ok(pinned.includes('min-height:var(--od-frame-vh)'), 'units are repointed at the frame variable')
  assert.ok(pinned.includes('The spec says 100vh here.'), 'body text that merely mentions 100vh is left alone')

  const probed = withHeightProbe(page, 'screen-1', DEVICE)
  assert.ok(probed.includes(`--od-frame-vh:${DEVICE}px`), 'the viewport reference is the device height, not the frame')
  assert.ok(/html\{height:var\(--od-frame-vh\)!important\}/.test(probed), 'the root box is held at the device height so it can shrink')
  assert.ok(probed.indexOf('data-od-frame') < probed.indexOf('</body>'), 'the probe is injected inside the document')
  assert.ok(probed.includes('"screen-1"'), 'the frame id travels with the measurement')
  assert.ok(probed.includes('ResizeObserver'), 'the page re-measures when its content changes')
  // The document's scrolling box is floored at the frame height, so measuring it would report back
  // whatever height the frame already had and a screen that got shorter would stay tall forever.
  assert.ok(!probed.includes('documentElement.scrollHeight'), 'the probe measures the body box, not the scrolling box')
  assert.ok(probed.includes('b.scrollHeight'), 'the probe measures the body box')
  assert.ok(withHeightProbe('', 'screen-1', DEVICE) === '', 'nothing to probe before the HTML arrives')

  // The preview route simulates a real phone, so it must keep the real device viewport.
  const previewRoute = readFileSync('src/routes/preview.$projectId.tsx', 'utf8')
  assert.ok(!previewRoute.includes('withHeightProbe'), 'the preview page is a device, not a canvas frame')
  const canvasRoute = readFileSync('src/routes/p.$projectId.tsx', 'utf8')
  assert.ok(/onHeight=\{reportHeight\}/.test(canvasRoute), 'the canvas listens for measured heights')
  assert.ok(/height=\{frameHeight\(s\)\}/.test(canvasRoute), 'the canvas lays frames out at their measured height')
}

// --- UI-01/02/06: the studio's own palette ---
{
  const css = readFileSync('src/styles.css', 'utf8')
  const root = css.slice(css.indexOf(':root {'), css.indexOf('@layer base {'))
  assert.ok(!/oklch\(\s*[\d.]+\s+0\s+0\s*\)/.test(root), 'no chroma-zero grey: the neutrals are warm, which is what makes the chrome look designed')
  for (const token of ['--background', '--foreground', '--card', '--muted', '--border', '--sidebar', '--canvas']) {
    assert.ok(new RegExp(`${token}:`).test(root), `${token} is defined`)
  }
  assert.ok(!/--foreground:\s*#000000/.test(root) && !/--background:\s*#000000/.test(root), 'neither end of the ramp is pure black')
  assert.equal((root.match(/--canvas:/g) ?? []).length, 2, 'the canvas has a light and a dark value')

  const frame = readFileSync('src/ScreenFrame.tsx', 'utf8')
  assert.ok(!/rounded-xl border bg-white/.test(frame), 'UI-02: a screen sits on the canvas, not inside a card')
  const root2 = readFileSync('src/routes/__root.tsx', 'utf8')
  assert.ok(root2.includes("localStorage.getItem('od:theme')") && root2.includes('add(\'dark\')'), 'UI-06: the saved mode is applied before the first paint')
}

console.log('Testing Judge Regressions (GQ-18/19 follow-ups)...')
{
  // The judge saw a floating pill cover list content: a floating bar now leaves 128px, not 112.
  const { navClearance: clearance } = await import('./ShellService.ts')
  assert.ok(clearance('pill') >= 128 && clearance('island') >= 128, `floating bars leave room for themselves: ${clearance('pill')}`)
  assert.equal(clearance('bar'), 88, 'the edge-to-edge bar is unchanged')
  // The injected large title made a page <h1> of the same words a duplicate: it is dropped.
  const { dropDuplicateTitle: drop } = await import('../../lib/screen-normalizer.ts')
  const page = (h: string) => `<!doctype html><html><head><title>x</title></head><body><header data-od-shell="detail-header"><h1>Create Habit</h1></header>${h}<p>form</p></body></html>`
  assert.ok(!drop(page('<h1 class="t">Create habit</h1>'), 'Create Habit').includes('<h1 class="t">'), 'a heading repeating the title is removed (case-insensitive)')
  assert.ok(!drop(page('<h2>Habit Detail</h2>'), 'Habit Detail — Streakly').includes('<h2>Habit Detail</h2>'), 'the app-name suffix is ignored')
  assert.ok(drop(page('<h1>Morning meditation</h1>'), 'Habit Detail — Streakly').includes('<h1>Morning meditation</h1>'), 'a different heading stays')
  assert.ok(drop(page('<h1>Create Habit</h1>'), 'Create Habit').includes('<header data-od-shell="detail-header"><h1>Create Habit</h1></header>'), 'the header\'s own title is not the one removed')
  const { shellPartsFor: parts } = await import('./ScreenContext.ts')
  const nav = { type: 'bottom-tabs' as const, tabs: [{ id: 'a', label: 'A', icon: 'home' }, { id: 'b', label: 'B', icon: 'user' }] }
  assert.equal(parts({ screenType: 'detail-view', parentScreen: 'Home' }, nav, true, 'Create Habit').title, 'Create Habit', 'the normaliser is told the title the header shows')
}

console.log('Testing Motion Tokens (GQ-24)...')
{
  const kit = readFileSync('kit/od-kit.css', 'utf8')
  const block = kit.slice(kit.indexOf('GQ-24: motion as a token'))
  assert.ok(block.includes('@media (prefers-reduced-motion: no-preference)'), 'every motion rule sits behind the reduced-motion preference')
  assert.ok(block.includes('.od-btn:active, .od-icon-btn:active, .od-chip:active, .od-segmented > button:active, .od-stepper > button:active { transform: scale(.96); }'), 'press feedback is a small scale')
  assert.ok(block.includes('var(--ease-spring, cubic-bezier(.34, 1.3, .64, 1))'), 'the spring curve is a token with a default, so every system gets the feel')
  assert.ok(block.includes('.od-switch::after { transition: transform var(--motion-base, 220ms)'), 'the switch knob glides')
  const nova = DesignSystemService.readTokensRoot('nova')
  assert.ok(nova.includes('--ease-spring: cubic-bezier(0.34, 1.3, 0.64, 1)') && nova.includes('--motion-press: 120ms'), 'nova states its spring and press timing')
  const { buildBottomNav: bar } = await import('./ShellService.ts')
  const nav = { type: 'bottom-tabs' as const, tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'me', label: 'Me', icon: 'user' }] }
  const pill = bar(nav, 'home', 'pill')
  assert.ok(pill.includes('@keyframes od-pop') && pill.indexOf('od-pop') > pill.indexOf('prefers-reduced-motion: no-preference'), 'the active tab pops in with the spring, only when motion is welcome')
  // Still one entrance sequence per screen (craft §8): the kit adds none, only state transitions.
  assert.ok(!/@keyframes\s+od-(fade|slide|enter)/.test(kit), 'the kit adds no entrance animation of its own')
}

console.log('Testing Phone Type Scale (GQ-23)...')
{
  const craft = readFileSync('craft/mobile.md', 'utf8')
  assert.ok(craft.includes('body 17px (min 15), secondary 15px, captions 13px, tab labels 11px'), 'the craft file states the phone scale in numbers')
  const nova = DesignSystemService.readTokensRoot('nova')
  for (const t of ['--text-base: 17px', '--text-sm: 15px', '--text-xs: 13px', '--text-4xl: 88px', '--od-display-weight: 400', '--od-heading-weight: 600', '--od-heading-font: var(--font-body)']) {
    assert.ok(nova.includes(t), `nova: ${t}`)
  }
  const kit = readFileSync('kit/od-kit.css', 'utf8')
  // A one-weight serif must not be faux-bolded: the kit takes the display weight from the system.
  for (const sel of ['.od-stat__value', '.od-price', '.od-hero__title']) {
    const rule = kit.match(new RegExp(`^${sel.replace('.', '\\.')} \\{[^\\n]*\\}`, 'm'))![0]
    assert.ok(rule.includes('font-weight: var(--od-display-weight, 700)'), `${sel} weight comes from the system`)
  }
  assert.ok(kit.match(/^\.od-section__title \{[^\n]*\}/m)![0].includes('font-family: var(--od-heading-font, var(--font-display))'), 'a system can put section headings in its body face')
  assert.ok(kit.match(/^\.od-section__title \{[^\n]*\}/m)![0].includes('font-weight: var(--od-heading-weight, 650)'), 'heading weight comes from the system')
  // Other systems are untouched: the defaults reproduce the old values.
  assert.ok(!DesignSystemService.readTokensRoot('bento').includes('--od-display-weight'), 'a catalogue system without the token keeps the 700 default')
}

console.log('Testing Pinned Chrome (GQ-29)...')
{
  const { navStyle, buildBottomNav } = await import('./ShellService.ts')
  const { readFileSync } = await import('node:fs')
  // A system whose identity is its chrome pins the shape: Lumen is iOS 26, and its first run put a
  // flat edge-to-edge bar on every screen because the roulette was free to choose one — so not a
  // single screen showed the material the system exists for.
  const nav = { tabs: [{ id: 'a', label: 'Home', icon: 'home' }, { id: 'b', label: 'More', icon: 'list' }] }
  for (const seed of ['a', 'b', 'c', 'd', 'e']) {
    for (const appType of ['fintech', 'media', undefined]) {
      assert.equal(navStyle(seed, { tabCount: 2, appType, designSystem: 'lumen' }), 'island', 'lumen always floats')
      assert.equal(navStyle(seed, { tabCount: 2, appType, designSystem: 'ember' }), 'island', 'so does ember')
      assert.equal(navStyle(seed, { tabCount: 2, appType, designSystem: 'graphite' }), 'bar', 'graphite wears its chrome')
      assert.equal(navStyle(seed, { tabCount: 2, appType, designSystem: 'volt' }), 'bar', 'so does volt')
    }
  }
  // Nova still rolls, so pinning one system did not pin them all.
  assert.ok(new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((s) => navStyle(s, { tabCount: 3, designSystem: 'nova' }))).size > 1, 'an unpinned system still varies')
  const bar = buildBottomNav(nav as never, 'a', 'island')
  assert.ok(bar.includes('var(--od-nav-tint, 78%)'), 'how much surface the panel keeps is a token the system can set')
  assert.ok(bar.includes('var(--od-blur-nav, 18px)'), 'so is the blur')
  const tokens = readFileSync('design-systems/lumen/tokens.css', 'utf8')
  for (const t of ['--od-nav-tint', '--od-blur-nav']) assert.ok(tokens.includes(t), `lumen sets ${t}`)
}

console.log('Testing Ink Swap Reach (GQ-34)...')
{
  const { autofixScreen } = await import('../../lib/design-lint.ts')
  const { buildBottomNav } = await import('./ShellService.ts')
  // The brand-colour-as-text swap only reached <style> blocks and only var(--accent) itself; Ember's
  // first run wrote the same colour inline ten times and as --accent-active nine, and a coral figure
  // on a grey tile read 2.4:1.
  const page = '<html><head><style>.a{color: var(--accent-active)}.h{color:var(--accent-hover)}.b{background:var(--accent)}</style></head><body><b style="font-size:40px;color:var(--accent)">82</b><i style="color:var(--accent-on);background:var(--accent)">x</i></body></html>'
  const out = autofixScreen(page)
  assert.ok(/\.a\{color: var\(--od-accent-text\)\}/.test(out) && /\.h\{color: var\(--od-accent-text\)\}/.test(out), 'pressed and hover shades used as text are swapped')
  assert.ok(out.includes('style="font-size:40px;color: var(--od-accent-text)"'), 'an inline colour is swapped too')
  assert.ok(out.includes('background:var(--accent)'), 'a fill is left alone')
  assert.ok(out.includes('color:var(--accent-on)'), 'the ink on the accent is left alone')
  const nav = buildBottomNav({ tabs: [{ id: 'a', label: 'Home', icon: 'home' }, { id: 'b', label: 'More', icon: 'list' }] } as never, 'a', 'island')
  assert.ok(!/color:var\(--accent\)/.test(nav), "the shell's active tab takes the measured token at its source")
}

console.log('Testing Stickers (GQ-21)...')
{
  const { renderStickers, stickerSvg, STICKER_NAMES } = await import('../../lib/stickers.ts')
  const { lintScreen: lint, autofixScreen: fix } = await import('../../lib/design-lint.ts')
  assert.equal(STICKER_NAMES.length, 12, 'twelve glyphs')
  for (const name of STICKER_NAMES) {
    const svg = stickerSvg(name)
    assert.ok(svg.includes('linearGradient') && svg.includes('feDropShadow'), `${name}: gradient and shadow make it clay`)
    assert.ok(svg.includes('var(--accent)'), `${name}: coloured from the tokens, not a literal`)
    assert.ok(!/https?:\/\//.test(svg), `${name}: no external reference`)
  }
  assert.ok(stickerSvg('trophy', 'warn').includes('var(--warn)'), 'a tone picks the matching status token')
  assert.ok(stickerSvg('no-such-glyph').includes(stickerSvg('sparkle').match(/<path d="([^"]+)" fill="#fff"\/>/)![1]), 'an unknown name draws the sparkle, never nothing')
  const page = '<!doctype html><html><body><div data-od-sticker="fire"></div><span data-od-sticker="trophy" data-tone="success" style="width:96px"></span></body></html>'
  const once = renderStickers(page)
  assert.equal((once.match(/data-od-sticker-rendered/g) ?? []).length, 4, 'both slots are drawn (marker on the slot and on its svg)')
  assert.ok(once.includes('width:96px;height:96px'), 'the slot\'s style width sets the sticker size')
  assert.ok(once.includes('var(--success)'), 'data-tone reaches the drawing')
  assert.equal(renderStickers(once), once, 'idempotent: a drawn sticker is left alone')
  assert.ok(fix(page).includes('data-od-sticker-rendered'), 'autofix draws stickers, next to charts and maps')
  assert.ok(!lint(fix(page)).some((f) => f.rule === 'hand-drawn-icon'), 'a drawn sticker is not reported as a hand-drawn icon')
  assert.ok(readFileSync('src/app/Services/PromptComposer.ts', 'utf8').includes('data-od-sticker="fire"'), 'the model is told the slot exists')

  // GQ-27: a paragraph in the system prompt is not enough. One run put the same flame on two
  // screens and nothing on the stats screen, so the name now travels in the screen's own spec —
  // the same lesson as the hue: a sampler acts on what its specific brief says, not on a general
  // permission. Only heroes that are a figure or a moment get one; a detail, a player and a
  // profile lead with a photo or an avatar, where a glyph would compete with the subject.
  const { BlueprintService } = await import('./BlueprintService.ts')
  const withSticker = ['dashboard', 'stats', 'result', 'onboarding', 'paywall']
  for (const id of withSticker) {
    const bp = BlueprintService.find(id)!
    assert.ok(bp.hero?.sticker && STICKER_NAMES.includes(bp.hero.sticker), `${id}: its hero names a real sticker`)
    const brief = BlueprintService.brief(id)
    assert.ok(brief.includes(`data-od-sticker="${bp.hero!.sticker}"`), `${id}: the name reaches the screen's spec`)
    assert.ok(brief.indexOf('HERO MOMENT') < brief.indexOf('data-od-sticker'), `${id}: the sticker sits with the hero, not loose`)
  }
  for (const id of ['detail', 'player', 'profile']) assert.ok(!BlueprintService.find(id)?.hero?.sticker, `${id}: a photo-led hero takes no sticker`)
  assert.ok(!BlueprintService.brief('list').includes('data-od-sticker'), 'an archetype with no hero offers no sticker')
  // Every suggestion is distinct, so two screens of one app never ask for the same glyph.
  const names = withSticker.map((id) => BlueprintService.find(id)!.hero!.sticker)
  assert.equal(new Set(names).size, names.length, 'no two archetypes suggest the same sticker')
  assert.ok(BlueprintService.find('result')!.kit!.includes('data-od-sticker="trophy"'), "result's kit sketch draws the same sticker its hero names")
  assert.ok(readFileSync('src/app/Services/PromptComposer.ts', 'utf8').includes('when the screen\'s brief names one'), 'the general paragraph defers to the spec')
}

console.log('Testing Large-Title Header (GQ-19)...')
{
  const { buildDetailHeader: header } = await import('./ShellService.ts')
  const h = header('Morning meditation', 'Today')
  assert.ok(h.includes('font:400 34px/1.1 var(--font-display, inherit)'), 'the large title is 34px in the display face')
  assert.ok(/data-od-title="small"[^>]*font-size:17px/.test(h), 'the small title is 17px')
  assert.ok(/data-od-title="small"[^>]*opacity:0/.test(h), 'the small title starts hidden')
  assert.ok(h.includes('backdrop-filter:blur('), 'the header is glass')
  assert.ok(!h.includes('border-bottom'), 'no hairline under the header')
  assert.equal((h.match(/<script /g) ?? []).length, 1, 'one collapse script, inside the header')
  assert.ok(h.includes('prefers-reduced-motion'), 'no motion for people who asked for none')
  assert.ok(h.includes('data-od-back="Today"') && h.includes('data-od-shell="detail-header"') && h.includes('data-od-id="screen-header"'), 'the markers the bridge and the normaliser rely on are unchanged')
  assert.ok(!/class="/.test(h), 'inline styles only')
  assert.ok(h.includes('position:sticky;top:0'), 'still pinned, so the normaliser recognises it as the header')
}

console.log('Testing Icon Treatment (GQ-20)...')
{
  const { buildBottomNav: bar, iconSvg } = await import('./ShellService.ts')
  assert.ok(iconSvg('home').includes('stroke-width:var(--icon-stroke, 2)'), 'shell glyphs take their stroke from the design system')
  const nav = { type: 'bottom-tabs' as const, tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'me', label: 'Me', icon: 'user' }, { id: 'more', label: 'More', icon: 'grid' }] }
  const pill = bar(nav, 'home', 'pill')
  assert.ok(pill.includes('[aria-current=page] svg{fill:color-mix(in oklab, currentColor var(--od-icon-duotone, 14%), transparent)}'), 'the active tab glyph is duotone')
  assert.ok(pill.includes('@keyframes od-draw') && pill.includes('prefers-reduced-motion: no-preference'), 'the active glyph draws itself in, only when motion is welcome')
  assert.equal((pill.match(/<style /g) ?? []).length, 1, 'one style block, inside the nav')
  assert.ok(!bar(nav, 'home', 'bar').includes('od-draw'), 'the edge-to-edge bar stays plain')
  const kit = readFileSync('kit/od-kit.css', 'utf8')
  assert.ok(/\.od-row__lead svg, \.od-icon-btn svg, \.od-empty__icon svg \{ fill: color-mix\(in oklab, currentColor var\(--od-icon-duotone, 14%\), transparent\); \}/.test(kit), 'lead icons in the kit are duotone by default')
  assert.ok(kit.includes('.od-empty__icon { width: 56px; height: 56px; border-radius: var(--od-icon-radius, 50%)'), 'the empty-state icon container follows the same tokens as the icon button')
}

console.log('Testing Identical Card Stack (GQ-22)...')
{
  const { lintScreen: lint } = await import('../../lib/design-lint.ts')
  const page = (body: string) => `<!doctype html><html><head><title>T</title></head><body>${body}</body></html>`
  const card = (n: number, cls = 'od-card') => Array.from({ length: n }, (_, i) => `<div class="${cls}"><p>Item ${i}</p></div>`).join('')
  const hit = (html: string) => lint(html).find((f) => f.rule === 'identical-card-stack')
  assert.ok(hit(page(`<main>${card(4)}</main>`)), 'four identical cards in a row is the finding')
  assert.ok(!hit(page(`<main>${card(3)}</main>`)), 'three is a section, not a stack')
  assert.ok(!hit(page(`<main>${card(2)}<h2>Later</h2>${card(2)}</main>`)), 'a heading between them breaks the run')
  assert.ok(!hit(page(`<main><div class="od-bento">${card(1, 'od-card od-bento__wide')}${card(4)}</div></main>`)), 'uniform squares inside a bento are the point, not the problem')
  assert.ok(!hit(page(`<main>${card(2)}${card(2, 'od-card od-card--media')}</main>`)), 'cards of different kinds are not identical')
  assert.ok(hit(page(`<main><section><div class="wrap">${card(5)}</div></section></main>`))!.samples[0].includes('×5'), 'the sample says how many, wherever they nest')
  // The rule reads markup only — a <style> block that happens to mention od-card four times is not a stack.
  assert.ok(!hit(page(`<style>.od-card{} .od-card{} .od-card{} .od-card{}</style><main>${card(1)}</main>`)), 'CSS is not counted')
}

console.log('Testing iOS 26 Bar (GQ-18)...')
{
  const { buildBottomNav: bar } = await import('./ShellService.ts')
  const nav = { type: 'bottom-tabs' as const, tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'search', label: 'Search', icon: 'search' }, { id: 'me', label: 'Me', icon: 'user' }] }
  for (const style of ['island', 'pill'] as const) {
    const html = bar(nav, 'home', style)
    assert.ok(html.includes('bottom:21px'), `${style}: the floating bar sits 21px in from the bottom, as the iOS 26 capsule does`)
    assert.ok(html.includes('inset 0 1px 0 rgba(255,255,255,.45)'), `${style}: glass is blur plus a light along the top edge`)
    assert.ok(html.includes('backdrop-filter:blur('), `${style}: the bar is translucent`)
    assert.equal((html.match(/<script /g) ?? []).length, 1, `${style}: exactly one collapse script, inside the nav`)
    assert.ok(html.includes('prefers-reduced-motion'), `${style}: no motion for people who asked for none`)
    assert.ok(/data-od-search="1"[^>]*style="position:absolute;right:-70px/.test(html), `${style}: Search is its own island to the right`)
    assert.ok(html.includes('data-od-tab="search"'), `${style}: the search island is still the search tab`)
  }
  assert.ok(bar(nav, 'home', 'island').includes('left:21px;right:21px'), 'the island keeps 21px side insets')
  for (const style of ['bar', 'contrast'] as const) {
    const html = bar(nav, 'home', style)
    assert.ok(!html.includes('<script'), `${style}: an edge-to-edge or filled bar does not minimise`)
    assert.ok(!html.includes('data-od-search='), `${style}: search stays a normal tab`)
  }
  // (That two root-tab bars differ only in the active tab is already asserted by the Navigation Shell Builder block above.)

}

console.log('Testing Palette Wiring (GQ-10)...')
{
  // A system the person chose by hand is a choice and keeps its colours; only an automatic pick
  // may be recoloured. And every path that reads tokens must read the project's, not the catalogue's,
  // or a screen added later would come back in the old colours.
  const planCtl = readFileSync('src/app/Http/Controllers/PlanController.ts', 'utf8')
  assert.ok(/project\.designSystemAuto && plan\.palette/.test(planCtl), 'the palette is applied only when the system was chosen automatically')
  assert.ok(planCtl.includes('Project.savePalette('), 'the built palette is saved so later screens share it')
  const store = readFileSync('src/app/Http/Controllers/ProjectController.ts', 'utf8')
  assert.ok(/designSystemAuto: data\.designSystem === AUTO/.test(store), 'creating a project records whether the system was automatic')
  for (const file of ['src/app/Http/Controllers/PlanController.ts', 'src/app/Http/Controllers/GenerateController.ts', 'src/app/Http/Controllers/ProjectController.ts']) {
    const text = readFileSync(file, 'utf8')
    assert.ok(!/DesignSystemService\.readTokensRoot\(/.test(text), `${file} must read tokens through readTokensRootFor, never the bare catalogue root`)
  }
  const composer = readFileSync('src/app/Services/PromptComposer.ts', 'utf8')
  assert.ok(/opts\.tokensRoot \?\?/.test(composer), 'the drawing prompt shows the model the palette it will actually get')
}

console.log('All new features and App Coherence verified successfully! \u2705')

