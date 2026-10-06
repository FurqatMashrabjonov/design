// KIT-20: the component gallery harness — hand-written blocks are shot and bundled here for review before they join the kit.
//   shot <file.jsx> <outdir>          compile + render check + PNGs (iOS light, iOS dark, Material light)
//   html <out.html> <a.jsx> <b.jsx>…  one self-contained, clickable HTML file (each file = one tab)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename } from 'node:path'
import { compileScreen } from '@/app/Services/ScreenCompiler'
import { auditScreen, screenshotScreen } from '@/app/Services/RenderAudit'
import { exportHtml } from '@/app/Services/ExportService'
import { resolvePhotos } from '@/app/Services/PhotoService'
const [cmd, out, ...files] = process.argv.slice(2)
const ICONS = ['Calendar', 'Layers', 'Users', 'Keyboard', 'Star', 'Grid2x2']
const slugOf = (f: string) => basename(f, '.jsx')
const tabs = (cmd === 'html' ? files : [out!]).map((f, i) => ({ id: slugOf(f), label: slugOf(f).replace(/^\w/, (c) => c.toUpperCase()), icon: ICONS[i % ICONS.length] }))
const look = { accent: '#5e5ce6', dark: false, platform: 'ios', style: 'clean', tabs } as any
if (cmd === 'shot') {
  const file = out!, dir = files[0]!
  mkdirSync(dir, { recursive: true })
  const src = readFileSync(file, 'utf8')
  const c = await compileScreen(src)
  if (!c.ok) { console.log('BUILD FAILED:\n' + c.errors.join('\n')); process.exit(1) }
  const found = await auditScreen(src, look, slugOf(file))
  console.log('built · render check:', found?.length ? found.map((f: any) => `${f.kind ?? f.rule}: ${f.text ?? f.message ?? ''}`.slice(0, 120)).join(' | ') : 'clean')
  for (const [tag, l] of [['ios', look], ['ios-dark', { ...look, dark: true }], ['material', { ...look, platform: 'material' }]] as const) {
    const png = await screenshotScreen(src, l, slugOf(file))
    if (png) { writeFileSync(`${dir}/${slugOf(file)}-${tag}.png`, png); console.log(`${dir}/${slugOf(file)}-${tag}.png`) }
  }
} else if (cmd === 'html') {
  for (const f of files) await resolvePhotos(readFileSync(f, 'utf8')).catch(() => {}) // the HTML carries real photos
  const rows = files.map((f, i) => ({ id: `g${i}`, slug: slugOf(f), name: tabs[i]!.label, html: readFileSync(f, 'utf8'), x: i * 450, y: 0, screenType: 'tab', activeTabId: slugOf(f) }))
  const html = await exportHtml({ name: 'Kit gallery', theme: JSON.stringify({ accent: '#5e5ce6', dark: false, platform: 'ios', style: 'clean' }), navigation: JSON.stringify({ tabs }), plan: null }, rows)
  writeFileSync(out!, html); console.log('wrote', out, html.length, 'bytes')
}
process.exit(0)
