// Run with the alias hook and a throwaway database (see package.json "check"). DeepSeek is a stub.
import assert from 'node:assert'

delete process.env.PEXELS_API_KEY // image slots must not reach the network from a test
process.env.DEEPSEEK_API_KEY = 'test-key'
const { Project } = await import('../../Models/Project.ts')
const { Screen } = await import('../../Models/Screen.ts')
const { ScreenVersion } = await import('../../Models/ScreenVersion.ts')
const { GenerateController } = await import('./GenerateController.ts')
const { PlanController } = await import('./PlanController.ts')
const { HistoryController } = await import('./HistoryController.ts')
const { Message } = await import('../../Models/Message.ts')
const { parseMeta } = await import('../../../lib/agent-messages.ts')
const { annotateElements } = await import('../../../lib/element-ops.ts')

const page = (title: string) => `<artifact title="${title}"><!doctype html><html><head><title>${title}</title><style>:root{--accent:#111}.card{border-radius:16px}</style></head><body><main><h1>${title}</h1></main></body></html></artifact>`
const sse = (text: string) => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n`, { status: 200 })

type Sent = { system: string; user: string; json: boolean }
let sent: Sent[] = []
let reply: (req: Sent) => Response = () => sse(page('Screen'))
globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body))
  const req = { system: body.messages[0].content, user: body.messages[1].content, json: Boolean(body.response_format) }
  sent.push(req)
  return reply(req)
}) as typeof fetch

const post = (controller: { stream(r: Request): Promise<Response> }, body: unknown) =>
  controller.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify(body) })).then((r) => r.text())

// --- a failed planned screen keeps its slot and can be retried there (GEN-08, EDT-22) ---
const nav = { type: 'bottom-tabs', tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'orders', label: 'Orders', icon: 'receipt' }] }
Project.create({ id: 'p1', name: 'GoBite', designSystem: 'minimal', device: 'mobile' })
Project.saveNavigation('p1', nav)
Project.savePlan('p1', { summary: 'Food delivery', appType: 'food-delivery', entities: [{ kind: 'Dish', items: [{ name: 'Pad Thai', fields: { price: '$12.99' } }] }] })
Screen.create({ id: 's-home', projectId: 'p1', name: 'Home', prompt: 'feed', html: '<!doctype html><html><head><style>.card{border-radius:16px}</style></head><body><main>feed</main></body></html>', x: 0, y: 0, screenType: 'root-tab', activeTabId: 'home' })
Screen.create({ id: 's-cart', projectId: 'p1', name: 'Cart', prompt: 'cart', html: '', x: 454, y: 0, screenType: 'detail-view', parentScreenName: 'Home', spec: 'Order summary, then a Place order bar.', error: 'Model returned incomplete HTML' })

sent = []
reply = () => sse(page('Cart — GoBite'))
const out = await post(GenerateController, { projectId: 'p1', regenerateScreenId: 's-cart' })
assert.ok(!out.includes('GEN_ERROR'), out)
const brief = sent[0].user
// GQ-16: the retry also gets the app's component sheet, with the app's own data in the rows.
for (const part of ['App: GoBite — Food delivery', 'Order summary, then a Place order bar.', 'SHELL CONTRACT', 'Pad Thai — price: $12.99', '# HOUSE STYLE', 'od-row__title">Pad Thai', 'Screen to design: Cart'])
  assert.ok(brief.includes(part), `the retry is drawn from the stored spec with the app's context: "${part}"`)
assert.ok(/Other screens in this app: Home\n/.test(brief), 'a screen is not listed as its own sibling')
let cart = Screen.find('s-cart')!
assert.ok(cart.html.includes('Cart — GoBite') && cart.error === null, 'the slot is filled and the failure note cleared')
// GQ-19 follow-up: the injected header already shows "Cart" at 34px, so the page's own <h1> repeating it is dropped.
assert.ok(!cart.html.includes('<h1>Cart — GoBite</h1>') && cart.html.includes('data-od-shell="detail-header"'), 'a page heading that repeats the injected title is removed')
assert.ok(cart.html.includes('data-od-back="Home"'), 'it got the detail header of its own slot')
assert.equal(cart.prompt, 'cart', 'regenerating never overwrites what the screen was asked to be')
assert.equal(ScreenVersion.forScreen('s-cart').length, 0, 'a failed screen has no design worth keeping as a version')

await post(GenerateController, { projectId: 'p1', regenerateScreenId: 's-cart' })
assert.equal(ScreenVersion.forScreen('s-cart').length, 1, 'regenerating a drawn screen keeps the old design as a version')

reply = () => new Response('upstream down', { status: 500 })
const before = Screen.find('s-cart')!.html
await post(GenerateController, { projectId: 'p1', regenerateScreenId: 's-cart' })
cart = Screen.find('s-cart')!
assert.equal(cart.html, before, 'a failed retry leaves the last good design in place')
assert.match(cart.error ?? '', /DeepSeek 500|upstream/, 'and records why')
assert.equal((await GenerateController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p1', regenerateScreenId: 'nope' }) }))).status, 404)

// --- a planned run records the screen it could not draw ---
Project.create({ id: 'p2', name: 'x', designSystem: 'minimal', device: 'mobile' })
const planJson = JSON.stringify({
  appName: 'Tasky',
  navigation: nav,
  screens: [
    { name: 'Today', archetype: 'dashboard', screenType: 'root-tab', activeTabId: 'home', sections: ['Greeting', 'Task list'] },
    { name: 'Task Detail', archetype: 'detail', screenType: 'detail-view', parentScreen: 'Today', sections: ['Title', 'Notes'] },
  ],
})
reply = (req) => {
  if (req.json) return new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 })
  return req.user.includes('Screen to design: Task Detail') ? sse('<artifact title="Task Detail"><!doctype html><html><body>cut off') : sse(page('Today'))
}
const events = (await post(PlanController, { projectId: 'p2', brief: 'todo app' })).trim().split('\n').map((l) => JSON.parse(l))
assert.ok(events.some((e) => e.type === 'screen_error'), 'the client is told')
const rows = Screen.forProject('p2').sort((a, z) => a.x - z.x)
assert.deepEqual(rows.map((s) => [s.name, Boolean(s.html), Boolean(s.error)]), [['Today', true, false], ['Task Detail', false, true]], 'the failed screen still has its slot')
assert.ok(rows[1].spec?.includes('1. Title') && rows[1].screenType === 'detail-view' && rows[1].parentScreenName === 'Today', 'with everything a retry needs')
assert.ok(rows[0].spec?.includes('1. Greeting'), 'drawn screens keep their spec too, so they can be regenerated after edits')

