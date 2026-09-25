import assert from 'node:assert'
import { extractArtifact } from '../../artifact.ts'
import { streamCompletion } from './LlmService.ts'
import { DesignSystemService } from './DesignSystemService.ts'
import { composeSystemPrompt } from './PromptComposer.ts'
import { parsePlan, screenTitle, withOnboarding, type PlannedScreen } from './PlannerService.ts'
import { componentSheet, SHEET_BUDGET } from './ComponentSheetService.ts'
import { mapLimit } from './Pool.ts'
import { buildBottomNav, ICON_NAMES, ICON_SYNONYMS, resolveIcon } from './ShellService.ts'

const h = '<!doctype html><html><head><title>T</title></head></html>'
assert.deepEqual(extractArtifact(`<artifact title="Dash">${h}</artifact>`), { title: 'Dash', html: h })
assert.deepEqual(extractArtifact('Sure!\n```html\n' + h + '\n```'), { title: 'T', html: h })
assert.deepEqual(extractArtifact(`<artifact title="X">\n\`\`\`html\n${h}\n\`\`\`\n</artifact>`), { title: 'X', html: h })
assert.equal(extractArtifact(`<artifact title="Cut">${h.slice(0, 20)}`).html, h.slice(0, 20)) // partial stream
assert.equal(extractArtifact(`<artifact title="Profile &amp; Goals">${h}</artifact>`).title, 'Profile & Goals', 'titles are plain text')
assert.equal(extractArtifact('<html><head><title>Q&amp;A &lt;3</title></head></html>').title, 'Q&A <3')
assert.equal(extractArtifact(`<artifact title="X">${h}\n\`\`\`\n### What I built\n- a list</artifact>`).html, h, 'prose after </html> is dropped')
assert.equal(extractArtifact(`${h}\n\nHope this helps!`).html, h)
assert.equal(extractArtifact('<artifact><html><head><title>Grocery list</title></head></html></artifact>').title, 'Grocery list', 'an unnamed artifact takes its <title>')
assert.equal(extractArtifact('<artifact><html><body><h1>Trip <em>settings</em></h1></body></html></artifact>').title, 'Trip settings', '…then its first heading')
assert.equal(extractArtifact('<artifact><html><body><p>x</p></body></html></artifact>').title, 'Untitled')
assert.ok(DesignSystemService.list().some((d) => d.id === 'minimal' && d.name === 'Minimal'))
assert.ok(DesignSystemService.exists('minimal'))
assert.ok(!DesignSystemService.exists('../../etc'))

// compose: the mobile skill body, its one craft file and the style card land in the prompt
const mobile = composeSystemPrompt('minimal')
assert.ok(mobile.includes('390px'), 'mobile skill body present')
assert.ok(mobile.includes('— style card'), 'style card present')
assert.ok(mobile.includes('# Mobile screen craft'), 'requested craft file present')

// SSE parser: events split across chunk boundaries, keep-alive comments, [DONE]
const sse = [
  ': keep-alive\n\n',
  'data: {"choices":[{"delta":{"content":"<art"}}]}\n\ndata: {"choi',
  'ces":[{"delta":{"content":"ifact>"}}]}\n\n',
  'data: [DONE]\n\n',
]
process.env.DEEPSEEK_API_KEY = 'test'
globalThis.fetch = async () =>
  new Response(new ReadableStream({ start(c) { sse.forEach((s) => c.enqueue(new TextEncoder().encode(s))); c.close() } }))
let out = ''
for await (const d of streamCompletion('s', 'u')) out += d
assert.equal(out, '<artifact>')

// planner: parse + validate + truncate untrusted model JSON
const plan = parsePlan(
  JSON.stringify({
    appName: 'BrainFlow AI',
    summary: 'A study app.',
    tags: ['dark', 'mobile'],
    screens: [{ name: 'Home', description: 'Today view' }],
  }),
)
assert.equal(plan.appName, 'BrainFlow AI')
assert.equal(plan.screens.length, 1)
assert.throws(() => parsePlan(JSON.stringify({ appName: 'X', screens: [] })), /no screens/) // model returned nothing to build
assert.throws(() => parsePlan('not json'))
const many = parsePlan(JSON.stringify({ screens: Array.from({ length: 9 }, (_, i) => ({ name: `S${i}` })) }))
assert.equal(many.screens.length, 6, 'capped at 6 screens')

// GQ-08 judge finding: the app's name is not part of a screen's name — the header drew it at 34px.
const named = parsePlan(
  JSON.stringify({
    appName: 'Streakly',
    screens: [
      { name: 'Today — Streakly habit tracker', screenType: 'root-tab', activeTabId: 'today', linksTo: ['Habit Detail — Streakly'] },
      { name: 'Habit Detail — Streakly', screenType: 'detail-view', parentScreen: 'Today — Streakly habit tracker' },
      { name: 'Streakly — Achievements', screenType: 'detail-view', parentScreen: 'Today' },
      { name: 'Streakly Progress — Bento Stats', screenType: 'root-tab', activeTabId: 'progress' },
      { name: 'Streakly', screenType: 'root-tab', activeTabId: 'home' },
    ],
    navigation: { type: 'bottom-tabs', tabs: [{ id: 'today', label: 'Today' }, { id: 'progress', label: 'Progress' }, { id: 'home', label: 'Home' }] },
  }),
)
assert.deepEqual(named.screens.map((s) => s.name), ['Today', 'Habit Detail', 'Achievements', 'Progress — Bento Stats', 'Streakly'])
assert.deepEqual(named.screens[0]!.linksTo, ['Habit Detail'], 'a link written with the app name still finds its screen')
assert.equal(named.screens[1]!.parentScreen, 'Today', 'a parent written with the app name still resolves')
assert.equal(screenTitle('Cart', 'GoBite'), 'Cart')
assert.equal(screenTitle('Cart (GoBite)', 'GoBite'), 'Cart')
assert.equal(screenTitle('Settings', ''), 'Settings')

const screens = [{ name: 'Home', description: 'Today view' }]

