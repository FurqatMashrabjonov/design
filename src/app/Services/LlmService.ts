export type LlmUsage = { promptTokens: number; cachedTokens: number; completionTokens: number }

// One listener, set by whoever measures spend (today: eval/run.ts). Called once per completed call.
let usageListener: ((u: LlmUsage) => void) | undefined
export function onLlmUsage(fn: typeof usageListener) {
  usageListener = fn
}
function reportUsage(u: Record<string, number> | undefined) {
  if (!u || !usageListener) return
  usageListener({ promptTokens: u.prompt_tokens ?? 0, cachedTokens: u.prompt_cache_hit_tokens ?? 0, completionTokens: u.completion_tokens ?? 0 })
}

// The one model this app generates with: DeepSeek V4 Flash, thinking off. Asked for by name,
// `deepseek-flash` thinks by default (reasoning tokens are billed as output and delay the first
// byte of a stream); the legacy `deepseek-chat` alias is this same model with thinking off, but an
// alias can be re-pointed, so both the id and the mode are pinned here.
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash'
const THINKING = { type: 'disabled' } as const

// Sampling temperatures, stated rather than inherited from the provider's default. 1.0 was kept after
// an eval A/B (4 briefs, 20 screens each): 0.6 and 1.3 moved no metric beyond noise — lint-clean
// 0.90 / 0.95 / 0.95, cross-app sameness 0.133 / 0.127 / 0.137, same speed and output size. Variety has
// to come from code (VAR-01/02), not from sampling. The env overrides exist for such A/B runs only.
const SCREEN_TEMPERATURE = Number(process.env.LLM_TEMPERATURE_SCREEN ?? 1.0)
const PLAN_TEMPERATURE = Number(process.env.LLM_TEMPERATURE_PLAN ?? 1.0)

// Yields text deltas from DeepSeek's OpenAI-compatible SSE stream.
// `signal` lets the caller stop the request (and the token spend) when the client goes away.
export async function* streamCompletion(system: string, user: string, signal?: AbortSignal) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      thinking: THINKING,
      // A full HTML screen plus a heavy craft-rules system prompt can run past 8k tokens — DeepSeek allows up to 384k.
      max_tokens: 16000,
      temperature: SCREEN_TEMPERATURE,
      stream: true,
      stream_options: { include_usage: true }, // usage arrives in a final chunk with no choices
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
      const data = JSON.parse(payload)
      reportUsage(data.usage)
      const choice = data.choices?.[0]
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
      model: MODEL,
      thinking: THINKING,
      max_tokens: 1024,
      temperature: PLAN_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`)
  const json = await res.json()
  reportUsage(json.usage)
  return json.choices[0].message.content as string
}
