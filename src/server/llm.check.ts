import assert from 'node:assert'
import { extractArtifact } from '../artifact.ts'
import { listDesignSystems, streamCompletion } from './llm.ts'
import { composeSystemPrompt } from './compose.ts'

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

console.log('ok')
