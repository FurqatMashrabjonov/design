// Run with the alias hook and a throwaway database (see package.json "check"). DeepSeek is a stub.
import assert from 'node:assert'

delete process.env.PEXELS_API_KEY // image slots must not reach the network from a test
process.env.DEEPSEEK_API_KEY = 'test-key'
const { Project } = await import('../../Models/Project.ts')
const { Screen } = await import('../../Models/Screen.ts')
const { ScreenVersion } = await import('../../Models/ScreenVersion.ts')
const { GenerateController } = await import('./GenerateController.ts')
const { PlanController } = await import('./PlanController.ts')

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

console.log('ok')
