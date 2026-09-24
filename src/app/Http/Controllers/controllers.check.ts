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
let lastAuth: string | undefined
globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
  lastAuth = (init?.headers as Record<string, string> | undefined)?.Authorization
  const body = JSON.parse(String(init?.body))
  const req = { system: body.messages[0].content, user: body.messages[1].content, json: Boolean(body.response_format) }
  sent.push(req)
  return reply(req)
}) as typeof fetch

const post = (controller: { stream(r: Request): Promise<Response> }, body: unknown) =>
  controller.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify(body) })).then((r) => r.text())

// --- a failed planned screen keeps its slot and can be retried there (GEN-08, EDT-22) ---
const nav = { type: 'bottom-tabs', tabs: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'orders', label: 'Orders', icon: 'receipt' }] }
await Project.create({ id: 'p1', name: 'GoBite', designSystem: 'minimal', device: 'mobile' })
await Project.saveNavigation('p1', nav)
await Project.savePlan('p1', { summary: 'Food delivery', appType: 'food-delivery', entities: [{ kind: 'Dish', items: [{ name: 'Pad Thai', fields: { price: '$12.99' } }] }] })
await Screen.create({ id: 's-home', projectId: 'p1', name: 'Home', prompt: 'feed', html: '<!doctype html><html><head><style>.card{border-radius:16px}</style></head><body><main>feed</main></body></html>', x: 0, y: 0, screenType: 'root-tab', activeTabId: 'home' })
await Screen.create({ id: 's-cart', projectId: 'p1', name: 'Cart', prompt: 'cart', html: '', x: 454, y: 0, screenType: 'detail-view', parentScreenName: 'Home', spec: 'Order summary, then a Place order bar.', error: 'Model returned incomplete HTML' })

sent = []
reply = () => sse(page('Cart — GoBite'))
const out = await post(GenerateController, { projectId: 'p1', regenerateScreenId: 's-cart' })
assert.ok(!out.includes('GEN_ERROR'), out)
const brief = sent[0].user
// GQ-16: the retry also gets the app's component sheet, with the app's own data in the rows.
for (const part of ['App: GoBite — Food delivery', 'Order summary, then a Place order bar.', 'SHELL CONTRACT', 'Pad Thai — price: $12.99', '# HOUSE STYLE', 'od-row__title">Pad Thai', 'Screen to design: Cart'])
  assert.ok(brief.includes(part), `the retry is drawn from the stored spec with the app's context: "${part}"`)
assert.ok(/Other screens in this app: Home\n/.test(brief), 'a screen is not listed as its own sibling')
let cart = (await Screen.find('s-cart'))!
assert.ok(cart.html.includes('Cart — GoBite') && cart.error === null, 'the slot is filled and the failure note cleared')
// GQ-19 follow-up: the injected header already shows "Cart" at 34px, so the page's own <h1> repeating it is dropped.
assert.ok(!cart.html.includes('<h1>Cart — GoBite</h1>') && cart.html.includes('data-od-shell="detail-header"'), 'a page heading that repeats the injected title is removed')
assert.ok(cart.html.includes('data-od-back="Home"'), 'it got the detail header of its own slot')
assert.equal(cart.prompt, 'cart', 'regenerating never overwrites what the screen was asked to be')
assert.equal((await ScreenVersion.forScreen('s-cart')).length, 0, 'a failed screen has no design worth keeping as a version')

await post(GenerateController, { projectId: 'p1', regenerateScreenId: 's-cart' })
assert.equal((await ScreenVersion.forScreen('s-cart')).length, 1, 'regenerating a drawn screen keeps the old design as a version')

