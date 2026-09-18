import { ERROR_MARK } from './artifact'

// Streams /api/generate. onText gets the full text so far. Resolves with the project id once saved.
export async function generate(
  body: { prompt: string; projectId?: string; device?: string; designSystem?: string; editScreenId?: string },
  onText: (text: string) => void,
) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
