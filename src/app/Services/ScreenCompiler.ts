import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@babel/parser'
import { transformSync } from 'rolldown/experimental'
import { compile as twCompile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'

// A screen is one React component the model wrote on Konsta UI (KON-00). It is parsed and transformed
// here and never executed on the server: static refusal of anything outside the four allowed imports and
// of the browser APIs a screen has no business touching, then JSX → JS (oxc) and the Tailwind CSS for the
// classes it uses. The frame it runs in (sandbox, no same-origin) is the boundary; this is depth.

const ROOT = process.cwd()
export const RUNTIME_DIR = join(ROOT, 'runtime', 'dist')

type Exports = Record<string, string[]>
let exportsCache: { allowed: Record<string, Set<string>>; lucide: Record<string, string>; mtime: number } | null = null
// Read again when the runtime is rebuilt (its exports.json changes), so a new kit export is known without a restart.
function runtimeExports() {
  const file = join(RUNTIME_DIR, 'exports.json')
  if (!existsSync(file)) {
    if (exportsCache) return exportsCache // mid-rebuild: the last build's list is still right
    throw new Error('The screen runtime is not built — run `npm run build:runtime`')
  }
  const mtime = statSync(file).mtimeMs
  if (exportsCache?.mtime === mtime) return exportsCache
  const ex = JSON.parse(readFileSync(file, 'utf8')) as Exports
  const lucide = JSON.parse(readFileSync(join(RUNTIME_DIR, 'lucide-map.json'), 'utf8')) as Record<string, string>
  exportsCache = {
    allowed: {
      react: new Set([...ex.react, 'default']),
      'react/jsx-runtime': new Set(ex['jsx-runtime']),
      'konsta/react': new Set(ex.konsta),
      'lucide-react': new Set(ex.lucide),
      '@od/kit': new Set(ex.kit),
    },
    lucide,
    mtime,
  }
  return exportsCache
}

const BANNED = new Set(['require', 'eval', 'Function', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'postMessage', 'importScripts', 'opener', 'dangerouslySetInnerHTML'])
const BANNED_MEMBER = new Set(['parent', 'top', 'cookie', 'opener']) // only as window./document./globalThis./self.
const GLOBALS = new Set(['window', 'document', 'globalThis', 'self'])
const BANNED_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'base', 'link', 'meta', 'style'])
// ponytail: token-level refusal, so `window['parent']` slips past — the sandbox is the boundary.

// Konsta's @theme blocks (tokens only) so per-screen utilities like bg-primary resolve; runtime.css emits every token.
let cssInput: string | null = null
function tailwindInput() {
  if (cssInput) return cssInput
  const dir = join(ROOT, 'node_modules', 'konsta', 'styles')
  const theme = readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .flatMap((f) => [...readFileSync(join(dir, f), 'utf8').matchAll(/@theme\s*\{([^}]*)\}/g)].map((m) => m[1]))
    .join('\n')
  // HIG-12: the type scale (text-title1 …), the same file runtime.css emits the tokens from.
  const scale = readFileSync(join(ROOT, 'runtime', 'type-scale.css'), 'utf8').match(/@theme static\s*\{([^}]*)\}/)?.[1] ?? ''
  cssInput = `@import "tailwindcss/theme.css" theme(reference);\n@import "tailwindcss/utilities.css";\n@custom-variant dark (&:where(.dark, .dark *));\n@theme reference {\n${theme}\n${scale}\n}\n`
  return cssInput
}

export type Compiled = { ok: true; js: string; css: string } | { ok: false; errors: string[] }

/**
 * The source with the imports it forgot. A name the screen uses but never imported (<BlockTitle> without its
 * import crashed a screen at render) is imported when the runtime has exactly that export: Konsta first, then
 * the kit, then a lucide icon. The compiler builds from this, and the code export ships it, so an exported
 * project builds too. A source that does not parse is returned as it is (the compiler reports it).
 */
export function completeImports(source: string): string {
  return resolveNames(source).source
}

