// Lets plain `node` run the app's server code outside Vite: resolves the `@/` alias and
// extensionless relative imports to their .ts files. Only touches specifiers that originate
// in this repo's own source, never node_modules.
import { registerHooks } from 'node:module'
import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const SRC = resolve(ROOT, 'src')
const isFile = (p) => existsSync(p) && statSync(p).isFile()

registerHooks({
  resolve(specifier, context, next) {
    const parent = context.parentURL?.startsWith('file:') ? fileURLToPath(context.parentURL) : ''
    const ours = parent.startsWith(ROOT) && !parent.includes('node_modules')
    let base = null
    if (specifier.startsWith('@/')) base = resolve(SRC, specifier.slice(2))
    else if (ours && specifier.startsWith('.')) base = resolve(dirname(parent), specifier)
    if (base) {
      const hit = [base, `${base}.ts`, `${base}/index.ts`].find(isFile)
      if (hit) return next(pathToFileURL(hit).href, context)
    }
    return next(specifier, context)
  },
})
