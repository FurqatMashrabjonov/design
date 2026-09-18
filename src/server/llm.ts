import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DS_DIR = join(process.cwd(), 'design-systems')

// Label = first "# " heading of DESIGN.md
export function listDesignSystems() {
  return readdirSync(DS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ id: d.name, name: readFileSync(join(DS_DIR, d.name, 'DESIGN.md'), 'utf8').match(/^#\s+(.+)$/m)?.[1] ?? d.name }))
}

// Yields text deltas from DeepSeek's OpenAI-compatible SSE stream.
export async function* streamCompletion(system: string, user: string) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      max_tokens: 8192,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok || !res.body) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`)

  let buf = ''
  for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop()!
    for (const line of lines) {
      if (!line.startsWith('data:')) continue // skips ": keep-alive" comments and blank lines
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      const choice = JSON.parse(payload).choices?.[0]
      if (choice?.delta?.content) yield choice.delta.content as string
      if (choice?.finish_reason === 'length') throw new Error('Output hit max_tokens, HTML is incomplete. Try a simpler screen.')
    }
  }
}
