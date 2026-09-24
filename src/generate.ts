import { ERROR_MARK } from './artifact'
import { creditsChanged, failFrom } from './credits'

export async function generate(
  body: {
    prompt: string
    projectId?: string
    device?: string
    designSystem?: string
    editScreenId?: string
    editElementId?: string
    /** Redraw this screen from its stored spec (also how a failed screen is retried); `prompt` is ignored. */
    regenerateScreenId?: string
    /** LLM-02: reference pictures for this one request, as data URLs ("make it look like this"). */
    images?: string[]
  },
  onText: (text: string) => void,
  signal?: AbortSignal,
) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) return failFrom(res)

  let text = ''
  try {
    for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
      text += chunk
      onText(text)
    }
  } finally {
    creditsChanged() // spent, or refunded if it failed
  }
  const err = text.indexOf(ERROR_MARK)
  if (err !== -1) throw new Error(text.slice(err + ERROR_MARK.length).replace(/-->$/, ''))
  return res.headers.get('X-Project-Id')!
}
