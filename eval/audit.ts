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

// A phone is 390px wide, and headless Chrome will not open a window narrower than 500 — so a
// --window-size of 390 silently laid the page out at 500 and the audit measured a width no user
// has. The screen is framed in a 390px iframe inside a wider host, which gives it a real 390px
// viewport; the probe runs inside the screen as before and the host copies its result out
// (--allow-file-access-from-files makes the two same-origin).
const PHONE_W = 390, PHONE_H = 844
export function auditHtml(html: string): AuditFinding[] {
  const probe = `<script>window.addEventListener('load',function(){setTimeout(function(){var f=(function(){${AUDIT_SOURCE}})();var p=document.createElement('pre');p.id='od-audit';p.textContent=JSON.stringify(f);document.body.appendChild(p)},600)})</script>`
  const page = join(tmp, 'screen.html')
  writeFileSync(page, html.includes('</body>') ? html.replace('</body>', `${probe}</body>`) : html + probe)
  const host = join(tmp, 'host.html')
  writeFileSync(host, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}iframe{width:${PHONE_W}px;height:${PHONE_H}px;border:0;display:block}</style><iframe src="screen.html"></iframe><script>var t=0;(function poll(){t++;var d=document.querySelector('iframe').contentDocument,r=d&&d.getElementById('od-audit');if(r||t>120){var p=document.createElement('pre');p.id='od-audit-out';p.textContent=r?r.textContent:'';document.body.appendChild(p);return}setTimeout(poll,100)})()</script>`)
  const dom = execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', `--window-size=${PHONE_W + 140},${PHONE_H}`, '--virtual-time-budget=20000', '--dump-dom', pathToFileURL(host).href], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 })
  // A probe that fails to run would report a perfectly clean screen. Nothing about this measurement
  // may fail quietly: no element means the page never reached the probe, which is an error, not a pass.
  const raw = dom.match(/<pre id="od-audit-out">([\s\S]*?)<\/pre>/)
  if (!raw) throw new Error('audit: the probe never reported — the screen did not load')
  const json = raw[1]!.trim()
  if (!json) throw new Error('audit: the probe reported nothing — it did not finish inside the frame')
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
