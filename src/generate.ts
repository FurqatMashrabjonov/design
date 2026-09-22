import { ERROR_MARK } from './artifact'

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
    /** Fix these render-audit findings on editScreenId in one edit (EYE-02); `prompt` is ignored. */
    fixFindings?: unknown[]
    skill?: string
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
  if (!res.ok || !res.body) throw new Error(await res.text())

  let text = ''
  for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
    text += chunk
    onText(text)
  }
  const err = text.indexOf(ERROR_MARK)
  if (err !== -1) throw new Error(text.slice(err + ERROR_MARK.length).replace(/-->$/, ''))
  return res.headers.get('X-Project-Id')!
}
