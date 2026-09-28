// KON-01 probe: ask the local Claude Code login (Haiku, no DeepSeek) to write Vita's screens as Konsta
// JSX, with the skill + Konsta reference + kit reference as the system prompt and one neutral exemplar.
//   node scripts/kon01/generate.mjs [--model claude-haiku-4-5-20251001] [--only today,habits] [--out inputs/model]
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d }
const MODEL = arg('--model', process.env.CLAUDE_CLI_MODEL || 'claude-haiku-4-5-20251001')
const OUT = join(ROOT, 'scripts/kon01', arg('--out', 'inputs/model'))
const ONLY = arg('--only', '')?.split(',').filter(Boolean)
mkdirSync(OUT, { recursive: true })

const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const SYSTEM = [read('skills/mobile-screen-jsx/SKILL.md').replace(/^---[\s\S]*?---\n/, ''), '', read('konsta/KIT.md'), '', read('konsta/REFERENCE.md')].join('\n')
const EXEMPLAR = read('scripts/kon01/inputs/exemplar/list-reading.jsx')

// The app: Vita, as the planner would hand it over (data from prototypes/vita-konsta/src/store.jsx, no emoji).
const APP = `App: Vita — habits, steps and water in one place.
Accent: indigo (the host sets --color-primary). Date: Sunday, September 27.
Screens in this app (id — name — kind): today — Today — tab; habits — Habits — tab; insights — Insights — tab; profile — Profile — tab; habit — Habit detail — pushed from habits (params: id); add-habit — New habit — modal from habits; steps — Steps — pushed from today; water — Water — pushed from today; settings — Settings — pushed from profile; inbox — Activity — pushed from today.
Tab ids for AppTabbar: today, habits, insights, profile.

# APP DATA — the only source for these things
User: Aziza Karimova, aziza@vita.app, Tashkent, joined March 2026, avatar colour #ff9f0a
Steps: today 7,843 of 10,000 goal; week Mon–Sun 6210, 9120, 10432, 5480, 11206, 8120, 7843; 5.8 km; 312 kcal; 64 min
Water: 1,500 ml of 2,500 ml; log 07:40 250 ml, 09:15 500 ml, 12:30 250 ml, 15:05 500 ml
Metric colours: steps #ff9f0a, water #0a84ff, habits #30d158, sleep #5e5ce6, mind #bf5af2, pink #ff375f
Habits (name — goal — done/total today — streak — best — part — week Mon–Sun — colour):
- Meditate — 10 min — 1/1 — 41 — 41 — Morning — 1,1,1,1,1,1,1 — #bf5af2
- Morning run — 5 km — 1/1 — 23 — 31 — Morning — 1,1,0,1,1,1,1 — #ff375f
- Vitamins — 1 time — 0/1 — 12 — 20 — Morning — 1,1,1,0,1,1,0 — #ff9f0a
- Read — 20 pages — 12/20 — 8 — 19 — Evening — 1,0,1,1,1,0,0 — #5e5ce6
- Journal — 1 entry — 0/1 — 3 — 14 — Evening — 0,1,1,0,0,1,0 — #0a84ff
- No sugar — all day — 0/1 — 5 — 9 — Anytime — 1,1,1,1,1,0,0 — #30d158
Activity inbox: "41-day streak!" — Meditate is your longest streak yet. Keep it going. — 8m; "Time for water" — You are 1,000 ml away from today's goal. — 1h; "New award: Early Bird" — Five morning runs before 7 AM this month. — Yesterday; "Weekly summary is ready" — You completed 86% of your habits — up 9% from last week. — Mon
Settings: reminders on, daily summary on, streak alerts on, sound off, units metric, week starts Monday, dark mode off, accent Indigo (choices Indigo, Blue, Green, Orange, Pink, Purple); premium: no`

