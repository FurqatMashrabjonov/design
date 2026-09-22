import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

export type LlmUsage = { promptTokens: number; cachedTokens: number; completionTokens: number }

// DeepSeek list prices, USD per million tokens — for estimates in the eval and the spend log.
export const PRICE = {
  cached: Number(process.env.LLM_PRICE_IN_CACHED ?? 0.07),
  input: Number(process.env.LLM_PRICE_IN ?? 0.27),
  output: Number(process.env.LLM_PRICE_OUT ?? 1.1),
}
export const costOf = (u: LlmUsage) => ((u.promptTokens - u.cachedTokens) * PRICE.input + u.cachedTokens * PRICE.cached + u.completionTokens * PRICE.output) / 1e6

/** One finished model call: how long, whether it worked, what it used. For the spend log (OBS-01). */
export type LlmCall = { provider: string; ms: number; ok: boolean; error?: string; usage: LlmUsage }
let callListener: ((c: LlmCall) => void) | undefined
export function onLlmCall(fn: typeof callListener) {
  callListener = fn
}
/** Wraps a call so its duration, outcome and usage are reported once, however it ends. */
async function* tracked(run: (tally: (u: LlmUsage) => void) => AsyncGenerator<string>): AsyncGenerator<string> {
  const started = Date.now()
  const usage: LlmUsage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0 }
  const tally = (u: LlmUsage) => {
    usage.promptTokens += u.promptTokens
    usage.cachedTokens += u.cachedTokens
    usage.completionTokens += u.completionTokens
  }
  let error: string | undefined
  try {
    yield* run(tally)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    throw e
  } finally {
    callListener?.({ provider: PROVIDER, ms: Date.now() - started, ok: !error, error: error?.slice(0, 300), usage })
  }
}

// One listener, set by whoever measures spend (today: eval/run.ts). Called once per completed call.
let usageListener: ((u: LlmUsage) => void) | undefined
export function onLlmUsage(fn: typeof usageListener) {
  usageListener = fn
}
function reportUsage(u: Record<string, number> | undefined, also?: (u: LlmUsage) => void) {
  if (!u) return
  const usage = { promptTokens: u.prompt_tokens ?? 0, cachedTokens: u.prompt_cache_hit_tokens ?? 0, completionTokens: u.completion_tokens ?? 0 }
  also?.(usage) // the caller's own tally (one request's agent log)
  usageListener?.(usage)
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

// LLM_PROVIDER=claude-cli: for local testing only, generation runs through the developer's own
// Claude Code login (`claude -p`) instead of DeepSeek, so trying things out costs no API balance.
// Never in production — a subscription is personal and cannot serve other people's requests. Evals
// may run on it (the user's call, 2026-09-22), tagged by provider and compared only with each other.
const PROVIDER = process.env.LLM_PROVIDER === 'claude-cli' ? 'claude-cli' : 'deepseek'
function assertLocalProvider() {
  if (process.env.NODE_ENV === 'production') throw new Error('LLM_PROVIDER=claude-cli is for local testing only; unset it in production')
}

// Yields text deltas from DeepSeek's OpenAI-compatible SSE stream.
// `signal` lets the caller stop the request (and the token spend) when the client goes away.
export async function* streamCompletion(system: string, user: string, signal?: AbortSignal, onUsage?: (u: LlmUsage) => void): AsyncGenerator<string> {
  yield* tracked((tally) => rawStream(system, user, signal, (u) => (tally(u), onUsage?.(u))))
}

async function* rawStream(system: string, user: string, signal?: AbortSignal, onUsage?: (u: LlmUsage) => void): AsyncGenerator<string> {
  if (PROVIDER === 'claude-cli') {
    yield* claudeCli(system, user, signal, onUsage)
    return
  }
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
      reportUsage(data.usage, onUsage)
      const choice = data.choices?.[0]
      if (choice?.delta?.content) yield choice.delta.content as string
      if (choice?.finish_reason === 'length') throw new Error('Output hit max_tokens, HTML is incomplete. Try a simpler screen.')
    }
  }
}

