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

  // Build design system section with both prose and tokens. Mobile reads the style card (look only);
  // desktop still reads the full brand document.
  const isMobile = device === 'mobile'
  const designMd = isMobile ? DesignSystemService.readStyleCard(designSystem) : DesignSystemService.readDesignMd(designSystem)
  const tokensCss = DesignSystemService.readTokensRoot(designSystem)
  let designSection = `# Design system\n\n${designMd}`
  if (tokensCss) {
    designSection += `\n\n## Design tokens (CSS custom properties)\n\nPaste this :root block into your <style> tag verbatim — do not rename, drop, or re-value any property:\n\n\`\`\`css\n${tokensCss}\n\`\`\`\n\nThis block is the complete token vocabulary. \`var(--x)\` is only valid for a property defined above.`
    if (!isMobile) designSection += ` The prose section quotes the real product's internal variable names (\`--hds-color-…\`, \`--geist-…\`, \`--palette-…\` and similar) as background research — those do not exist here, so never reference one.`
  }

  // Add data-od-id instruction for element-level editing support
  const elementInstruction = `\n\n## Element targeting\n\nTag every major structural section with a \`data-od-id\` attribute using semantic slugs.\nExamples: \`data-od-id="header"\`, \`data-od-id="hero"\`, \`data-od-id="features"\`, \`data-od-id="pricing"\`, \`data-od-id="footer"\`.\nThis enables users to select and edit individual sections without regenerating the full screen.`

  const assetContract = `\n\n## Icons and fonts — do not hand-roll these

**Icons.** Write \`<i data-lucide="camera"></i>\` and nothing else. Do not draw \`<svg>\` paths by hand: hand-drawn icons come out at a different weight and shape on every screen, which is the most visible way a multi-screen app falls apart. Use real [lucide](https://lucide.dev) names (\`home\`, \`search\`, \`plus\`, \`bar-chart-2\`, \`user\`, \`bell\`, \`chevron-right\`, …). Size them with CSS (\`width\`/\`height\`), colour them with \`currentColor\`. The library and its bootstrap are added to your page automatically. An \`<svg>\` you draw yourself is only acceptable for something lucide has no icon for — a logo or an illustration.

**Charts.** Never draw a chart — no bar towers of divs, no hand-made SVG paths. Write an empty slot with the data and it is drawn for you in the design system's colours: \`<div data-od-chart="bar" data-values="4.2,5.1,3.8,6.0,5.5" data-labels="Mon,Tue,Wed,Thu,Fri" data-highlight="4"></div>\`. Types: \`bar\`, \`line\`, \`area\`, \`sparkline\` (tiny trend in a row or card), \`donut\` (shares, with \`data-labels\` as the legend), \`ring\` (progress: \`data-values="7.2" data-max="10" data-unit="k" data-labels="steps"\`), \`heatmap\` (a streak calendar: one value per day, \`data-columns="7"\`). Values must match the numbers shown elsewhere on the screen. Size it with a style height if the default does not fit; put titles and totals outside the slot.

**Component kit — build with it first.** A stylesheet of ready components is added to your page as soon as you use an \`od-\` class. They are already styled with the design tokens: never write a CSS rule for an \`od-\` class (the kit's rules win, and yours are removed). Write CSS only for your own classes — this screen's hero composition, a special layout — and use them next to kit classes (\`class="od-card promo"\`). Classes:
- Layout: \`od-page\` (screen body), \`od-stack\`, \`od-grid\` (2 columns), \`od-carousel\` (horizontal scroll), \`od-divider\`
- Text: \`od-hero__eyebrow\` / \`__title\` / \`__sub\`; \`od-section\` > \`od-section__head\` > \`od-section__title\` + \`od-section__link\`
- Actions: \`od-btn\` (+ \`--secondary\` \`--ghost\` \`--danger\` \`--sm\` \`--block\`), \`od-icon-btn\`
- Surfaces: \`od-card\` (+ \`--flat\` \`--media\`; \`od-card__body\` \`__title\` \`__meta\`), \`od-media\` (+ \`--wide\` \`--square\`) around an image slot, \`od-banner\` (+ \`--success\` \`--warn\` \`--danger\`)
- Lists: \`od-list\` > \`od-row\` (+ \`--chevron\`) > \`od-row__lead\`, \`od-row__body\` (\`od-row__title\` + \`od-row__sub\`), \`od-row__trail\`; \`od-kv\` (+ \`--total\`); \`od-timeline\` > \`od-timeline__item\` (\`.is-done\` \`.is-current\`) > \`od-timeline__dot\`
- Small: \`od-chip\` (\`.is-active\`), \`od-tag\` (+ \`--neutral\` \`--success\` \`--warn\` \`--danger\`), \`od-badge\`, \`od-avatar\` (+ \`--sm\` \`--lg\`), \`od-rating\`
- Numbers: \`od-stat\` > \`od-stat__label\` \`__value\` \`__delta\` (\`--up\` \`--down\`), \`od-price\` (+ \`od-price__unit\`), \`od-progress\` with \`style="--value:68%"\` > \`<span>\`
- Inputs: \`od-field\` > \`od-field__label\` + \`od-input\` + \`od-field__help\` (\`od-field--error\`), \`od-search\` > icon + input, \`od-segmented\` > \`button.is-active\`, \`input.od-switch\` (checkbox), \`od-stepper\` > button + output + button
- States: \`od-empty\` > \`od-empty__icon\` + \`od-empty__title\`; \`od-bottom-bar\` (sticky bar for the primary action)

**Fonts.** Do NOT add a Google Fonts \`<link>\` or \`@import\`. The design system's webfonts are injected into your page automatically; any font link you write is stripped. Reference type only through \`var(--font-display)\`, \`var(--font-body)\`, and \`var(--font-mono)\`.`

  return [INTRO, designSection, craft, isMobile ? MOBILE_AESTHETIC : '', skillData.body, elementInstruction, assetContract]
    .filter(Boolean)
    .join('\n\n---\n\n')
}

// VAR-03: the aesthetic bar for a phone screen, in a few decisions (about 250 tokens). Mobile only;
// the desktop skills carry their own longer guidance.
const MOBILE_AESTHETIC = `## Aesthetic bar
- One focal point per screen: the biggest thing is the most important thing; everything else is at least one step quieter.
- Contrast of scale: one large number or headline against small, calm supporting text — never a page of medium-sized text.
- Rhythm, not decoration: spacing in 8px steps, shared left edges, one radius family.
- Real density: 3–6 meaningful items above the fold; no filler sections or generic welcome banners.
- Colour discipline: neutrals carry the layout; the accent marks the primary action and at most one highlight.
- Depth sparingly: separate by space first, lines second, shadows last.
- Craft details: tabular figures for numbers, one icon size (20–24px), ellipsis instead of clipped text.`

/** Compose a prompt specifically for editing a single element within a screen */
export function composeElementEditPrompt(
  designSystem: string,
  device: string,
  fullHtml: string,
  elementId: string,
  elementHtml: string,
  instruction: string,
): string {
  const designMd = device === 'mobile' ? DesignSystemService.readStyleCard(designSystem) : DesignSystemService.readDesignMd(designSystem)
  const tokensCss = DesignSystemService.readTokensRoot(designSystem)

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

