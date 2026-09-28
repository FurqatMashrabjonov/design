// KON-01 harness — compileScreen(jsxSource): static checks, JSX→JS (oxc via rolldown), per-screen Tailwind CSS.
// The model's code is parsed and transformed here, never executed. Runs with plain node from the repo root.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'
import { transformSync } from 'rolldown/experimental'
import { compile as twCompile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const VITA = join(ROOT, 'prototypes', 'vita-konsta')
export const RUNTIME = join(VITA, 'dist-runtime')

const EXPORTS = JSON.parse(readFileSync(join(RUNTIME, 'exports.json'), 'utf8'))
const LUCIDE = JSON.parse(readFileSync(join(RUNTIME, 'lucide-map.json'), 'utf8'))
// import specifier → names the runtime exports for it
const ALLOWED = {
  react: new Set([...EXPORTS.react, 'default']),
  'react/jsx-runtime': new Set(EXPORTS['jsx-runtime']),
  'konsta/react': new Set(EXPORTS.konsta),
  'lucide-react': new Set(EXPORTS.lucide),
  '@od/kit': new Set(EXPORTS.kit),
}
const BANNED = new Set(['require', 'eval', 'Function', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'postMessage', 'importScripts', 'opener', 'dangerouslySetInnerHTML'])
const BANNED_MEMBER = new Set(['parent', 'top', 'cookie', 'opener']) // only as window./document./globalThis./self.
const GLOBALS = new Set(['window', 'document', 'globalThis', 'self'])
const BANNED_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'base', 'link', 'meta'])
// ponytail: token-level refusal, so `window['parent']` or a computed key slips past — the sandbox is the boundary, this is depth.

// Konsta's @theme blocks (tokens only) so per-screen utilities like bg-primary resolve; runtime.css emits every token (theme(static)).
const KONSTA_THEME = readdirSync(join(VITA, 'node_modules/konsta/styles'))
  .filter((f) => f.endsWith('.css'))
  .flatMap((f) => [...readFileSync(join(VITA, 'node_modules/konsta/styles', f), 'utf8').matchAll(/@theme\s*\{([^}]*)\}/g)].map((m) => m[1]))
  .join('\n')
const CSS_INPUT = `@import "tailwindcss/theme.css" theme(reference);\n@import "tailwindcss/utilities.css";\n@custom-variant dark (&:where(.dark, .dark *));\n@theme reference {\n${KONSTA_THEME}\n}\n`