// --- the conversation is written as the work happens (CHAT-01, CHAT-02, CHAT-04, CHAT-06, CHAT-07) ---
const talk = Message.forProject('p1').map((m) => ({ ...m, meta: parseMeta(m.meta) }))
assert.deepEqual(talk.map((m) => `${m.role}:${m.kind}`), ['user:regenerate', 'agent:regenerate', 'user:regenerate', 'agent:regenerate', 'user:regenerate', 'agent:error'], 'a request that is rejected outright (404) leaves no trace')
assert.equal(talk[0].text, 'Regenerate “Cart”')
assert.equal(talk[1].text, 'Redrew “Cart” from its plan.', 'the first draw of a failed screen has no previous design to mention (and the model\'s "Cart — GoBite" title loses the app name)')
assert.match(talk[3].text, /previous design is kept as v1/)
assert.ok(talk[3].meta.screens?.[0].versionId, 'the agent message points at the snapshot taken before its change')
assert.ok(talk[3].meta.log?.some((l) => /KB/.test(l)), 'and carries a log')
assert.equal(talk[5].text, 'The AI provider had an error on its side. Try again in a moment.', 'errors are said in plain words')
assert.ok(talk[5].meta.log?.[0].includes('DeepSeek 500'), 'the raw error is kept for the log')

// go back to before the second regenerate
const v1Html = ScreenVersion.forScreen('s-cart')[0].html
HistoryController.revertMessage({ projectId: 'p1', messageId: talk[3].id })
assert.equal(Screen.find('s-cart')!.html, v1Html, 'the screen is back to the snapshot taken before that message')
assert.equal(ScreenVersion.forScreen('s-cart').length, 2, 'the design that was reverted is itself kept')
assert.throws(() => HistoryController.revertMessage({ projectId: 'p1', messageId: talk[3].id }), /cannot be undone/, 'a step is undone once')
assert.throws(() => HistoryController.revertMessage({ projectId: 'p2', messageId: talk[3].id }), 'a message is only revertible inside its own project')
assert.equal(Message.forProject('p1').at(-1)!.kind, 'revert')

// adding a screen, then taking it back, removes it
reply = () => sse(page('Live Tracking — GoBite'))
await post(GenerateController, { projectId: 'p1', prompt: 'add order tracking' })
const added = Message.forProject('p1').at(-1)!
assert.match(added.text, /^Added “Live Tracking” under “Home”\.$/)
const addedId = parseMeta(added.meta).screens![0].id
assert.ok(Screen.find(addedId))
const removal = HistoryController.revertMessage({ projectId: 'p1', messageId: added.id })
assert.ok(!Screen.forProject('p1').some((s) => s.id === addedId), 'the added screen is gone from the project')
assert.ok(Screen.find(addedId)?.deletedAt, 'but its row is kept')
assert.equal(Message.find(removal)!.text, 'Removed “Live Tracking”.')
// redo = revert the revert
const comeback = HistoryController.revertMessage({ projectId: 'p1', messageId: removal })
assert.ok(Screen.forProject('p1').some((s) => s.id === addedId), 'reverting the removal brings the screen back')
assert.equal(Message.find(comeback)!.text, 'Brought back “Live Tracking”.')
assert.throws(() => HistoryController.revertMessage({ projectId: 'p1', messageId: removal }), /cannot be undone/, 'a revert is itself reverted once')
HistoryController.revertMessage({ projectId: 'p1', messageId: comeback })
assert.ok(!Screen.forProject('p1').some((s) => s.id === addedId), 'and removed again')
// redo of a content change
const cartVersions = ScreenVersion.count('s-cart')
const undoEdit = HistoryController.revertMessage({ projectId: 'p1', messageId: Message.forProject('p1').find((m) => m.kind === 'revert')!.id })
assert.equal(ScreenVersion.count('s-cart'), cartVersions + 1, 'reverting the first revert is itself a recorded change')
assert.match(Message.find(undoEdit)!.text, /^Applied that change again on “Cart”\.$/)

// the plan run
const planTalk = Message.forProject('p2')
assert.deepEqual(planTalk.map((m) => `${m.role}:${m.kind}`), ['user:plan', 'agent:plan'])
assert.equal(planTalk[0].text, 'todo app')
assert.match(planTalk[1].text, /Designed 1 screen: Today\./)
assert.match(planTalk[1].text, /Task Detail could not be drawn/)
const planMeta = parseMeta(planTalk[1].meta)
assert.deepEqual(planMeta.screens?.map((x) => x.name), ['Today'])
assert.ok(planMeta.log?.some((l) => /^Planned 2 screens \(dashboard, detail\), 2 tabs/.test(l)) && planMeta.log?.some((l) => /Task Detail — failed/.test(l)))
assert.throws(() => HistoryController.revertMessage({ projectId: 'p2', messageId: planTalk[1].id }), /cannot be undone/, 'reverting the plan would delete the app')

// --- hand edits on the canvas (EDT-25, EDT-26) and theme from chat (EDT-18) ---
const { ElementController } = await import('./ElementController.ts')
const { ProjectController } = await import('./ProjectController.ts')
Project.create({ id: 'p3', name: 'Hand', designSystem: 'minimal', device: 'mobile' })
Screen.create({ id: 's3', projectId: 'p3', name: 'Home', prompt: 'home', html: '<!doctype html><html><body><main><h1>Hello</h1><button><i data-lucide="plus"></i> Add to cart</button><p>Note</p><img data-od-img="ramen" src="https://images.pexels.com/1.jpeg" data-od-img-resolved alt="Ramen"></main></body></html>', x: 0, y: 0, spec: 'home' })