/** Every name a binding pattern declares: `x`, `{ a: B, ...rest }`, `[first = 1]`. */
function patternNames(p: unknown, out: Set<string>): void {
  const n = p as { type?: string; name?: string; value?: unknown; left?: unknown; argument?: unknown; properties?: unknown[]; elements?: unknown[] } | null
  if (!n) return
  if (n.type === 'Identifier' && n.name) out.add(n.name)
  else if (n.type === 'ObjectPattern') for (const q of n.properties ?? []) patternNames((q as { type: string }).type === 'RestElement' ? q : (q as { value: unknown }).value, out)
  else if (n.type === 'ArrayPattern') for (const q of n.elements ?? []) patternNames(q, out)
  else if (n.type === 'AssignmentPattern') patternNames(n.left, out)
  else if (n.type === 'RestElement') patternNames(n.argument, out)
}

/** completeImports, plus the names used as components that nothing declares and the runtime does not have. */
function resolveNames(source: string): { source: string; missing: string[] } {
  const { allowed, lucide } = runtimeExports()
  let ast: ReturnType<typeof parse>
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx'] })
  } catch {
    return { source, missing: [] }
  }
  const declared = new Set<string>()
  const used = new Set<string>()
  const tags = new Set<string>() // names used as <Tag> — only these can be a missing component (Number(), Date() are not)
  ;(function walk(n: unknown, parentKey?: string): void {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) return n.forEach((c) => walk(c, parentKey))
    const node = n as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    if (node.type === 'ImportSpecifier' || node.type === 'ImportDefaultSpecifier') declared.add((node.local as { name: string }).name)
    if ((node.type === 'VariableDeclarator' || node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && (node.id as { type?: string })?.type === 'Identifier') declared.add((node.id as { name: string }).name)
    if (node.type === 'VariableDeclarator') patternNames(node.id, declared)
    // Parameters — plain, destructured ({ icon: Icon }) or defaulted — and catch clauses declare their names.
    if (Array.isArray(node.params)) for (const q of node.params) patternNames(q, declared)
    if (node.type === 'CatchClause') patternNames(node.param, declared)
    if (node.type === 'JSXOpeningElement' && (node.name as { type: string }).type === 'JSXIdentifier') {
      used.add((node.name as { name: string }).name)
      tags.add((node.name as { name: string }).name)
    }
    if (node.type === 'CallExpression' && (node.callee as { type: string }).type === 'Identifier') used.add((node.callee as { name: string }).name)
    for (const [k, v] of Object.entries(node)) if (k !== 'loc' && k !== 'start' && k !== 'end' && typeof v === 'object') walk(v, k)
  })(ast.program)
  const add: Record<string, string[]> = { react: [], 'konsta/react': [], '@od/kit': [], 'lucide-react': [] }
  const missing: string[] = []
  for (const name of used) {
    if (declared.has(name) || !/^[A-Za-z]/.test(name)) continue
    // A React hook used without its import ("useState is not defined" crashed a screen in production).
    if (/^use[A-Z]/.test(name) && allowed.react!.has(name)) add.react!.push(name)
    else if (allowed['konsta/react']!.has(name)) add['konsta/react']!.push(name)
    else if (allowed['@od/kit']!.has(name)) add['@od/kit']!.push(name)
    else if (/^[A-Z]/.test(name) && lucide[name]) add['lucide-react']!.push(name)
    // HIG-10: a capitalised name nothing declares is a component that does not exist — the frame would crash on it.
    else if (/^[A-Z]/.test(name) && tags.has(name)) missing.push(name)
  }
  const lines = Object.entries(add).filter(([, names]) => names.length).map(([spec, names]) => `import { ${names.sort().join(', ')} } from '${spec}'`)
  return { source: lines.length ? `${lines.join('\n')}\n${source}` : source, missing }
}

