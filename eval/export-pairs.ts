// Writes every edit pair in a database as JSON lines (FB-02).
// Run: node --env-file-if-exists=.env --import ./eval/alias-hook.mjs eval/export-pairs.ts > pairs.jsonl (DATABASE_URL picks the database)
import { Project } from '../src/app/Models/Project.ts'
import { EditPairService } from '../src/app/Services/EditPairService.ts'

let n = 0
for (const p of await Project.all()) for (const pair of await EditPairService.forProject(p.id)) {
  process.stdout.write(JSON.stringify(pair) + '\n')
  n++
}
console.error(`${n} edit pairs`)