reply = () => new Response('upstream down', { status: 500 })
const before = (await Screen.find('s-cart'))!.html
await post(GenerateController, { projectId: 'p1', regenerateScreenId: 's-cart' })
cart = (await Screen.find('s-cart'))!
assert.equal(cart.html, before, 'a failed retry leaves the last good design in place')
assert.match(cart.error ?? '', /DeepSeek 500|upstream/, 'and records why')
assert.equal((await GenerateController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p1', regenerateScreenId: 'nope' }) }))).status, 404)

// --- a planned run records the screen it could not draw ---
await Project.create({ id: 'p2', name: 'x', designSystem: 'minimal', device: 'mobile' })
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
const rows = (await Screen.forProject('p2')).sort((a, z) => a.x - z.x)
assert.deepEqual(rows.map((s) => [s.name, Boolean(s.html), Boolean(s.error)]), [['Today', true, false], ['Task Detail', false, true]], 'the failed screen still has its slot')
assert.ok(rows[1].spec?.includes('1. Title') && rows[1].screenType === 'detail-view' && rows[1].parentScreenName === 'Today', 'with everything a retry needs')
assert.ok(rows[0].spec?.includes('1. Greeting'), 'drawn screens keep their spec too, so they can be regenerated after edits')

// --- the conversation is written as the work happens (CHAT-01, CHAT-02, CHAT-04, CHAT-06, CHAT-07) ---
const talk = (await Message.forProject('p1')).map((m) => ({ ...m, meta: parseMeta(m.meta) }))
assert.deepEqual(talk.map((m) => `${m.role}:${m.kind}`), ['user:regenerate', 'agent:regenerate', 'user:regenerate', 'agent:regenerate', 'user:regenerate', 'agent:error'], 'a request that is rejected outright (404) leaves no trace')
assert.equal(talk[0].text, 'Regenerate “Cart”')
assert.equal(talk[1].text, 'Redrew “Cart” from its plan.', 'the first draw of a failed screen has no previous design to mention (and the model\'s "Cart — GoBite" title loses the app name)')
assert.match(talk[3].text, /previous design is kept as v1/)
assert.ok(talk[3].meta.screens?.[0].versionId, 'the agent message points at the snapshot taken before its change')
assert.ok(talk[3].meta.log?.some((l) => /KB/.test(l)), 'and carries a log')
assert.equal(talk[5].text, 'The AI provider had an error on its side. Try again in a moment.', 'errors are said in plain words')
assert.ok(talk[5].meta.log?.[0].includes('DeepSeek 500'), 'the raw error is kept for the log')

// go back to before the second regenerate
const v1Html = (await ScreenVersion.forScreen('s-cart'))[0].html
await HistoryController.revertMessage({ projectId: 'p1', messageId: talk[3].id })
assert.equal((await Screen.find('s-cart'))!.html, v1Html, 'the screen is back to the snapshot taken before that message')
assert.equal((await ScreenVersion.forScreen('s-cart')).length, 2, 'the design that was reverted is itself kept')
await assert.rejects(async () => await HistoryController.revertMessage({ projectId: 'p1', messageId: talk[3].id }), /cannot be undone/, 'a step is undone once')
await assert.rejects(async () => await HistoryController.revertMessage({ projectId: 'p2', messageId: talk[3].id }), 'a message is only revertible inside its own project')
assert.equal((await Message.forProject('p1')).at(-1)!.kind, 'revert')

// adding a screen, then taking it back, removes it
reply = () => sse(page('Live Tracking — GoBite'))
await post(GenerateController, { projectId: 'p1', prompt: 'add order tracking' })
const added = (await Message.forProject('p1')).at(-1)!
assert.match(added.text, /^Added “Live Tracking” under “Home”\.$/)
const addedId = parseMeta(added.meta).screens![0].id
assert.ok(await Screen.find(addedId))
const removal = await HistoryController.revertMessage({ projectId: 'p1', messageId: added.id })
assert.ok(!(await Screen.forProject('p1')).some((s) => s.id === addedId), 'the added screen is gone from the project')
assert.ok((await Screen.find(addedId))?.deletedAt, 'but its row is kept')
assert.equal((await Message.find(removal))!.text, 'Removed “Live Tracking”.')
// redo = revert the revert
const comeback = await HistoryController.revertMessage({ projectId: 'p1', messageId: removal })
assert.ok((await Screen.forProject('p1')).some((s) => s.id === addedId), 'reverting the removal brings the screen back')
assert.equal((await Message.find(comeback))!.text, 'Brought back “Live Tracking”.')
await assert.rejects(async () => await HistoryController.revertMessage({ projectId: 'p1', messageId: removal }), /cannot be undone/, 'a revert is itself reverted once')
await HistoryController.revertMessage({ projectId: 'p1', messageId: comeback })
assert.ok(!(await Screen.forProject('p1')).some((s) => s.id === addedId), 'and removed again')
// redo of a content change
const cartVersions = await ScreenVersion.count('s-cart')
const undoEdit = await HistoryController.revertMessage({ projectId: 'p1', messageId: (await Message.forProject('p1')).find((m) => m.kind === 'revert')!.id })
assert.equal(await ScreenVersion.count('s-cart'), cartVersions + 1, 'reverting the first revert is itself a recorded change')
assert.match((await Message.find(undoEdit))!.text, /^Applied that change again on “Cart”\.$/)

// the plan run
const planTalk = await Message.forProject('p2')
assert.deepEqual(planTalk.map((m) => `${m.role}:${m.kind}`), ['user:plan', 'agent:plan'])
assert.equal(planTalk[0].text, 'todo app')
assert.match(planTalk[1].text, /Designed 1 screen: Today\./)
assert.match(planTalk[1].text, /Task Detail could not be drawn/)
const planMeta = parseMeta(planTalk[1].meta)
assert.deepEqual(planMeta.screens?.map((x) => x.name), ['Today'])
assert.ok(planMeta.log?.some((l) => /^Planned 2 screens \(dashboard, detail\), 2 tabs/.test(l)) && planMeta.log?.some((l) => /Task Detail — failed/.test(l)))
await assert.rejects(async () => await HistoryController.revertMessage({ projectId: 'p2', messageId: planTalk[1].id }), /cannot be undone/, 'reverting the plan would delete the app')

// --- hand edits on the canvas (EDT-25, EDT-26) and theme from chat (EDT-18) ---
const { ElementController } = await import('./ElementController.ts')
const { ProjectController } = await import('./ProjectController.ts')
await Project.create({ id: 'p3', name: 'Hand', designSystem: 'minimal', device: 'mobile' })
await Screen.create({ id: 's3', projectId: 'p3', name: 'Home', prompt: 'home', html: '<!doctype html><html><body><main><h1>Hello</h1><button><i data-lucide="plus"></i> Add to cart</button><p>Note</p><img data-od-img="ramen" src="https://images.pexels.com/1.jpeg" data-od-img-resolved alt="Ramen"></main></body></html>', x: 0, y: 0, spec: 'home' })

assert.deepEqual(await ElementController.info({ projectId: 'p3', screenId: 's3', elementId: 'button-1' }), { label: 'Button “Add to cart”', textEditable: true, isPhoto: false, photoQuery: '' }, 'ids the browser sees exist on the server without having been saved')
assert.equal(await ElementController.info({ projectId: 'p3', screenId: 's3', elementId: 'gone' }), null)

sent = []
await ElementController.editText({ projectId: 'p3', screenId: 's3', elementId: 'button-1', text: 'Order now' })
let home = (await Screen.find('s3'))!
assert.ok(home.html.includes('<i data-lucide="plus"></i> Order now</button>'))
assert.equal(sent.length, 0, 'no model call')
let last = (await Message.forProject('p3')).at(-1)!
assert.equal(last.text, 'Changed text on “Home”: “Add to cart” → “Order now”.')
assert.equal(parseMeta(last.meta).screens?.[0].versionId !== undefined, true, 'undoable')

await ElementController.act({ projectId: 'p3', screenId: 's3', elementId: 'p-1', action: 'up' })
home = (await Screen.find('s3'))!
assert.ok(home.html.indexOf('Note') < home.html.indexOf('Order now'))
assert.equal((await Message.forProject('p3')).at(-1)!.text, 'Moved up Text “Note” on “Home”.')
await ElementController.act({ projectId: 'p3', screenId: 's3', elementId: 'h1-1', action: 'delete' })
assert.ok(!(await Screen.find('s3'))!.html.includes('Hello'))
await assert.rejects(async () => await ElementController.act({ projectId: 'p3', screenId: 's3', elementId: 'h1-1', action: 'delete' }), /no longer on this screen/)
await assert.rejects(async () => await ElementController.act({ projectId: 'p3', screenId: 's3', elementId: 'main-1', action: 'delete' }), /main container/)
await assert.rejects(async () => await ElementController.editText({ projectId: 'p1', screenId: 's3', elementId: 'button-1', text: 'x' }), 'a screen is only editable inside its own project')

// undo the delete from the chat
await HistoryController.revertMessage({ projectId: 'p3', messageId: (await Message.forProject('p3')).at(-1)!.id })
assert.ok((await Screen.find('s3'))!.html.includes('Hello'), 'a hand edit is undone like any other step')

// replacing a photo: with no key the slot becomes an honest empty block, and the message says so
await ElementController.replacePhoto({ projectId: 'p3', screenId: 's3', elementId: 'img-1', query: 'green curry' })
assert.ok((await Screen.find('s3'))!.html.includes('data-od-img-fallback'))
assert.match((await Message.forProject('p3')).at(-1)!.text, /No photo matched “green curry”/)

// an element edit through the model uses the same ids, and says which element it changed
reply = () => sse('<artifact title="x"><button data-od-id="button-1">Checkout</button></artifact>')
await post(GenerateController, { projectId: 'p3', prompt: 'say checkout', editScreenId: 's3', editElementId: 'button-1' })
assert.ok((await Screen.find('s3'))!.html.includes('>Checkout</button>'))
assert.match((await Message.forProject('p3')).at(-1)!.text, /^Updated Button “Order now” on “Home” — now v\d+\.$/)
assert.equal((await GenerateController.stream(new Request('http://t/api', { method: 'POST', body: JSON.stringify({ projectId: 'p3', prompt: 'x', editScreenId: 's3', editElementId: 'nope' }) }))).status, 409, 'a stale element is refused before any tokens are spent')

// editing a whole screen by parts (EDT-19)
const beforePatch = (await Screen.find('s3'))!.html
sent = []
reply = () => sse('<affects>p-1, button-1</affects>\n<edit target="p-1"><p data-od-id="p-1">Free delivery tonight</p></edit>\n<edit after="p-1"><p>New line</p></edit>')
await post(GenerateController, { projectId: 'p3', prompt: 'mention free delivery', editScreenId: 's3' })
assert.ok(sent[0].system.includes('Editing an existing screen') && sent[0].user.includes('data-od-id="button-1"'), 'the model sees the annotated screen and the edit contract')
let patched = (await Screen.find('s3'))!.html
assert.ok(/Free delivery tonight<\/p>\n<p[^>]*>New line<\/p>/.test(patched), 'the replacement, then the insertion right after it')
const untouched = (h: string) => h.slice(h.indexOf('<button'), h.indexOf('</button>'))
assert.equal(untouched(patched), untouched(annotateElements(beforePatch)), 'what the request did not touch is byte-identical')
assert.match((await Message.forProject('p3')).at(-1)!.text, /^Updated “Home” — now v\d+: Text “Note” and added next to Text “Note”\.$/)
const patchLog = parseMeta((await Message.forProject('p3')).at(-1)!.meta).log ?? []
assert.ok(patchLog[0].startsWith('Edited by parts: replace p-1, insert p-1'))
assert.ok(patchLog.includes('Listed as affected but not edited: button-1 — check them'), 'a place the model named but did not change is surfaced')

reply = () => sse('<edit target="gone"><p>x</p></edit>')
const beforeMiss = (await Screen.find('s3'))!.html
await post(GenerateController, { projectId: 'p3', prompt: 'x', editScreenId: 's3' })
assert.equal((await Screen.find('s3'))!.html, beforeMiss, 'an edit that matches nothing changes nothing')
assert.equal((await Message.forProject('p3')).at(-1)!.kind, 'error')

reply = () => sse(page('Home v2'))
await post(GenerateController, { projectId: 'p3', prompt: 'redo the whole layout', editScreenId: 's3' })
assert.ok((await Screen.find('s3'))!.html.includes('<h1>Home v2</h1>'), 'a full document still works for a whole-layout change')

// theme from chat
const t1 = await ProjectController.themeFromChat({ projectId: 'p3', prompt: 'make it blue' })
assert.deepEqual(t1, { applied: true, theme: { accent: '#2563eb' } })
assert.deepEqual(await ProjectController.themeFromChat({ projectId: 'p3', prompt: 'add a stats screen' }), { applied: false })
const themeMsg = (await Message.forProject('p3')).at(-1)!
assert.match(themeMsg.text, /Changed the accent colour to blue on every screen/)
await ProjectController.themeFromChat({ projectId: 'p3', prompt: 'rounder corners' })
assert.equal((await Project.find('p3'))!.theme, JSON.stringify({ accent: '#2563eb', radius: 'round' }), 'theme changes accumulate')
const themeUndo = await HistoryController.revertMessage({ projectId: 'p3', messageId: (await Message.forProject('p3')).at(-1)!.id })
assert.equal((await Project.find('p3'))!.theme, JSON.stringify({ accent: '#2563eb' }), 'and undo one at a time')
await HistoryController.revertMessage({ projectId: 'p3', messageId: themeUndo })
assert.equal((await Project.find('p3'))!.theme, JSON.stringify({ accent: '#2563eb', radius: 'round' }), 'redo puts the theme change back')

// --- ‹ › walks a screen's versions and back (EDT-09) ---
const doc = (t: string) => `<!doctype html><html><body><h1>${t}</h1></body></html>`
await Project.create({ id: 'p9', name: 'V', designSystem: 'minimal', device: 'mobile' })
await Screen.create({ id: 's9', projectId: 'p9', name: 'Home', prompt: 'a', html: doc('A'), x: 0, y: 0 })
await Screen.create({ id: 's9b', projectId: 'p9', name: 'Lone', prompt: 'x', html: doc('X'), x: 0, y: 0 })
for (const t of ['B', 'C']) {
  await ScreenVersion.captureFrom((await Screen.find('s9'))!)
  await Screen.updateContent('s9', { name: 'Home', prompt: t.toLowerCase(), html: doc(t) })
}
const stepTo = async (dir: number) => await HistoryController.stepVersion({ projectId: 'p9', screenId: 's9', dir })
const shows = async (t: string) => assert.ok((await Screen.find('s9'))!.html.includes(`<h1>${t}</h1>`), `the screen shows ${t}`)
assert.deepEqual(await ScreenVersion.position((await Screen.find('s9'))!), { position: 3, total: 3 }, 'two snapshots plus the newest work')
assert.deepEqual(await stepTo(-1), { position: 2, total: 3 })
await shows('B')
assert.equal(await ScreenVersion.count('s9'), 3, 'stepping back first keeps the newest work as a snapshot')
assert.deepEqual(await stepTo(-1), { position: 1, total: 3 })
await shows('A')
assert.deepEqual(await stepTo(-1), { position: 1, total: 3 }, 'nothing before v1')
assert.deepEqual(await stepTo(1), { position: 2, total: 3 })
assert.deepEqual(await stepTo(1), { position: 3, total: 3 })
await shows('C')
assert.deepEqual(await stepTo(1), { position: 3, total: 3 }, 'nothing after the newest')
assert.equal(await ScreenVersion.count('s9'), 3, 'walking never adds snapshots')
// an edit made while an older version is shown continues from it, without copying it again
await stepTo(-1)
await shows('B')
const shownId = (await Screen.find('s9'))!.versionId!
assert.equal(await ScreenVersion.captureFrom((await Screen.find('s9'))!), shownId, 'the shown version is already a snapshot')
await Screen.updateContent('s9', { name: 'Home', prompt: 'd', html: doc('D') })
assert.equal((await Screen.find('s9'))!.versionId, null, 'new content is the newest work again')
assert.deepEqual(await ScreenVersion.position((await Screen.find('s9'))!), { position: 4, total: 4 })
assert.deepEqual(await HistoryController.stepVersion({ projectId: 'p9', screenId: 's9b', dir: -1 }), { position: 1, total: 1 }, 'a screen with no snapshots stays put')
assert.equal(await ScreenVersion.count('s9b'), 0, 'and gets none from trying')
await assert.rejects(async () => await HistoryController.stepVersion({ projectId: 'p1', screenId: 's9', dir: -1 }), 'a screen is only stepped inside its own project')

// a deleted screen keeps its row, leaves every listing, and comes back
const { ScreenController } = await import('./ScreenController.ts')
await ScreenController.destroy({ id: 's9b', projectId: 'p9' })
assert.ok(!(await Screen.forProject('p9')).some((s) => s.id === 's9b') && (await Screen.positions('p9')).length === 1, 'a deleted screen is not listed or counted for placement')
await ScreenController.restore({ id: 's9b', projectId: 'p9' })
assert.ok((await Screen.forProject('p9')).some((s) => s.id === 's9b'), 'restore brings it back')
await assert.rejects(async () => await ScreenController.restore({ id: 's9b', projectId: 'p1' }), 'restore is scoped to the project')

// the project name is edited from the breadcrumb (EDT-10)
await ProjectController.rename({ id: 'p9', name: '  Veggie Box  ' })
assert.equal((await Project.find('p9'))!.name, 'Veggie Box', 'trimmed')
await assert.rejects(async () => await ProjectController.rename({ id: 'p9', name: '   ' }), /cannot be empty/)
await assert.rejects(async () => await ProjectController.rename({ id: 'nope', name: 'x' }))
await ProjectController.rename({ id: 'p9', name: 'x'.repeat(200) })
assert.equal((await Project.find('p9'))!.name.length, 80, 'capped')

// FB-01: ratings and regenerate signals, traced to the pattern that drew the screen
{
  const { FeedbackController, patternOf } = await import('./FeedbackController.ts')
  const { Feedback } = await import('../../Models/Feedback.ts')
  assert.deepEqual(patternOf('Sections…\nScreen pattern (detail, layout b): Photo hero…'), { archetype: 'detail', variant: 'b' })
  assert.deepEqual(patternOf('Screen pattern (feed): …'), { archetype: 'feed', variant: null })
  assert.deepEqual(patternOf(null), { archetype: null, variant: null })
  await Screen.create({ id: 's-fb', projectId: 'p9', name: 'Rated', prompt: 'x', html: '<html><body>x</body></html>', x: 0, y: 0, spec: 'Screen pattern (list, layout c): …' })
  await FeedbackController.rate({ projectId: 'p9', screenId: 's-fb', value: 'up' })
  await FeedbackController.rate({ projectId: 'p9', screenId: 's-fb', value: 'down' })
  assert.equal((await Feedback.ratings('p9')).get('s-fb'), 'down', 'the latest rating wins')
  assert.deepEqual((await Feedback.forProject('p9')).map((f) => [f.value, f.designSystem, f.archetype, f.variant]), [['down', 'minimal', 'list', 'c']], 'one rating per screen, with what drew it')
  await FeedbackController.rate({ projectId: 'p9', screenId: 's-fb', value: null })
  assert.equal((await Feedback.ratings('p9')).has('s-fb'), false, 'null clears it')
  await assert.rejects(async () => await FeedbackController.rate({ projectId: 'p9', screenId: 's-fb', value: 'love' }), /up, down or null/)
  await assert.rejects(async () => await FeedbackController.rate({ projectId: 'p1', screenId: 's-fb', value: 'up' }), 'a screen is rated only inside its own project')
  assert.equal((await ProjectController.show('p9')).screens.find((s) => s.id === 's-fb')!.rating, null)
  // regenerating a drawn screen is recorded; retrying a failed one is not
  reply = () => sse(page('Rated again'))
  await post(GenerateController, { projectId: 'p9', regenerateScreenId: 's-fb' })
  assert.deepEqual((await Feedback.forProject('p9')).map((f) => f.value), ['regenerate'])
}

// FB-02: each change as a before/after pair with its request, derived from the conversation
{
  const { EditPairService } = await import('../../Services/EditPairService.ts')
  const pairs = await EditPairService.forProject('p3')
  assert.ok(pairs.length >= 3, `p3's edits come back as pairs (${pairs.length})`)
  for (const p of pairs) assert.ok(p.before && p.after && p.before !== p.after && p.request, `${p.kind} pair is complete`)
  const hand = pairs.find((p) => p.kind === 'direct')!
  assert.match(hand.request, /Changed text|Deleted|Moved|Duplicated|Removed|Replaced/, 'a hand edit carries its own description as the request')
  assert.ok(pairs.some((p) => p.undone), 'a change that was undone is kept and marked')
  const byAsk = pairs.find((p) => p.kind === 'edit')
  assert.ok(byAsk && byAsk.request.length > 3 && byAsk.designSystem === 'minimal', 'a model edit carries the person\'s words and the design system')
  assert.deepEqual(await EditPairService.forProject('nope'), [])
}

// CHAT-08: with `gate`, the run stops at the plan and waits; the approval draws the plan with the
// person's edits and the ids the canvas already holds.
{
  const { PendingPlans } = await import('../../Services/PendingPlans.ts')
  await Project.create({ id: 'p-gate', name: 'Gate', device: 'mobile', designSystem: 'minimal' })
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : sse(page('Drawn')))
  const before = (await Message.forProject('p-gate')).length
  const gated = (await post(PlanController, { projectId: 'p-gate', brief: 'todo app', gate: true })).trim().split('\n').map((l) => JSON.parse(l))
  assert.deepEqual(gated.map((e) => e.type), ['plan', 'awaiting'], 'a gated run sends the plan and waits — nothing is drawn')
  assert.equal((await Screen.forProject('p-gate')).length, 0, 'no screen exists before approval')
  assert.ok(PendingPlans.has('p-gate'), 'the plan waits on the server')
  assert.equal((await Message.forProject('p-gate')).length - before, 1, 'the ask is written once, when the plan is asked for')
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
  assert.equal((await Screen.forProject('p-gate')).length, keep.length, 'exactly the approved screens exist')
  assert.equal((await Message.forProject('p-gate')).length - before, 2, 'ask, then one reply after drawing — approval adds no ask')
  assert.ok(!PendingPlans.has('p-gate'), 'an approved plan is no longer pending')
  const expired = await PlanController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p-gate', approve: { keep: [0] } }) }))
  assert.equal(expired.status, 409, 'approving with no plan waiting is refused, not drawn from nothing')
  // Without the gate, nothing changes: plan and draw in one run.
  await Project.create({ id: 'p-nogate', name: 'No gate', device: 'mobile', designSystem: 'minimal' })
  const plain = (await post(PlanController, { projectId: 'p-nogate', brief: 'todo app' })).trim().split('\n').map((l) => JSON.parse(l))
  assert.ok(!plain.some((e) => e.type === 'awaiting') && plain.at(-1).type === 'done', 'the eval and the API without `gate` behave as before')
}

// B1: ownership, orphan adoption, account deletion cascades
{
  const { db } = await import('../../../database/connection.ts')
  const { user } = await import('../../../database/schema.ts')
  const { AccountController } = await import('./AccountController.ts')
  const now = new Date()
  await db.insert(user).values([{ id: 'u1', name: 'A', email: 'a@x.uz', createdAt: now, updatedAt: now }, { id: 'u2', name: 'B', email: 'b@x.uz', createdAt: now, updatedAt: now }])
  await Project.create({ id: 'own-1', name: 'Mine', designSystem: 'minimal', device: 'mobile', userId: 'u1' })
  await Project.create({ id: 'orphan-1', name: 'Old', designSystem: 'minimal', device: 'mobile' })
  assert.ok(await Project.findOwned('own-1', 'u1') && !await Project.findOwned('own-1', 'u2'), 'only the owner finds a project')
  assert.deepEqual((await Project.forUser('u2')).map((p) => p.id), [], 'nobody else lists it')
  await Project.adoptOrphans('u2')
  assert.equal((await Project.find('orphan-1'))!.userId, 'u2', 'projects from before accounts go to the first person who signs in')
  assert.equal((await Project.find('own-1'))!.userId, 'u1', 'owned projects are not adopted')
  await Screen.create({ id: 's-own', projectId: 'own-1', name: 'S', prompt: 'p', html: '<html></html>', x: 0, y: 0 })
  await AccountController.destroy('u1')
  assert.ok(!await Project.find('own-1') && !await Screen.find('s-own'), 'deleting the account deletes its projects and screens')
  assert.ok(await Project.find('orphan-1'), "and nobody else's")
}

// GQ-07: a planned run outlives its page; only Stop ends it
{
  const { PlanRuns } = await import('../../Services/PlanRuns.ts')
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : sse(page('Drawn')))
  await Project.create({ id: 'p-detach', name: 'x', designSystem: 'minimal', device: 'mobile' })
  let finished = 0
  const res = await PlanController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p-detach', brief: 'todo app' }) }), { onFinish: () => finished++ })
  assert.equal(res.headers.get('X-OD-Detached'), '1')
  await res.body!.cancel() // the tab closed before anything arrived
  for (let i = 0; i < 50 && (finished === 0 || PlanRuns.running('p-detach')); i++) await new Promise((r) => setTimeout(r, 20))
  assert.equal(finished, 1, 'the run reports its own end')
  assert.equal((await Screen.forProject('p-detach')).filter((s) => s.html).length, 2, 'every planned screen was still drawn and saved')
  assert.ok(!(await Message.forProject('p-detach')).some((m) => /Stopped/.test(m.text)), 'and the chat does not say it stopped')

  // Stop reaches the run on the server.
  let release!: () => void
  const gate = new Promise<void>((r) => (release = r))
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : new Response(new ReadableStream({ async start(c) { await gate; c.close() } })))
  await Project.create({ id: 'p-stop', name: 'x', designSystem: 'minimal', device: 'mobile' })
  const res2 = await PlanController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p-stop', brief: 'todo app' }) }))
  const reader = res2.body!.getReader()
  await reader.read() // the plan event: the anchor screen is now waiting on the model
  assert.equal(PlanRuns.stop('p-stop'), true, 'Stop finds the run')
  release()
  while (!(await reader.read()).done) {}
  assert.equal(PlanRuns.running('p-stop'), false)
  assert.equal((await Screen.forProject('p-stop')).filter((s) => s.html).length, 0, 'nothing more is drawn after Stop')
  assert.ok((await Message.forProject('p-stop')).some((m) => m.role === 'agent' && /Stopped/i.test(m.text)), 'and the chat says it stopped')
  reply = () => sse(page('Screen'))
}

