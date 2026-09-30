import { creditsChanged, failFrom } from './credits'

export type PlanEvent =
  | { type: 'plan'; appName: string; screenIds: string[]; screens: { name: string; kind: string }[] }
  | { type: 'screen_start'; index: number; name: string }
  | { type: 'screen_done'; index: number; screenId: string; name: string }
  | { type: 'screen_error'; index: number; message: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type PlanRequest = { brief: string; images?: string[] }

// Streams /api/generate-plan (newline-delimited JSON) and calls onEvent for each line.
export async function generatePlan(projectId: string, request: PlanRequest, onEvent: (e: PlanEvent) => void, signal?: AbortSignal) {
  const res = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, ...request }),
    signal,
  })
  if (!res.ok || !res.body) return failFrom(res)

  let buf = ''
  try {
    for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
      buf += chunk
      const lines = buf.split('\n')
      buf = lines.pop()!
      for (const line of lines) {
        if (line.trim()) onEvent(JSON.parse(line))
      }
    }
  } finally {
    creditsChanged() // spent, or refunded for what was not drawn
  }
}
