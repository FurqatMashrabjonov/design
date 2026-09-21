import assert from 'node:assert'
import { extractArtifact } from '../../artifact.ts'
import { streamCompletion } from './LlmService.ts'
import { DesignSystemService } from './DesignSystemService.ts'
import { composeSystemPrompt } from './PromptComposer.ts'
import { parsePlan } from './PlannerService.ts'
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
assert.ok(DesignSystemService.list().some((d) => d.id === 'minimal' && d.name === 'Minimal'))
assert.ok(DesignSystemService.exists('minimal'))
assert.ok(!DesignSystemService.exists('../../etc'))

// compose: skill body + only its requested craft files land in the prompt, DESIGN.md always does
const mobile = composeSystemPrompt('minimal', 'mobile')
assert.ok(mobile.includes('390px'), 'mobile skill body present')
assert.ok(mobile.includes('— style card'), 'style card present')
assert.ok(composeSystemPrompt('minimal', 'desktop').includes('# Minimal'), 'desktop still reads DESIGN.md')
assert.ok(mobile.includes('# Mobile screen craft'), 'requested craft file present')
assert.ok(!mobile.includes('Anti-AI-slop') && !mobile.includes('Form validation'), 'web craft essays stay out of the mobile prompt')
assert.ok(!mobile.includes('Laws of UX'), 'web-only craft file absent from mobile prompt')

const web = composeSystemPrompt('minimal', 'desktop')
assert.ok(web.includes('1440px'), 'web skill body present')
assert.ok(web.includes('Laws of UX'), 'web-only craft file present')
assert.ok(!web.includes('Animation discipline'), 'mobile-only craft file absent from web prompt')

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
assert.equal(many.screens.length, 5, 'capped at 5 screens')

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
  const duo = composeSystemPrompt('duolingo', 'mobile')
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
  assert.ok(leak(page('Home', '<h2>Duo says hi</h2>'), 'duolingo'), 'mascot in a heading')
  assert.ok(!leak(page('Production', '<h1>Produce duo-tone reports</h1>'), 'duolingo'), 'whole words only')
  assert.ok(!leak(page('Checkout', '<p>Pay securely with Stripe</p>'), 'stripe'), 'a brand in ordinary copy is fine')
  assert.ok(leak(page('Checkout', '<h1>Stripe Dashboard</h1>'), 'stripe'), 'a brand naming the app is not')
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
  assert.ok(shellContract(detail, nav, true).includes("this screen's title"), 'the title is the model\'s to choose')
  assert.ok(shellPartsFor(detail, nav, true, 'Water log').header?.includes('data-od-back="SnapCal — Home"'))
  assert.ok(shellPartsFor({ screenType: 'root-tab', activeTabId: 'stats' }, nav, true, 'Stats').nav?.includes('data-od-shell="bottom-nav"'))
  assert.deepEqual(shellPartsFor(detail, nav, false, 'x'), {}, 'desktop has no injected shell')

  const brief = screenBrief({ app: 'SnapCal', screenNames: existing.map((s) => s.name), contract: shellContract(detail, nav, true), digest: '.card{border-radius:16px}', heading: 'Screen to add', description: 'water log' })
  for (const part of ['App: SnapCal', 'SnapCal — Home, Meal detail, SnapCal — Profile', 'SHELL CONTRACT', '.card{border-radius:16px}', 'water log']) assert.ok(brief.includes(part), `brief carries "${part}"`)

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
  const { contentSeed, contentBlock, localeOf } = await import('../../lib/content-seed.ts')
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
  const uz = contentSeed('project-a', 'uz', day)
  assert.ok(/so'm/.test(uz.money) && /@gmail\.com$/.test(uz.user.email))
  const ru = contentSeed('project-a', 'ru', day)
  assert.ok(/[а-яё]/i.test(ru.user.name) && /₽/.test(ru.money) && /^user\d+@/.test(ru.user.email), 'a Cyrillic name still gets an address')
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
    const [first, last] = contentSeed(id, 'ru', day).user.name.split(' ')
    assert.equal(/[ая]$/.test(first), /а$/.test(last), `${first} ${last}: surname agrees with the first name`)
  }
}

// GEN-23: the mobile system prompt stays small enough for a fast model to actually follow.
{
  const { readdirSync, existsSync, readFileSync } = await import('node:fs')
  for (const id of readdirSync('design-systems').filter((d) => existsSync(`design-systems/${d}/DESIGN.md`))) {
    const size = composeSystemPrompt(id, 'mobile').length
    assert.ok(size < 24_000, `${id}: mobile system prompt is ${size} chars (budget 24 000, about 6k tokens)`)
  }
  assert.ok(readFileSync('craft/mobile.md', 'utf8').split('\n').length <= 150, 'craft/mobile.md is at most 150 lines')
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

console.log('ok')
