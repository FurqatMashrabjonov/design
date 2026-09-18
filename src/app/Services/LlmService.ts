// Yields text deltas from DeepSeek's OpenAI-compatible SSE stream.
export async function* streamCompletion(system: string, user: string) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      // A full HTML screen plus a heavy craft-rules system prompt can run past 8k tokens — DeepSeek allows up to 384k.
      max_tokens: 16000,
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

// Non-streaming, JSON-only completion (planner). DeepSeek's response_format:json_object guarantees valid JSON syntax.
export async function completeJSON(system: string, user: string) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.choices[0].message.content as string
}