// GQ-02: a brief's palette becomes the project's theme — unless one was set by hand
{
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : sse(page('Drawn')))
  await Project.create({ id: 'p-style', name: 'x', designSystem: 'minimal', device: 'mobile' })
  await post(PlanController, { projectId: 'p-style', brief: 'Food delivery app with yellow accents and rounded corners' })
  assert.deepEqual(JSON.parse((await Project.find('p-style'))!.theme!), { accent: '#eab308', radius: 'round' })
  const log = parseMeta((await Message.forProject('p-style')).find((m) => m.role === 'agent')!.meta).log ?? []
  assert.ok(log.some((l) => /From the brief: accent yellow, rounded corners/.test(l)), 'the agent log says where the theme came from')
  await Project.create({ id: 'p-style2', name: 'x', designSystem: 'minimal', device: 'mobile' })
  await Project.saveTheme('p-style2', { accent: '#111111' })
  await post(PlanController, { projectId: 'p-style2', brief: 'Food delivery app with yellow accents' })
  assert.equal(JSON.parse((await Project.find('p-style2'))!.theme!).accent, '#111111', 'a theme set by hand is kept')
  reply = () => sse(page('Screen'))
}

// GQ-03: nobody picked a system — the brief does
{
  const { DesignSystemService } = await import('../../Services/DesignSystemService.ts')
  const { ProjectController } = await import('./ProjectController.ts')
  const auto = async (b: string) => (await ProjectController.store({ designSystem: 'auto', brief: b })).designSystem
  // DS-01: the app type offers a few systems that suit it and the project id picks one, so the
  // assertion is about the shortlist, not one fixed answer — two people typing the same brief must
  // not get the same app. A style the brief names still beats all of it.
  // GQ-32: the shortlist is now the three systems authored for a phone, and which of them suits the
  // app is the assertion — a consumer app never lands on the instrument, a bank never on the warm one.
  const food = new Set(await Promise.all([...Array(12)].map(() => auto('A food delivery app with restaurant menus and live order tracking'))))
  assert.ok(food.size > 1, 'the same brief twice is not the same system twice')
  for (const id of food) assert.ok(['ember', 'nova', 'lumen'].includes(id), `food delivery should suit the app: got ${id}`)
  const bank = new Set(await Promise.all([...Array(12)].map(() => auto('Neobank: balance, cards, transfers and spending insights'))))
  for (const id of bank) assert.ok(['graphite', 'lumen'].includes(id), `a bank should look like one: got ${id}`)
  assert.equal(await auto('A neo-brutalist habit tracker'), 'neobrutalism', 'a style the brief names beats the app type')
  assert.equal(await auto('Crypto wallet with a dark theme'), 'midnight')
  assert.equal(await auto('zzz'), 'minimal', 'nothing to go on: minimal')
  assert.equal((await ProjectController.store({ designSystem: 'nike', brief: 'A dark neo-brutalist bank' })).designSystem, 'nike', 'a system picked by hand is kept')
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
  await db.insert(user).values({ id: 'adm', name: 'Boss', email: 'boss@x.uz', createdAt: now, updatedAt: now })
  await db.insert(session).values({ id: 'sess-u2', token: 't-u2', userId: 'u2', expiresAt: new Date(Date.now() + 1e7), createdAt: now, updatedAt: now })
  await AdminController.ban('adm', { userId: 'u2', reason: 'spam' })
  const banned = (await db.select().from(user).where(eq(user.id, 'u2')))[0]!
  assert.ok(banned.banned && banned.banReason === 'spam', 'a ban is saved with its reason')
  assert.equal((await db.select().from(session).where(eq(session.userId, 'u2'))).length, 0, 'and signs the user out everywhere')
  await assert.rejects(async () => await AdminController.ban('adm', { userId: 'adm', reason: '' }), /yourself/)
  await AdminController.unban('adm', 'u2')
  assert.equal((await db.select().from(user).where(eq(user.id, 'u2')))[0]!.banned, false)
  await assert.rejects(async () => await AdminController.setRole('adm', { userId: 'adm', role: 'user' }), /own admin role/)

  await AdminController.setSetting('adm', { key: 'generation.paused', value: '1' })
  assert.equal((await UsageService.refusal('u2'))?.status, 503, 'a pause set in the panel stops generation without a deploy')
  await AdminController.setSetting('adm', { key: 'generation.paused', value: null })
  assert.equal((await UsageService.limits()).paused, false)
  await assert.rejects(async () => await AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: '-3' }), /Invalid value/)
  await AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: '40' })
  await AdminController.setUserLimit('adm', { userId: 'u2', limit: 500 })
  assert.deepEqual([(await UsageService.limits()).callsPerDay, (await UsageService.limits('u2')).callsPerDay, (await UsageService.limits('adm')).callsPerDay], [40, 500, 40], 'a per-user limit beats the global one')
  await AdminController.setUserLimit('adm', { userId: 'u2', limit: null })
  await AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: null })
  assert.equal((await Setting.all()).length, 0, 'clearing a setting falls back to the default')

  const trail = (await AdminStatsService.controls()).actions.map((a) => a.action)
  assert.deepEqual(trail.slice(0, 3), ['set-setting', 'set-user-limit', 'set-user-limit'], 'every admin write is logged, newest first')
  assert.ok(trail.includes('ban') && trail.includes('unban'))
  const o = await AdminStatsService.overview(7)
  assert.equal(o.series.length >= 30, true, 'a 30-day series with a row per day')
  assert.ok(o.current.newUsers >= 1 && typeof o.current.failRate === 'number')
  assert.ok((await AdminStatsService.users()).some((u) => u.email === 'boss@x.uz'))

  // BIL-04: credits are a ledger — the balance is the sum, a ref happens once, an admin grant is logged.
  const { Credit } = await import('../../Models/Credit.ts')
  assert.equal(await Credit.balance('u2'), 0, 'no rows, no credits')
  assert.equal(await Credit.add({ userId: 'u2', delta: 60, kind: 'signup', ref: 'signup:u2' }), true)
  assert.equal(await Credit.add({ userId: 'u2', delta: 60, kind: 'signup', ref: 'signup:u2' }), false, 'the same ref twice grants once (a webhook delivered twice)')
  await Credit.add({ userId: 'u2', delta: -15, kind: 'hold', actionId: 'a1' })
  await Credit.add({ userId: 'u2', delta: 4, kind: 'refund', actionId: 'a1' })
  assert.equal(await Credit.balance('u2'), 49, 'balance = sum of rows')
  assert.equal(await Credit.ofAction('u2', 'a1'), -11, 'an action nets its hold and refunds')
  await assert.rejects(async () => await Credit.add({ userId: 'u2', delta: 1.5, kind: 'admin' }), /whole/)
  await AdminController.grantCredits('adm', { userId: 'u2', amount: 100, note: 'beta tester' })
  assert.equal(await Credit.balance('u2'), 149)
  assert.equal((await AdminStatsService.controls()).actions[0]!.action, 'grant-credits', 'a grant is in the admin log')
  assert.equal((await AdminStatsService.users()).find((u) => u.id === 'u2')!.credits, 149, 'the users table shows the balance')
  assert.equal((await AdminStatsService.user('u2'))!.credits[0]!.note, 'beta tester', 'newest movement first')
}

