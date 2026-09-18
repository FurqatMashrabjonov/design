import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const INTRO = 'You are an expert product designer and front-end engineer, like Google Stitch. Given a brief, you design one polished, production-quality UI screen.'

// Reads skills/<id>/SKILL.md: frontmatter's od.craft.requires list + the body after the closing ---.
// Our SKILL.md files are hand-authored with a fixed shape, so a small regex beats a YAML dependency.
function readSkill(id: string) {
  const raw = readFileSync(join(ROOT, 'skills', id, 'SKILL.md'), 'utf8')
  const fmEnd = raw.indexOf('\n---', 4)
  if (!raw.startsWith('---') || fmEnd === -1) throw new Error(`${id}/SKILL.md is missing frontmatter`)
  const frontmatter = raw.slice(0, fmEnd)
  const body = raw.slice(fmEnd + 4).replace(/^\s*\n/, '')
  const requires = frontmatter.match(/requires:\s*\[([^\]]*)\]/)?.[1] ?? ''
  const craftRequires = requires
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return { body, craftRequires }
}

function readCraft(slug: string) {
  return readFileSync(join(ROOT, 'craft', `${slug}.md`), 'utf8')
}

function readDesignSystem(id: string) {
  return readFileSync(join(ROOT, 'design-systems', id, 'DESIGN.md'), 'utf8')
}

const DEVICE_SKILL = { desktop: 'web-screen', mobile: 'mobile-screen' } as const

// Order: intro -> DESIGN.md (brand) -> craft references (universal quality rules) -> skill body (workflow + output contract).
export function composeSystemPrompt(designSystem: string, device: string) {
  const skill = readSkill(DEVICE_SKILL[device as keyof typeof DEVICE_SKILL] ?? DEVICE_SKILL.desktop)
  const craft = skill.craftRequires.map(readCraft).join('\n\n---\n\n')
  return [INTRO, `# Design system\n\n${readDesignSystem(designSystem)}`, craft, skill.body]
    .filter(Boolean)
    .join('\n\n---\n\n')
}
