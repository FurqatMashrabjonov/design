// GQ-08: the visual judge, pointed at canvas projects instead of an eval run. The "make habit
// tracker" iterations live in data.db as ordinary projects, and a before/after on them is the
// question the whole craft layer was built to answer — so the same rubric scores them, and
// --vs asks which of two projects is the better app, in random order so the judge cannot favour
// a side.
//
//   node --import ./eval/alias-hook.mjs eval/judge-project.ts <projectId> [<projectId>…] [--vs a,b] [--concurrency 2]
//
// Local only, on the developer's Claude Code login. Screenshots and scores go to eval/out/projects/<id>/.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import Database from 'better-sqlite3'
import { applyThemeOverride, parseTheme } from '../src/lib/theme-override.ts'
import { normalizeScreen } from '../src/lib/screen-normalizer.ts'
import { DesignSystemService } from '../src/app/Services/DesignSystemService.ts'
import { KitService } from '../src/app/Services/KitService.ts'
import { navClearance } from '../src/app/Services/ShellService.ts'
import { navStyleFor, parseNavigation, shellPartsFor, type ScreenSlot } from '../src/app/Services/ScreenContext.ts'
import { RUBRIC, PAIRWISE, ask, parseJudgement } from './judge.ts'

// A screenshot catches a page mid-entrance: the first judge run scored an Achievements grid at
// "near-zero opacity" and a Settings section "faded out as if mid-animation" — the model's own
// entrance animation, frozen by the virtual clock. The judge should see the settled page.
const FREEZE = '<style data-od-judge>*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}</style>'

/** Today's shell, kit and tokens re-applied over the stored screen, so a craft fix can be judged without regenerating. */
function renormalize(p: Row, s: ScreenRow & { screen_type: string; active_tab_id: string | null; parent_screen_name: string | null }): string {
  const nav = parseNavigation((db.prepare('SELECT navigation, plan FROM projects WHERE id = ?').get(p.id) as { navigation: string | null }).navigation)
  if (!nav) return s.html
  const plan = JSON.parse((db.prepare('SELECT plan FROM projects WHERE id = ?').get(p.id) as { plan: string | null }).plan ?? '{}')
  const bar = navStyleFor(p.name, nav, { appType: plan.appType, designSystem: p.design_system })
  const slot: ScreenSlot = { name: s.name, screenType: s.screen_type as ScreenSlot['screenType'], activeTabId: s.active_tab_id ?? undefined, parentScreen: s.parent_screen_name ?? undefined }
  return normalizeScreen(s.html, { tokensCss: DesignSystemService.readTokensRoot(p.design_system), fontUrls: DesignSystemService.readFontUrls(p.design_system), iconStroke: DesignSystemService.readIconStroke(p.design_system), shell: shellPartsFor(slot, nav, s.name, bar), navClearance: navClearance(bar), kitCss: KitService.css() })
}

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = resolve('eval/out/projects')
const db = new Database(process.env.DB_PATH || 'data.db', { readonly: true })

type Row = { id: string; name: string; design_system: string; theme: string | null; palette: string | null }
type ScreenRow = { name: string; html: string }
type Score = { file: string; hierarchy: number; spacing: number; polish: number; fidelity: number; overall: number; issues: string[] }
type Verdict = { screens: Score[]; coherence: number; app_overall: number }