// GQ-38: an app opens with its onboarding, in place of a screen nobody asked for.
{
  const nav = { type: 'bottom-tabs', tabs: [{ id: 'today', label: 'Today' }, { id: 'stats', label: 'Stats' }, { id: 'settings', label: 'Settings' }] }
  const six = (requested: string[] = [], settingsCovers: number[] = []) =>
    parsePlan(JSON.stringify({
      appName: 'Streakly', summary: 'Build habits.', navigation: nav, requested,
      screens: [
        { name: 'Today', archetype: 'dashboard', screenType: 'root-tab', activeTabId: 'today' },
        { name: 'Habit Detail', archetype: 'detail', screenType: 'detail-view', parentScreen: 'Today' },
        { name: 'Create Habit', archetype: 'form', screenType: 'modal-flow', parentScreen: 'Today' },
        { name: 'Stats', archetype: 'stats', screenType: 'root-tab', activeTabId: 'stats' },
        { name: 'Achievements', archetype: 'result', screenType: 'detail-view', parentScreen: 'Stats' },
        { name: 'Settings', archetype: 'settings', screenType: 'root-tab', activeTabId: 'settings', covers: settingsCovers },
      ],
    }))
  const p = withOnboarding(six(), 'make habit tracker')
  assert.equal(p.screens[0]!.archetype, 'onboarding', 'onboarding comes first')
  assert.equal(p.screens[0]!.screenType, 'modal-flow')
  assert.deepEqual(p.screens[0]!.linksTo, ['Today'], 'its button opens the first tab')
  assert.equal(p.screens.length, 6, 'still six screens: it takes a slot, it does not add one')
  assert.ok(!p.screens.some((s) => s.archetype === 'settings'), 'the unrequested settings screen made room')
  assert.deepEqual(p.navigation.tabs.map((t) => t.id), ['today', 'stats'], 'a tab no screen opens any more is pruned')
  // A requested settings screen stays; with nothing else to give up, there is no onboarding.
  const kept = withOnboarding(six(['settings'], [0]), 'habit tracker with settings')
  assert.ok(kept.screens.some((s) => s.name === 'Settings'), 'a screen the brief asked for is never dropped')
  assert.ok(!kept.screens.some((s) => s.archetype === 'onboarding'), '…so there is no room for onboarding')
  // Briefs that count their screens, refuse onboarding, or already have one are left alone.
  assert.equal(withOnboarding(six(), 'a habit tracker on three screens').screens[0]!.name, 'Today')
  assert.equal(withOnboarding(six(), 'habit tracker, no onboarding').screens[0]!.name, 'Today')
  assert.equal(withOnboarding(p, 'make habit tracker').screens.filter((s) => s.archetype === 'onboarding').length, 1, 'never twice')
  // No supporting screen to give up: a second screen of a kind the app already has makes room.
  const forms = parsePlan(JSON.stringify({ appName: 'TaskFlow', navigation: { type: 'bottom-tabs', tabs: [{ id: 'today', label: 'Today' }, { id: 'projects', label: 'Projects' }] }, screens: [
    { name: 'Today', archetype: 'list', screenType: 'root-tab', activeTabId: 'today' },
    { name: 'Projects', archetype: 'list', screenType: 'root-tab', activeTabId: 'projects' },
    { name: 'Project Detail', archetype: 'detail', screenType: 'detail-view', parentScreen: 'Projects' },
    { name: 'Task Detail', archetype: 'detail', screenType: 'detail-view', parentScreen: 'Today' },
    { name: 'Create Task', archetype: 'form', screenType: 'modal-flow', parentScreen: 'Today' },
    { name: 'Edit Task', archetype: 'form', screenType: 'modal-flow', parentScreen: 'Today' },
  ] }))
  const f = withOnboarding(forms, 'todo app')
  assert.equal(f.screens[0]!.archetype, 'onboarding')
  assert.ok(!f.screens.some((s) => s.name === 'Edit Task') && f.screens.some((s) => s.name === 'Create Task'), 'the second form made room, the first stayed')
  assert.ok(f.screens.filter((s) => s.screenType === 'root-tab').length === 2, 'a tab root is never the one given up')
  // Fewer than six: onboarding is added without dropping anything.
  const two = parsePlan(JSON.stringify({ appName: 'X', navigation: nav, screens: [{ name: 'Today', screenType: 'root-tab', activeTabId: 'today' }, { name: 'Stats', screenType: 'root-tab', activeTabId: 'stats' }] }))
  assert.equal(withOnboarding(two, 'x').screens.length, 3)
  // It is drawn without chrome: no back header, no tab bar, and its button opens the first tab.
  const { shellPartsFor, shellContract } = await import('./ScreenContext.ts')
  const welcome = p.screens[0]!
  assert.deepEqual(shellPartsFor(welcome, p.navigation, welcome.name), {}, 'nothing injected over a first-run screen')
  assert.ok(shellContract(welcome, p.navigation).includes('data-od-link="Today"'), 'the contract names where Get started goes')
  assert.ok(shellPartsFor({ screenType: 'detail-view', name: 'Habit Detail', archetype: 'detail' }, p.navigation, 'Habit Detail').header, 'other pushed screens keep their header')
}

// pool: never exceeds the concurrency limit, still runs every item, preserves result order
let inFlight = 0
let maxInFlight = 0
const results = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
  inFlight++
  maxInFlight = Math.max(maxInFlight, inFlight)
  await new Promise((r) => setTimeout(r, n % 2 === 0 ? 1 : 5))
  inFlight--
  return n * 10
})
assert.ok(maxInFlight <= 2, `max concurrency was ${maxInFlight}`)
assert.deepEqual(results, [10, 20, 30, 40, 50, 60])

