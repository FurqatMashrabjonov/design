import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DS_DIR = join(process.cwd(), 'design-systems')

export const DesignSystemService = {
  // Label = first "# " heading of DESIGN.md
  list() {
    return readdirSync(DS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ id: d.name, name: readFileSync(join(DS_DIR, d.name, 'DESIGN.md'), 'utf8').match(/^#\s+(.+)$/m)?.[1] ?? d.name }))
  },

  exists(id: string) {
    return this.list().some((d) => d.id === id)
  },

  // Callers must reject an id that fails this before it becomes a file path (PromptComposer reads it directly).
  assertExists(id: string) {
    if (!this.exists(id)) throw new Error('Unknown design system')
  },
}
