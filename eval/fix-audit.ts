// EYE-02 measurement: audit a run's screens, fix each one's findings with one edit call through
// the real GenerateController, audit again. Works on a copy of the run's database.
// Run: DB_PATH=<copy of eval.db> [LLM_PROVIDER=claude-cli] node --import ./eval/alias-hook.mjs eval/fix-audit.ts [--limit n]
import { Screen } from '../src/app/Models/Screen.ts'
import { Project } from '../src/app/Models/Project.ts'
import { GenerateController } from '../src/app/Http/Controllers/GenerateController.ts'
import { auditHtml } from './audit.ts'

const limit = Number(process.argv[process.argv.indexOf('--limit') + 1]) || 6
const rows = Project.all().flatMap((p) => Screen.forProject(p.id).filter((s) => s.html).map((s) => ({ p, s })))
let before = 0, after = 0, fixed = 0, tried = 0, clean = 0
for (const { p, s } of rows) {
  if (tried >= limit) break
  const findings = auditHtml(s.html)
  if (!findings.some((f) => f.id)) continue
  tried++
  const res = await GenerateController.stream(new Request('http://eval/api', { method: 'POST', body: JSON.stringify({ projectId: p.id, editScreenId: s.id, prompt: '', fixFindings: findings }) }))
  await res.text()
  const now = Screen.find(s.id)!
  const again = auditHtml(now.html)
  before += findings.length
  after += again.length
  if (now.html !== s.html) fixed++
  if (!again.length) clean++
  console.log(`${s.name.slice(0, 32).padEnd(32)} ${findings.length} → ${again.length}  ${[...new Set(again.map((f) => f.rule))].join(', ')}`)
}
console.log(JSON.stringify({ screens: tried, changed: fixed, findingsBefore: before, findingsAfter: after, cleanAfter: clean }))