// GEN-17: mobile prompts carry the look of a design system, never the company it came from.
{
  const { readdirSync, readFileSync, existsSync } = await import('node:fs')
  const STYLE_NAMED = ['minimal', 'midnight', 'elegant', 'retro', 'neon', 'bento', 'brutalist', 'neobrutalism', 'glassmorphism', 'doodle', 'dashboard', 'material']
  for (const id of readdirSync('design-systems').filter((d) => existsSync(`design-systems/${d}/DESIGN.md`))) {
    const path = `design-systems/${id}/STYLE.md`
    assert.ok(existsSync(path), `${id}: STYLE.md exists`)
    const card = readFileSync(path, 'utf8')
    assert.ok(card.split('\n').length <= 60, `${id}: style card is at most 60 lines`)
    for (const h of ['Colour energy:', '## Colour use', '## Type', '## Shape and depth', '## Layout and density', '## Signature moves', '## Avoid'])
      assert.ok(card.includes(h), `${id}: style card has "${h}"`)
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(card), `${id}: colours only through tokens, no hex`)
    const tokens = new Set([...readFileSync(`design-systems/${id}/tokens.css`, 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
    for (const m of card.matchAll(/var\((--[\w-]+)/g)) assert.ok(tokens.has(m[1]), `${id}: ${m[1]} is not in tokens.css`)
    if (!STYLE_NAMED.includes(id)) assert.ok(!new RegExp(`\\b${id.split('-')[0]}\\b`, 'i').test(card), `${id}: brand name in style card`)
  }
  const duo = composeSystemPrompt('duolingo')
  assert.ok(!/\bowl\b|\bDuo\b|Duolingo|mascot/i.test(duo), 'the brand and its mascot never reach a mobile prompt')
}

// GEN-18: a screen that names its design system's company is a P0 lint finding.
{
  const { lintScreen } = await import('../../lib/design-lint.ts')
  const { readFileSync } = await import('node:fs')
  const page = (title: string, body: string) => `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`
  const leak = (html: string, id: string) => lintScreen(html, { leakTerms: DesignSystemService.readLeakTerms(id) }).find((f) => f.rule === 'design-system-brand-leak')
  const owl = leak(page('Lesson Complete — Duolingo', '<h1>Lesson complete!</h1>'), 'duolingo')
  assert.equal(owl?.severity, 'error')
  assert.deepEqual(owl?.samples, ['Duolingo'])
  assert.ok(leak(page('Duo — Home', ''), 'duolingo'), 'mascot naming the app')
  assert.ok(!leak(page('Production', '<h1>Produce duo-tone reports</h1>'), 'duolingo'), 'whole words only')
  assert.ok(!leak(page('Checkout', '<p>Pay securely with Stripe</p>'), 'stripe'), 'a brand in ordinary copy is fine')
  assert.ok(leak(page('Stripe Dashboard', ''), 'stripe'), 'a brand naming the app is not')
  assert.ok(!leak(page('Product Detail — KicksDrop', '<h1>Nike Air Max 90</h1><p>Nike</p>'), 'nike'), 'a shop may sell the brand')
  assert.ok(leak(page('Car', '<p>Reserve your Cybertruck</p>'), 'tesla'), 'product names leak anywhere')
  assert.ok(!leak(page('Lesson Complete — Duolingo', ''), 'minimal'), 'systems without terms never fire')
  assert.ok(!lintScreen(page('Duolingo', '')).some((f) => f.rule === 'design-system-brand-leak'), 'no terms passed, no rule')
  for (const id of Object.keys(JSON.parse(readFileSync('design-systems/leak-terms.json', 'utf8')))) assert.ok(DesignSystemService.exists(id), `leak-terms.json: unknown design system ${id}`)
  assert.ok(!DesignSystemService.list().some((d) => d.id.includes('leak-terms')), 'the terms file is not listed as a design system')
}

// GEN-19: a screen added to an existing app joins that app.
{
  const { parseNavigation, screenBrief, shellContract, shellPartsFor, slotForAddedScreen } = await import('./ScreenContext.ts')
  const nav = { type: 'bottom-tabs' as const, tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'stats', label: 'Stats', icon: 'bar-chart-2' }, { id: 'profile', label: 'Profile', icon: 'user' }] }
  const existing = [
    { name: 'SnapCal — Home', screenType: 'root-tab', activeTabId: 'home' },
    { name: 'Meal detail', screenType: 'detail-view', activeTabId: null },
    { name: 'SnapCal — Profile', screenType: 'root-tab', activeTabId: 'profile' },
  ]
  assert.deepEqual(slotForAddedScreen("yana bitta qo'sh", nav, existing), { screenType: 'detail-view', parentScreen: 'SnapCal — Home' }, 'a vague request becomes a detail screen under the first tab')
  assert.deepEqual(slotForAddedScreen('make the stats page', nav, existing), { screenType: 'root-tab', activeTabId: 'stats' }, 'naming an empty tab fills it')
  assert.equal(slotForAddedScreen('another profile variant', nav, existing).screenType, 'detail-view', 'an occupied tab never gets a second root screen')
  assert.equal(slotForAddedScreen('show statsy things', nav, existing).screenType, 'detail-view', 'tab labels match as whole words')

  const detail = slotForAddedScreen('water log', nav, existing)
  assert.ok(shellContract(detail, nav).includes("this screen's title"), 'the title is the model\'s to choose')
  assert.ok(shellPartsFor(detail, nav, 'Water log').header?.includes('data-od-back="SnapCal — Home"'))
  assert.ok(shellPartsFor({ screenType: 'root-tab', activeTabId: 'stats' }, nav, 'Stats').nav?.includes('data-od-shell="bottom-nav"'))

  const brief = screenBrief({ app: 'SnapCal', screenNames: existing.map((s) => s.name), contract: shellContract(detail, nav), sheet: '<div class="od-card">x</div>', heading: 'Screen to add', description: 'water log' })
  for (const part of ['App: SnapCal', 'SnapCal — Home, Meal detail, SnapCal — Profile', 'SHELL CONTRACT', '# HOUSE STYLE', '```html\n<div class="od-card">x</div>\n```', 'water log']) assert.ok(brief.includes(part), `brief carries "${part}"`)

  // GQ-16: the sheet is the kit filled with this app's data, small, and the same for every caller.
  const entities = [{ kind: 'Habits', items: [{ name: 'Morning run', fields: { streak: '12 days', time: '7:00' } }, { name: 'Read <10> pages', fields: { streak: '4 days', time: '21:00' } }] }]
  const sheet = componentSheet(entities)
  assert.ok(sheet.length <= SHEET_BUDGET && sheet.length > 1200, `sheet is ${sheet.length} chars`)
  for (const part of ['od-row__title">Morning run', 'od-row__trail">12 days', 'Read &lt;10&gt; pages', 'od-section__title">Habits', 'od-stat__label">streak', 'od-bento__wide', 'od-btn od-btn--block', 'od-chip', 'od-search', 'od-switch', 'data-lucide="']) assert.ok(sheet.includes(part), `sheet carries "${part}"`)
  assert.equal(componentSheet(entities), sheet, 'deterministic')
  assert.ok(!sheet.includes('undefined') && !sheet.includes('<style'), 'no holes, no CSS — the kit styles it')
  assert.ok(componentSheet([]).includes('od-row__title">First item'), 'a plan without data still shows the build')

  assert.equal(parseNavigation(JSON.stringify(nav))?.tabs.length, 3)
  for (const junk of [null, '', '{', '{"tabs":[]}', '"x"']) assert.equal(parseNavigation(junk), null)
}

// GEN-19 (shell): a detail header injected into a row-flex body stacks above the screen, not beside it.
{
  const { normalizeShell, bodyIsRowContainer } = await import('../../lib/screen-normalizer.ts')
  const doc = (bodyCss: string, bodyAttrs = '') => `<!doctype html><html><head><style>/* body { display:block } */\nbody {\n  ${bodyCss}\n}\n.screen{max-width:390px}</style></head><body${bodyAttrs}><div class="screen">x</div></body></html>`
  assert.ok(bodyIsRowContainer(doc('display: flex;\n  justify-content: center;')))
  assert.ok(bodyIsRowContainer(doc('margin:0', ' class="min-h-screen flex justify-center"')))
  assert.ok(bodyIsRowContainer(doc('display:grid')))
  assert.ok(!bodyIsRowContainer(doc('display:flex; flex-direction: column')))
  assert.ok(!bodyIsRowContainer(doc('margin:0', ' class="flex flex-col"')))
  assert.ok(!bodyIsRowContainer(doc('margin:0')), 'a block body is left alone')
  const header = '<header data-od-id="screen-header" data-od-shell="detail-header">T</header>'
  const fixed = normalizeShell(doc('display:flex;justify-content:center'), { header })
  assert.ok(fixed.includes('data-od-shell="stack"') && fixed.includes('flex-direction:column!important'))
  assert.equal(normalizeShell(fixed, { header }).match(/data-od-shell="stack"/g)?.length, 1, 'idempotent')
  assert.ok(!normalizeShell(doc('margin:0'), { header }).includes('data-od-shell="stack"'))
  assert.ok(!normalizeShell(doc('display:flex'), { nav: '<nav data-od-shell="bottom-nav"></nav>' }).includes('data-od-shell="stack"'), 'a fixed tab bar is out of flow and needs no fix')
}

// GEN-20: screen types are made true in code — the stored baseline had 39 of 39 screens as "root-tab".
{
  const tabs = [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'search', label: 'Search', icon: 'search' }, { id: 'stats', label: 'Stats', icon: 'bar-chart-2' }, { id: 'profile', label: 'Profile', icon: 'user' }]
  const plan = (screens: Record<string, unknown>[]) => parsePlan(JSON.stringify({ navigation: { tabs }, screens })).screens
  const check = (screens: ReturnType<typeof plan>) => {
    const roots = screens.filter((s) => s.screenType === 'root-tab')
    assert.equal(new Set(roots.map((s) => s.activeTabId)).size, roots.length, 'one root screen per tab')
    assert.ok(roots.length >= 1 && roots.every((s) => tabs.some((t) => t.id === s.activeTabId) && !s.parentScreen))
    for (const s of screens.filter((x) => x.screenType !== 'root-tab')) {
      assert.ok(!s.activeTabId, `${s.name}: a pushed screen lights no tab`)
      assert.ok(screens.some((o) => o.name === s.parentScreen && o.name !== s.name), `${s.name}: parent "${s.parentScreen}" is a real, other screen`)
    }
  }

  // the historical failure: everything root-tab, tabs reused
  const lazy = plan([
    { name: 'Home', screenType: 'root-tab', activeTabId: 'home' },
    { name: 'Note Editor', screenType: 'root-tab', activeTabId: 'home' },
    { name: 'Search', screenType: 'root-tab', activeTabId: 'search' },
    { name: 'Stats', screenType: 'root-tab' },
    { name: 'Profile', screenType: 'root-tab', activeTabId: 'nope' },
  ])
  check(lazy)
  assert.deepEqual(lazy.map((s) => s.screenType), ['root-tab', 'detail-view', 'root-tab', 'root-tab', 'root-tab'])
  assert.equal(lazy[1].parentScreen, 'Home', 'the loser of a tab is pushed from the winner')
  assert.equal(lazy[3].activeTabId, 'stats', 'a root screen with no tab takes the free tab named like it')
  assert.equal(lazy[4].activeTabId, 'profile', 'an invalid tab id is repaired the same way')

  const five = plan(['Home', 'Search', 'Stats', 'Profile', 'Settings'].map((name) => ({ name, screenType: 'root-tab' })))
  check(five)
  assert.equal(five.filter((s) => s.screenType === 'detail-view').length, 1, '5 screens over 4 tabs leaves at least one detail view')

  const orphans = plan([
    { name: 'Meal Detail', screenType: 'detail-view', parentScreen: 'Nowhere' },
    { name: 'Checkout', screenType: 'modal-flow', parentScreen: 'meal detail', activeTabId: 'home' },
    { name: 'Self', screenType: 'detail-view', parentScreen: 'Self' },
  ])
  check(orphans)
  assert.equal(orphans[0].screenType, 'root-tab', 'an app with no root screen gets a way in')
  assert.equal(orphans[1].parentScreen, 'Meal Detail', 'parents match case-insensitively and keep the real name')
  assert.equal(orphans[2].parentScreen, 'Meal Detail', 'a screen is never its own parent')
}

