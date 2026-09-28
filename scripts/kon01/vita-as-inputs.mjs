// KON-01 harness — turns ten Vita screens into standalone JSX inputs (scripts/kon01/inputs/vita/<name>.jsx) that import
// only from the whitelist: the store becomes constants, useStore() goes, dispatch is a no-op, nav/ui come from @od/kit.
// These are the etalon: what the model's screens are compared with. Re-run after a Vita change.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@babel/parser'
import { VITA, ROOT } from './compile.mjs'

const SCREENS = { today: ['today', 'Today'], habits: ['habits', 'Habits'], habit: ['habits', 'Habit'], 'add-habit': ['habits', 'AddHabit'], steps: ['body', 'Steps'], water: ['body', 'Water'], insights: ['me', 'Insights'], settings: ['me', 'Settings'], profile: ['me', 'Profile'], premium: ['me', 'Premium'] }
const OUT = join(ROOT, 'scripts', 'kon01', 'inputs', 'vita')
mkdirSync(OUT, { recursive: true })

const ast = (src) => parse(src, { sourceType: 'module', plugins: ['jsx'] }).program.body
const src = (code, n) => code.slice(n.start, n.end)

// The store's data as constants: COLORS, ACCENTS, fmt, TODAY and `initial` (renamed `state`).
const storeSrc = readFileSync(join(VITA, 'src/store.jsx'), 'utf8')
const wanted = { COLORS: 'COLORS', ACCENTS: 'ACCENTS', fmt: 'fmt', TODAY: 'TODAY', initial: 'state' }
const data = []
for (const n of ast(storeSrc)) {
  const decl = n.type === 'ExportNamedDeclaration' ? n.declaration : n
  if (decl?.type !== 'VariableDeclaration') continue
  const name = decl.declarations[0].id.name
  if (name in wanted) data.push(src(storeSrc, decl).replace(/^const \w+/, `const ${wanted[name]}`))
}
data.push('const dispatch = () => {}')

const cache = {}
for (const [file, [module, component]] of Object.entries(SCREENS)) {
  const code = (cache[module] ??= readFileSync(join(VITA, `src/screens/${module}.jsx`), 'utf8'))
  const body = ast(code)
  const imports = [], kit = new Set(), rest = []
  for (const n of body) {
    if (n.type === 'ImportDeclaration') {
      const from = n.source.value
      if (from === '../nav.jsx' || from === '../ui.jsx') n.specifiers.forEach((s) => kit.add(s.local.name))
      else if (from !== '../store.jsx') imports.push(src(code, n))
    } else if (n.type === 'ExportNamedDeclaration' && n.declaration?.type === 'FunctionDeclaration') {
      if (n.declaration.id.name === component) rest.push(src(code, n).replace(/^export function/, 'export default function'))
    } else rest.push(src(code, n))
  }
  const out = [...imports, `import { ${[...kit].join(', ')} } from '@od/kit'`, '', ...data, '', ...rest].join('\n')
    .replace(/^\s*const \{[^}]*\} = useStore\(\)\n/gm, '')
  if (/useStore|\.\.\/(nav|ui|store)\.jsx/.test(out)) throw new Error(`${file}: store or relative import left behind`)
  writeFileSync(join(OUT, `${file}.jsx`), out + '\n')
  console.log(`${file}.jsx ${out.length} chars`)
}
