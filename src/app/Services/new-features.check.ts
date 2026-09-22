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
}

console.log('Testing Navigation Shell Builder...')
const { buildBottomNav, buildDetailHeader, NAV_CLEARANCE } = await import('./ShellService.ts')
const navA = buildBottomNav(multiPlan.navigation, 'home')
const navB = buildBottomNav(multiPlan.navigation, 'stats')
assert.ok(navA.includes('data-od-shell="bottom-nav"'), 'Nav carries a shell marker')
assert.equal(
  navA.replace(/var\(--accent\)|var\(--meta\)/g, 'C').replace(/ aria-current="page"/g, ''),
  navB.replace(/var\(--accent\)|var\(--meta\)/g, 'C').replace(/ aria-current="page"/g, ''),
  'Two root-tab navs may differ ONLY in which tab is active',
)
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
const { normalizeScreen, extractStyleDigest, extractRootBlock, parseDeclarations } = await import(
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

const digest = extractStyleDigest(normA)
assert.ok(!digest.includes(':root'), 'Style digest excludes the canonical token block')

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
assert.ok(badged.includes('button:not(.bell):has('), 'a button whose class already has an ::after (a badge) keeps it')

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
// Both controllers must tie the response stream's cancellation to the upstream abort.
for (const f of ['GenerateController', 'PlanController']) {
  const src = (await import('node:fs')).readFileSync(`src/app/Http/Controllers/${f}.ts`, 'utf8')
  assert.ok(/cancel\(\)\s*\{\s*abort\.abort\(\)/.test(src), `${f} must abort the LLM call when the client cancels`)
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

console.log('All new features and App Coherence verified successfully! ✅')