// BIL-05: every action's credit price, at the cheapest a credit is sold, covers what the action
// really costs at its worst: DeepSeek's peak hours and the 90th percentile of logged calls
// (llm_calls, 174 calls, measured 2026-09-24, off-peak p90 doubled). Under peak-p90 × 1.25 a heavy
// user would cost more than they pay. Element edits are not yet in the log; theirs is an estimate
// (a whole-screen prompt, a few hundred tokens out) until LLM-06 measures it.
{
  const { CreditService, CREDIT_PRICES, CHEAPEST_CREDIT_USD } = await import('../../Services/CreditService.ts')
  const PEAK_P90_USD = { plan: 0.0045, screen: 0.0114, element: 0.006 }
  const { PRICES, MODELS, costOf } = await import('../../Services/LlmService.ts')
  // LLM-07: every other model is held to the same rule. Its worst cost is DeepSeek's token profile
  // (plan 2k in/2k out, screen 10k in of which 7k cached/6k out, element 15k in/0.5k out), priced at
  // that model's rates and scaled by what DeepSeek's log measured over the same profile.
  const PROFILE = {
    plan: { promptTokens: 2000, cachedTokens: 0, completionTokens: 2000 },
    screen: { promptTokens: 10000, cachedTokens: 7000, completionTokens: 6000 },
    element: { promptTokens: 15000, cachedTokens: 0, completionTokens: 500 },
  }
  const peak = new Date('2026-09-23T07:00:00Z') // a Wednesday, in DeepSeek's peak hours
  const worstAt = (m: string, k: keyof typeof PROFILE) => {
    const u = { ...PROFILE[k], cacheWriteTokens: 0 }
    // Claude writes its cache before it reads it: the worst case pays the write.
    if (PRICES[m]!.cacheWrite) Object.assign(u, { cacheWriteTokens: u.cachedTokens, cachedTokens: 0 })
    return costOf(u, m, peak) * (PEAK_P90_USD[k] / costOf(PROFILE[k], 'deepseek-flash', peak))
  }
  for (const m of Object.keys(MODELS)) {
    assert.ok(CREDIT_PRICES[m], `${m} can be picked, so it needs credit prices`)
    const worst = { plan: worstAt(m, 'plan'), draw: 6.5 * worstAt(m, 'screen'), screen: worstAt(m, 'screen'), element: worstAt(m, 'element') }
    for (const kind of ['plan', 'draw', 'screen', 'element'] as const) {
      const credits = await CreditService.priceOf(kind, m)
      const usd = credits * CHEAPEST_CREDIT_USD
      assert.ok(usd >= worst[kind] * 1.25 - 1e-9, `${m} ${kind}: ${credits} credits = $${usd.toFixed(4)}, under 1.25 × its worst cost $${worst[kind].toFixed(4)}`)
    }
  }
  assert.equal(await CreditService.priceOf('app'), 15, 'an app is 15 credits: the plan and its drawing (BIL-02)')
  assert.deepEqual(CREDIT_PRICES['deepseek-flash'], { plan: 1, draw: 14, screen: 2, element: 1 })
  await assert.rejects(() => CreditService.priceOf('screen', 'gpt-imaginary'), /No credit price/)
  for (const m of Object.keys(CREDIT_PRICES)) assert.ok(PRICES[m], `${m} has credit prices, so it needs a token price too`)
  // Which action a request is.
  assert.equal(CreditService.kindOf('/api/generate-plan', { brief: 'x', gate: true }), 'plan')
  assert.equal(CreditService.kindOf('/api/generate-plan', { approve: {} }), 'draw')
  assert.equal(CreditService.kindOf('/api/generate-plan', { brief: 'x' }), 'app')
  assert.equal(CreditService.kindOf('/api/generate', { prompt: 'x' }), 'screen')
  assert.equal(CreditService.kindOf('/api/generate', { editScreenId: 's', prompt: 'x' }), 'screen')
  assert.equal(CreditService.kindOf('/api/generate', { editScreenId: 's', editElementId: 'button-3', prompt: 'x' }), 'element')
}

// BIL-06: the price is held before the model runs; an action that produced nothing gives it all
// back, a planned run pays back its undrawn screens, and no action returns more than it took.
{
  const { CreditService } = await import('../../Services/CreditService.ts')
  const { UsageService } = await import('../../Services/UsageService.ts')
  const { Credit } = await import('../../Models/Credit.ts')
  await Credit.add({ userId: 'buyer', delta: 20, kind: 'admin' })
  assert.equal(await CreditService.hold('buyer', 'act-a', 15), true)
  assert.equal(await CreditService.hold('buyer', 'act-b', 15), false, 'a hold the balance cannot cover is refused')
  assert.equal(await Credit.balance('buyer'), 5, 'a refused hold writes nothing')
  // act-a made no successful call (none at all): settling gives all 15 back, and a second settle nothing.
  await CreditService.settle('buyer', 'act-a')
  await CreditService.settle('buyer', 'act-a')
  assert.equal(await Credit.balance('buyer'), 20, 'nothing generated, nothing paid — once')
  // A planned run inside an action: 2 of its screens undrawn come back at 2 each, capped by the hold.
  await CreditService.hold('buyer', 'act-c', 14)
  assert.equal(await UsageService.run({ userId: 'buyer', actionId: 'act-c' }, () => CreditService.refundScreens(2)), 4)
  assert.equal(await UsageService.run({ userId: 'buyer', actionId: 'act-c' }, () => CreditService.refundScreens(50)), 10, 'never more than the action still holds')
  assert.equal(await Credit.ofAction('buyer', 'act-c'), 0)
  assert.equal(await CreditService.refundScreens(3), 0, 'outside an action (the eval) there is nothing to refund')
  // BIL-07: a new account's free start, granted once.
  const { SIGNUP_CREDITS } = await import('../../Services/CreditService.ts')
  assert.equal(await CreditService.signupGrant('newbie'), true)
  assert.equal(await CreditService.signupGrant('newbie'), false, 'the start is granted once')
  assert.equal(await Credit.balance('newbie'), SIGNUP_CREDITS)
  assert.equal(SIGNUP_CREDITS, 4 * (await CreditService.priceOf('app')), 'the free start is four apps (BIL-02)')
}

