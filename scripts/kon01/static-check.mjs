// KON-01: the static half of the compiler, runnable on a folder of screens before anything renders —
// imports on the whitelist, every imported name real (Konsta types, kit, lucide), one default export,
// no forbidden API, no emoji.   node scripts/kon01/static-check.mjs scripts/kon01/inputs/model
import { readdirSync, readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '')
const dir = process.argv[2]
const konsta = new Set(readdirSync(ROOT + '/prototypes/vita-konsta/node_modules/konsta/react/types').map((f) => f.replace('.d.ts', '')))
const kit = new Set(['useNav', 'AppTabbar', 'Ring', 'Bars', 'Area', 'WaterGlass', 'CountUp', 'Avatar', 'Tile', 'Confetti'])
const lucide = new Set(Object.keys(await import(ROOT + '/prototypes/vita-konsta/node_modules/lucide-react/dist/esm/lucide-react.mjs')))
const OK = new Set(['react', 'konsta/react', 'lucide-react', '@od/kit'])
const BAD = /\b(fetch|XMLHttpRequest|WebSocket|localStorage|eval|Function|postMessage|parent)\b|import\(|dangerouslySetInnerHTML|<style|<script/
for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsx')).sort()) {
  const src = readFileSync(`${dir}/${f}`, 'utf8'); const issues = []
  let ast; try { ast = parse(src, { sourceType: 'module', plugins: ['jsx'] }) } catch (e) { console.log(f, 'PARSE ERROR', e.message.slice(0, 80)); continue }
  let hasDefault = false
  for (const n of ast.program.body) {
    if (n.type === 'ImportDeclaration') {
      if (!OK.has(n.source.value)) issues.push(`import ${n.source.value}`)
      for (const s of n.specifiers) { const name = s.imported?.name ?? s.local.name
        if (n.source.value === 'konsta/react' && !konsta.has(name)) issues.push(`konsta:${name}`)
        if (n.source.value === '@od/kit' && !kit.has(name)) issues.push(`kit:${name}`)
        if (n.source.value === 'lucide-react' && !lucide.has(name)) issues.push(`lucide:${name}`) }
    }
    if (n.type === 'ExportDefaultDeclaration') hasDefault = true
  }
  if (!hasDefault) issues.push('no default export')
  const bad = src.match(BAD); if (bad) issues.push(`forbidden:${bad[0]}`)
  const emoji = /\p{Extended_Pictographic}/u.test(src); if (emoji) issues.push('emoji')
  console.log(f.padEnd(16), issues.length ? 'FAIL ' + issues.join(', ') : 'ok', `· ${src.length} chars`)
}