assert.deepEqual(ElementController.info({ projectId: 'p3', screenId: 's3', elementId: 'button-1' }), { label: 'Button “Add to cart”', textEditable: true, isPhoto: false, photoQuery: '' }, 'ids the browser sees exist on the server without having been saved')
assert.equal(ElementController.info({ projectId: 'p3', screenId: 's3', elementId: 'gone' }), null)

sent = []
ElementController.editText({ projectId: 'p3', screenId: 's3', elementId: 'button-1', text: 'Order now' })
let home = Screen.find('s3')!
assert.ok(home.html.includes('<i data-lucide="plus"></i> Order now</button>'))
assert.equal(sent.length, 0, 'no model call')
let last = Message.forProject('p3').at(-1)!
assert.equal(last.text, 'Changed text on “Home”: “Add to cart” → “Order now”.')
assert.equal(parseMeta(last.meta).screens?.[0].versionId !== undefined, true, 'undoable')

ElementController.act({ projectId: 'p3', screenId: 's3', elementId: 'p-1', action: 'up' })
home = Screen.find('s3')!
assert.ok(home.html.indexOf('Note') < home.html.indexOf('Order now'))
assert.equal(Message.forProject('p3').at(-1)!.text, 'Moved up Text “Note” on “Home”.')
ElementController.act({ projectId: 'p3', screenId: 's3', elementId: 'h1-1', action: 'delete' })
assert.ok(!Screen.find('s3')!.html.includes('Hello'))
assert.throws(() => ElementController.act({ projectId: 'p3', screenId: 's3', elementId: 'h1-1', action: 'delete' }), /no longer on this screen/)
assert.throws(() => ElementController.act({ projectId: 'p3', screenId: 's3', elementId: 'main-1', action: 'delete' }), /main container/)
assert.throws(() => ElementController.editText({ projectId: 'p1', screenId: 's3', elementId: 'button-1', text: 'x' }), 'a screen is only editable inside its own project')

// undo the delete from the chat
HistoryController.revertMessage({ projectId: 'p3', messageId: Message.forProject('p3').at(-1)!.id })
assert.ok(Screen.find('s3')!.html.includes('Hello'), 'a hand edit is undone like any other step')

// replacing a photo: with no key the slot becomes an honest empty block, and the message says so
await ElementController.replacePhoto({ projectId: 'p3', screenId: 's3', elementId: 'img-1', query: 'green curry' })
assert.ok(Screen.find('s3')!.html.includes('data-od-img-fallback'))
assert.match(Message.forProject('p3').at(-1)!.text, /No photo matched “green curry”/)

// an element edit through the model uses the same ids, and says which element it changed
reply = () => sse('<artifact title="x"><button data-od-id="button-1">Checkout</button></artifact>')
await post(GenerateController, { projectId: 'p3', prompt: 'say checkout', editScreenId: 's3', editElementId: 'button-1' })
assert.ok(Screen.find('s3')!.html.includes('>Checkout</button>'))
assert.match(Message.forProject('p3').at(-1)!.text, /^Updated Button “Order now” on “Home” — now v\d+\.$/)
assert.equal((await GenerateController.stream(new Request('http://t/api', { method: 'POST', body: JSON.stringify({ projectId: 'p3', prompt: 'x', editScreenId: 's3', editElementId: 'nope' }) }))).status, 409, 'a stale element is refused before any tokens are spent')

// editing a whole screen by parts (EDT-19)
const beforePatch = Screen.find('s3')!.html
sent = []
reply = () => sse('<affects>p-1, button-1</affects>\n<edit target="p-1"><p data-od-id="p-1">Free delivery tonight</p></edit>\n<edit after="p-1"><p>New line</p></edit>')
await post(GenerateController, { projectId: 'p3', prompt: 'mention free delivery', editScreenId: 's3' })
assert.ok(sent[0].system.includes('Editing an existing screen') && sent[0].user.includes('data-od-id="button-1"'), 'the model sees the annotated screen and the edit contract')
let patched = Screen.find('s3')!.html
assert.ok(/Free delivery tonight<\/p>\n<p[^>]*>New line<\/p>/.test(patched), 'the replacement, then the insertion right after it')
const untouched = (h: string) => h.slice(h.indexOf('<button'), h.indexOf('</button>'))
assert.equal(untouched(patched), untouched(annotateElements(beforePatch)), 'what the request did not touch is byte-identical')
assert.match(Message.forProject('p3').at(-1)!.text, /^Updated “Home” — now v\d+: Text “Note” and added next to Text “Note”\.$/)
const patchLog = parseMeta(Message.forProject('p3').at(-1)!.meta).log ?? []
assert.ok(patchLog[0].startsWith('Edited by parts: replace p-1, insert p-1'))
assert.ok(patchLog.includes('Listed as affected but not edited: button-1 — check them'), 'a place the model named but did not change is surfaced')

reply = () => sse('<edit target="gone"><p>x</p></edit>')
const beforeMiss = Screen.find('s3')!.html
await post(GenerateController, { projectId: 'p3', prompt: 'x', editScreenId: 's3' })
assert.equal(Screen.find('s3')!.html, beforeMiss, 'an edit that matches nothing changes nothing')
assert.equal(Message.forProject('p3').at(-1)!.kind, 'error')

reply = () => sse(page('Home v2'))
await post(GenerateController, { projectId: 'p3', prompt: 'redo the whole layout', editScreenId: 's3' })
assert.ok(Screen.find('s3')!.html.includes('<h1>Home v2</h1>'), 'a full document still works for a whole-layout change')

