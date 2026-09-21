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
assert.ok(DesignSystemService.list().some((d) => d.id === 'minimal' && d.name === 'Minimal'))
assert.ok(DesignSystemService.exists('minimal'))
assert.ok(!DesignSystemService.exists('../../etc'))

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