// Non-streaming, JSON-only completion (planner). DeepSeek's response_format:json_object guarantees valid JSON syntax.
export async function completeJSON(system: string, user: string, maxTokens = 1024, onUsage?: (u: LlmUsage) => void): Promise<string> {
  let out = ''
  for await (const part of tracked(async function* (tally) {
    yield await rawJSON(system, user, maxTokens, (u) => (tally(u), onUsage?.(u)))
  })) out += part
  return out
}

async function rawJSON(system: string, user: string, maxTokens = 1024, onUsage?: (u: LlmUsage) => void): Promise<string> {
  if (PROVIDER === 'claude-cli') {
    let text = ''
    for await (const d of claudeCli(system, user, undefined, onUsage)) text += d
    return jsonOnly(text)
  }
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      thinking: THINKING,
      max_tokens: maxTokens,
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
  reportUsage(json.usage, onUsage)
  return json.choices[0].message.content as string
}

/** Claude has no JSON mode: keep what lies between the first { and the last }, fences and prose dropped. */
export function jsonOnly(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text
}

/**
 * One headless Claude Code turn: no tools, no settings, hooks, MCP servers or session files, run
 * from a temp dir so no project CLAUDE.md is read, with our system prompt replacing Claude Code's.
 * The user message goes in on stdin (it can be long); text deltas come back as stream-json events.
 */
async function* claudeCli(system: string, user: string, signal?: AbortSignal, onUsage?: (u: LlmUsage) => void): AsyncGenerator<string> {
  assertLocalProvider()
  const args = ['-p', '--output-format', 'stream-json', '--include-partial-messages', '--verbose', '--tools', '', '--system-prompt', system, '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence', '--disable-slash-commands']
  if (process.env.CLAUDE_CLI_MODEL) args.push('--model', process.env.CLAUDE_CLI_MODEL)
  // Without an API key in its environment the CLI uses the logged-in subscription, never API billing.
  const { ANTHROPIC_API_KEY: _key, ...env } = process.env
  const child = spawn(process.env.CLAUDE_CLI_BIN || 'claude', args, { cwd: tmpdir(), env, stdio: ['pipe', 'pipe', 'pipe'] })
  const stop = () => child.kill('SIGTERM')
  signal?.addEventListener('abort', stop, { once: true })
  let stderr = ''
  child.stderr.on('data', (d) => (stderr += d))
  const exited = new Promise<number>((resolve, reject) => {
    child.on('error', (e) => reject(new Error(`Could not start the claude CLI (${e.message}). Is Claude Code installed and logged in?`)))
    child.on('close', (code) => resolve(code ?? 0))
  })
  child.stdin.end(user)

  let buf = ''
  let stopReason = ''
  try {
    for await (const chunk of child.stdout) {
      buf += chunk
      const lines = buf.split('\n')
      buf = lines.pop()!
      for (const line of lines) {
        if (!line.trim()) continue
        let ev: any
        try {
          ev = JSON.parse(line)
        } catch {
          continue
        }
        if (ev.type === 'stream_event' && ev.event?.type === 'content_block_delta' && ev.event.delta?.type === 'text_delta') yield ev.event.delta.text as string
        else if (ev.type === 'stream_event' && ev.event?.type === 'message_delta') stopReason = ev.event.delta?.stop_reason ?? stopReason
        else if (ev.type === 'result') {
          const u = ev.usage ?? {}
          reportUsage({ prompt_tokens: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), prompt_cache_hit_tokens: u.cache_read_input_tokens ?? 0, completion_tokens: u.output_tokens ?? 0 }, onUsage)
          if (ev.is_error) throw new Error(`Claude CLI: ${String(ev.result ?? ev.subtype).slice(0, 300)}`)
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', stop)
  }
  const code = await exited
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (code !== 0) throw new Error(`Claude CLI exited with ${code}: ${stderr.slice(0, 300)}`)
  if (stopReason === 'max_tokens') throw new Error('Output hit max_tokens, HTML is incomplete. Try a simpler screen.')
}