// theme from chat
const t1 = ProjectController.themeFromChat({ projectId: 'p3', prompt: 'make it blue' })
assert.deepEqual(t1, { applied: true, theme: { accent: '#2563eb' } })
assert.deepEqual(ProjectController.themeFromChat({ projectId: 'p3', prompt: 'add a stats screen' }), { applied: false })
const themeMsg = Message.forProject('p3').at(-1)!
assert.match(themeMsg.text, /Changed the accent colour to blue on every screen/)
ProjectController.themeFromChat({ projectId: 'p3', prompt: 'rounder corners' })
assert.equal(Project.find('p3')!.theme, JSON.stringify({ accent: '#2563eb', radius: 'round' }), 'theme changes accumulate')
const themeUndo = HistoryController.revertMessage({ projectId: 'p3', messageId: Message.forProject('p3').at(-1)!.id })
assert.equal(Project.find('p3')!.theme, JSON.stringify({ accent: '#2563eb' }), 'and undo one at a time')
HistoryController.revertMessage({ projectId: 'p3', messageId: themeUndo })
assert.equal(Project.find('p3')!.theme, JSON.stringify({ accent: '#2563eb', radius: 'round' }), 'redo puts the theme change back')

// --- ‹ › walks a screen's versions and back (EDT-09) ---
const doc = (t: string) => `<!doctype html><html><body><h1>${t}</h1></body></html>`
Project.create({ id: 'p9', name: 'V', designSystem: 'minimal', device: 'mobile' })
Screen.create({ id: 's9', projectId: 'p9', name: 'Home', prompt: 'a', html: doc('A'), x: 0, y: 0 })
Screen.create({ id: 's9b', projectId: 'p9', name: 'Lone', prompt: 'x', html: doc('X'), x: 0, y: 0 })
for (const t of ['B', 'C']) {
  ScreenVersion.captureFrom(Screen.find('s9')!)
  Screen.updateContent('s9', { name: 'Home', prompt: t.toLowerCase(), html: doc(t) })
}
const stepTo = (dir: number) => HistoryController.stepVersion({ projectId: 'p9', screenId: 's9', dir })
const shows = (t: string) => assert.ok(Screen.find('s9')!.html.includes(`<h1>${t}</h1>`), `the screen shows ${t}`)
assert.deepEqual(ScreenVersion.position(Screen.find('s9')!), { position: 3, total: 3 }, 'two snapshots plus the newest work')
assert.deepEqual(stepTo(-1), { position: 2, total: 3 })
shows('B')
assert.equal(ScreenVersion.count('s9'), 3, 'stepping back first keeps the newest work as a snapshot')
assert.deepEqual(stepTo(-1), { position: 1, total: 3 })
shows('A')
assert.deepEqual(stepTo(-1), { position: 1, total: 3 }, 'nothing before v1')
assert.deepEqual(stepTo(1), { position: 2, total: 3 })
assert.deepEqual(stepTo(1), { position: 3, total: 3 })
shows('C')
assert.deepEqual(stepTo(1), { position: 3, total: 3 }, 'nothing after the newest')
assert.equal(ScreenVersion.count('s9'), 3, 'walking never adds snapshots')
// an edit made while an older version is shown continues from it, without copying it again
stepTo(-1)
shows('B')
const shownId = Screen.find('s9')!.versionId!
assert.equal(ScreenVersion.captureFrom(Screen.find('s9')!), shownId, 'the shown version is already a snapshot')
Screen.updateContent('s9', { name: 'Home', prompt: 'd', html: doc('D') })
assert.equal(Screen.find('s9')!.versionId, null, 'new content is the newest work again')
assert.deepEqual(ScreenVersion.position(Screen.find('s9')!), { position: 4, total: 4 })
assert.deepEqual(HistoryController.stepVersion({ projectId: 'p9', screenId: 's9b', dir: -1 }), { position: 1, total: 1 }, 'a screen with no snapshots stays put')
assert.equal(ScreenVersion.count('s9b'), 0, 'and gets none from trying')
assert.throws(() => HistoryController.stepVersion({ projectId: 'p1', screenId: 's9', dir: -1 }), 'a screen is only stepped inside its own project')

// a deleted screen keeps its row, leaves every listing, and comes back
const { ScreenController } = await import('./ScreenController.ts')
ScreenController.destroy({ id: 's9b', projectId: 'p9' })
assert.ok(!Screen.forProject('p9').some((s) => s.id === 's9b') && Screen.positions('p9').length === 1, 'a deleted screen is not listed or counted for placement')
ScreenController.restore({ id: 's9b', projectId: 'p9' })
assert.ok(Screen.forProject('p9').some((s) => s.id === 's9b'), 'restore brings it back')
assert.throws(() => ScreenController.restore({ id: 's9b', projectId: 'p1' }), 'restore is scoped to the project')

// the project name is edited from the breadcrumb (EDT-10)
ProjectController.rename({ id: 'p9', name: '  Veggie Box  ' })
assert.equal(Project.find('p9')!.name, 'Veggie Box', 'trimmed')
assert.throws(() => ProjectController.rename({ id: 'p9', name: '   ' }), /cannot be empty/)
assert.throws(() => ProjectController.rename({ id: 'nope', name: 'x' }))
ProjectController.rename({ id: 'p9', name: 'x'.repeat(200) })
assert.equal(Project.find('p9')!.name.length, 80, 'capped')

