import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { extractRootBlock, parseDeclarations } from '../../lib/screen-normalizer.ts'

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

  /**
   * STYLE.md: the look only, in under 60 lines, with no trace of the company it came from.
   * DESIGN.md is a brand document — fed whole, the model copied the brand's product into
   * unrelated apps (a calorie counter drew an owl and "Lesson complete"). Mobile prompts read
   * this card; DESIGN.md stays the source the card is distilled from, and the desktop prompt.
   */
  readStyleCard(id: string): string {
    const path = join(DS_DIR, id, 'STYLE.md')
    return existsSync(path) ? readFileSync(path, 'utf8') : this.readDesignMd(id)
  },

  /** Read tokens.css if it exists, returns empty string otherwise */
  readTokensCss(id: string): string {
    const path = join(DS_DIR, id, 'tokens.css')
    return existsSync(path) ? readFileSync(path, 'utf8') : ''
  },

  /**
   * The bare `:root { … }` rule with rationale comments stripped.
   * tokens.css carries long explanatory comments for humans; every byte of them would
   * otherwise be re-sent in each screen's system prompt.
   */
  readTokensRoot(id: string): string {
    const raw = this.readTokensCss(id)
    if (!raw) return ''
    const block = extractRootBlock(raw)
    if (block === null) return ''
    const decls = [...parseDeclarations(block)].map(([k, v]) => `  ${k}: ${v};`).join('\n')
    return decls ? `:root {\n${decls}\n}` : ''
  },

  /**
   * Webfont stylesheet URLs this system needs, declared as `@import url(…)` in tokens.css.
   * Screens are told to reference `--font-*`, but nothing makes a model remember the
   * `<link>` — so the loading step is owned here and injected deterministically.
   */
  readFontUrls(id: string): string[] {
    const raw = this.readTokensCss(id)
    return [...raw.matchAll(/@import\s+url\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1])
  },

  /** Icon stroke weight for this brand; lucide's own default when the system doesn't override it. */
  readIconStroke(id: string): number {
    const block = extractRootBlock(this.readTokensCss(id))
    const raw = block ? parseDeclarations(block).get('--icon-stroke') : undefined
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : 2
  },

  // Callers must reject an id that fails this before it becomes a file path (PromptComposer reads it directly).
  assertExists(id: string) {
    if (!this.exists(id)) throw new Error('Unknown design system')
  },
}