// GEN-22: the cast of an app is chosen in code — one signed-in user per project, different across projects.
{
  const { contentSeed, contentBlock, localeOf, genderOf } = await import('../../lib/content-seed.ts')
  const day = new Date('2026-09-21T09:00:00Z')
  const a = contentSeed('project-a', 'en', day)
  assert.deepEqual(contentSeed('project-a', 'en', day), a, 'same project, same cast — on every screen and on a screen added later')
  const users = new Set(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].map((id) => contentSeed(id, 'en', day).user.name))
  assert.ok(users.size >= 6, `8 projects share only ${users.size} names`)
  assert.ok(!a.people.includes(a.user.name) && new Set(a.people).size === a.people.length && a.people.length === 6)
  assert.equal(a.user.initials.length, 2)
  assert.match(a.user.email, /^[a-z.]+@gmail\.com$/)
  assert.ok(contentBlock(a).includes(a.user.name) && contentBlock(a).includes('2026'))

  assert.equal(localeOf('Toshkent uchun taksi chaqirish ilovasi'), 'uz')
  assert.equal(localeOf('Приложение доставки продуктов'), 'ru')
  assert.equal(localeOf('Fitness tracker for runners, vague todo app'), 'en')
  assert.equal(genderOf('Никита Соколов'), 'm', 'a male name ending in -a is still male')
  assert.equal(genderOf('Maya Chen'), undefined, 'a name the model invented has no known gender')
  assert.ok([a.user.name, ...a.people].every((n) => genderOf(n)), 'every seeded person has a gender, so an avatar can match')
  const uz = contentSeed('project-a', 'uz', day)
  assert.ok(/so'm/.test(uz.money) && /@gmail\.com$/.test(uz.user.email))
  const ru = contentSeed('project-a', 'ru', day)
  assert.ok(/[а-яё]/i.test(ru.user.name) && /₽/.test(ru.money) && /^user\d+@/.test(ru.user.email), 'a Cyrillic name still gets an address')
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
    const name = contentSeed(id, 'ru', day).user.name
    assert.equal(genderOf(name) === 'f', /а$/.test(name.split(' ')[1]), `${name}: surname agrees with gender`)
  }
}

// GEN-23: the mobile system prompt stays small enough for a fast model to actually follow.
{
  const { readdirSync, existsSync, readFileSync } = await import('node:fs')
  for (const id of readdirSync('design-systems').filter((d) => existsSync(`design-systems/${d}/DESIGN.md`))) {
    const size = composeSystemPrompt(id).length
    assert.ok(size < 24_000, `${id}: mobile system prompt is ${size} chars (budget 24 000, about 6k tokens)`)
  }
  assert.ok(readFileSync('craft/mobile.md', 'utf8').split('\n').length <= 150, 'craft/mobile.md is at most 150 lines')
}

// GEN-24: accent is budgeted per design system, not "at most twice" for all of them.
{
  const { lintScreen, ACCENT_BOUNDS } = await import('../../lib/design-lint.ts')
  const { readdirSync, existsSync, readFileSync } = await import('node:fs')
  assert.equal(DesignSystemService.readColorEnergy('duolingo'), 'high')
  assert.equal(DesignSystemService.readColorEnergy('minimal'), 'low')
  for (const id of readdirSync('design-systems').filter((d) => existsSync(`design-systems/${d}/DESIGN.md`))) assert.ok(DesignSystemService.readColorEnergy(id), `${id}: style card states its colour energy`)
  const screen = (n: number) => `<html><head><style>:root{--accent:#58cc02}</style></head><body>${'<b style="color:var(--accent)">x</b>'.repeat(n)}<nav data-od-shell="bottom-nav"><a style="color:var(--accent)">t</a></nav></body></html>`
  const mismatch = (n: number, colorEnergy: 'low' | 'medium' | 'high') => lintScreen(screen(n), { colorEnergy }).find((f) => f.rule === 'accent-energy-mismatch')
  assert.equal(mismatch(1, 'high')?.severity, 'warn', 'a grey screen in a high-energy system')
  assert.ok(!mismatch(ACCENT_BOUNDS.highMin, 'high') && !mismatch(30, 'high'))
  assert.ok(mismatch(ACCENT_BOUNDS.lowMax + 1, 'low') && !mismatch(ACCENT_BOUNDS.lowMax, 'low') && !mismatch(0, 'low'))
  assert.ok(!mismatch(0, 'medium') && !mismatch(99, 'medium'), 'medium is never flagged')
  assert.ok(!lintScreen(screen(0)).some((f) => f.rule === 'accent-energy-mismatch'), 'no energy given, no rule')
  for (const f of ['craft/mobile.md', 'skills/mobile-screen/SKILL.md']) assert.ok(!/at most (2|twice)|most twice/i.test(readFileSync(f, 'utf8')), `${f}: the flat accent cap is gone`)
}

