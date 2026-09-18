import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SKILLS_DIR = join(process.cwd(), 'skills')

export interface SkillEntry {
  id: string
  name: string
  description: string
}

/**
 * Parse SKILL.md frontmatter to extract name and description.
 */
function parseFrontmatter(raw: string): { name: string; description: string } {
  const fmEnd = raw.indexOf('\n---', 4)
  if (!raw.startsWith('---') || fmEnd === -1) return { name: '', description: '' }
  const fm = raw.slice(4, fmEnd)
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? ''
  // description can be multiline with | syntax or single line
  const descMatch = fm.match(/^description:\s*\|?\s*\n?([\s\S]*?)(?=\n\w|\n---)/m)
  const description = descMatch
    ? descMatch[1].trim().split('\n').map((l) => l.trim()).join(' ')
    : fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? ''
  return { name, description }
}

export const SkillService = {
  list(): SkillEntry[] {
    if (!existsSync(SKILLS_DIR)) return []
    return readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, 'SKILL.md')))
      .map((d) => {
        const raw = readFileSync(join(SKILLS_DIR, d.name, 'SKILL.md'), 'utf8')
        const { name, description } = parseFrontmatter(raw)
        return {
          id: d.name,
          name: name || d.name,
          description,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  exists(id: string): boolean {
    return existsSync(join(SKILLS_DIR, id, 'SKILL.md'))
  },
}