// FB-01: ratings and regenerate signals, traced to the pattern that drew the screen
{
  const { FeedbackController, patternOf } = await import('./FeedbackController.ts')
  const { Feedback } = await import('../../Models/Feedback.ts')
  assert.deepEqual(patternOf('Sections…\nScreen pattern (detail, layout b): Photo hero…'), { archetype: 'detail', variant: 'b' })
  assert.deepEqual(patternOf('Screen pattern (feed): …'), { archetype: 'feed', variant: null })
  assert.deepEqual(patternOf(null), { archetype: null, variant: null })
  Screen.create({ id: 's-fb', projectId: 'p9', name: 'Rated', prompt: 'x', html: '<html><body>x</body></html>', x: 0, y: 0, spec: 'Screen pattern (list, layout c): …' })
  FeedbackController.rate({ projectId: 'p9', screenId: 's-fb', value: 'up' })
  FeedbackController.rate({ projectId: 'p9', screenId: 's-fb', value: 'down' })
  assert.equal(Feedback.ratings('p9').get('s-fb'), 'down', 'the latest rating wins')
  assert.deepEqual(Feedback.forProject('p9').map((f) => [f.value, f.designSystem, f.archetype, f.variant]), [['down', 'minimal', 'list', 'c']], 'one rating per screen, with what drew it')
  FeedbackController.rate({ projectId: 'p9', screenId: 's-fb', value: null })
  assert.equal(Feedback.ratings('p9').has('s-fb'), false, 'null clears it')
  assert.throws(() => FeedbackController.rate({ projectId: 'p9', screenId: 's-fb', value: 'love' }), /up, down or null/)
  assert.throws(() => FeedbackController.rate({ projectId: 'p1', screenId: 's-fb', value: 'up' }), 'a screen is rated only inside its own project')
  assert.equal(ProjectController.show('p9').screens.find((s) => s.id === 's-fb')!.rating, null)
  // regenerating a drawn screen is recorded; retrying a failed one is not
  reply = () => sse(page('Rated again'))
  await post(GenerateController, { projectId: 'p9', regenerateScreenId: 's-fb' })
  assert.deepEqual(Feedback.forProject('p9').map((f) => f.value), ['regenerate'])
}

// FB-02: each change as a before/after pair with its request, derived from the conversation
{
  const { EditPairService } = await import('../../Services/EditPairService.ts')
  const pairs = EditPairService.forProject('p3')
  assert.ok(pairs.length >= 3, `p3's edits come back as pairs (${pairs.length})`)
  for (const p of pairs) assert.ok(p.before && p.after && p.before !== p.after && p.request, `${p.kind} pair is complete`)
  const hand = pairs.find((p) => p.kind === 'direct')!
  assert.match(hand.request, /Changed text|Deleted|Moved|Duplicated|Removed|Replaced/, 'a hand edit carries its own description as the request')
  assert.ok(pairs.some((p) => p.undone), 'a change that was undone is kept and marked')
  const byAsk = pairs.find((p) => p.kind === 'edit')
  assert.ok(byAsk && byAsk.request.length > 3 && byAsk.designSystem === 'minimal', 'a model edit carries the person\'s words and the design system')
  assert.deepEqual(EditPairService.forProject('nope'), [])
}

// EYE-02: the render audit's findings become one edit-by-parts call on the elements at fault
{
  const base = '<!doctype html><html><head><style>.t{color:#ddd}</style></head><body><main><h1>Title</h1><p class="t">Faint</p><button class="b">Go</button></main></body></html>'
  Screen.create({ id: 's-fix', projectId: 'p9', name: 'Fixable', prompt: 'x', html: base, x: 0, y: 0 })
  const ids = annotateElements(base)
  const pId = ids.match(/<p class="t" data-od-id="([^"]+)"/)![1]
  sent = []
  reply = () => sse(`<affects>${pId}</affects><edit target="${pId}"><p class="t" data-od-id="${pId}" style="color:var(--fg)">Faint</p></edit>`)
  await post(GenerateController, { projectId: 'p9', editScreenId: 's-fix', prompt: '', fixFindings: [{ rule: 'low-contrast', id: pId, detail: 'Faint 1.4:1' }, { rule: 'overlap', id: null, detail: 'no element' }, { rule: 'evil', id: 'x' }] })
  assert.equal(sent.length, 1, 'one call for all findings')
  assert.ok(sent[0].user.includes(`data-od-id="${pId}" (Faint 1.4:1): text is too faint`) && !sent[0].user.includes('no element'), 'the instruction names the element and how to fix it; untargetable findings are left out')
  assert.ok(Screen.find('s-fix')!.html.includes('style="color:var(--fg)">Faint'), 'the element was fixed by parts')
  assert.equal(ScreenVersion.count('s-fix'), 1, 'one version for the whole fix')
  const talk = Message.forProject('p9').slice(-2)
  assert.deepEqual(talk.map((m) => [m.role, m.kind]), [['user', 'edit'], ['agent', 'edit']])
  assert.equal(talk[0].text, 'Fix 1 problem found in the rendered screen', 'the chat says what was asked in plain words')
  // EYE-04: an automatic repair is the agent's own work — no request in the person's name.
  const before = Message.forProject('p9').length
  const p2 = annotateElements(Screen.find('s-fix')!.html).match(/<p class="t" data-od-id="([^"]+)"/)![1]
  reply = () => sse(`<affects>${p2}</affects><edit target="${p2}"><p class="t" data-od-id="${p2}" style="color:var(--fg)">Fixed</p></edit>`)
  await post(GenerateController, { projectId: 'p9', editScreenId: 's-fix', prompt: '', auto: true, fixFindings: [{ rule: 'low-contrast', id: p2, detail: 'Faint 1.4:1' }] })
  const said = Message.forProject('p9').slice(before)
  assert.deepEqual(said.map((m) => m.role), ['agent'], 'an automatic repair is not asked for in the person\'s name')
  assert.match(said[0].text, /Checked “Fixable” and fixed 1 rendering problem/)

  const bad = await GenerateController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p9', editScreenId: 's-fix', fixFindings: [{ rule: 'overlap', id: null }] }) }))
  assert.equal(bad.status, 400, 'nothing with an element to fix is refused before any call')
}