// UX-03 / UX-04: the plan says what each screen is for, covers what the brief asked for, and carries one data model.
{
  const { inferArchetype } = await import('./PlannerService.ts')
  const { dataBlock, screenSpec, parseStoredPlan } = await import('./ScreenContext.ts')
  const v2 = parsePlan(
    JSON.stringify({
      appName: 'Feastly',
      appType: 'food-delivery',
      requested: ['restaurant feed', 'dish detail with add-ons', 'cart and checkout', 'live order tracking'],
      navigation: { tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'orders', label: 'Orders', icon: 'receipt' }, { id: 'search', label: 'Search', icon: 'search' }, { id: 'profile', label: 'Profile', icon: 'user' }] },
      entities: [
        { kind: 'Dish', items: [{ name: 'Pad Thai', fields: { price: '$16.50', rating: 4.8, nested: { no: 1 } } }, { name: '', fields: {} }, { name: 'Green Curry', fields: { price: '$17.00' } }] },
        { kind: '', items: [{ name: 'x' }] },
        { kind: 'Empty', items: [] },
      ],
      screens: [
        { name: 'Home', archetype: 'feed', screenType: 'root-tab', activeTabId: 'home', covers: [0], sections: ['Search', 'Cuisine chips', 'Featured'], primaryAction: 'Open a restaurant', userGoal: 'Find dinner', linksTo: ['dish detail', 'Home', 'Nowhere'] },
        { name: 'Dish Detail', archetype: 'hologram', screenType: 'detail-view', parentScreen: 'Home', covers: [1, 1, 99, -1, 'x'], linksTo: ['Cart'] },
        { name: 'Cart', screenType: 'modal-flow', parentScreen: 'Dish Detail', covers: [2] },
        { name: 'Orders', screenType: 'root-tab', activeTabId: 'orders' },
      ],
    }),
  )
  assert.deepEqual(v2.uncovered, ['live order tracking'], 'a requested screen nobody covers is reported for the repair round')
  assert.deepEqual(v2.screens[1].covers, [1], 'covers keeps only real, distinct indexes')
  assert.deepEqual(v2.screens.map((s) => s.archetype), ['feed', 'detail', 'checkout', 'list'], 'unknown or missing archetypes are inferred from the name, then the type')
  assert.deepEqual(v2.screens[0].linksTo, ['Dish Detail'], 'links keep the real screen name; self and unknown targets are dropped')
  assert.deepEqual(v2.navigation.tabs.map((t) => t.id), ['home', 'orders'], 'tabs no screen can open are pruned')
  assert.deepEqual(v2.entities, [{ kind: 'Dish', items: [{ name: 'Pad Thai', fields: { price: '$16.50', rating: '4.8' } }, { name: 'Green Curry', fields: { price: '$17.00' } }] }], 'entities are cleaned: strings only, no empty kinds or items')
  assert.equal(parsePlan(JSON.stringify({ screens: [{ name: 'A' }] })).uncovered.length, 0, 'a vague brief requests nothing')
  assert.equal(inferArchetype('Live Order Tracking', 'detail-view'), 'map')
  assert.equal(inferArchetype('Whatever', 'root-tab'), 'list')

  const data = dataBlock(v2.entities)
  assert.ok(data.includes('- Pad Thai — price: $16.50; rating: 4.8') && data.includes('Never rename'))
  assert.equal(dataBlock([]), '')
  const spec = screenSpec(v2.screens[0])
  for (const part of ['User goal: Find dinner', 'Primary action', '1. Search', '3. Featured', 'data-od-link', '"Dish Detail"']) assert.ok(spec.includes(part), `spec carries ${part}`)
  assert.ok(!screenSpec(v2.screens[3]).includes('Sections'), 'an old-shape screen still yields a usable brief')
  assert.ok(spec.includes(`Screen pattern (${v2.screens[0].archetype}):`) && spec.includes('It must show:') && spec.includes('Avoid:'), 'the archetype\'s blueprint is in the spec')
  // GQ-15: a tab's root screen carries a hero even when its archetype's blueprint has none.
  const quietRoot = screenSpec({ ...v2.screens[0], archetype: 'list', screenType: 'root-tab', activeTabId: 'home' } as PlannedScreen)
  assert.ok(quietRoot.includes('HERO MOMENT:'), 'a root-tab list screen still gets a headline number')
  const quietDetail = screenSpec({ ...v2.screens[0], archetype: 'list', screenType: 'detail-view', parentScreen: 'Home' } as PlannedScreen)
  assert.ok(!quietDetail.includes('HERO MOMENT:'), 'a pushed list stays a quiet list')
  const loudRoot = screenSpec({ ...v2.screens[0], archetype: 'dashboard', screenType: 'root-tab', activeTabId: 'home' } as PlannedScreen)
  assert.equal((loudRoot.match(/HERO MOMENT:/g) ?? []).length, 1, 'an archetype with its own hero is not told twice')
  const quietTab = screenSpec({ ...v2.screens[0], archetype: 'settings', screenType: 'root-tab', activeTabId: 'settings' } as PlannedScreen)
  assert.ok(!quietTab.includes('HERO MOMENT:'), 'a settings tab stays quiet even as a root tab')
  assert.deepEqual(parseStoredPlan(JSON.stringify({ summary: 's', entities: v2.entities }))?.entities, v2.entities)
  for (const junk of [null, '', '{', '"x"']) assert.equal(parseStoredPlan(junk), null)
}

// CHAT-02 / CHAT-06: what the agent says is written in code.
{
  const { planReply, changeReply, friendlyError, parseMeta, formatTokens } = await import('../../lib/agent-messages.ts')
  const reply = planReply({ appName: 'GoBite', summary: 'Food delivery for busy evenings.', drawn: ['Feed', 'Menu', 'Cart'], failed: ['Tracking'], tabs: ['Home', 'Orders'], entities: [{ kind: 'Dish', count: 6 }, { kind: 'Restaurant', count: 1 }] })
  assert.equal(reply, 'GoBite — Food delivery for busy evenings.\nDesigned 3 screens: Feed, Menu and Cart.\nTabs: Home · Orders.\nEvery screen shares one set of data: 6 dishes and 1 restaurant.\nTracking could not be drawn — use “Try again” on that frame.')
  assert.match(planReply({ appName: 'A', summary: '', drawn: [], failed: [], tabs: [], entities: [{ kind: 'Category', count: 2 }, { kind: 'Box', count: 3 }] }), /2 categories and 3 boxes/)
  assert.equal(changeReply({ kind: 'element', screen: 'Home', element: 'header', version: 3 }), 'Updated “header” on “Home” — now v3.')
  assert.equal(changeReply({ kind: 'edit', screen: 'Home', version: 2 }), 'Updated “Home” — now v2.')
  assert.equal(changeReply({ kind: 'add', screen: 'Stats', slot: 'as the Stats tab' }), 'Added “Stats” as the Stats tab.')
  assert.match(friendlyError('DeepSeek 402: {"error":{"message":"Insufficient Balance"}}'), /out of credit/)
  assert.match(friendlyError('DeepSeek 429: Too many requests'), /rate-limiting/)
  assert.match(friendlyError('Model returned incomplete HTML'), /stopped before the screen was complete/)
  assert.match(friendlyError('fetch failed'), /connection/)
  assert.match(friendlyError('kaboom'), /Something went wrong/)
  assert.deepEqual(parseMeta('{'), {})
  assert.equal(formatTokens({ promptTokens: 25140, cachedTokens: 22016, completionTokens: 7310 }), 'Tokens: 25,140 in (22,016 cached), 7,310 out')
}

// CHAT-08: next-step suggestions are facts about the project, not guesses.
{
  const { suggestions } = await import('../../lib/suggestions.ts')
  const scr = (name: string, screenType: string, activeTabId: string | null, html: string) => ({ id: name, name, x: 0, screenType, activeTabId, parentScreenName: null, html })
  const tabs = [{ id: 'home', label: 'Home' }, { id: 'orders', label: 'Orders' }]
  const app = [
    scr('GoBite — Feed', 'root-tab', 'home', '<a data-od-link="Dish Detail">a</a><a data-od-link="Order Tracking">b</a><a data-od-link="Order Tracking">c</a><a data-od-link="Cart &amp; Checkout">d</a>'),
    scr('Dish Detail — GoBite', 'detail-view', null, '<a data-od-link="Cart & Checkout">x</a>'),
    scr('Broken', 'detail-view', null, ''),
  ]
  assert.deepEqual(suggestions(app, tabs), ['Design the Orders tab', 'Design the “Order Tracking” screen', 'Design the “Cart & Checkout” screen'], 'an empty tab first, then undesigned link targets, most linked first')
  assert.deepEqual(suggestions(app.slice(0, 2), [{ id: 'home', label: 'Home' }], 5).slice(-2), ['Show the empty state of “GoBite — Feed”', 'Add an onboarding screen'])
  // GQ-38: an app that already opens with an onboarding screen is not offered another.
  assert.ok(!suggestions([{ ...app[0]!, id: 'w', name: 'Welcome', x: -500 }, ...app.slice(0, 2)], [{ id: 'home', label: 'Home' }], 5).includes('Add an onboarding screen'))
  assert.deepEqual(suggestions([], tabs), [], 'nothing to suggest before anything is drawn')
  assert.deepEqual(suggestions([scr('x', 'root-tab', 'home', '')], tabs), [], 'a project of failed screens suggests nothing')
}

