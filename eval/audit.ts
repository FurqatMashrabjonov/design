// Runs the render audit (lib/render-audit.ts) over a run's screens in headless Chrome at phone
// size and prints the findings per rule — how EYE-01/02 are measured.
// Run: node --import ./eval/alias-hook.mjs eval/audit.ts <run label> [--json]
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { AUDIT_SOURCE, parseAudit, type AuditFinding } from '../src/lib/render-audit.ts'

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const run = process.argv[2]
const tmp = mkdtempSync(join(tmpdir(), 'od-audit-'))

export function auditHtml(html: string): AuditFinding[] {
  const probe = `<script>window.addEventListener('load',function(){setTimeout(function(){var f=(function(){${AUDIT_SOURCE}})();var p=document.createElement('pre');p.id='od-audit';p.textContent=JSON.stringify(f);document.body.appendChild(p)},600)})</script>`
  const page = join(tmp, 'screen.html')
  writeFileSync(page, html.includes('</body>') ? html.replace('</body>', `${probe}</body>`) : html + probe)
  const dom = execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--window-size=390,844', '--virtual-time-budget=8000', '--dump-dom', pathToFileURL(page).href], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 })
  const json = dom.match(/<pre id="od-audit">([\s\S]*?)<\/pre>/)?.[1] ?? '[]'
  return parseAudit(JSON.parse(json.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')))
}

// Only when run directly; eval/fix-audit.ts imports auditHtml.
if (run && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = join('eval', 'out', run, 'screens')
  const byRule: Record<string, number> = {}
  let screens = 0, withFindings = 0
  const all: Record<string, AuditFinding[]> = {}
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    const findings = auditHtml(readFileSync(join(dir, f), 'utf8'))
    screens++
    if (findings.length) withFindings++
    for (const x of findings) byRule[x.rule] = (byRule[x.rule] ?? 0) + 1
    all[f] = findings
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(all, null, 2))
  console.log(JSON.stringify({ run, screens, cleanShare: Number(((screens - withFindings) / screens).toFixed(3)), byRule }))
}