// CHAT-08: with `gate`, the run stops at the plan and waits; the approval draws the plan with the
// person's edits and the ids the canvas already holds.
{
  const { PendingPlans } = await import('../../Services/PendingPlans.ts')
  Project.create({ id: 'p-gate', name: 'Gate', device: 'mobile', designSystem: 'minimal' })
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : sse(page('Drawn')))
  const before = Message.forProject('p-gate').length
  const gated = (await post(PlanController, { projectId: 'p-gate', brief: 'todo app', gate: true })).trim().split('\n').map((l) => JSON.parse(l))
  assert.deepEqual(gated.map((e) => e.type), ['plan', 'awaiting'], 'a gated run sends the plan and waits — nothing is drawn')
  assert.equal(Screen.forProject('p-gate').length, 0, 'no screen exists before approval')
  assert.ok(PendingPlans.has('p-gate'), 'the plan waits on the server')
  assert.equal(Message.forProject('p-gate').length - before, 1, 'the ask is written once, when the plan is asked for')
  const planned = gated[0]
  const total = planned.screens.length
  // Approve without the last screen and with the first one renamed.
  const keep = planned.screens.map((_: unknown, i: number) => i).slice(0, Math.max(1, total - 1))
  const drawn = (await post(PlanController, { projectId: 'p-gate', approve: { keep, names: { 0: 'My Home' } } })).trim().split('\n').map((l) => JSON.parse(l))
  assert.equal(drawn[0].type, 'plan', 'the approval replays the (edited) plan')
  assert.equal(drawn[0].screens.length, keep.length, 'removed screens are gone')
  assert.equal(drawn[0].screens[0].name, 'My Home', 'a rename is kept')
  assert.deepEqual(drawn[0].screenIds, keep.map((i: number) => planned.screenIds[i]), 'kept screens keep their frame ids')
  assert.equal(drawn.at(-1).type, 'done', 'the approved plan is drawn to the end')
  assert.equal(Screen.forProject('p-gate').length, keep.length, 'exactly the approved screens exist')
  assert.equal(Message.forProject('p-gate').length - before, 2, 'ask, then one reply after drawing — approval adds no ask')
  assert.ok(!PendingPlans.has('p-gate'), 'an approved plan is no longer pending')
  const expired = await PlanController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p-gate', approve: { keep: [0] } }) }))
  assert.equal(expired.status, 409, 'approving with no plan waiting is refused, not drawn from nothing')
  // Without the gate, nothing changes: plan and draw in one run.
  Project.create({ id: 'p-nogate', name: 'No gate', device: 'mobile', designSystem: 'minimal' })
  const plain = (await post(PlanController, { projectId: 'p-nogate', brief: 'todo app' })).trim().split('\n').map((l) => JSON.parse(l))
  assert.ok(!plain.some((e) => e.type === 'awaiting') && plain.at(-1).type === 'done', 'the eval and the API without `gate` behave as before')
}

// B1: ownership, orphan adoption, account deletion cascades
{
  const { db } = await import('../../../database/connection.ts')
  const { user } = await import('../../../database/schema.ts')
  const { AccountController } = await import('./AccountController.ts')
  const now = new Date()
  db.insert(user).values([{ id: 'u1', name: 'A', email: 'a@x.uz', createdAt: now, updatedAt: now }, { id: 'u2', name: 'B', email: 'b@x.uz', createdAt: now, updatedAt: now }]).run()
  Project.create({ id: 'own-1', name: 'Mine', designSystem: 'minimal', device: 'mobile', userId: 'u1' })
  Project.create({ id: 'orphan-1', name: 'Old', designSystem: 'minimal', device: 'mobile' })
  assert.ok(Project.findOwned('own-1', 'u1') && !Project.findOwned('own-1', 'u2'), 'only the owner finds a project')
  assert.deepEqual(Project.forUser('u2').map((p) => p.id), [], 'nobody else lists it')
  Project.adoptOrphans('u2')
  assert.equal(Project.find('orphan-1')!.userId, 'u2', 'projects from before accounts go to the first person who signs in')
  assert.equal(Project.find('own-1')!.userId, 'u1', 'owned projects are not adopted')
  Screen.create({ id: 's-own', projectId: 'own-1', name: 'S', prompt: 'p', html: '<html></html>', x: 0, y: 0 })
  AccountController.destroy('u1')
  assert.ok(!Project.find('own-1') && !Screen.find('s-own'), 'deleting the account deletes its projects and screens')
  assert.ok(Project.find('orphan-1'), "and nobody else's")
}

// GQ-07: a planned run outlives its page; only Stop ends it
{
  const { PlanRuns } = await import('../../Services/PlanRuns.ts')
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : sse(page('Drawn')))
  Project.create({ id: 'p-detach', name: 'x', designSystem: 'minimal', device: 'mobile' })
  let finished = 0
  const res = await PlanController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p-detach', brief: 'todo app' }) }), { onFinish: () => finished++ })
  assert.equal(res.headers.get('X-OD-Detached'), '1')
  await res.body!.cancel() // the tab closed before anything arrived
  for (let i = 0; i < 50 && (finished === 0 || PlanRuns.running('p-detach')); i++) await new Promise((r) => setTimeout(r, 20))
  assert.equal(finished, 1, 'the run reports its own end')
  assert.equal(Screen.forProject('p-detach').filter((s) => s.html).length, 2, 'every planned screen was still drawn and saved')
  assert.ok(!Message.forProject('p-detach').some((m) => /Stopped/.test(m.text)), 'and the chat does not say it stopped')

  // Stop reaches the run on the server.
  let release!: () => void
  const gate = new Promise<void>((r) => (release = r))
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : new Response(new ReadableStream({ async start(c) { await gate; c.close() } })))
  Project.create({ id: 'p-stop', name: 'x', designSystem: 'minimal', device: 'mobile' })
  const res2 = await PlanController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p-stop', brief: 'todo app' }) }))
  const reader = res2.body!.getReader()
  await reader.read() // the plan event: the anchor screen is now waiting on the model
  assert.equal(PlanRuns.stop('p-stop'), true, 'Stop finds the run')
  release()
  while (!(await reader.read()).done) {}
  assert.equal(PlanRuns.running('p-stop'), false)
  assert.equal(Screen.forProject('p-stop').filter((s) => s.html).length, 0, 'nothing more is drawn after Stop')
  assert.ok(Message.forProject('p-stop').some((m) => m.role === 'agent' && /Stopped/i.test(m.text)), 'and the chat says it stopped')
  reply = () => sse(page('Screen'))
}

