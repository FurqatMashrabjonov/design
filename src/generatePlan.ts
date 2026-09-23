import type { Plan } from './app/Services/PlannerService'

export type PlanEvent =
  | ({ type: 'plan'; screenIds: string[] } & Plan)
  | { type: 'screen_start'; index: number; name: string }
  | { type: 'screen_delta'; index: number; text: string }
  | { type: 'screen_done'; index: number; screenId: string; name: string }
  | { type: 'screen_image'; index: number; query: string; url: string }
  | { type: 'screen_error'; index: number; message: string }
  /** CHAT-08: the plan is drawn up and waits for the person; nothing is being drawn. */
  | { type: 'awaiting' }
  | { type: 'done' }
  | { type: 'error'; message: string }

/** CHAT-08: how a planned run is asked for — plan and wait, or draw a plan the person approved. */
export type PlanRequest =
  /** IMG-01: `images` are data URLs read once on the server and then dropped. */
  | { brief: string; gate?: boolean; images?: string[] }
  | { approve: { keep: number[]; names: Record<number, string> } }

// Streams /api/generate-plan (newline-delimited JSON) and calls onEvent for each line.
export async function generatePlan(projectId: string, request: PlanRequest, onEvent: (e: PlanEvent) => void, signal?: AbortSignal) {
  const res = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, ...request }),
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
