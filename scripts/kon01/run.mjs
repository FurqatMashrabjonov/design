// KON-01 harness — node scripts/kon01/run.mjs <dir-of-jsx-files> [--dark] [--accent #hex] [--out dir]
// Compiles every *.jsx, renders each in a sandboxed frame, writes out/report.json, out/report.md and out/sheet.png.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, basename, resolve } from 'node:path'
import { compileScreen } from './compile.mjs'
import { serve, renderScreen, chrome } from './render.mjs'

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
if (!dir) { console.error('usage: node scripts/kon01/run.mjs <dir-of-jsx-files> [--dark] [--accent #hex] [--out dir]'); process.exit(1) }
const flag = (n) => { const i = args.indexOf(n); return i < 0 ? undefined : args[i + 1] }
const opts = { dark: args.includes('--dark'), accent: flag('--accent') || '#e0532f' }
const outDir = resolve(flag('--out') || join(dir, 'out'))
await mkdir(outDir, { recursive: true })

const files = (await readdir(dir)).filter((f) => f.endsWith('.jsx')).sort()
const server = await serve(outDir)
const rows = []
const CONC = 6
for (let i = 0; i < files.length; i += CONC) {
  await Promise.all(files.slice(i, i + CONC).map(async (f) => {
    const name = basename(f, '.jsx')
    const source = await readFile(join(dir, f), 'utf8')
    const c = await compileScreen(source)
    const row = { name, chars: source.length, compiled: c.ok, errors: c.errors, unknown: c.unknown, imports: c.imports, transformMs: c.ms.transform, cssMs: c.ms.css, jsBytes: Buffer.byteLength(c.js), cssBytes: Buffer.byteLength(c.css), rendered: false, painted: 0, consoleErrors: [] }
    if (c.ok) {
      const r = await renderScreen(outDir, server.port, name, c.js, c.css, opts)
      Object.assign(row, { rendered: r.rendered, painted: r.painted, consoleErrors: r.errors })
    }
    rows.push(row)
    console.log(`${row.compiled ? (row.rendered ? 'OK  ' : 'FAIL') : 'ERR '} ${name.padEnd(14)} ${row.chars} chars  jsx ${row.transformMs} ms  css ${row.cssMs} ms / ${row.cssBytes} B${row.errors.concat(row.consoleErrors).map((e) => `\n      ${e}`).join('')}`)
  }))
}
rows.sort((a, b) => files.indexOf(a.name + '.jsx') - files.indexOf(b.name + '.jsx'))

// Contact sheet: 6 per row, 390×844 each, labelled — Chrome lays it out, no image library.
const ok = rows.filter((r) => r.rendered)
if (ok.length) {
  const per = 6, cols = Math.min(per, ok.length), rowsN = Math.ceil(ok.length / per), gap = 16, label = 36
  const sw = cols * 390 + (cols + 1) * gap, sh = rowsN * (844 + label) + (rowsN + 1) * gap
  await writeFile(join(outDir, 'sheet.html'), `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:${gap}px;background:#1c1b1a;display:grid;grid-template-columns:repeat(${cols},390px);gap:${gap}px;font:14px/${label}px -apple-system,system-ui,sans-serif;color:#f2efe9}figure{margin:0;width:390px}img{display:block;width:390px;height:844px;border-radius:24px}figcaption{text-align:center;height:${label}px}</style>${ok.map((r) => `<figure><img src="/${r.name}.png"><figcaption>${r.name}</figcaption></figure>`).join('')}`)
  await chrome([`--window-size=${sw},${sh}`, `--screenshot=${join(outDir, 'sheet.png')}`, `http://127.0.0.1:${server.port}/sheet.html`])
}
server.close()

const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const totals = { screens: rows.length, compiled: rows.filter((r) => r.compiled).length, rendered: ok.length, medianTransformMs: med(rows.map((r) => r.transformMs)), medianCssMs: med(rows.map((r) => r.cssMs)), medianChars: med(rows.map((r) => r.chars)), medianCssBytes: med(rows.map((r) => r.cssBytes)) }
await writeFile(join(outDir, 'report.json'), JSON.stringify({ opts, totals, screens: rows }, null, 2))
const used = {}
for (const r of rows) for (const [spec, names] of Object.entries(r.imports)) for (const n of names) used[`${spec}:${n}`] = (used[`${spec}:${n}`] || 0) + 1
const md = [
  `# KON-01 harness report`, ``,
  `${totals.compiled}/${totals.screens} compiled, ${totals.rendered}/${totals.screens} rendered · median JSX→JS ${totals.medianTransformMs} ms · median CSS ${totals.medianCssMs} ms / ${totals.medianCssBytes} B · median source ${totals.medianChars} chars · ${opts.dark ? 'dark' : 'light'}, accent ${opts.accent}`, ``,
  `| screen | chars | compile | jsx ms | css ms | css B | js B | rendered | painted | errors |`, `|---|---|---|---|---|---|---|---|---|---|`,
  ...rows.map((r) => `| ${r.name} | ${r.chars} | ${r.compiled ? 'ok' : 'ERR'} | ${r.transformMs} | ${r.cssMs} | ${r.cssBytes} | ${r.jsBytes} | ${r.rendered ? 'ok' : 'NO'} | ${r.painted} | ${[...r.errors, ...r.consoleErrors].join('; ').replace(/\|/g, '\\|').slice(0, 200)} |`),
  ``, `## Components used (import name: screens)`, ``,
  Object.entries(used).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '),
].join('\n')
await writeFile(join(outDir, 'report.md'), md)
console.log(`\n${totals.compiled}/${totals.screens} compiled · ${totals.rendered}/${totals.screens} rendered · median jsx ${totals.medianTransformMs} ms, css ${totals.medianCssMs} ms → ${outDir}/report.md`)