// GQ-02: a brief's palette becomes the project's theme — unless one was set by hand
{
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : sse(page('Drawn')))
  Project.create({ id: 'p-style', name: 'x', designSystem: 'minimal', device: 'mobile' })
  await post(PlanController, { projectId: 'p-style', brief: 'Food delivery app with yellow accents and rounded corners' })
  assert.deepEqual(JSON.parse(Project.find('p-style')!.theme!), { accent: '#eab308', radius: 'round' })
  const log = parseMeta(Message.forProject('p-style').find((m) => m.role === 'agent')!.meta).log ?? []
  assert.ok(log.some((l) => /From the brief: accent yellow, rounded corners/.test(l)), 'the agent log says where the theme came from')
  Project.create({ id: 'p-style2', name: 'x', designSystem: 'minimal', device: 'mobile' })
  Project.saveTheme('p-style2', { accent: '#111111' })
  await post(PlanController, { projectId: 'p-style2', brief: 'Food delivery app with yellow accents' })
  assert.equal(JSON.parse(Project.find('p-style2')!.theme!).accent, '#111111', 'a theme set by hand is kept')
  reply = () => sse(page('Screen'))
}

// GQ-03: nobody picked a system — the brief does
{
  const { DesignSystemService } = await import('../../Services/DesignSystemService.ts')
  const { ProjectController } = await import('./ProjectController.ts')
  const auto = (b: string) => ProjectController.store({ designSystem: 'auto', brief: b }).designSystem
  // DS-01: the app type offers a few systems that suit it and the project id picks one, so the
  // assertion is about the shortlist, not one fixed answer — two people typing the same brief must
  // not get the same app. A style the brief names still beats all of it.
  // GQ-32: the shortlist is now the three systems authored for a phone, and which of them suits the
  // app is the assertion — a consumer app never lands on the instrument, a bank never on the warm one.
  const food = new Set([...Array(12)].map(() => auto('A food delivery app with restaurant menus and live order tracking')))
  assert.ok(food.size > 1, 'the same brief twice is not the same system twice')
  for (const id of food) assert.ok(['ember', 'nova', 'lumen'].includes(id), `food delivery should suit the app: got ${id}`)
  const bank = new Set([...Array(12)].map(() => auto('Neobank: balance, cards, transfers and spending insights')))
  for (const id of bank) assert.ok(['graphite', 'lumen'].includes(id), `a bank should look like one: got ${id}`)
  assert.equal(auto('A neo-brutalist habit tracker'), 'neobrutalism', 'a style the brief names beats the app type')
  assert.equal(auto('Crypto wallet with a dark theme'), 'midnight')
  assert.equal(auto('zzz'), 'minimal', 'nothing to go on: minimal')
  assert.equal(ProjectController.store({ designSystem: 'nike', brief: 'A dark neo-brutalist bank' }).designSystem, 'nike', 'a system picked by hand is kept')
  assert.equal(DesignSystemService.autoFor('', null, 'seed'), 'minimal')
}

// ADM-01/04/08: admins, bans, runtime settings, audit trail
{
  const { isAdmin } = await import('../../Services/AuthService.ts')
  const { AdminController } = await import('./AdminController.ts')
  const { UsageService } = await import('../../Services/UsageService.ts')
  const { AdminStatsService } = await import('../../Services/AdminStatsService.ts')
  const { Setting } = await import('../../Models/Setting.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user, session } = await import('../../../database/schema.ts')
  const { eq } = await import('drizzle-orm')
  process.env.ADMIN_EMAILS = 'Boss@x.uz, other@x.uz'
  assert.ok(isAdmin({ email: 'boss@x.uz' }) && isAdmin({ email: 'z@x.uz', role: 'admin' }) && !isAdmin({ email: 'z@x.uz', role: 'user' }), 'admins come from ADMIN_EMAILS or the role')
  const now = new Date()
  db.insert(user).values({ id: 'adm', name: 'Boss', email: 'boss@x.uz', createdAt: now, updatedAt: now }).run()
  db.insert(session).values({ id: 'sess-u2', token: 't-u2', userId: 'u2', expiresAt: new Date(Date.now() + 1e7), createdAt: now, updatedAt: now }).run()
  AdminController.ban('adm', { userId: 'u2', reason: 'spam' })
  const banned = db.select().from(user).where(eq(user.id, 'u2')).get()!
  assert.ok(banned.banned && banned.banReason === 'spam', 'a ban is saved with its reason')
  assert.equal(db.select().from(session).where(eq(session.userId, 'u2')).all().length, 0, 'and signs the user out everywhere')
  assert.throws(() => AdminController.ban('adm', { userId: 'adm', reason: '' }), /yourself/)
  AdminController.unban('adm', 'u2')
  assert.equal(db.select().from(user).where(eq(user.id, 'u2')).get()!.banned, false)
  assert.throws(() => AdminController.setRole('adm', { userId: 'adm', role: 'user' }), /own admin role/)

  AdminController.setSetting('adm', { key: 'generation.paused', value: '1' })
  assert.equal(UsageService.refusal('u2')?.status, 503, 'a pause set in the panel stops generation without a deploy')
  AdminController.setSetting('adm', { key: 'generation.paused', value: null })
  assert.equal(UsageService.limits().paused, false)
  assert.throws(() => AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: '-3' }), /Invalid value/)
  AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: '40' })
  AdminController.setUserLimit('adm', { userId: 'u2', limit: 500 })
  assert.deepEqual([UsageService.limits().callsPerDay, UsageService.limits('u2').callsPerDay, UsageService.limits('adm').callsPerDay], [40, 500, 40], 'a per-user limit beats the global one')
  AdminController.setUserLimit('adm', { userId: 'u2', limit: null })
  AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: null })
  assert.equal(Setting.all().length, 0, 'clearing a setting falls back to the default')

  const trail = AdminStatsService.controls().actions.map((a) => a.action)
  assert.deepEqual(trail.slice(0, 3), ['set-setting', 'set-user-limit', 'set-user-limit'], 'every admin write is logged, newest first')
  assert.ok(trail.includes('ban') && trail.includes('unban'))
  const o = AdminStatsService.overview(7)
  assert.equal(o.series.length >= 30, true, 'a 30-day series with a row per day')
  assert.ok(o.current.newUsers >= 1 && typeof o.current.failRate === 'number')
  assert.ok(AdminStatsService.users().some((u) => u.email === 'boss@x.uz'))
}