// BIL-09/10: plans grant monthly (a yearly plan too), once per month; unused plan credits lapse at the
// next month, packs never do; every webhook may arrive twice and grants once.
{
  const { BillingController } = await import('./BillingController.ts')
  const { CreditService } = await import('../../Services/CreditService.ts')
  const { Credit } = await import('../../Models/Credit.ts')
  const { Subscription, monthIndex } = await import('../../Models/Subscription.ts')
  const t = (iso: string) => Math.floor(Date.parse(iso) / 1000)
  assert.equal(monthIndex(t('2026-01-31T10:00:00Z'), t('2026-02-27T10:00:00Z')), 0)
  assert.equal(monthIndex(t('2026-01-31T10:00:00Z'), t('2026-02-28T10:00:00Z')), 1, 'Jan 31 renews on Feb 28')
  assert.equal(monthIndex(t('2026-01-15T10:00:00Z'), t('2027-01-15T09:59:59Z')), 11)

  await assert.rejects(BillingController.checkout({ id: 'payer', email: 'p@x.uz' }, 'pack-500', 'http://x'), /subscribers/, 'packs are for subscribers only')

  const sub = (status: string, extra: Record<string, unknown> = {}) => ({
    type: 'subscription.updated',
    data: { id: 'sub_1', status, started_at: new Date().toISOString(), current_period_end: new Date(Date.now() + 365 * 864e5).toISOString(), customer: { external_id: 'payer' }, product: { metadata: { od: 'starter-year' } }, ...extra },
  })
  assert.equal(await BillingController.webhook(sub('active')), 'subscription saved')
  await BillingController.webhook(sub('active'))
  assert.equal(await Credit.balance('payer'), 1200, 'the first month lands once, however often the event comes')
  assert.equal(await BillingController.webhook({ type: 'order.paid', data: { id: 'ord_9', product: { metadata: { od: 'pack-500' } }, customer: { external_id: 'payer' } } }), 'pack granted')
  assert.equal(await BillingController.webhook({ type: 'order.paid', data: { id: 'ord_9', product: { metadata: { od: 'pack-500' } }, customer: { external_id: 'payer' } } }), 'duplicate')
  assert.equal(await Credit.balance('payer'), 1700)
  assert.equal(await BillingController.webhook({ type: 'order.paid', data: { id: 'ord_x', product: { metadata: { od: 'something-else' } }, customer: { external_id: 'payer' } } }), 'ignored')

  // Spend 200 of the plan's 1 200, then a month passes: 1 000 unused lapse, the 500 pack stays, 1 200 arrive.
  await CreditService.hold('payer', 'act-p', 200)
  const nextMonth = Math.floor(Date.now() / 1000) + 31 * 86400
  await CreditService.refresh('payer', nextMonth)
  await CreditService.refresh('payer', nextMonth)
  assert.equal(await Credit.balance('payer'), 500 + 1200, 'unused plan credits lapse, the pack does not, the new month lands once')

  // Cancelled at period end: still the plan until the period ends; revoked: nothing more.
  await BillingController.webhook(sub('active', { cancel_at_period_end: true }))
  assert.ok(await Subscription.activeFor('payer'), 'a cancelled plan runs to the end of its period')
  await BillingController.webhook(sub('revoked'))
  assert.equal(await Subscription.activeFor('payer'), undefined)
  const before = await Credit.balance('payer')
  await CreditService.refresh('payer', nextMonth + 31 * 86400)
  assert.equal(await Credit.balance('payer'), before, 'a revoked plan grants nothing more')
}

// BIL-14: a plan's project count is enforced on the server; export follows the plan; admins are free.
{
  const { CreditService } = await import('../../Services/CreditService.ts')
  const { Subscription } = await import('../../Models/Subscription.ts')
  const { ProjectController } = await import('./ProjectController.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user } = await import('../../../database/schema.ts')
  await db.insert(user).values({ id: 'freebie', name: 'F', email: 'f@x.uz', createdAt: new Date(), updatedAt: new Date() })
  assert.deepEqual(await CreditService.limitsFor('freebie'), { plan: 'free', projects: 1, export: false })
  assert.deepEqual(await CreditService.limitsFor('freebie', true), { plan: 'free', projects: null, export: true }, 'an admin is not limited')
  await ProjectController.store({ designSystem: 'nova', userId: 'freebie' })
  await assert.rejects(async () => await ProjectController.store({ designSystem: 'nova', userId: 'freebie' }), /plan-limit:projects:1/, 'Free makes one project')
  await ProjectController.store({ designSystem: 'nova', userId: 'freebie', admin: true })
  await Subscription.upsert({ id: 'sub_s', userId: 'freebie', productKey: 'starter-month', status: 'active', startedAt: Math.floor(Date.now() / 1000), currentPeriodEnd: null, cancelAtPeriodEnd: false })
  assert.deepEqual(await CreditService.limitsFor('freebie'), { plan: 'starter', projects: 5, export: true })
  for (let i = 0; i < 3; i++) await ProjectController.store({ designSystem: 'nova', userId: 'freebie' })
  await assert.rejects(async () => await ProjectController.store({ designSystem: 'nova', userId: 'freebie' }), /plan-limit:projects:5/, 'Starter makes five')
  await Subscription.upsert({ id: 'sub_s', userId: 'freebie', productKey: 'pro-month', status: 'active', startedAt: Math.floor(Date.now() / 1000), currentPeriodEnd: null, cancelAtPeriodEnd: false })
  await ProjectController.store({ designSystem: 'nova', userId: 'freebie' })
  assert.equal((await CreditService.limitsFor('freebie')).projects, null, 'Pro is unlimited')
  await ProjectController.store({ designSystem: 'nova' }) // the eval and tests make projects with no user: never limited
}

// ADM-13: a key saved in the panel wins over .env, is stored sealed, is shown only by its last four,
// and removing it falls back to .env. The test reports an outcome, never a response body.
{
  const { randomBytes } = await import('node:crypto')
  process.env.SECRETS_KEY = randomBytes(32).toString('base64')
  const { SecretService } = await import('../../Services/SecretService.ts')
  const { AdminController } = await import('./AdminController.ts')
  const { AdminStatsService } = await import('../../Services/AdminStatsService.ts')
  const { db } = await import('../../../database/connection.ts')
  const { secrets } = await import('../../../database/schema.ts')
  process.env.PEXELS_API_KEY = 'env-pexels-0000'
  assert.equal(await SecretService.get('PEXELS_API_KEY'), 'env-pexels-0000', 'no saved key: .env')
  await AdminController.setSecret('adm', { name: 'PEXELS_API_KEY', value: 'panel-pexels-9876' })
  assert.equal(await SecretService.get('PEXELS_API_KEY'), 'panel-pexels-9876', 'a saved key wins, at once (cache cleared)')
  const [row] = await db.select().from(secrets)
  assert.ok(row && !row.sealed.includes('panel-pexels') && row.last4 === '9876', 'stored sealed; only the last four in clear')
  const st = (await AdminController.secrets()).find((k) => k.name === 'PEXELS_API_KEY')!
  assert.deepEqual([st.source, st.last4], ['admin', '9876'])
  assert.ok(!JSON.stringify(await AdminController.secrets()).includes('panel-pexels'), 'the panel never receives a key')
  assert.equal((await AdminController.secrets()).find((k) => k.name === 'ANTHROPIC_API_KEY')!.source, 'missing')
  assert.equal((await AdminStatsService.controls()).actions[0]!.detail, '…9876', 'the log keeps the last four only')
  const llmFetch = globalThis.fetch
  let probe = { status: 401, headers: {} as Record<string, string> }
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => ((probe.headers = init?.headers as Record<string, string>), new Response('{"error":"invalid key sk-echo"}', { status: probe.status }))) as typeof fetch
  const bad = await AdminController.testSecret('PEXELS_API_KEY')
  assert.ok(!bad.ok && /Rejected/.test(bad.detail) && !bad.detail.includes('sk-echo'), 'a rejected key says so, without the body')
  assert.equal(probe.headers.Authorization, 'panel-pexels-9876', 'the test sends the key in force')
  probe.status = 200
  assert.equal((await AdminController.testSecret('PEXELS_API_KEY')).ok, true)
  globalThis.fetch = llmFetch
  // The model call takes the panel's DeepSeek key over .env (SecretService registers itself with LlmService).
  process.env.DEEPSEEK_API_KEY = 'env-deepseek-0000'
  await AdminController.setSecret('adm', { name: 'DEEPSEEK_API_KEY', value: 'panel-deepseek-1111' })
  await Project.create({ id: 'p-key', name: 'K', designSystem: 'minimal', device: 'mobile' })
  await post(GenerateController, { projectId: 'p-key', prompt: 'a settings screen' })
  assert.equal(lastAuth, 'Bearer panel-deepseek-1111', 'generation uses the key saved in the panel')
  await AdminController.setSecret('adm', { name: 'DEEPSEEK_API_KEY', value: null })
  await post(GenerateController, { projectId: 'p-key', prompt: 'another screen' })
  assert.equal(lastAuth, 'Bearer env-deepseek-0000', 'removed from the panel: .env again')
  await AdminController.setSecret('adm', { name: 'PEXELS_API_KEY', value: null })
  assert.equal(await SecretService.get('PEXELS_API_KEY'), 'env-pexels-0000', 'removed: back to .env')
  assert.deepEqual((await AdminController.testSecret('ANTHROPIC_API_KEY')), { ok: false, detail: 'No key set' })
}