/** @returns {Promise<{ok:boolean, js:string, css:string, errors:string[], imports:Record<string,string[]>, unknown:string[], ms:{transform:number, css:number}}>} */
export async function compileScreen(source) {
  const errors = [], unknown = [], imports = {}
  const ms = { transform: 0, css: 0 }
  let t = performance.now()
  let ast
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx'], tokens: true })
  } catch (e) {
    return { ok: false, js: '', css: '', errors: [`parse: ${e.message}`], imports, unknown, ms }
  }

  // 1. imports: whitelist, known names, no namespace imports; lucide names are rewritten to per-icon modules.
  const splices = [] // [start, end, replacement]
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue
    const spec = node.source.value
    if (!ALLOWED[spec]) { errors.push(`import from '${spec}' is not allowed`); continue }
    const names = (imports[spec] ??= [])
    const lucide = []
    for (const s of node.specifiers) {
      if (s.type === 'ImportNamespaceSpecifier') { errors.push(`namespace import from '${spec}' is not allowed`); continue }
      const name = s.type === 'ImportDefaultSpecifier' ? 'default' : s.imported.name ?? s.imported.value
      names.push(name)
      if (!ALLOWED[spec].has(name)) { unknown.push(`${name} (${spec})`); continue }
      if (spec === 'lucide-react') lucide.push(`import ${s.local.name} from 'lucide-react/icons/${LUCIDE[name]}'`)
    }
    if (spec === 'lucide-react') splices.push([node.start, node.end, lucide.join('\n')])
  }
  if (unknown.length) errors.push(`unknown imports: ${unknown.join(', ')}`)

  // 2. exactly one default export, a function component
  const defaults = ast.program.body.filter((n) => n.type === 'ExportDefaultDeclaration')
  if (defaults.length !== 1) errors.push(`expected one default export, found ${defaults.length}`)
  else {
    const d = defaults[0].declaration
    const fnTypes = new Set(['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'])
    const isFn = fnTypes.has(d.type) || (d.type === 'Identifier' && ast.program.body.some((n) =>
      (n.type === 'FunctionDeclaration' && n.id.name === d.name) ||
      (n.type === 'VariableDeclaration' && n.declarations.some((v) => v.id.name === d.name && v.init && fnTypes.has(v.init.type)))))
    if (!isFn) errors.push('default export is not a function component')
  }

  // 3. banned identifiers, dynamic import(), window.parent / document.cookie, script-like JSX tags
  const tok = ast.tokens
  for (let i = 0; i < tok.length; i++) {
    const { type, value } = tok[i]
    const label = type.label
    if (label === 'name' && BANNED.has(value)) errors.push(`'${value}' is not allowed`)
    else if (label === 'name' && BANNED_MEMBER.has(value) && tok[i - 1]?.type.label === '.' && GLOBALS.has(tok[i - 2]?.value)) errors.push(`'${tok[i - 2].value}.${value}' is not allowed`)
    else if (label === 'import' && tok[i + 1]?.type.label === '(') errors.push('dynamic import() is not allowed')
    else if (label === 'jsxName' && BANNED_TAGS.has(value) && tok[i - 1]?.type.label === 'jsxTagStart') errors.push(`<${value}> is not allowed`)
    else if (label === 'jsxName' && value === 'dangerouslySetInnerHTML') errors.push(`'${value}' is not allowed`)
  }
  if (errors.length) return { ok: false, js: '', css: '', errors: [...new Set(errors)], imports, unknown, ms }

  // 4. JSX → JS (oxc). Specifiers stay as written; the import map resolves them.
  let src = source
  for (const [s, e, r] of splices.sort((a, b) => b[0] - a[0])) src = src.slice(0, s) + r + src.slice(e)
  const out = transformSync('screen.jsx', src, { lang: 'jsx', sourceType: 'module', jsx: { runtime: 'automatic' } })
  ms.transform = +(performance.now() - t).toFixed(1)
  if (out.errors?.length) return { ok: false, js: '', css: '', errors: out.errors.map((e) => `transform: ${e.message}`), imports, unknown, ms }

  // 5. Tailwind for this screen's classes only — a fresh compiler is ~5 ms with a reference theme, and build() accumulates otherwise.
  t = performance.now()
  const candidates = new Scanner({ sources: [] }).scanFiles([{ content: source, extension: 'jsx' }]) // a Scanner remembers what it saw: one per screen
  const compiler = await twCompile(CSS_INPUT, { base: VITA, onDependency() {} })
  const css = optimize(compiler.build(candidates), { minify: true }).code
  ms.css = +(performance.now() - t).toFixed(1)
  return { ok: true, js: out.code, css, errors, imports, unknown, ms }
}

// Self-check: node scripts/kon01/compile.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ok = await compileScreen(`import { useState } from 'react'\nimport { Page, Navbar } from 'konsta/react'\nimport { Bell } from 'lucide-react'\nimport { Ring } from '@od/kit'\nexport default function S() { const [n] = useState(1); return <Page className="flex p-4"><Navbar title="x" /><Bell /><Ring value={n} /></Page> }`)
  console.assert(ok.ok, ok.errors)
  console.assert(ok.js.includes('lucide-react/icons/bell') && ok.js.includes('react/jsx-runtime'), 'lucide rewrite + automatic runtime')
  console.assert(ok.css.includes('.flex') && ok.css.includes('.p-4'), 'css')
  const bad = await compileScreen(`import x from 'axios'\nimport { Nope } from 'konsta/react'\nexport default () => { fetch('/'); window.parent; import('y'); return <script/> }`)
  console.assert(!bad.ok && bad.errors.length === 6, bad.errors)
  const two = await compileScreen(`export default 3`)
  console.assert(!two.ok, 'not a component')
  console.log('compile self-check ok', ok.ms, 'errors sample:', bad.errors)
}