// DSH-04/08/11/12: dashboard cards count what is shown, point at the first screen, sort by last change
{
  const { UsageService } = await import('../../Services/UsageService.ts')
  const { swatchOf } = await import('../../Services/DesignSystemService.ts')
  Project.create({ id: 'card-a', name: 'A', designSystem: 'minimal', device: 'mobile', userId: 'u2' })
  Screen.create({ id: 'ca-1', projectId: 'card-a', name: 'First', prompt: 'p', html: '<html>1</html>', x: 0, y: 0 })
  Screen.create({ id: 'ca-2', projectId: 'card-a', name: 'Failed', prompt: 'p', html: '', x: 0, y: 0 })
  Screen.create({ id: 'ca-3', projectId: 'card-a', name: 'Gone', prompt: 'p', html: '<html>3</html>', x: 0, y: 0 })
  Screen.delete('ca-3')
  Message.add({ projectId: 'orphan-1', role: 'user', kind: 'plan', text: 'later change' })
  const cards = Project.cardsForUser('u2')
  const a = cards.find((c) => c.id === 'card-a')!
  assert.equal(a.screenCount, 1, 'failed and deleted screens are not counted')
  assert.equal(a.coverId, 'ca-1', 'the cover is the first screen that shows something')
  assert.ok(cards.every((c) => Project.find(c.id)!.userId === 'u2'), 'only this user’s projects')
  assert.ok(Project.cardsForUser('nobody').length === 0)
  Project.setFavorite('card-a', true)
  assert.equal(Project.cardsForUser('u2').find((c) => c.id === 'card-a')!.favorite, true, 'a star is saved')
  assert.equal(typeof UsageService.callsToday('u2'), 'number')
  assert.deepEqual(swatchOf('/* --accent: #fff (brand) */\n:root { --bg: #fafafa; --fg: rgb(1, 2, 3); --accent: #10a37f; --font-display: "Inter", sans-serif; }'), { bg: '#fafafa', fg: 'rgb(1, 2, 3)', accent: '#10a37f', font: 'Inter' }, 'comments do not win over the declaration')
  assert.deepEqual(swatchOf('--bg: var(--x); --font-display: url(evil)'), { bg: null, fg: null, accent: null, font: null }, 'only literal values reach a style attribute')
}
{
  const { str, idOf, num, oneOf, obj } = await import('../../../server/validate.ts')
  assert.throws(() => idOf('../x'), /Invalid id/)
  assert.throws(() => str('x'.repeat(11), 10), /Invalid text/)
  assert.throws(() => num(Number.NaN), /Invalid number/)
  assert.throws(() => oneOf('love', ['up', 'down']), /Invalid value/)
  assert.throws(() => obj(null), /Invalid request/)
  assert.equal(idOf('0mucc31f3-0001-896f'), '0mucc31f3-0001-896f', 'message ids pass')
}

// B2: every model call is logged with its user and project; limits read the log
{
  const { UsageService, LIMITS } = await import('../../Services/UsageService.ts')
  const { db } = await import('../../../database/connection.ts')
  const { llmCalls } = await import('../../../database/schema.ts')
  reply = () => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: page('Logged') } }] })}\n\ndata: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 1000, prompt_cache_hit_tokens: 400, completion_tokens: 2000 } })}\n\ndata: [DONE]\n`, { status: 200 })
  Project.create({ id: 'p-usage', name: 'U', designSystem: 'minimal', device: 'mobile' })
  const out = await UsageService.run({ userId: 'user-9', projectId: 'p-usage' }, () => post(GenerateController, { projectId: 'p-usage', prompt: 'a settings screen' }))
  assert.ok(!out.includes('GEN_ERROR'))
  const rows = db.select().from(llmCalls).all().filter((r) => r.userId === 'user-9')
  assert.equal(rows.length, 1, 'one row per model call, attributed to the request\'s user')
  assert.equal(rows[0].projectId, 'p-usage')
  assert.deepEqual([rows[0].promptTokens, rows[0].cachedTokens, rows[0].completionTokens, rows[0].ok], [1000, 400, 2000, true])
  // The rate depends on the clock (DeepSeek peak is twice off-peak), so the row is checked against
  // both possibilities rather than pinned to one — the point is that it came from the price table.
  const offPeakCost = (600 * 0.15 + 400 * 0.003 + 2000 * 0.6) / 1e6
  assert.ok(
    Math.abs(rows[0].costUsd - offPeakCost) < 1e-9 || Math.abs(rows[0].costUsd - offPeakCost * 2) < 1e-9,
    'cost from the price table, at whichever rate was in force',
  )
  reply = () => new Response('down', { status: 500 })
  await UsageService.run({ userId: 'user-9' }, () => post(GenerateController, { projectId: 'p-usage', prompt: 'again' }))
  const failed = db.select().from(llmCalls).all().filter((r) => r.userId === 'user-9' && !r.ok)
  assert.ok(failed.length === 1 && /DeepSeek 500/.test(failed[0].error ?? ''), 'a failed call is logged with its error')

  assert.equal(UsageService.refusal('user-9'), null, 'under the limits')
  UsageService.begin('user-9')
  assert.equal(UsageService.refusal('user-9')?.status, 429, 'one generation at a time')
  UsageService.end('user-9')
  const limit = LIMITS.callsPerDay
  LIMITS.callsPerDay = 2
  assert.match(UsageService.refusal('user-9')?.message ?? '', /today’s generation limit/, 'the daily call limit')
  LIMITS.callsPerDay = limit
  const budget = LIMITS.dailyBudgetUsd
  LIMITS.dailyBudgetUsd = 0.001
  assert.equal(UsageService.refusal('someone-else')?.status, 503, 'the service-wide daily budget pauses everyone')
  LIMITS.dailyBudgetUsd = budget
  process.env.GENERATION_PAUSED = '1'
  assert.equal(UsageService.refusal('someone-else')?.status, 503, 'the stop switch')
  delete process.env.GENERATION_PAUSED
}

console.log('ok')