// ADM-10: the admin command palette searches users and projects; % and _ match literally
{
  const { AdminController } = await import('./AdminController.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user } = await import('../../../database/schema.ts')
  const now = new Date()
  await db.insert(user).values({ id: 'pal', name: 'Pal Ette', email: 'palette@x.uz', createdAt: now, updatedAt: now })
  await Project.create({ id: 'pal-p', name: 'Zeta 100% App', designSystem: 'minimal', device: 'mobile', userId: 'pal' })
  assert.ok((await AdminController.search('PALETTE')).users.some((u) => u.id === 'pal'), 'a user is found by email, any case')
  assert.ok((await AdminController.search('ette')).users.some((u) => u.id === 'pal'), 'and by name')
  const hit = (await AdminController.search('100%')).projects
  assert.deepEqual(hit.map((p) => [p.id, p.owner]), [['pal-p', 'palette@x.uz']], 'a project by name, with its owner')
  assert.deepEqual((await AdminController.search('%')).projects.map((p) => p.id), ['pal-p'], '% is a literal, not a wildcard')
  assert.deepEqual(await AdminController.search('  '), { users: [], projects: [] }, 'blank text finds nothing')
}

// OBS-10/OBS-11: the request log masks secrets and skips assets; errors group by fingerprint; logs carry their request
{
  const { TelescopeService, maskQuery, skipPath, fingerprint, installServerLogs } = await import('../../Services/TelescopeService.ts')
  const { RequestContext } = await import('../../Services/RequestContext.ts')
  const { db } = await import('../../../database/connection.ts')
  const { httpRequests, serverLogs, user } = await import('../../../database/schema.ts')
  const { eq } = await import('drizzle-orm')

  assert.equal(maskQuery(new URL('http://x/a?token=abc&page=2').search), 'token=***&page=2', 'a token is masked, page kept')
  assert.equal(maskQuery('?apiKey=1&sessionId=2&q=hi'), 'apiKey=***&sessionId=***&q=hi')
  assert.equal(maskQuery(''), null)
  for (const p of ['/@vite/client', '/@fs/x', '/@id/y', '/node_modules/z.js', '/src/styles.css', '/assets/app.js', '/a.css', '/a.map', '/logo.png', '/icon.svg', '/favicon.ico', '/f.woff2', '/showcase/x', '/api/thumb/s1'])
    assert.ok(skipPath(p), `${p} is not recorded`)
  for (const p of ['/', '/admin/requests', '/_serverFn/abc', '/api/generate', '/p/123']) assert.ok(!skipPath(p), `${p} is recorded`)

  const at = '    at load (/app/src/x.ts:10:5)\n    at run (/app/src/y.ts:1:1)'
  const e1 = fingerprint('Error', 'Screen 3f2a9c1e-1b2c-4d5e-8f90-123456789abc not found (attempt 2)', `Error: …\n${at}`)
  const e2 = fingerprint('Error', 'Screen 9aa0bb11-2222-4333-8444-555566667777 not found (attempt 7)', `Error: …\n${at}`)
  assert.equal(e1, e2, 'errors differing only by ids and numbers share a fingerprint')
  assert.notEqual(e1, fingerprint('Error', 'Project not found', `Error: …\n${at}`), 'a different message does not')
  assert.notEqual(e1, fingerprint('TypeError', 'Screen x not found (attempt 2)', `Error: …\n${at}`))

  const now = Math.floor(Date.now() / 1000)
  await db.insert(user).values({ id: 'tel-u', name: 'Tel', email: 'tele@x.uz', createdAt: new Date(), updatedAt: new Date() })
  const rows = [
    ...Array.from({ length: 55 }, (_, i) => ({ id: `tr-ok-${i}`, method: 'GET', path: `/p/${i}`, kind: 'page', status: 200, ms: 20, createdAt: now - i })),
    { id: 'tr-404', method: 'GET', path: '/missing', kind: 'page', status: 404, ms: 5, createdAt: now },
    { id: 'tr-500', method: 'POST', path: '/_serverFn/boom', kind: 'server-fn', status: 500, ms: 2500, userId: 'tel-u', createdAt: now },
    { id: 'tr-old', method: 'GET', path: '/old', kind: 'page', status: 200, ms: 1, createdAt: now - 8 * 86400 },
  ]
  await db.insert(httpRequests).values(rows)
  const all = await TelescopeService.requests({})
  assert.equal(all.total, 58)
  assert.equal(all.rows.length, 50, '50 a page')
  assert.equal((await TelescopeService.requests({ page: 1 })).rows.length, 8, 'the rest on page two')
  assert.deepEqual((await TelescopeService.requests({ status: '5xx' })).rows.map((r) => r.id), ['tr-500'])
  assert.deepEqual((await TelescopeService.requests({ status: '4xx' })).rows.map((r) => r.id), ['tr-404'])
  assert.deepEqual((await TelescopeService.requests({ slowMs: 1000 })).rows.map((r) => [r.id, r.email]), [['tr-500', 'tele@x.uz']], 'slow, with the user')
  assert.deepEqual((await TelescopeService.requests({ email: 'TELE@' })).rows.map((r) => r.id), ['tr-500'])
  assert.equal((await TelescopeService.requests({ path: '/p/' })).total, 55)
  assert.equal((await TelescopeService.requests({ path: '%' })).total, 0, '% is literal')
  assert.equal((await TelescopeService.requests({ method: 'POST', from: now - 60 })).total, 1)

  // A console.error inside a request is stored with that request's id (and still printed).
  installServerLogs()
  const stored = RequestContext.run({ requestId: 'tr-500' }, () => TelescopeService.log('error', ['boom:', new Error('Screen 42 not found')]))
  await stored
  console.error('[test] expected error line for tr-500', new Error('Screen 43 not found'))
  await RequestContext.run({ requestId: 'tr-500' }, async () => console.warn('a warning'))
  await new Promise((r) => setTimeout(r, 200))
  const logs = await db.select().from(serverLogs).where(eq(serverLogs.requestId, 'tr-500'))
  assert.ok(logs.some((l) => l.level === 'error' && l.message === 'boom: Error: Screen 42 not found' && l.stack?.includes('controllers.check') && l.fingerprint), 'stored with its request id, stack and fingerprint')
  assert.ok(logs.some((l) => l.level === 'warn' && l.message === 'a warning' && !l.fingerprint), 'the console wrapper stores within the context')
  assert.ok((await db.select().from(serverLogs).where(eq(serverLogs.message, '[test] expected error line for tr-500 Error: Screen 43 not found')))[0]?.requestId === null, 'outside a request: no request id')
  console.log('[auth] magic link: http://x/api/auth/magic-link/verify?token=SECRET123&callbackURL=/')
  await new Promise((r) => setTimeout(r, 200))
  assert.equal((await db.select().from(serverLogs).where(eq(serverLogs.level, 'log'))).filter((l) => l.message.includes('SECRET123')).length, 0, 'a token in a logged URL is masked')
  const detail = await TelescopeService.request('tr-500')
  assert.equal(detail?.request?.email, 'tele@x.uz')
  assert.ok(detail!.logs.length >= 2)
  assert.equal(await TelescopeService.request('nope'), null)
  const groups = await TelescopeService.errors()
  assert.ok(groups.some((g) => g.count >= 1 && g.requestId === 'tr-500'), 'errors grouped, with the last request')
  assert.ok((await TelescopeService.logs({ level: 'warn' })).rows.every((l) => l.level === 'warn'))
  const newest = (await TelescopeService.logs({})).rows[0]!.id
  assert.equal((await TelescopeService.logs({ afterId: newest })).rows.length, 0, 'live polling sees nothing newer')

  // Retention: older than 7 days goes.
  await db.insert(serverLogs).values({ level: 'info', message: 'ancient', createdAt: now - 8 * 86400 })
  await TelescopeService.cleanup()
  assert.equal((await db.select().from(httpRequests).where(eq(httpRequests.id, 'tr-old'))).length, 0, 'an old request is deleted')
  assert.equal((await db.select().from(serverLogs).where(eq(serverLogs.message, 'ancient'))).length, 0, 'an old log line is deleted')
  assert.equal((await TelescopeService.requests({})).total, 57, 'recent rows stay')
}

// ADM-11: the admin tables page, sort, filter and export in SQL; the query parser whitelists everything
{
  const { AdminController } = await import('./AdminController.ts')
  const { parseCallsQuery, parseUsersQuery } = await import('../../../admin/table-query.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user, llmCalls } = await import('../../../database/schema.ts')
  // Everything here lives in March 2001, so the date filter keeps other tests' rows out.
  const t0 = Date.parse('2001-03-01T00:00:00Z') / 1000
  await db.insert(user).values([
    { id: 'tbl-a', name: 'Alpha', email: 'alpha_tbl@x.uz', createdAt: new Date('2001-03-02T10:00:00Z'), updatedAt: new Date() },
    { id: 'tbl-b', name: 'Bravo', email: 'bravo@x.uz', createdAt: new Date('2001-03-20T10:00:00Z'), updatedAt: new Date() },
  ])
  await db.insert(llmCalls).values(Array.from({ length: 30 }, (_, i) => ({
    id: `tc-${String(i).padStart(2, '0')}`, userId: i % 2 ? 'tbl-b' : 'tbl-a', provider: 'deepseek', model: i % 3 === 0 ? 'tbl-m1' : 'tbl-m2',
    promptTokens: 100 + i, completionTokens: 10, costUsd: i / 100, ms: 1000 + i, ok: i % 5 !== 0,
    error: i === 0 ? 'boom, "quoted"\nline2' : i === 5 ? 'stopped at 100% done' : i % 5 === 0 ? 'timeout' : null,
    createdAt: t0 + i * 43200,
  })))
  const march = { from: '2001-03-01', to: '2001-03-31' }
  const calls = (q: Record<string, unknown>) => AdminController.callsPage(parseCallsQuery({ ...march, ...q }))
  const first = await calls({ size: 10 })
  assert.equal(first.rows.length, 10, 'a page holds `size` rows')
  assert.equal(first.total, 30, 'and the total counts every match')
  assert.equal(first.rows[0]!.id, 'tc-29', 'newest first by default')
  assert.deepEqual((await calls({ size: 10, page: 2 })).rows.map((r) => r.id).slice(-1), ['tc-00'], 'the last page ends with the oldest')
  assert.deepEqual((await calls({ sort: 'cost', dir: 'desc', size: 3 })).rows.map((r) => r.costUsd), [0.29, 0.28, 0.27], 'sort by cost')
  assert.deepEqual((await calls({ sort: 'cost', dir: 'asc', size: 1 })).rows.map((r) => r.id), ['tc-00'], 'and ascending')
  const errors = await calls({ result: 'error' })
  assert.equal(errors.total, 6, 'result=error keeps the failed calls')
  assert.ok(errors.rows.every((r) => !r.ok))
  assert.equal((await calls({ errors: true })).total, 6, 'the old ?errors=true link still means result=error')
  assert.equal((await calls({ result: 'ok' })).total, 24)
  assert.equal((await calls({ model: 'tbl-m1' })).total, 10, 'model filter')
  assert.ok((await calls({})).models.includes('tbl-m2'), 'the distinct models come with the page')
  assert.equal((await AdminController.callsPage(parseCallsQuery({ from: '2001-03-01', to: '2001-03-01' }))).total, 2, 'a one-day range covers that whole day')
  assert.equal((await calls({ minCost: 0.25 })).total, 5, 'min cost')
  assert.equal((await calls({ q: 'alpha_tbl' })).total, 15, 'q matches the email')
  assert.equal((await calls({ user: 'BRAVO' })).total, 15, 'user email contains, any case')
  assert.deepEqual((await calls({ q: '%' })).rows.map((r) => r.id), ['tc-05'], '% in the search is a literal, not a wildcard')
  const evil = parseCallsQuery({ ...march, sort: 'cost; DROP TABLE llm_calls', dir: 'sideways', page: -1, size: 5000, result: 'maybe', minCost: 'NaN' })
  assert.deepEqual(evil, march, 'unknown sort, dir, page, size and filters fall back to the defaults')
  assert.equal((await AdminController.callsPage(evil)).rows[0]!.id, 'tc-29', 'and the default sort applies')
  const csv = await AdminController.callsCsv(parseCallsQuery({ ...march, result: 'error', model: 'tbl-m1' }))
  const [head] = csv.split('\r\n')
  assert.equal(head, 'id,time,user,project,provider,model,action_id,ok,prompt_tokens,cached_tokens,cache_write_tokens,completion_tokens,cost_usd,ms,error', 'CSV header')
  assert.ok(csv.includes('"boom, ""quoted""\nline2"'), 'a comma, a quote and a newline are quoted and doubled')
  assert.equal(csv.match(/^tc-/gm)?.length, 2, 'the CSV is the current filter, unpaged')
  assert.ok(csv.includes('tc-15,2001-03-08T12:00:00.000Z,bravo@x.uz,'), 'one row per call')

  const users = (q: Record<string, unknown>) => AdminController.usersPage(parseUsersQuery({ from: '2001-01-01', to: '2001-12-31', ...q }))
  const u = await users({ size: 1 })
  assert.deepEqual([u.rows.length, u.total, u.rows[0]!.id], [1, 2, 'tbl-b'], 'users page: newest joined first, total counts all')
  assert.deepEqual((await users({ sort: 'joined', dir: 'asc' })).rows.map((r) => r.id), ['tbl-a', 'tbl-b'])
  assert.deepEqual((await users({ sort: 'spend' })).rows.map((r) => [r.id, Math.round(r.spend * 100)]), [['tbl-b', 225], ['tbl-a', 210]], 'sort by spend')
  assert.deepEqual((await users({ q: 'ALPHA_' })).rows.map((r) => r.id), ['tbl-a'], 'search by email')
  assert.equal((await users({ q: 'bra' })).total, 1, 'and by name')
  assert.equal((await users({ to: '2001-03-10' })).total, 1, 'joined date range')
  assert.equal((await users({ role: 'admin' })).total, 0)
  await db.update(user).set({ banned: true }).where((await import('drizzle-orm')).eq(user.id, 'tbl-b'))
  assert.deepEqual((await users({ status: 'banned' })).rows.map((r) => r.id), ['tbl-b'], 'status filter')
  assert.deepEqual((await users({ status: 'active' })).rows.map((r) => r.id), ['tbl-a'])
  assert.deepEqual(parseUsersQuery({ sort: 'password', role: 'root' }), {}, 'users: unknown sort and filter values are dropped')
  assert.ok((await AdminController.usersCsv(parseUsersQuery({ from: '2001-01-01', to: '2001-12-31' }))).startsWith('id,email,name,role,banned,joined'), 'users CSV header')
}

// LLM-07: the model a call site runs on is an admin setting — checked, read at call time, and it
// moves the credit price with it.
{
  const { AdminController } = await import('./AdminController.ts')
  const { CreditService } = await import('../../Services/CreditService.ts')
  await import('../../Services/SecretService.ts') // registers the settings source, as guard.ts does
  await assert.rejects(() => AdminController.setSetting('adm', { key: 'llm.model.screen', value: 'gpt-imaginary' }), /Invalid value/)
  await assert.rejects(() => AdminController.setSetting('adm', { key: 'llm.fallback', value: 'claude-opus-9' }), /Invalid value/)
  await AdminController.setSetting('adm', { key: 'llm.fallback', value: '' })
  await AdminController.setSetting('adm', { key: 'llm.model.screen', value: 'claude-haiku-4-5' })
  assert.equal(await CreditService.priceOf('screen'), 10, 'a screen costs the Claude row once screens run on Claude')
  assert.equal(await CreditService.priceOf('plan'), 1, 'the plan model is untouched')
  assert.ok((await AdminController.models()).some((m) => m.id === 'claude-haiku-4-5' && m.provider === 'anthropic' && m.credits?.screen === 10))
  const llmFetch = globalThis.fetch
  const realKey = process.env.ANTHROPIC_API_KEY
  process.env.ANTHROPIC_API_KEY = 'test-anthropic'
  const hits: { url: string; headers: Record<string, string>; body: any }[] = []
  const html = '<artifact title="Claude screen"><!doctype html><html><head><title>Claude screen</title></head><body><main><p>hi</p></main></body></html></artifact>'
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    hits.push({ url: String(url), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) })
    const ev = (o: unknown) => `event: x\ndata: ${JSON.stringify(o)}\n\n`
    return new Response(ev({ type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 1 } } }) + ev({ type: 'content_block_delta', delta: { type: 'text_delta', text: html } }) + ev({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 50 } }), { status: 200 })
  }) as typeof fetch
  try {
    await Project.create({ id: 'p-llm07', name: 'L', designSystem: 'minimal', device: 'mobile' })
    const out = await post(GenerateController, { projectId: 'p-llm07', prompt: 'a settings screen' })
    assert.ok(!out.includes('GEN_ERROR'), out)
    assert.equal(hits[0]?.url, 'https://api.anthropic.com/v1/messages', 'the screen call went to Anthropic')
    assert.equal(hits[0]!.body.model, 'claude-haiku-4-5-20251001')
    assert.equal(hits[0]!.headers['x-api-key'], 'test-anthropic')
    assert.ok((await Screen.forProject('p-llm07')).some((sc) => sc.html.includes('Claude screen')), 'the screen was drawn from its stream')
  } finally {
    globalThis.fetch = llmFetch
    if (realKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = realKey
    await AdminController.setSetting('adm', { key: 'llm.model.screen', value: null })
    await AdminController.setSetting('adm', { key: 'llm.fallback', value: null })
  }
  assert.equal(await CreditService.priceOf('screen'), 2, 'reset: DeepSeek again')
}

