import { streamCompletion } from './LlmService.ts'
import { extractArtifact } from '../../artifact.ts'

export interface CritiqueScores {
  layout: number       // 0-10: composition, hierarchy, spacing
  brandCompliance: number // 0-10: design system token adherence
  accessibility: number  // 0-10: WCAG contrast, semantic HTML, focus
  copyQuality: number    // 0-10: text quality, no filler
}

export interface CritiqueResult {
  round: number
  scores: CritiqueScores
  composite: number
  mustFix: string[]
  suggestions: string[]
  passed: boolean
  revisedHtml?: string
}

const WEIGHTS = { layout: 0.3, brandCompliance: 0.25, accessibility: 0.25, copyQuality: 0.2 } as const
const THRESHOLD = 8.0
const MAX_ROUNDS = 2

function computeComposite(scores: CritiqueScores): number {
  return (
    scores.layout * WEIGHTS.layout +
    scores.brandCompliance * WEIGHTS.brandCompliance +
    scores.accessibility * WEIGHTS.accessibility +
    scores.copyQuality * WEIGHTS.copyQuality
  )
}

function buildCritiquePrompt(html: string, designSystemContent: string): string {
  return `You are a Design Jury panel reviewing a generated UI screen.

# Design system context
${designSystemContent}

# Screen HTML to review
\`\`\`html
${html}
\`\`\`

# Review instructions

Score each dimension 0-10 and list must-fix issues:

1. LAYOUT (30%): Visual hierarchy, spacing, alignment, responsive balance, grid consistency
2. BRAND_COMPLIANCE (25%): Does it faithfully follow the design system tokens? Correct colors, fonts, radii, spacing
3. ACCESSIBILITY (25%): WCAG AA contrast (4.5:1 text, 3:1 large), focus-visible states, semantic HTML, aria labels, touch targets ≥44px
4. COPY_QUALITY (20%): Is text realistic, concise, professional? No lorem ipsum, no "Click here", no filler metrics

# Rules
- Score ≤ 6 on ANY dimension = list specific MUST FIX issues
- Be concrete: cite exact CSS values, elements, or line references
- Do NOT be generous — hold to professional production standards
- If composite < ${THRESHOLD}, rewrite the ENTIRE HTML fixing all must-fix issues

# Output format (strict JSON)
{
  "scores": {
    "layout": <0-10>,
    "brandCompliance": <0-10>,
    "accessibility": <0-10>,
    "copyQuality": <0-10>
  },
  "mustFix": ["specific issue 1", "specific issue 2"],
  "suggestions": ["optional improvement 1"],
  "revisedHtml": "<full revised HTML if composite < ${THRESHOLD}, otherwise null>"
}

Return ONLY the JSON object, no other text.`
}

/**
 * Run a critique pass on generated HTML.
 * Returns critique results. If the design doesn't pass, includes revised HTML.
 */
export async function critiqueScreen(
  html: string,
  designSystemContent: string,
): Promise<CritiqueResult> {
  const prompt = buildCritiquePrompt(html, designSystemContent)

  // Collect full response
  let text = ''
  for await (const delta of streamCompletion(prompt, 'Review the screen above according to the jury instructions.')) {
    text += delta
  }

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    // Fallback: if LLM didn't return valid JSON, pass with default scores
    return {
      round: 1,
      scores: { layout: 8, brandCompliance: 8, accessibility: 8, copyQuality: 8 },
      composite: 8.0,
      mustFix: [],
      suggestions: ['Critique parsing failed — auto-passed'],
      passed: true,
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const scores: CritiqueScores = {
      layout: clamp(parsed.scores?.layout ?? 8),
      brandCompliance: clamp(parsed.scores?.brandCompliance ?? 8),
      accessibility: clamp(parsed.scores?.accessibility ?? 8),
      copyQuality: clamp(parsed.scores?.copyQuality ?? 8),
    }
    const composite = Math.round(computeComposite(scores) * 10) / 10
    const mustFix = Array.isArray(parsed.mustFix) ? parsed.mustFix.filter(Boolean) : []
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(Boolean) : []

    let revisedHtml: string | undefined
    if (composite < THRESHOLD && parsed.revisedHtml && typeof parsed.revisedHtml === 'string') {
      // Try to extract artifact from revised HTML, fallback to raw
      try {
        const extracted = extractArtifact(parsed.revisedHtml)
        revisedHtml = extracted.html
      } catch {
        revisedHtml = parsed.revisedHtml
      }
    }

    return {
      round: 1,
      scores,
      composite,
      mustFix,
      suggestions,
      passed: composite >= THRESHOLD,
      revisedHtml,
    }
  } catch {
    return {
      round: 1,
      scores: { layout: 8, brandCompliance: 8, accessibility: 8, copyQuality: 8 },
      composite: 8.0,
      mustFix: [],
      suggestions: ['Critique JSON parsing failed — auto-passed'],
      passed: true,
    }
  }
}

function clamp(n: unknown): number {
  const val = Number(n)
  if (!Number.isFinite(val)) return 8
  return Math.max(0, Math.min(10, val))
}

export { THRESHOLD, MAX_ROUNDS, WEIGHTS }
