import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DS_DIR = join(process.cwd(), 'design-systems')

export interface DesignSystemEntry {
  id: string
  name: string
  category: string
  description: string
  hasTokens: boolean
}

function tryReadJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function extractH1(md: string): string | undefined {
  const m = md.match(/^#\s+(.+)$/m)
  if (!m) return undefined
  // Strip "Design System Inspired by " prefix if present
  return m[1].replace(/^Design System Inspired by\s+/i, '').trim()
}

function extractCategory(md: string): string | undefined {
  const m = md.match(/>\s*Category:\s*(.+)/i)
  return m?.[1]?.trim()
}

export const DesignSystemService = {
  list(): DesignSystemEntry[] {
    return readdirSync(DS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== '_schema')
      .map((d) => {
        const dir = join(DS_DIR, d.name)
        const manifest = tryReadJson(join(dir, 'manifest.json'))
        const designMd = existsSync(join(dir, 'DESIGN.md'))
          ? readFileSync(join(dir, 'DESIGN.md'), 'utf8')
          : ''
        const hasTokens = existsSync(join(dir, 'tokens.css'))

        const name =
          (manifest?.name as string) ||
          extractH1(designMd) ||
          d.name
        const category =
          (manifest?.category as string) ||
          extractCategory(designMd) ||
          'General'
        const description =
          (manifest?.description as string) || ''

        return { id: d.name, name, category, description, hasTokens }
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  },

  exists(id: string) {
    return existsSync(join(DS_DIR, id, 'DESIGN.md'))
  },

  /** Read the DESIGN.md content for prompt injection */
  readDesignMd(id: string): string {
    return readFileSync(join(DS_DIR, id, 'DESIGN.md'), 'utf8')
  },

  /** Read tokens.css if it exists, returns empty string otherwise */
  readTokensCss(id: string): string {
    const path = join(DS_DIR, id, 'tokens.css')
    return existsSync(path) ? readFileSync(path, 'utf8') : ''
  },

  // Callers must reject an id that fails this before it becomes a file path (PromptComposer reads it directly).
  assertExists(id: string) {
    if (!this.exists(id)) throw new Error('Unknown design system')
  },
}
