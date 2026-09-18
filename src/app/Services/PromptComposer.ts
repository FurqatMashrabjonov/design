import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { DesignSystemService } from './DesignSystemService.ts'

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

const DEVICE_SKILL = { desktop: 'web-screen', mobile: 'mobile-screen' } as const

/** Resolve a skill ID from device name or direct skill name */
function resolveSkillId(device: string, skill?: string): string {
  if (skill && existsSync(join(ROOT, 'skills', skill, 'SKILL.md'))) return skill
  return DEVICE_SKILL[device as keyof typeof DEVICE_SKILL] ?? DEVICE_SKILL.desktop
}

// Order: intro -> DESIGN.md + tokens.css (brand) -> craft references (universal quality rules) -> skill body (workflow + output contract).
export function composeSystemPrompt(designSystem: string, device: string, skill?: string) {
  const skillData = readSkill(resolveSkillId(device, skill))
  const craft = skillData.craftRequires.map(readCraft).join('\n\n---\n\n')

  // Build design system section with both prose and tokens
  const designMd = DesignSystemService.readDesignMd(designSystem)
  const tokensCss = DesignSystemService.readTokensCss(designSystem)
  let designSection = `# Design system\n\n${designMd}`
  if (tokensCss) {
    designSection += `\n\n## Design tokens (CSS custom properties)\n\nPaste this :root block into your <style> tag:\n\n\`\`\`css\n${tokensCss}\n\`\`\``
  }

  // Add data-od-id instruction for element-level editing support
  const elementInstruction = `\n\n## Element targeting\n\nTag every major structural section with a \`data-od-id\` attribute using semantic slugs.\nExamples: \`data-od-id="header"\`, \`data-od-id="hero"\`, \`data-od-id="features"\`, \`data-od-id="pricing"\`, \`data-od-id="footer"\`.\nThis enables users to select and edit individual sections without regenerating the full screen.`

  return [INTRO, designSection, craft, skillData.body, elementInstruction]
    .filter(Boolean)
    .join('\n\n---\n\n')
}

/** Compose a prompt specifically for editing a single element within a screen */
export function composeElementEditPrompt(
  designSystem: string,
  device: string,
  fullHtml: string,
  elementId: string,
  elementHtml: string,
  instruction: string,
): string {
  const designMd = DesignSystemService.readDesignMd(designSystem)
  const tokensCss = DesignSystemService.readTokensCss(designSystem)

  let systemPrompt = `You are an expert product designer. You will edit ONE specific element within an existing screen.

# Design system

${designMd}`

  if (tokensCss) {
    systemPrompt += `\n\n## Design tokens\n\n\`\`\`css\n${tokensCss}\n\`\`\``
  }

  systemPrompt += `

# Element edit rules

1. You are editing ONLY the element with data-od-id="${elementId}"
2. Return ONLY the updated element HTML (the single element, not the full page)
3. Keep all data-od-id attributes intact
4. Maintain consistency with the rest of the page (colors, fonts, spacing)
5. Do NOT change any other elements

## Current element HTML
\`\`\`html
${elementHtml}
\`\`\`

## Full page context (read-only, do NOT return this)
\`\`\`html
${fullHtml}
\`\`\`

## User instruction
${instruction}

Return ONLY the updated element HTML wrapped in <artifact title="element-edit">...</artifact>.`

  return systemPrompt
}