// EDT-18: "make it blue" is a theme change, not a new screen.
{
  const { routeIntent } = await import('../../lib/intent.ts')
  const none = { elementSelected: false }
  const theme = (p: string) => { const r = routeIntent(p, none); return r.kind === 'theme' ? r.theme : null }
  assert.deepEqual(theme('make it blue'), { accent: '#2563eb' })
  assert.deepEqual(theme('Make it blue please'), { accent: '#2563eb' })
  assert.deepEqual(theme('use #FF8800 as the accent'), { accent: '#ff8800' })
  assert.deepEqual(theme('#0af'), { accent: '#00aaff' })
  assert.deepEqual(theme('change the brand colour to a deep navy'), { accent: '#1e3a8a' })
  assert.deepEqual(theme("ko'k qil"), { accent: '#2563eb' })
  assert.deepEqual(theme('сделай зелёным'), { accent: '#16a34a' })
  assert.deepEqual(theme('rounder corners'), { radius: 'round' })
  assert.deepEqual(theme('sharper'), { radius: 'sharp' })
  assert.equal(theme('purple')?.accent, '#9333ea', 'plain purple is not the linted AI violet')
  for (const p of ['make the header blue', 'make the button red', 'add a blue banner to the home screen', 'change the background to black', 'a recipe app for busy parents with warm orange accents and a weekly planner screen', 'add a settings screen'])
    assert.equal(routeIntent(p, none).kind, 'generate', `"${p}" is design work`)
  assert.equal(routeIntent('make it blue', { elementSelected: true }).kind, 'generate', 'with an element selected it is about that element')
}

// GEN-21: a tab icon always resolves to a glyph we can draw — the baseline eval had 69 bare circles.
assert.ok(ICON_NAMES.length >= 80, `${ICON_NAMES.length} shell icons`)
for (const [from, to] of Object.entries(ICON_SYNONYMS)) assert.ok(ICON_NAMES.includes(to), `synonym ${from} -> ${to} points at a missing icon`)
// every name the planner actually produced on the baseline run
for (const name of 'user home search plus bar-chart-2 calendar message-circle compass list bookmark users bell heart file-text check-square library camera send pie-chart refresh-cw settings shopping-cart map play star hash grid shopping-bag tag plus-circle check-circle award mic play-circle wind moon book-open'.split(' '))
  assert.equal(resolveIcon(name), name, `${name} is drawn as itself`)
assert.equal(resolveIcon('profile-outline'), 'user')
assert.equal(resolveIcon('House'), 'home')
assert.equal(resolveIcon('no-such-glyph', 'Leaderboard'), 'trophy', 'falls back to the tab label')
assert.equal(resolveIcon('circle', 'Social'), 'users', 'the model\'s own "circle" is treated as unknown')
assert.equal(resolveIcon('', ''), 'grid')

const iconPlan = parsePlan(
  JSON.stringify({
    navigation: {
      tabs: [
        { id: 'a', label: 'Feed', icon: 'rss-feed-thing' },
        { id: 'b', label: 'Add', icon: 'plus', isAction: true },
        { id: 'c', label: 'Scan', icon: 'camera', isAction: true },
        { id: 'd', label: 'Record', icon: 'mic', isAction: true },
      ],
    },
    screens: [{ name: 'Feed' }],
  }),
)
assert.deepEqual(iconPlan.navigation.tabs.map((t) => t.icon), ['home', 'plus', 'camera', 'mic'])
assert.deepEqual(iconPlan.navigation.tabs.map((t) => t.isAction), [false, false, true, false], 'only one capture tab is raised; "plus" is not an action tab')
assert.ok(!/<svg data-od-icon[^>]*><circle cx="12" cy="12" r="10"\/><\/svg>/.test(buildBottomNav(iconPlan.navigation, 'a')), 'no fallback circle in the tab bar')

