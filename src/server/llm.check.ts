import assert from 'node:assert'
import { extractArtifact } from '../artifact.ts'
import { listDesignSystems, streamCompletion } from './llm.ts'
import { composeSystemPrompt } from './compose.ts'
import { parsePlan } from './planner.ts'
import { mapLimit } from './pool.ts'

const h = '<!doctype html><html><head><title>T</title></head></html>'
assert.deepEqual(extractArtifact(`<artifact title="Dash">${h}</artifact>`), { title: 'Dash', html: h })
assert.deepEqual(extractArtifact('Sure!\n```html\n' + h + '\n```'), { title: 'T', html: h })
assert.deepEqual(extractArtifact(`<artifact title="X">\n\`\`\`html\n${h}\n\`\`\`\n</artifact>`), { title: 'X', html: h })
assert.equal(extractArtifact(`<artifact title="Cut">${h.slice(0, 20)}`).html, h.slice(0, 20)) // partial stream
assert.ok(listDesignSystems().some((d) => d.id === 'minimal' && d.name === 'Minimal'))

// compose: skill body + only its requested craft files land in the prompt, DESIGN.md always does
const mobile = composeSystemPrompt('minimal', 'mobile')
assert.ok(mobile.includes('390px'), 'mobile skill body present')
assert.ok(mobile.includes('# Minimal'), 'DESIGN.md present')
assert.ok(mobile.includes('Anti-AI-slop'), 'requested craft file present')
assert.ok(mobile.includes('Animation'), 'mobile-only craft file present')
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

console.log('ok')