function shoot(p: Row, renorm = false): string[] {
  const dir = join(OUT, renorm ? `${p.id}-rn` : p.id)
  mkdirSync(dir, { recursive: true })
  const theme = parseTheme(p.theme)
  const screens = db.prepare('SELECT name, html, screen_type, active_tab_id, parent_screen_name FROM screens WHERE project_id = ? AND deleted_at IS NULL ORDER BY x').all(p.id) as (ScreenRow & { screen_type: string; active_tab_id: string | null; parent_screen_name: string | null })[]
  return screens.map((s, i) => {
    const base = `screen-${i}`
    const png = join(dir, `${base}.png`)
    if (!existsSync(png)) {
      const html = applyThemeOverride(renorm ? renormalize(p, s) : s.html, theme)
      writeFileSync(join(dir, `${base}.html`), /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${FREEZE}</head>`) : FREEZE + html)
      // Headless Chrome on macOS will not open a window narrower than 500px: frame the 390px screen.
      writeFileSync(join(dir, `${base}.frame.html`), `<body style="margin:0;background:#d9d9de"><iframe src="${base}.html" sandbox="allow-scripts" style="display:block;margin:0 auto;width:390px;height:844px;border:0;background:#fff"></iframe></body>`)
      execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--window-size=500,844', '--virtual-time-budget=10000', `--screenshot=${png}`, pathToFileURL(join(dir, `${base}.frame.html`)).href], { stdio: 'ignore', timeout: 60000 })
    }
    return png
  })
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0)

async function judge(p: Row, shots: string[]) {
  const brief = 'make habit tracker'
  const prompt = `Brief: ${brief}\n\nRead each screenshot below (one phone screen each, on a grey canvas — ignore the canvas), then score them.\n${shots.map((s) => `- ${s}`).join('\n')}`
  const v = parseJudgement<Verdict>(await ask(RUBRIC, prompt, join(OUT, p.id)).catch((e) => (console.warn(`${p.name}: ${e.message}`), '')))
  if (!v) return null
  const overall = mean(v.screens.map((s) => s.overall))
  const report = { id: p.id, name: p.name, system: p.design_system, overall, coherence: v.coherence, app_overall: v.app_overall, hierarchy: mean(v.screens.map((s) => s.hierarchy)), spacing: mean(v.screens.map((s) => s.spacing)), polish: mean(v.screens.map((s) => s.polish)), fidelity: mean(v.screens.map((s) => s.fidelity)), screens: v.screens }
  writeFileSync(join(OUT, p.id, 'judge.json'), JSON.stringify(report, null, 2))
  return report
}

async function main() {
  const { values: args, positionals } = parseArgs({ allowPositionals: true, options: { vs: { type: 'string' }, concurrency: { type: 'string', default: '2' }, renormalize: { type: 'boolean', default: false } } })
  const ids = positionals
  const rows = ids.map((id) => db.prepare('SELECT id, name, design_system, theme, palette FROM projects WHERE id = ?').get(id) as Row | undefined).filter((r): r is Row => !!r)
  // With --renormalize each project is judged as today's shell/kit/tokens would render it; its
  // report goes to <id>-rn so the stored-HTML score stays beside it for comparison.
  const taken = rows.map((r) => [r.id, shoot(r, args.renormalize)] as const)
  if (args.renormalize) for (const r of rows) r.id = `${r.id}-rn`
  const shots = new Map(taken.map(([id, s]) => [args.renormalize ? `${id}-rn` : id, s]))
  // --vs may name a project judged earlier (its shots are on disk), so a renormalised run can be
  // set against the stored-HTML baseline.
  const shotsFor = (id: string): string[] | undefined => {
    if (shots.has(id)) return shots.get(id)
    const dir = join(OUT, id)
    if (!existsSync(dir)) return undefined
    const pngs = readdirSync(dir).filter((f) => /^screen-\d+\.png$/.test(f)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0])).map((f) => join(dir, f))
    return pngs.length ? pngs : undefined
  }
  const n = Number(args.concurrency)
  const reports: (Awaited<ReturnType<typeof judge>> | null)[] = []
  for (let i = 0; i < rows.length; i += n) reports.push(...(await Promise.all(rows.slice(i, i + n).map((r) => judge(r, shots.get(r.id)!)))))
  for (const r of reports) {
    if (!r) continue
    console.log(`${r.name.padEnd(12)} ${r.system.padEnd(8)} overall ${r.overall.toFixed(2)} | hierarchy ${r.hierarchy} spacing ${r.spacing} polish ${r.polish} fidelity ${r.fidelity} | coherence ${r.coherence} app ${r.app_overall}`)
    for (const s of r.screens) console.log(`   ${String(s.overall).padStart(2)} ${s.file.split('/').pop()}  ${s.issues.slice(0, 2).join(' · ')}`)
  }
  if (args.vs) {
    const [a, b] = args.vs.split(',')
    const sa = a && shotsFor(a)
    const sb = b && shotsFor(b)
    if (a && b && sa && sb) {
      // Random order: the judge must not learn that "A" is the newer run.
      const flip = Math.random() < 0.5
      const [first, second] = flip ? [b, a] : [a, b]
      const prompt = `Brief: make habit tracker\n\nSet A (read each):\n${shotsFor(first)!.map((p) => `- ${p}`).join('\n')}\n\nSet B (read each):\n${shotsFor(second)!.map((p) => `- ${p}`).join('\n')}`
      const v = parseJudgement<{ winner: string; margin: string; reason: string }>(await ask(PAIRWISE, prompt, OUT).catch(() => ''))
      if (v) {
        const winner = v.winner === 'tie' ? 'tie' : (v.winner === 'A') === !flip ? a : b
        console.log(`\nPAIRWISE ${a.slice(0, 8)} vs ${b.slice(0, 8)}: winner ${winner === 'tie' ? 'tie' : winner.slice(0, 8)} (${v.margin}) — ${v.reason}`)
        writeFileSync(join(OUT, `pairwise-${a.slice(0, 8)}-${b.slice(0, 8)}.json`), JSON.stringify({ a, b, ...v, winner }, null, 2))
      }
    }
  }
}

await main()