// UX-01: one blueprint per planner archetype, all in one shape
{
  const { ARCHETYPES } = await import('./PlannerService.ts')
  const { BlueprintService } = await import('./BlueprintService.ts')
  const { readdirSync } = await import('node:fs')
  const HIG = ['tab-bar', 'nav-bar', 'large-title', 'list', 'card', 'button', 'text-field', 'search', 'segmented', 'toggle', 'sheet', 'alert', 'progress', 'chip', 'avatar', 'image', 'map', 'player-controls', 'keyboard', 'badge', 'stepper', 'date-picker', 'picker']
  const files = readdirSync('blueprints').filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
  assert.deepEqual(files, [...ARCHETYPES].sort(), 'exactly one blueprint per archetype, no strays')
  for (const id of ARCHETYPES) {
    const b = BlueprintService.find(id)!
    assert.equal(b.id, id)
    for (const k of ['purpose', 'layout'] as const) assert.ok(typeof b[k] === 'string' && b[k].length > 20 && b[k].length < 400, `${id}.${k}`)
    assert.ok(b.sections.required.length >= 2 && b.sections.required.length <= 6, `${id}: 2–6 required sections`)
    assert.ok(Array.isArray(b.sections.optional), `${id}: optional sections`)
    assert.ok(['bottom-bar', 'inline', 'header', 'none'].includes(b.primaryAction.placement) && b.primaryAction.note.length > 10, `${id}: primary action`)
    assert.ok(b.avoid.length >= 2 && b.avoid.length <= 4, `${id}: 2–4 things to avoid`)
    for (const h of b.hig) assert.ok(HIG.includes(h), `${id}: unknown HIG card "${h}"`)
    assert.ok(BlueprintService.brief(id).length < (BlueprintService.exemplar(id) ? 6800 : 4200), `${id}: the brief stays short (pattern + platform notes + kit sketch or exemplar): ${BlueprintService.brief(id).length}`)
    assert.ok(!/\b(Airbnb|Uber|Spotify|Instagram|Duolingo|Apple|Google)\b/.test(JSON.stringify(b)), `${id}: no brand names`)
    // GQ-15: a hero names what it is and how big, in pixels — "big" without a number came out at 14px.
    if (b.hero) {
      assert.ok(b.hero.what.length > 15 && b.hero.what.length < 200, `${id}: hero.what`)
      assert.ok(/\d+(–|-)\d+px/.test(b.hero.size), `${id}: hero.size states a px range`)
      assert.ok(BlueprintService.brief(id).includes(`HERO MOMENT: ${b.hero.what}`), `${id}: the hero reaches the screen brief`)
    }
  }
  assert.ok(BlueprintService.find('dashboard')!.hero && BlueprintService.find('stats')!.hero && BlueprintService.find('detail')!.hero, 'the screens a habit app is made of carry a hero')
  assert.ok(!BlueprintService.find('settings')!.hero, 'a settings screen is quiet on purpose')
  // VAR-02: layout variants, picked per app, stable
  for (const id of ARCHETYPES) {
    const vs = BlueprintService.find(id)!.variants ?? []
    assert.ok(vs.length >= 2 && vs.length <= 4 && new Set(vs.map((v) => v.id)).size === vs.length, `${id}: 2–4 distinct variants`) // GQ-22: three archetypes gained a bento variant
  }
  assert.deepEqual(BlueprintService.variant('feed', 'GoBite'), BlueprintService.variant('feed', ' gobite '), 'the same app always gets the same layout')
  const picks = new Set(['GoBite', 'NovaBank', 'Tasky', 'Stayfinder', 'Tempo', 'Habitly', 'Zen', 'Pagely', 'Shelf', 'Trailmate'].map((a) => BlueprintService.variant('feed', a)!.id))
  assert.ok(picks.size >= 2, 'different apps land on different layouts')
  assert.ok(BlueprintService.brief('detail', 'GoBite').includes('Screen pattern (detail, layout '), 'a seeded brief names its layout')
  assert.ok(BlueprintService.brief('detail').startsWith('Screen pattern (detail): '), 'unseeded, the base pattern')
  for (const id of ARCHETYPES) {
    const kit = BlueprintService.find(id)!.kit ?? ''
    assert.ok(/class="od-/.test(kit) && kit.length < 1200, `${id}: a short kit sketch built from od- classes`)
  }
  // KIT-04: golden exemplars — a finished screen per pattern, built from the kit, replacing the sketch
  {
    const { EXEMPLAR_BUDGET } = await import('./BlueprintService.ts')
    const { readFileSync } = await import('node:fs')
    const kitCss = readFileSync('kit/od-kit.css', 'utf8')
    const known = new Set([...kitCss.matchAll(/\.(od-[a-z0-9_-]+)/g)].map((m) => m[1]))
    for (const f of readdirSync('blueprints/exemplars').filter((x) => x.endsWith('.html'))) {
      const m = f.match(/^([a-z-]+?)(?:-([a-z]))?\.html$/)
      assert.ok(m && (ARCHETYPES as readonly string[]).includes(m[1]!), `${f}: named <archetype>[-<variant>].html`)
      if (m![2]) assert.ok(BlueprintService.find(m![1]!)!.variants!.some((v) => v.id === m![2]), `${f}: its variant exists`)
      const html = BlueprintService.exemplar(m![1]!, m![2])
      assert.ok(html.length > 400 && html.length <= EXEMPLAR_BUDGET, `${f}: 400–${EXEMPLAR_BUDGET} chars once collapsed (${html.length})`)
      assert.ok(!/<style|<script|<nav\b|data-od-link|data-od-shell|\[[A-Za-z]/.test(html), `${f}: no CSS, scripts, shell, links or [brackets] — the kit and the plan supply those`)
      assert.ok(!/<svg/.test(html), `${f}: icons are data-lucide`)
      const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap((x) => x[1]!.split(/\s+/)).filter(Boolean)
      const unknown = classes.filter((c) => !c.startsWith('is-') && !known.has(c))
      assert.deepEqual(unknown, [], `${f}: every class is a kit class`)
      assert.ok(BlueprintService.brief(m![1]!, 'x').length > 0)
    }
  }
  // HIG-01 / HIG-02: platform cards, and only the ones a screen's archetype uses
  const { readFileSync } = await import('node:fs')
  for (const id of ARCHETYPES) for (const h of BlueprintService.find(id)!.hig) for (const p of ['ios', 'android']) {
    const text = readFileSync(`craft/platform/${p}/${h}.md`, 'utf8')
    const lines = text.split(/(?<=\.) /).length
    assert.ok(text.length < 700 && lines >= 3 && lines <= 9, `${p}/${h}: a short card (${text.length} chars, ${lines} sentences)`)
    assert.ok(!/\b(Apple|Google|iPhone|SwiftUI|UIKit|Jetpack)\b/.test(text), `${p}/${h}: our wording, no brand or framework names`)
  }
  const notes = BlueprintService.platformNotes('checkout')
  assert.ok(notes.startsWith('Platform notes (iOS)') && notes.includes('**List.**') && notes.includes('**Stepper.**') && !notes.includes('**Map.**'), 'checkout carries its own components\' cards, not others')
  assert.ok(BlueprintService.brief('checkout').includes('Platform notes (iOS)'), 'the cards are in the screen brief')
  assert.equal(BlueprintService.find('../etc'), null, 'ids are validated before touching the disk')
  assert.equal(BlueprintService.brief('nope'), '')
}

// GQ-31: a hero figure that cannot fit the screen. Measured in the grotesk the systems ship, on a
// 390px screen with 20px gutters: "$213" is 222px wide at 100px, "$298.89" is 393px and "$4,218.40"
// is 469px — so the old flat "80–112px" put a long figure off the screen, which is what thirteen
// overflow findings in one run turned out to be. The band is named by character count because the
// planner's own data is what tells the model how long the figure will be.
{
  const { BlueprintService } = await import('./BlueprintService.ts')
  for (const id of ['dashboard', 'stats', 'result', 'detail']) {
    const size = BlueprintService.find(id)!.hero!.size
    assert.ok(/characters/.test(size), `${id}: the hero size depends on how long the figure is`)
    assert.ok(/390px/.test(size), `${id}: it says which screen width that is measured for`)
    assert.ok(!/figure of \d+–\d+px/.test(size), `${id}: no flat range that ignores the content`)
  }
}


// UX-02: app-type patterns, matched in code, only one reaches the planner
{
  const { AppPatternService } = await import('./AppPatternService.ts')
  const { ARCHETYPES } = await import('./PlannerService.ts')
  const all = AppPatternService.all()
  assert.equal(all.length, 13)
  assert.equal(new Set(all.map((p) => p.priority)).size, 13, 'priorities are unique, so ties are deterministic')
  for (const p of all) {
    assert.ok(p.match.length >= 5 && p.loop.length > 10 && p.flows.length >= 1 && p.pitfalls.length >= 1, `${p.id}: complete`)
    assert.ok(p.screens.length >= 4 && p.screens.length <= 6, `${p.id}: 4–6 typical screens`)
    for (const s of p.screens) assert.ok((ARCHETYPES as readonly string[]).includes(s.archetype), `${p.id}: ${s.archetype} is a planner archetype`)
    assert.ok(AppPatternService.brief(p).length < 1200, `${p.id}: brief stays short`)
  }
  const kind = (brief: string) => AppPatternService.classify(brief)?.id ?? null
  assert.equal(kind('Food delivery: restaurant feed, dish detail, cart, order tracking'), 'food-delivery', 'the specific type beats commerce')
  assert.equal(kind('Neobank app: balance, cards, send money'), 'fintech')
  assert.equal(kind('Shifokor qabuliga yozilish ilovasi: mutaxassislik boʻyicha shifokor qidirish'), 'health', 'Uzbek, with its own apostrophe')
  assert.equal(kind('Приложение для тренировок и бега'), 'fitness', 'Russian inflections match by stem')
  assert.equal(kind('Recipe app: ingredients and steps, cooking mode step by step'), null, '"steps" of a recipe is not fitness')
  assert.equal(kind('Cardio plan with heart zones'), null, 'a short keyword ("card") must be a whole word')
  assert.equal(kind('find and pay for parking'), null, 'no pattern rather than a wrong one')
  assert.equal(kind(''), null)
}

// the local claude-cli provider has no JSON mode: the JSON is cut out of whatever surrounds it
{
  const { jsonOnly } = await import('./LlmService.ts')
  assert.equal(jsonOnly('```json\n{"a":{"b":1}}\n```'), '{"a":{"b":1}}')
  assert.equal(jsonOnly('Here is the plan: {"x":[1]} Hope it helps.'), '{"x":[1]}')
  assert.equal(jsonOnly('no json'), 'no json', 'nothing to cut: the caller\'s JSON.parse reports it')
}

// VAR-01: one art direction per project, stable, suited to the app type, varied across projects
{
  const { artDirection, artBlock } = await import('../../lib/art-direction.ts')
  assert.deepEqual(artDirection('p-123', 'fintech'), artDirection('p-123', 'fintech'), 'stable for a project')
  for (let i = 0; i < 30; i++) assert.ok(['dense', 'calm', 'mosaic'].includes(artDirection(`bank-${i}`, 'fintech').id), 'a bank only lands on directions that suit banking')
  assert.ok(new Set(Array.from({ length: 30 }, (_, i) => artDirection(`p${i}`, 'media').id)).size >= 2, 'different projects get different directions')
  assert.ok(new Set(Array.from({ length: 60 }, (_, i) => artDirection(`x${i}`).id)).size >= 5, 'an unknown type can land anywhere')
  assert.match(artBlock(artDirection('p', 'travel')), /^ART DIRECTION for this whole app — /)
}

console.log('ok')

// GQ-05: a tab is named after the screen it opens
{
  const plan = parsePlan(JSON.stringify({
    appName: 'Feast',
    navigation: { type: 'bottom-tabs', tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'orders', label: 'Orders', icon: 'receipt' }, { id: 'profile', label: 'Profile', icon: 'user' }] },
    screens: [
      { name: 'Feast Home', screenType: 'root-tab', activeTabId: 'home' },
      { name: 'Feastly · Live Order Tracking', screenType: 'root-tab', activeTabId: 'orders' },
      { name: 'Feast — Cart', screenType: 'root-tab', activeTabId: 'profile' },
    ],
  }))
  const tab = plan.navigation.tabs.find((t) => t.id === 'profile')!
  assert.deepEqual([tab.label, tab.icon], ['Cart', 'shopping-cart'], 'the cart no longer lights up "Profile"')
  assert.deepEqual(plan.navigation.tabs.slice(0, 2).map((t) => t.label), ['Home', 'Orders'], 'a synonym in the same section group ("Order Tracking" on "Orders") keeps the tab\'s name')
  const uz = parsePlan(JSON.stringify({ appName: 'Taom', navigation: { tabs: [{ id: 'a', label: 'Bosh', icon: 'home' }, { id: 'b', label: 'Savat', icon: 'shopping-cart' }] }, screens: [{ name: 'Бош саҳифа', screenType: 'root-tab', activeTabId: 'a' }, { name: 'Savat', screenType: 'root-tab', activeTabId: 'b' }] }))
  assert.equal(uz.navigation.tabs[0].label, 'Bosh', 'names in another script are left alone')
}