/** Static checks, JSX → JS and this screen's CSS. */
export async function compileScreen(input: string): Promise<Compiled> {
  const { allowed, lucide: lucideFiles } = runtimeExports()
  const resolved = resolveNames(input)
  const source = resolved.source
  const errors: string[] = []
  if (resolved.missing.length) errors.push(`these components do not exist in konsta/react, @od/kit or lucide-react: ${resolved.missing.join(', ')}`)
  let ast: ReturnType<typeof parse>
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx'], tokens: true })
  } catch (e) {
    return { ok: false, errors: [`The screen's code does not parse: ${(e as Error).message}`] }
  }

  // 1. Imports: the whitelist, real names only; each lucide icon is rewritten to its own module.
  const splices: [number, number, string][] = []
  const unknown: string[] = []
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue
    const spec = node.source.value
    const names = allowed[spec]
    if (!names) { errors.push(`import from '${spec}' is not allowed`); continue }
    const icons: string[] = []
    for (const s of node.specifiers) {
      if (s.type === 'ImportNamespaceSpecifier') { errors.push(`namespace import from '${spec}' is not allowed`); continue }
      const name = s.type === 'ImportDefaultSpecifier' ? 'default' : s.imported.type === 'Identifier' ? s.imported.name : s.imported.value
      if (!names.has(name)) { unknown.push(`${name} from '${spec}'`); continue }
      if (spec === 'lucide-react') icons.push(`import ${s.local.name} from 'lucide-react/icons/${lucideFiles[name]}'`)
    }
    if (spec === 'lucide-react') splices.push([node.start!, node.end!, icons.join('\n')])
  }
  if (unknown.length) errors.push(`these do not exist: ${unknown.join(', ')}`)

  // 2. Exactly one default export, a function component.
  const defaults = ast.program.body.filter((n) => n.type === 'ExportDefaultDeclaration')
  if (defaults.length !== 1) errors.push(`expected one default export, found ${defaults.length}`)
  else {
    const d = (defaults[0] as { declaration: { type: string; name?: string } }).declaration
    const fn = new Set(['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'])
    const isFn = fn.has(d.type) || (d.type === 'Identifier' && ast.program.body.some((n) =>
      (n.type === 'FunctionDeclaration' && n.id?.name === d.name) ||
      (n.type === 'VariableDeclaration' && n.declarations.some((v) => v.id.type === 'Identifier' && v.id.name === d.name && v.init && fn.has(v.init.type)))))
    if (!isFn) errors.push('the default export is not a function component')
  }

  // 3. Banned identifiers, dynamic import(), window.parent / document.cookie, script-like tags.
  const tok = (ast.tokens ?? []) as { type: { label: string } | string; value?: string }[]
  const label = (i: number) => { const t = tok[i]?.type; return typeof t === 'string' ? t : t?.label }
  for (let i = 0; i < tok.length; i++) {
    const v = tok[i].value
    const l = label(i)
    if (l === 'name' && v && BANNED.has(v)) errors.push(`'${v}' is not allowed`)
    else if (l === 'name' && v && BANNED_MEMBER.has(v) && label(i - 1) === '.' && GLOBALS.has(String(tok[i - 2]?.value))) errors.push(`'${tok[i - 2].value}.${v}' is not allowed`)
    else if (l === 'import' && label(i + 1) === '(') errors.push('dynamic import() is not allowed')
    else if (l === 'jsxName' && v && BANNED_TAGS.has(v) && label(i - 1) === 'jsxTagStart') errors.push(`<${v}> is not allowed`)
    else if (l === 'jsxName' && v === 'dangerouslySetInnerHTML') errors.push(`'${v}' is not allowed`)
  }
  if (errors.length) return { ok: false, errors: [...new Set(errors)] }

  // REG-02: every JSX element carries where it is in the stored source (data-od-loc="start:end"), so a click in the
  // frame names exactly the code to change. Offsets are the stored text's: the imports resolveNames prepended are
  // taken off. A component that does not pass the attribute on is picked through its nearest ancestor that does.
  const shift = source.length - input.length
  ;(function tag(n: unknown): void {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) return n.forEach(tag)
    const node = n as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    if (node.type === 'JSXElement' && node.openingElement?.name?.end != null && node.start - shift >= 0) splices.push([node.openingElement.name.end, node.openingElement.name.end, ` data-od-loc="${node.start - shift}:${node.end - shift}"`])
    for (const [k, v] of Object.entries(node)) if (k !== 'loc' && typeof v === 'object') tag(v)
  })(ast.program)

  // 4. JSX → JS; specifiers stay as written, the frame's import map resolves them.
  let src = source
  for (const [s, e, r] of splices.sort((a, b) => b[0] - a[0])) src = src.slice(0, s) + r + src.slice(e)
  const out = transformSync('screen.jsx', src, { lang: 'jsx', sourceType: 'module', jsx: { runtime: 'automatic' } })
  if (out.errors?.length) return { ok: false, errors: out.errors.map((e) => `transform: ${e.message}`) }

  // 5. Tailwind for this screen's classes (a fresh compiler with a reference theme is ~5 ms).
  const candidates = new Scanner({ sources: [] }).scanFiles([{ content: source, extension: 'jsx' }])
  const compiler = await twCompile(tailwindInput(), { base: ROOT, onDependency() {} })
  const css = optimize(compiler.build(candidates), { minify: true }).code
  return { ok: true, js: out.code, css }
}

