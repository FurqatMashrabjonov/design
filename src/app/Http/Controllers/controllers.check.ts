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
for (const part of ['App: GoBite — Food delivery', 'Order summary, then a Place order bar.', 'SHELL CONTRACT', 'Pad Thai — price: $12.99', 'Screen to design: Cart'])
  assert.ok(brief.includes(part), `the retry is drawn from the stored spec with the app's context: "${part}"`)
assert.ok(/Other screens in this app: Home\n/.test(brief), 'a screen is not listed as its own sibling')
let cart = Screen.find('s-cart')!
assert.ok(cart.html.includes('<h1>Cart — GoBite</h1>') && cart.error === null, 'the slot is filled and the failure note cleared')
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
assert.equal(talk[1].text, 'Redrew “Cart — GoBite” from its plan.', 'the first draw of a failed screen has no previous design to mention')
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
assert.match(added.text, /^Added “Live Tracking — GoBite” under “Home”\.$/)
const addedId = parseMeta(added.meta).screens![0].id
assert.ok(Screen.find(addedId))
const removal = HistoryController.revertMessage({ projectId: 'p1', messageId: added.id })
assert.ok(!Screen.forProject('p1').some((s) => s.id === addedId), 'the added screen is gone from the project')
assert.ok(Screen.find(addedId)?.deletedAt, 'but its row is kept')
assert.equal(Message.find(removal)!.text, 'Removed “Live Tracking — GoBite”.')
// redo = revert the revert
const comeback = HistoryController.revertMessage({ projectId: 'p1', messageId: removal })
assert.ok(Screen.forProject('p1').some((s) => s.id === addedId), 'reverting the removal brings the screen back')
assert.equal(Message.find(comeback)!.text, 'Brought back “Live Tracking — GoBite”.')
assert.throws(() => HistoryController.revertMessage({ projectId: 'p1', messageId: removal }), /cannot be undone/, 'a revert is itself reverted once')
HistoryController.revertMessage({ projectId: 'p1', messageId: comeback })
assert.ok(!Screen.forProject('p1').some((s) => s.id === addedId), 'and removed again')
// redo of a content change
const cartVersions = ScreenVersion.count('s-cart')
const undoEdit = HistoryController.revertMessage({ projectId: 'p1', messageId: Message.forProject('p1').find((m) => m.kind === 'revert')!.id })
assert.equal(ScreenVersion.count('s-cart'), cartVersions + 1, 'reverting the first revert is itself a recorded change')
assert.match(Message.find(undoEdit)!.text, /^Applied that change again on “Cart — GoBite”\.$/)

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

console.log('ok')
