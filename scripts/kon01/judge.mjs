// KON-01 judge: rubric scores per folder of PNGs and pairwise verdicts between folders, asked in both
// orders (only agreeing verdicts count — eval/judge.ts's rule). Runs on the local Claude Code login.
//   node --import ./scripts/alias-hook.mjs scripts/kon01/judge.mjs --brief "…" A=path/to/pngs B=path/to/pngs [C=…]
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ask, parseJudgement, PAIRWISE, RUBRIC } from '../../eval/judge.ts'

const args = process.argv.slice(2)
const brief = args[args.indexOf('--brief') + 1]
const sets = Object.fromEntries(args.filter((a) => /^[A-Z]=/.test(a)).map((a) => [a[0], resolve(a.slice(2))]))
const shots = (dir) => readdirSync(dir).filter((f) => f.endsWith('.png') && !f.startsWith('sheet')).sort().map((f) => resolve(dir, f))
const list = (ps) => ps.map((p) => `- ${p}`).join('\n')

const scores = {}
for (const [k, dir] of Object.entries(sets)) {
  const ps = shots(dir)
  const text = await ask(RUBRIC, `Brief: ${brief}\n\nRead each screenshot below (one phone screen each), then score them.\n${list(ps)}`, dir)
  const j = parseJudgement(text)
  const mean = (f) => j ? +(j.screens.reduce((a, s) => a + (s[f] ?? 0), 0) / j.screens.length).toFixed(2) : null
  scores[k] = j ? { app_overall: j.app_overall, coherence: j.coherence, overall: mean('overall'), polish: mean('polish'), hierarchy: mean('hierarchy'), spacing: mean('spacing'), fidelity: mean('fidelity'), issues: j.screens.flatMap((s) => s.issues.map((i) => `${s.file.split('/').pop()}: ${i}`)).slice(0, 12) } : { error: text.slice(0, 200) }
  console.log(k, JSON.stringify({ ...scores[k], issues: undefined }))
}
const keys = Object.keys(sets)
const pairs = []
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  const [x, y] = [keys[i], keys[j]]
  const verdict = async (a, b) => parseJudgement(await ask(PAIRWISE, `Brief: ${brief}\n\nSet A:\n${list(shots(sets[a]))}\n\nSet B:\n${list(shots(sets[b]))}`, sets[a]))
  const [v1, v2] = await Promise.all([verdict(x, y), verdict(y, x)])
  const w1 = v1?.winner === 'A' ? x : v1?.winner === 'B' ? y : 'tie'
  const w2 = v2?.winner === 'A' ? y : v2?.winner === 'B' ? x : 'tie'
  const agreed = w1 === w2 ? w1 : 'disagree'
  pairs.push({ pair: `${x} vs ${y}`, agreed, order1: { winner: w1, margin: v1?.margin, reason: v1?.reason }, order2: { winner: w2, margin: v2?.margin, reason: v2?.reason } })
  console.log(`${x} vs ${y}: ${agreed}  (${w1} ${v1?.margin ?? ''} / ${w2} ${v2?.margin ?? ''})`)
}
console.log(JSON.stringify({ scores, pairs }, null, 2))
