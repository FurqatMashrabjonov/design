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
assert.equal(extractArtifact('<artifact><html><head><title>Grocery list</title></head></html></artifact>').title, 'Grocery list', 'an unnamed artifact takes its <title>')
assert.equal(extractArtifact('<artifact><html><body><h1>Trip <em>settings</em></h1></body></html></artifact>').title, 'Trip settings', '…then its first heading')
assert.equal(extractArtifact('<artifact><html><body><p>x</p></body></html></artifact>').title, 'Untitled')
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
assert.equal(many.screens.length, 6, 'capped at 6 screens')

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
    const size = composeSystemPrompt(id, 'mobile').length
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

console.log('ok')