// Compiled screens are kept by the hash of their source, so a frame reload costs nothing.
const cache = new Map<string, Promise<Compiled>>()
export const sourceHash = (source: string) => createHash('sha1').update(source).digest('hex').slice(0, 16)
export function compileCached(source: string): Promise<Compiled> {
  const key = sourceHash(source)
  let hit = cache.get(key)
  if (!hit) {
    hit = compileScreen(source)
    cache.set(key, hit)
    if (cache.size > 500) cache.delete(cache.keys().next().value!)
  }
  return hit
}

/** FUN-01: the app's store module (the model's `store.js`): plain JavaScript with no imports at all, the same banned
 *  identifiers as a screen, and the exports the kit reads — `initial` and `actions` (an object of functions), `derived`
 *  optional. Never executed on the server. */
export function compileStore(source: string): { ok: true; js: string } | { ok: false; errors: string[] } {
  let ast: ReturnType<typeof parse>
  try {
    ast = parse(source, { sourceType: 'module', tokens: true })
  } catch (e) {
    return { ok: false, errors: [`The store's code does not parse: ${(e as Error).message}`] }
  }
  const errors: string[] = []
  const exported = new Set<string>()
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') errors.push('the store imports nothing')
    if (node.type === 'ExportDefaultDeclaration' || node.type === 'ExportAllDeclaration') errors.push('the store has only named exports: initial, actions, derived')
    if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') for (const d of node.declaration.declarations) if (d.id.type === 'Identifier') exported.add(d.id.name)
    if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration' && node.declaration.id) exported.add(node.declaration.id.name)
  }
  for (const name of ['initial', 'actions']) if (!exported.has(name)) errors.push(`export const ${name} is missing`)
  const tok = (ast.tokens ?? []) as { type: { label: string } | string; value?: string }[]
  const label = (i: number) => { const t = tok[i]?.type; return typeof t === 'string' ? t : t?.label }
  for (let i = 0; i < tok.length; i++) {
    const v = tok[i].value
    const l = label(i)
    if (l === 'name' && v && (BANNED.has(v) || v === 'setTimeout' || v === 'setInterval')) errors.push(`'${v}' is not allowed in the store`)
    else if (l === 'name' && v && BANNED_MEMBER.has(v) && label(i - 1) === '.' && GLOBALS.has(String(tok[i - 2]?.value))) errors.push(`'${tok[i - 2].value}.${v}' is not allowed`)
    else if (l === 'name' && v && GLOBALS.has(v)) errors.push(`'${v}' is not allowed in the store`)
    else if (l === 'import' && label(i + 1) === '(') errors.push('dynamic import() is not allowed')
  }
  if (errors.length) return { ok: false, errors: [...new Set(errors)] }
  const out = transformSync('store.js', source, { lang: 'js', sourceType: 'module' })
  if (out.errors?.length) return { ok: false, errors: out.errors.map((e) => `transform: ${e.message}`) }
  return { ok: true, js: out.code }
}
