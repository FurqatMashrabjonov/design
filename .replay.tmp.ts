import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { auditHtml } from './eval/audit.ts'
import { autofixScreen } from './src/lib/design-lint.ts'
const [dir, out] = process.argv.slice(2); mkdirSync(out, { recursive: true })
const count = (fs: { rule: string }[]) => fs.reduce((m, f) => (m[f.rule] = (m[f.rule] ?? 0) + 1, m), {} as Record<string, number>)
let before: any[] = [], after: any[] = [], clean0 = 0, clean1 = 0, n = 0
for (const f of readdirSync(dir).filter((x) => x.endsWith('.html')).sort()) {
  const h = readFileSync(`${dir}/${f}`, 'utf8'); n++
  const fixed = autofixScreen(h.replace(/<style data-od-craft>[\s\S]*?<\/style>/, ''))
  writeFileSync(`${out}/${f}`, fixed)
  const a = auditHtml(h), b = auditHtml(fixed)
  before.push(...a); after.push(...b); clean0 += +!a.length; clean1 += +!b.length
  if (a.length !== b.length) console.log(f, a.map((x) => x.rule).join(','), '→', b.map((x) => x.rule).join(',') || 'clean')
}
console.log(`clean ${clean0}/${n} → ${clean1}/${n}`, JSON.stringify(count(before)), '→', JSON.stringify(count(after)))
