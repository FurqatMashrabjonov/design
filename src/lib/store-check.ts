// FUN-01: a screen must use the app's store as the store is written. Two mistakes crashed screens on the eval: a
// derived value called as a function (`weeklySteps()` when the store has `weeklySteps: (state) => […]`), and a name read
// from useStore() that the store does not have. Nothing is changed in the source: each is a finding for the model's one
// repair (drawScreen), with what the store does have. The store is read as text — never run.
import type { LintFinding } from './jsx-lint'

/** The store module a brief carries (its APP STORE block), if any. */
export const storeOf = (brief: string) => /# APP STORE[^\n]*\n```js\n([\s\S]*?)```/.exec(brief)?.[1]

/** The body of `export const <name> = { … }` (balanced braces), or ''. */
function block(src: string, name: string): string {
  const at = src.search(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\{`))
  if (at < 0) return ''
  const open = src.indexOf('{', at)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    const c = src[i]
    if (c === '{') depth++
    else if (c === '}' && --depth === 0) return src.slice(open + 1, i)
  }
  return ''
}

/** Top-level keys of an object body, with the parameter count when the value is a function. */
function keys(body: string): Map<string, number | null> {
  const out = new Map<string, number | null>()
  let depth = 0, start = 0
  const parts: string[] = []
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if ('{[('.includes(c!)) depth++
    else if ('}])'.includes(c!)) depth--
    else if (c === ',' && depth === 0) { parts.push(body.slice(start, i)); start = i + 1 }
  }
  parts.push(body.slice(start))
  for (const p of parts) {
    const t = p.replace(/^\s*(\/\/[^\n]*\n\s*)*/, '').trim()
    const m = /^(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?::\s*(?:(?:async\s+)?(?:function\s*)?\(([^)]*)\)\s*(?:=>|\{)|(?:async\s+)?([A-Za-z_$][\w$]*)\s*=>)|\(([^)]*)\)\s*\{)?/.exec(t)
    if (!m?.[1]) continue
    const params = m[2] ?? m[4] ?? (m[3] !== undefined ? m[3] : undefined)
    out.set(m[1], params === undefined ? null : params.split(',').filter((x) => x.trim()).length)
  }
  return out
}

export function storeFindings(source: string, store: string | undefined, max = 4): LintFinding[] {
  if (!store) return []
  const initial = keys(block(store, 'initial'))
  const derived = keys(block(store, 'derived'))
  const actions = keys(block(store, 'actions'))
  const out: LintFinding[] = []
  // A value derived from the state alone is a value: `weeklySteps`, not `weeklySteps()`.
  for (const [name, n] of derived) {
    if (n !== null && n <= 1 && new RegExp(`(?<![\\w$.])${name}\\s*\\(`).test(source)) out.push({ rule: 'store-call', message: `\`${name}\` in the store is a value computed from the state (\`${name}: (state) => …\`): write \`${name}\`, not \`${name}()\`.`, sample: name })
  }
  // Names taken from useStore() that the store does not have.
  const known = new Set(['state', ...initial.keys(), ...derived.keys(), ...actions.keys()])
  for (const m of source.matchAll(/const\s*\{([^}]*)\}\s*=\s*useStore\(\)/g)) {
    for (const part of m[1]!.split(',')) {
      const name = part.split(':')[0]!.split('=')[0]!.trim()
      if (name && /^[A-Za-z_$][\w$]*$/.test(name) && !known.has(name)) out.push({ rule: 'store-missing', message: `useStore() has no \`${name}\`. The store has state ${[...initial.keys()].join(', ') || '—'}; derived ${[...derived.keys()].join(', ') || '—'}; actions ${[...actions.keys()].join(', ') || '—'}. Use one of those, or compute it from the state in this screen.`, sample: name })
    }
  }
  return out.slice(0, max)
}
