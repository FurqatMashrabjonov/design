import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// The shared component sheet (kit/od-kit.css, KIT-01). Read once; the normalizer injects it into
// any screen that uses an od- class.
let css: string | null = null

export const KitService = {
  css(): string {
    return (css ??= readFileSync(join(process.cwd(), 'kit', 'od-kit.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{2,}/g, '\n').trim())
  },
}