const SCREENS = {
  today: { name: 'Today', kind: 'tab (active tab: today)', spec: 'The dashboard. Greeting with the user\'s first name and the date; a summary card leading with three nested rings (steps, water, habits done) and the three figures beside them; a row of today\'s habits with a check to complete each (two already done); quick links to Steps and Water. Bell in the navbar opens inbox.' },
  habits: { name: 'Habits', kind: 'tab (active tab: habits)', spec: 'All habits grouped by part of day (Morning, Evening, Anytime) as inset lists; a segmented filter All/Morning/Evening/Anytime; each row: name, goal, a small ring of today\'s progress, streak with a flame. Plus in the navbar opens add-habit; a row opens habit with its id.' },
  habit: { name: 'Habit detail', kind: 'pushed (back to habits); params: id = "meditate"', spec: 'Meditate: a large ring of today\'s progress with the streak figure, best streak, a 12-week completion grid (7 columns), a reminder toggle (on, 07:30), the one primary action "Mark as done" (already done today, so it reads "Done today" disabled) and a quiet "Edit" in the navbar.' },
  'add-habit': { name: 'New habit', kind: 'modal (Cancel pops back to habits)', spec: 'A form: name field, goal (amount + unit), part of day as a segmented control, colour choice from the metric colours, reminder toggle with a time, and a bottom "Create habit" button. Realistic filled-in state for a new habit "Stretch".' },
  steps: { name: 'Steps', kind: 'pushed (back to today)', spec: 'Today\'s steps as the hero figure with the goal under it, a ring, then a bars chart of the week with the goal line, then three tiles: distance, kcal, active minutes. A quiet note on the best day.' },
  water: { name: 'Water', kind: 'pushed (back to today)', spec: 'The water glass filling to today\'s level with the figure "1,500 / 2,500 ml", two buttons +250 ml and +500 ml (the one primary action is the +250), then today\'s log as a list with times.' },
  insights: { name: 'Insights', kind: 'tab (active tab: insights)', spec: 'Week overview: a segmented Week/Month/Year; a card with completion rate 86% and the change vs last week; an area trend of the week; per-habit rows with a small week strip of 7 dots; a "Best streak" callout for Meditate.' },
  profile: { name: 'Profile', kind: 'tab (active tab: profile)', spec: 'Avatar, name, city and joined date; three stats (day streak 41, habits 6, awards 3); inset lists of rows: Awards, Settings (opens settings), Notifications, Appearance, Premium (with a small badge), Help; a quiet Sign out.' },
  settings: { name: 'Settings', kind: 'pushed (back to profile)', spec: 'Grouped inset lists with toggles for reminders, daily summary, streak alerts, sound; rows for units (Metric), week starts (Monday), appearance (Light, Indigo); a danger row "Delete account" in its own group at the end; version footer.' },
}

const brief = (id, s) => `${APP}

# THIS SCREEN
Screen id: ${id} — ${s.name} — ${s.kind}
${s.spec}

# A finished screen from a different app, at the quality bar
Copy its build, its restraint and how it uses Konsta and the kit — never its words or data.
\`\`\`jsx
${EXEMPLAR}
\`\`\`

Write the ${s.name} screen of Vita now.`

function ask(user) {
  const args = ['-p', '--output-format', 'json', '--tools', '', '--system-prompt', SYSTEM, '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence', '--disable-slash-commands', '--model', MODEL]
  const { ANTHROPIC_API_KEY: _k, ...rest } = process.env
  return new Promise((ok, fail) => {
    const t0 = Date.now()
    const child = spawn(process.env.CLAUDE_CLI_BIN || 'claude', args, { cwd: tmpdir(), env: { ...rest, MAX_THINKING_TOKENS: '0' }, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '', err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', fail)
    child.on('close', () => {
      try { const j = JSON.parse(out); ok({ text: String(j.result ?? ''), usage: j.usage ?? {}, ms: Date.now() - t0, cost: j.total_cost_usd }) } catch { fail(new Error(`claude: ${err.slice(0, 200)} ${out.slice(0, 200)}`)) }
    })
    child.stdin.end(user)
  })
}

const extract = (text) => (text.match(/```(?:jsx|tsx|js)?\s*\n([\s\S]*?)```/) ?? [null, text])[1].trim() + '\n'

const ids = Object.keys(SCREENS).filter((id) => !ONLY?.length || ONLY.includes(id))
const report = []
const queue = [...ids]
async function worker() {
  for (let id = queue.shift(); id; id = queue.shift()) {
    try {
      const r = await ask(brief(id, SCREENS[id]))
      const jsx = extract(r.text)
      writeFileSync(join(OUT, `${id}.jsx`), jsx)
      const row = { id, chars: jsx.length, out: r.usage.output_tokens, in: r.usage.input_tokens, cacheRead: r.usage.cache_read_input_tokens, ms: r.ms }
      report.push(row); console.log(JSON.stringify(row))
    } catch (e) { report.push({ id, error: String(e.message) }); console.error(id, e.message) }
  }
}
await Promise.all([worker(), worker(), worker()])
writeFileSync(join(OUT, 'generate.json'), JSON.stringify({ model: MODEL, systemChars: SYSTEM.length, screens: report }, null, 2))
const ok = report.filter((r) => !r.error)
console.log(`${ok.length}/${report.length} written · median out tokens ${[...ok].sort((a, b) => a.out - b.out)[Math.floor(ok.length / 2)]?.out} · median chars ${[...ok].sort((a, b) => a.chars - b.chars)[Math.floor(ok.length / 2)]?.chars} · system ${SYSTEM.length} chars`)
