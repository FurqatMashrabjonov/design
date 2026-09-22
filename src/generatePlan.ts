import type { Plan } from './app/Services/PlannerService'

export type PlanEvent =
  | ({ type: 'plan'; screenIds: string[] } & Plan)
  | { type: 'screen_start'; index: number; name: string }
  | { type: 'screen_delta'; index: number; text: string }
  | { type: 'screen_done'; index: number; screenId: string; name: string }
  | { type: 'screen_image'; index: number; query: string; url: string }
  | { type: 'screen_error'; index: number; message: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

// Streams /api/generate-plan (newline-delimited JSON) and calls onEvent for each line.
export async function generatePlan(projectId: string, brief: string, onEvent: (e: PlanEvent) => void, signal?: AbortSignal) {
  const res = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, brief }),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(await res.text())

  let buf = ''
  for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop()!
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line))
    }
  }
}