// OBS-12: outgoing calls are recorded (masked, no bodies), webhooks are stored (payload only when
// verified), and a stored verified event can be replayed without granting twice.
{
  const { TelescopeService, wrapFetch, purposeOf } = await import('../../Services/TelescopeService.ts')
  const { RequestContext } = await import('../../Services/RequestContext.ts')
  const { BillingController } = await import('./BillingController.ts')
  const { AdminController } = await import('./AdminController.ts')
  const { Credit } = await import('../../Models/Credit.ts')
  const { sign } = await import('../../../lib/standard-webhooks.ts')
  const { db } = await import('../../../database/connection.ts')
  const { outgoingRequests, webhookEvents, adminActions } = await import('../../../database/schema.ts')
  const { eq, desc } = await import('drizzle-orm')
  const settle = () => new Promise((r) => setTimeout(r, 150))
  const rowsFor = (rid: string) => db.select().from(outgoingRequests).where(eq(outgoingRequests.requestId, rid)).orderBy(outgoingRequests.id)

  assert.deepEqual(['api.deepseek.com', 'generativelanguage.googleapis.com', 'api.anthropic.com', 'api.pexels.com', 'sandbox-api.polar.sh', 'oauth2.googleapis.com', 'example.org'].map(purposeOf), ['deepseek', 'gemini', 'anthropic', 'pexels', 'polar', 'google', 'other'])

  // A stub underneath: no network. The body is streamed in two chunks and must arrive unchanged.
  const seen: string[] = []
  const stub = (async (input: RequestInfo | URL) => {
    const u = String(input instanceof Request ? input.url : input)
    seen.push(u)
    if (u.includes('down.example')) throw new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED') })
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('data: one\n\n')); c.enqueue(new TextEncoder().encode('data: two\n\n')); c.close() } })
    return new Response(body, { status: u.includes('missing') ? 404 : 200, headers: u.includes('sized') ? { 'content-length': '22' } : {} })
  }) as typeof fetch
  const f = wrapFetch(stub)
  await RequestContext.run({ requestId: 'out-req' }, async () => {
    const r = await f('https://generativelanguage.googleapis.com/v1beta/models/x:generate?key=AIzaSECRET&alt=sse', { method: 'post', body: 'PROMPT-BODY', headers: { Authorization: 'Bearer SK-SECRET' } })
    assert.equal(await r.text(), 'data: one\n\ndata: two\n\n', 'a streamed body passes through unchanged')
    await f(new URL('https://api.pexels.com/v1/search?query=cats&sized=1'))
    await f('https://api.deepseek.com/missing')
    await assert.rejects(f('https://down.example/x'), /fetch failed/, 'a network error is thrown on, as it was')
    await f('http://localhost:3000/_serverFn/x')
    await f('http://127.0.0.1:5173/y')
  })
  assert.equal(seen.length, 6, 'every call reached the real fetch')
  await settle()
  const out = await rowsFor('out-req')
  assert.equal(out.length, 4, 'localhost calls are not recorded')
  // Inserts are fire-and-forget on a pool, so their order is not the calls' order.
  const [gem, pex, ds, down] = ['generativelanguage.googleapis.com', 'api.pexels.com', 'api.deepseek.com', 'down.example'].map((h) => out.find((o) => o.host === h))
  assert.deepEqual([gem!.host, gem!.method, gem!.path, gem!.query, gem!.status, gem!.purpose], ['generativelanguage.googleapis.com', 'POST', '/v1beta/models/x:generate', 'key=***&alt=sse', 200, 'gemini'], "Gemini's key is masked")
  assert.ok(gem!.ms >= 0 && Number.isInteger(gem!.ms))
  assert.ok(!JSON.stringify(out).includes('SECRET') && !JSON.stringify(out).includes('PROMPT-BODY'), 'no key, header or body is stored')
  assert.deepEqual([pex!.purpose, pex!.size, pex!.method], ['pexels', 22, 'GET'], 'size from content-length')
  assert.deepEqual([ds!.status, ds!.purpose], [404, 'deepseek'])
  assert.deepEqual([down!.status, down!.purpose], [null, 'other'])
  assert.match(down!.error ?? '', /fetch failed \(connect ECONNREFUSED\)/, 'a network error is recorded with its cause')

  // Filters and paging.
  const now = Math.floor(Date.now() / 1000)
  await db.insert(outgoingRequests).values(Array.from({ length: 55 }, (_, i) => ({ requestId: 'out-bulk', method: 'GET', host: 'api.pexels.com', path: `/p/${i}`, purpose: 'pexels', status: 200, ms: i * 100, createdAt: now - i })))
  await db.insert(outgoingRequests).values({ requestId: 'out-old', method: 'GET', host: 'old.example', path: '/', purpose: 'other', status: 200, ms: 1, createdAt: now - 8 * 86400 })
  const pexAll = await TelescopeService.outgoing({ purpose: 'pexels' })
  assert.deepEqual([pexAll.total, pexAll.rows.length, (await TelescopeService.outgoing({ purpose: 'pexels', page: 1 })).rows.length], [56, 50, 6], '50 a page')
  assert.deepEqual((await TelescopeService.outgoing({ status: 'error' })).rows.map((r) => r.host), ['down.example'], 'network errors')
  assert.equal((await TelescopeService.outgoing({ status: '4xx' })).total, 1)
  assert.equal((await TelescopeService.outgoing({ host: 'GOOGLEAPIS' })).total, 1, 'host contains, any case')
  assert.equal((await TelescopeService.outgoing({ purpose: 'pexels', slowMs: 5000 })).total, 5)
  assert.equal((await TelescopeService.outgoing({ from: now - 10, to: now + 10, purpose: 'pexels' })).total, 56 - 44, 'date range')
  assert.equal((await TelescopeService.request('out-req'))?.outgoing.length, 4, "a request's page lists its outgoing calls")
  await TelescopeService.cleanup()
  assert.equal((await rowsFor('out-old')).length, 0, 'retention: an old outgoing call is deleted')

  // Webhooks: unsigned → stored, not verified, no payload; signed → stored with payload and result.
  const secret = `whsec_${Buffer.from('obs12-test-secret').toString('base64')}`
  const realSecret = process.env.POLAR_WEBHOOK_SECRET
  process.env.POLAR_WEBHOOK_SECRET = secret
  try {
    const hook = (body: string, signed: boolean, id = `msg_${Math.random().toString(36).slice(2)}`) => {
      const ts = String(Math.floor(Date.now() / 1000))
      const headers: Record<string, string> = { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': signed ? `v1,${sign(secret, id, ts, body)}` : 'v1,forged' }
      return RequestContext.run({ requestId: 'wh-req' }, () => BillingController.receivePolar(new Request('http://x/api/polar-webhook', { method: 'POST', headers, body })))
    }
    const packPaid = (orderId: string) => JSON.stringify({ type: 'order.paid', data: { id: orderId, product: { metadata: { od: 'pack-500' } }, customer: { external_id: 'wh-payer' } } })
    const forged = await hook(packPaid('ord_forged'), false, 'msg_forged')
    assert.equal(forged.status, 403)
    const signed = await hook(packPaid('ord_wh1'), true, 'msg_signed')
    assert.deepEqual([signed.status, await signed.text()], [202, 'pack granted'])
    const junk = await hook('not json', true, 'msg_junk')
    assert.equal(junk.status, 400)
    await settle()
    const byId = async (id: string) => (await db.select().from(webhookEvents).where(eq(webhookEvents.eventId, id)))[0]!
    const f1 = await byId('msg_forged')
    assert.deepEqual([f1.verified, f1.payload, f1.result, f1.httpStatus, f1.eventType, f1.provider, f1.requestId], [false, null, 'invalid signature', 403, null, 'polar', 'wh-req'], 'unsigned: stored, no payload')
    const s1 = await byId('msg_signed')
    assert.deepEqual([s1.verified, s1.result, s1.httpStatus, s1.eventType], [true, 'pack granted', 202, 'order.paid'])
    assert.equal(JSON.parse(s1.payload!).data.id, 'ord_wh1', 'signed: the payload is stored')
    assert.deepEqual([(await byId('msg_junk')).result, (await byId('msg_junk')).payload], ['invalid body', null])
    assert.equal(await Credit.balance('wh-payer'), 500)

    // Replay: a stored verified event that was never applied grants once, then is a duplicate.
    const [stored] = await db.insert(webhookEvents).values({ provider: 'polar', eventType: 'order.paid', eventId: 'msg_replay', verified: true, result: 'error: db down', httpStatus: 500, payload: packPaid('ord_replay') }).returning()
    assert.deepEqual(await AdminController.replayWebhook('adm-wh', stored!.id), { result: 'pack granted' })
    assert.deepEqual(await AdminController.replayWebhook('adm-wh', stored!.id), { result: 'duplicate' }, 'the second replay grants nothing')
    assert.deepEqual(await AdminController.replayWebhook('adm-wh', s1.id), { result: 'duplicate' }, 'replaying an applied event grants nothing')
    assert.equal(await Credit.balance('wh-payer'), 1000, 'one pack per order, however often replayed')
    await assert.rejects(AdminController.replayWebhook('adm-wh', f1.id), /verified/, 'an unverified event cannot be replayed')
    const logged = await db.select().from(adminActions).where(eq(adminActions.adminId, 'adm-wh')).orderBy(desc(adminActions.createdAt))
    assert.equal(logged.filter((a) => a.action === 'replay-webhook').length, 3, 'each replay is in the admin log')

    // List filters and paging.
    await db.insert(webhookEvents).values(Array.from({ length: 52 }, (_, i) => ({ provider: 'polar', eventType: 'subscription.updated', eventId: `bulk-${i}`, verified: true, result: 'subscription saved', httpStatus: 202, payload: '{}' })))
    const list = await TelescopeService.webhooks({})
    assert.deepEqual([list.total, list.rows.length, (await TelescopeService.webhooks({ page: 1 })).rows.length], [56, 50, 6])
    assert.ok(!('payload' in list.rows[0]!) && list.rows[0]!.hasPayload === true, 'the list leaves payloads out')
    assert.deepEqual((await TelescopeService.webhooks({ verified: false })).rows.map((r) => r.eventId), ['msg_forged'])
    assert.equal((await TelescopeService.webhooks({ type: 'ORDER.' })).total, 2)
    assert.equal((await TelescopeService.webhooks({ result: 'invalid' })).total, 2)
    assert.equal((await TelescopeService.webhooks({ type: 'subscription', verified: true, result: 'saved' })).total, 52)
  } finally {
    if (realSecret === undefined) delete process.env.POLAR_WEBHOOK_SECRET
    else process.env.POLAR_WEBHOOK_SECRET = realSecret
  }
}

