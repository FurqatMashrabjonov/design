import { completeJSON } from './LlmService.ts'

// ponytail: this is a structured-JSON task, not a rendering skill — no craft/design-system injection needed,
// so it skips the SKILL.md ceremony PromptComposer uses for screen generation and just hardcodes its prompt.
const PLANNER_PROMPT = `You are a product design lead scoping a small app from a one-line brief.
Given the brief, propose 3 to 5 screens that together cover the app's core flow — each screen a distinct job, no two screens doing the same thing.

Respond with JSON only, exactly this shape:
{
  "appName": "Short product name, 2-4 words",
  "summary": "One or two sentences describing the app and its visual direction",
  "tags": ["3 to 6 short tags, e.g. dark, playful, fintech, mobile"],
  "screens": [{ "name": "Screen name", "description": "What this screen shows and does, specific enough to design from" }]
}
No prose outside the JSON.`

export type Plan = {
  appName: string
  summary: string
  tags: string[]
  screens: { name: string; description: string }[]
}

// Exported for tests — no network. Throws on malformed/empty output; callers decide whether to retry.
export function parsePlan(raw: string): Plan {
  const plan = JSON.parse(raw)
  if (!Array.isArray(plan.screens) || plan.screens.length === 0) throw new Error('Planner returned no screens')
  return {
    appName: String(plan.appName ?? 'Untitled').slice(0, 60),
    summary: String(plan.summary ?? '').slice(0, 400),
    tags: Array.isArray(plan.tags) ? plan.tags.slice(0, 6).map(String) : [],
    screens: plan.screens
      .slice(0, 5)
      .map((s: { name?: unknown; description?: unknown }) => ({
        name: String(s?.name ?? 'Screen').slice(0, 60),
        description: String(s?.description ?? '').slice(0, 500),
      })),
  }
}

export async function planScreens(brief: string, device: string): Promise<Plan> {
  const raw = await completeJSON(PLANNER_PROMPT, `Brief: ${brief}\nPlatform: ${device}`)
  return parsePlan(raw)
}

// One retry on malformed JSON or an empty screen list — DeepSeek's json_object mode guarantees syntax but not shape.
export async function planScreensWithRetry(brief: string, device: string): Promise<Plan> {
  try {
    return await planScreens(brief, device)
  } catch {
    return await planScreens(brief, device)
  }
}