// GQ-02: the look a brief asks for
{
  const { briefStyle } = await import('../../lib/intent.ts')
  const feast = briefStyle('A clean and modern UI design for a food delivery app… The overall design features rounded corners, a light color palette with yellow accents, and high-quality food photography.')
  assert.deepEqual(feast.theme, { accent: '#eab308', radius: 'round' }, 'yellow accents and rounded corners are read from a long brief')
  assert.equal(briefStyle('Crypto wallet, brand color #7C3AED').theme.accent, '#7c3aed')
  assert.equal(briefStyle('Primary colour: teal. Fitness tracker.').theme.accent, '#0d9488')
  for (const b of ['A red wine shop with tasting notes', 'Language app with a green owl mascot', 'Yellow taxi booking app', 'Black Friday deals tracker'])
    assert.deepEqual(briefStyle(b).theme, {}, `"${b}" names a subject, not a palette`)
}

// GQ-04: maps are drawn by code, and a "map photo" slot becomes a map
{
  const { renderMaps } = await import('../../lib/maps.ts')
  const slot = renderMaps('<main><div data-od-map data-pins="Burger Palace, 14 Kloof St" data-route data-you style="height:300px"></div></main>')
  assert.ok(slot.includes('data-od-map-rendered') && slot.includes('<svg') && slot.includes('Burger Palace') && slot.includes('14 Kloof St'), 'pins carry their labels')
  assert.ok(/stroke="var\(--accent\)" stroke-width="5"/.test(slot), 'the route is drawn in the accent')
  assert.ok(!/#[0-9a-f]{6}/i.test(slot.replace(/data-[^=]+="[^"]*"/g, '')), 'colours are tokens only, so the theme restyles the map')
  assert.ok(/data-od-map[^>]*style="height:300px"/.test(slot) && slot.includes(':where([data-od-map-rendered]){display:block;width:100%;height:100%;min-height:200px;overflow:hidden}'), 'the model\'s own height is kept; the default is a zero-specificity rule, so a class height wins too')
  assert.equal(renderMaps(slot), slot, 'idempotent')
  assert.equal(slot, renderMaps('<main><div data-od-map data-pins="Burger Palace, 14 Kloof St" data-route data-you style="height:300px"></div></main>'), 'the same map every render')
  const photo = renderMaps('<img data-od-img="city street map downtown cape town" alt="Map" class="map-hero">')
  assert.ok(photo.includes('<div data-od-map') && photo.includes('class="map-hero"') && photo.includes('<svg'), 'a map photo slot becomes a drawn map')
  assert.equal(renderMaps('<img data-od-img="classic cheeseburger" alt="">'), '<img data-od-img="classic cheeseburger" alt="">', 'other photos are left alone')
}

// GQ-06: a brief that counts its screens gets that many — the requested ones first
{
  const { screenCountAsked, trimToBrief } = await import('./PlannerService.ts')
  assert.equal(screenCountAsked('A food delivery UI presented on two smartphone screens'), 2)
  assert.equal(screenCountAsked('3 ta ekran'), 3)
  assert.equal(screenCountAsked('Нужно 4 экрана'), 4)
  for (const b of ['A food app', 'screen time tracker for kids', 'two-factor auth screen', 'Show 12 screens']) assert.equal(screenCountAsked(b), null, `"${b}" does not count screens`)
  const plan = parsePlan(JSON.stringify({
    appName: 'Feast',
    requested: ['home page with offers', 'cart with checkout'],
    navigation: { type: 'bottom-tabs', tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'search', label: 'Search', icon: 'search' }, { id: 'orders', label: 'Orders', icon: 'receipt' }, { id: 'profile', label: 'Profile', icon: 'user' }] },
    screens: [
      { name: 'Feast Home', screenType: 'root-tab', activeTabId: 'home', covers: [0], linksTo: ['Dish Detail', 'Cart'] },
      { name: 'Dish Detail', screenType: 'detail-view', parentScreen: 'Feast Home' },
      { name: 'Search', screenType: 'root-tab', activeTabId: 'search' },
      { name: 'Orders', screenType: 'root-tab', activeTabId: 'orders' },
      { name: 'Cart', screenType: 'root-tab', activeTabId: 'profile', covers: [1] },
      { name: 'Profile', screenType: 'detail-view', parentScreen: 'Feast Home' },
    ],
  }))
  const two = trimToBrief(plan, 'A food delivery UI presented on two smartphone screens: home and cart')
  assert.deepEqual(two.screens.map((s) => s.name), ['Home', 'Cart'], 'the two screens the brief asked for ("Feast Home" loses the app name)')
  assert.deepEqual(two.navigation.tabs.map((t) => t.label), ['Home', 'Cart'], 'tabs nobody opens are gone; the cart tab is named for the cart')
  assert.deepEqual(two.screens[0].linksTo, ['Cart'], 'links to dropped screens are dropped')
  assert.deepEqual(two.uncovered, [])
  assert.equal(trimToBrief(plan, 'A food app').screens.length, 6, 'no count, no trimming')
  assert.equal(plan.screens.length, 6, 'the original plan is not changed')
}