// DSH-04/08/11/12: dashboard cards count what is shown, point at the first screen, sort by last change
{
  const { UsageService } = await import('../../Services/UsageService.ts')
  const { swatchOf } = await import('../../Services/DesignSystemService.ts')
  await Project.create({ id: 'card-a', name: 'A', designSystem: 'minimal', device: 'mobile', userId: 'u2' })
  await Screen.create({ id: 'ca-1', projectId: 'card-a', name: 'First', prompt: 'p', html: '<html>1</html>', x: 0, y: 0 })
  await Screen.create({ id: 'ca-2', projectId: 'card-a', name: 'Failed', prompt: 'p', html: '', x: 0, y: 0 })
  await Screen.create({ id: 'ca-3', projectId: 'card-a', name: 'Gone', prompt: 'p', html: '<html>3</html>', x: 0, y: 0 })
  await Screen.delete('ca-3')
  await Message.add({ projectId: 'orphan-1', role: 'user', kind: 'plan', text: 'later change' })
  const cards = await Project.cardsForUser('u2')
  const a = cards.find((c) => c.id === 'card-a')!
  assert.equal(a.screenCount, 1, 'failed and deleted screens are not counted')
  assert.equal(a.coverId, 'ca-1', 'the cover is the first screen that shows something')
  assert.ok((await Promise.all(cards.map((c) => Project.find(c.id)))).every((p) => p!.userId === 'u2'), 'only this user’s projects')
  assert.ok((await Project.cardsForUser('nobody')).length === 0)
  await Project.setFavorite('card-a', true)
  assert.equal((await Project.cardsForUser('u2')).find((c) => c.id === 'card-a')!.favorite, true, 'a star is saved')
  assert.equal(typeof await UsageService.callsToday('u2'), 'number')
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
  await Project.create({ id: 'p-usage', name: 'U', designSystem: 'minimal', device: 'mobile' })
  const out = await UsageService.run({ userId: 'user-9', projectId: 'p-usage', actionId: 'act-1' }, () => post(GenerateController, { projectId: 'p-usage', prompt: 'a settings screen' }))
  assert.ok(!out.includes('GEN_ERROR'))
  const rows = (await db.select().from(llmCalls)).filter((r) => r.userId === 'user-9')
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
  // LLM-05: the call knows its model and its action, and the action's real cost is their sum.
  assert.deepEqual([rows[0].model, rows[0].actionId], ['deepseek-flash', 'act-1'])
  assert.deepEqual(await UsageService.actionCost('act-1'), { calls: 1, ok: 1, usd: rows[0].costUsd })
  assert.deepEqual(await UsageService.actionCost('no-such-action'), { calls: 0, ok: 0, usd: 0 })
  reply = () => new Response('down', { status: 500 })
  await UsageService.run({ userId: 'user-9' }, () => post(GenerateController, { projectId: 'p-usage', prompt: 'again' }))
  const failed = (await db.select().from(llmCalls)).filter((r) => r.userId === 'user-9' && !r.ok)
  assert.ok(failed.length === 1 && /DeepSeek 500/.test(failed[0].error ?? ''), 'a failed call is logged with its error')

  assert.equal(await UsageService.refusal('user-9'), null, 'under the limits')
  UsageService.begin('user-9')
  assert.equal((await UsageService.refusal('user-9'))?.status, 429, 'one generation at a time')
  UsageService.end('user-9')
  const limit = LIMITS.callsPerDay
  LIMITS.callsPerDay = 2
  assert.match((await UsageService.refusal('user-9'))?.message ?? '', /today’s generation limit/, 'the daily call limit')
  LIMITS.callsPerDay = limit
  const budget = LIMITS.dailyBudgetUsd
  LIMITS.dailyBudgetUsd = 0.001
  assert.equal((await UsageService.refusal('someone-else'))?.status, 503, 'the service-wide daily budget pauses everyone')
  LIMITS.dailyBudgetUsd = budget
  process.env.GENERATION_PAUSED = '1'
  assert.equal((await UsageService.refusal('someone-else'))?.status, 503, 'the stop switch')
  delete process.env.GENERATION_PAUSED
}

console.log('ok')
