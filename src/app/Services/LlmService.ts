import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

/** Tokens one call used. `promptTokens` counts every input token; `cachedTokens` (cache reads) and
 * `cacheWriteTokens` (cache writes — Claude bills them above the base rate) are parts of it. */
export type LlmUsage = { promptTokens: number; cachedTokens: number; completionTokens: number; cacheWriteTokens?: number }

/**
 * LLM-05: list prices in USD per million tokens, by model (checked 2026-09-24 on each provider's
 * pricing page). Credits are priced against these, so a model with no row here cannot be priced
 * and costOf refuses it rather than calling it free. DeepSeek bills by the clock: every rate doubles
 * in its peak hours (`peak`). Claude charges a cache write at 1.25× input.
 */
type Price = { input: number; cached: number; output: number; cacheWrite?: number; peak?: true }
export const PRICES: Record<string, Price> = {
  'deepseek-flash': { input: 0.15, cached: 0.003, output: 0.6, peak: true },
  'gemini-3.1-flash-lite': { input: 0.25, cached: 0.025, output: 1.5 },
  'gemini-2.5-flash': { input: 0.3, cached: 0.03, output: 2.5 },
  'claude-haiku-4-5': { input: 1, cached: 0.1, cacheWrite: 1.25, output: 5 },
  'claude-sonnet-5': { input: 2, cached: 0.2, cacheWrite: 2.5, output: 10 },
}
/** The generating model's base (off-peak) rate — what the eval's estimate uses. */
export const PRICE = PRICES['deepseek-flash']!

/** DeepSeek peak hours: 01:00–04:00 and 06:00–10:00 UTC, Monday to Friday. */
export function isPeak(at: Date = new Date()): boolean {
  const day = at.getUTCDay()
  if (day === 0 || day === 6) return false
  const h = at.getUTCHours()
  return (h >= 1 && h < 4) || (h >= 6 && h < 10)
}

export function costOf(u: LlmUsage, model: string, at: Date = new Date()): number {
  const p = PRICES[model]
  if (!p) throw new Error(`No price for model "${model}" — add it to PRICES before it generates`)
  const k = p.peak && isPeak(at) ? 2 : 1
  const writes = u.cacheWriteTokens ?? 0
  return (k * ((u.promptTokens - u.cachedTokens - writes) * p.input + u.cachedTokens * p.cached + writes * (p.cacheWrite ?? p.input) + u.completionTokens * p.output)) / 1e6
}

/** One finished model call: how long, whether it worked, what it used. For the spend log (OBS-01). */
export type LlmCall = { provider: string; model: string; ms: number; ok: boolean; error?: string; usage: LlmUsage }
let callListener: ((c: LlmCall) => void) | undefined
export function onLlmCall(fn: typeof callListener) {
  callListener = fn
}
/** Wraps a call so its duration, outcome and usage are reported once, however it ends. */
async function* tracked(run: (tally: (u: LlmUsage) => void) => AsyncGenerator<string>): AsyncGenerator<string> {
  const started = Date.now()
  const usage: LlmUsage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0, cacheWriteTokens: 0 }
  const tally = (u: LlmUsage) => {
    usage.promptTokens += u.promptTokens
    usage.cachedTokens += u.cachedTokens
    usage.completionTokens += u.completionTokens
    usage.cacheWriteTokens! += u.cacheWriteTokens ?? 0
  }
  let error: string | undefined
  try {
    yield* run(tally)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    throw e
  } finally {
    callListener?.({ provider: PROVIDER, model: CALL_MODEL, ms: Date.now() - started, ok: !error, error: error?.slice(0, 300), usage })
  }
}

// One listener, set by whoever measures spend (today: eval/run.ts). Called once per completed call.
let usageListener: ((u: LlmUsage) => void) | undefined
export function onLlmUsage(fn: typeof usageListener) {
  usageListener = fn
}
function reportUsage(u: Record<string, number> | undefined, also?: (u: LlmUsage) => void) {
  if (!u) return
  const usage = { promptTokens: u.prompt_tokens ?? 0, cachedTokens: u.prompt_cache_hit_tokens ?? 0, completionTokens: u.completion_tokens ?? 0, cacheWriteTokens: u.cache_write_tokens ?? 0 }
  also?.(usage) // the caller's own tally (one request's agent log)
  usageListener?.(usage)
}

// The one model this app generates with: DeepSeek V4 Flash. Asked for by name, `deepseek-flash`
// thinks by default; the legacy `deepseek-chat` alias is this same model with thinking off, but an
// alias can be re-pointed, so both the id and the mode are pinned here.
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash'
// Fail at boot, not after a paid call: a model we cannot price cannot be billed (LLM-05).
if (!PRICES[MODEL]) throw new Error(`DEEPSEEK_MODEL=${MODEL} has no row in PRICES`)

/**
 * LLM-01: thinking is decided per call site, not once for the process.
 *
 * Reasoning tokens are billed as output, and output is the expensive half of a generated app
 * (~47k of ~86k tokens). Measured on one plan: thinking on cost 8 924 output tokens and 89s,
 * off cost 2 075 and 17s. So it stays off for the six or seven screen calls, where correctness is
 * held by code anyway — and goes on for the planner, which runs once per app and is the one call
 * that makes real decisions (which screens, which tabs, which data).
 */
const THINKING_OFF = { type: 'disabled' } as const
const THINKING_ON = { type: 'enabled' } as const
const thinkingFor = (on: boolean) => (on ? THINKING_ON : THINKING_OFF)
/**
 * Off by default, including for the planner. Measured on the same brief (food-delivery):
 * off — 6 screens, 8.8s, 2 283 output tokens; on — 5 screens, 43.6s, 10 658 tokens. Five times the
 * output for a smaller plan and five times the wait, and a 4-briefs A/B moved no plan metric in its
 * favour. `LLM_PLAN_THINKING=1` is kept so the question can be re-asked when the model changes.
 */
const PLAN_THINKING = process.env.LLM_PLAN_THINKING === '1'

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
const CLI_MODEL = process.env.CLAUDE_CLI_MODEL || 'claude-haiku-4-5-20251001'
/** The model every call of this process is logged and priced as. */
const CALL_MODEL = PROVIDER === 'claude-cli' ? CLI_MODEL : MODEL
function assertLocalProvider() {
  if (process.env.NODE_ENV === 'production') throw new Error('LLM_PROVIDER=claude-cli is for local testing only; unset it in production')
}

/**
 * LLM-02: a reference picture the person attached, as a data URL. `deepseek-flash` reads images
 * natively, so this needs no second provider. An image is charged as prompt tokens and is never a
 * cache hit, so it rides the one request that asked for it — never a whole planned run.
 */
export type RefImage = { dataUrl: string }

// Yields text deltas from DeepSeek's OpenAI-compatible SSE stream.
// `signal` lets the caller stop the request (and the token spend) when the client goes away.
export async function* streamCompletion(
  system: string,
  user: string,
  signal?: AbortSignal,
  onUsage?: (u: LlmUsage) => void,
  images?: RefImage[],
): AsyncGenerator<string> {
  yield* tracked((tally) => rawStream(system, user, signal, (u) => (tally(u), onUsage?.(u)), images))
}

/** The user turn: plain text, or text plus the pictures the person attached. */
function userContent(user: string, images?: RefImage[]) {
  if (!images?.length) return user
  return [{ type: 'text', text: user }, ...images.map((i) => ({ type: 'image_url', image_url: { url: i.dataUrl } }))]
}

async function* rawStream(system: string, user: string, signal?: AbortSignal, onUsage?: (u: LlmUsage) => void, images?: RefImage[]): AsyncGenerator<string> {
  if (PROVIDER === 'claude-cli') {
    // The local provider takes text only; the reference picture is described rather than shown.
    const note = images?.length ? `${user}\n\n(A reference image was attached; the local provider cannot see it.)` : user
    yield* claudeCli(system, note, signal, onUsage)
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
      thinking: THINKING_OFF,
      // A full HTML screen plus a heavy craft-rules system prompt can run past 8k tokens — DeepSeek allows up to 384k.
      max_tokens: 16000,
      temperature: SCREEN_TEMPERATURE,
      stream: true,
      stream_options: { include_usage: true }, // usage arrives in a final chunk with no choices
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent(user, images) },
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
export async function completeJSON(
  system: string,
  user: string,
  maxTokens = 1024,
  onUsage?: (u: LlmUsage) => void,
  images?: RefImage[],
  signal?: AbortSignal,
): Promise<string> {
  let out = ''
  for await (const part of tracked(async function* (tally) {
    yield await rawJSON(system, user, maxTokens, (u) => (tally(u), onUsage?.(u)), images, signal)
  })) out += part
  return out
}

async function rawJSON(system: string, user: string, maxTokens = 1024, onUsage?: (u: LlmUsage) => void, images?: RefImage[], signal?: AbortSignal): Promise<string> {
  if (PROVIDER === 'claude-cli') {
    let text = ''
    for await (const d of claudeCli(system, user, signal, onUsage)) text += d
    return jsonOnly(text)
  }
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      thinking: thinkingFor(PLAN_THINKING),
      // Reasoning spends the same output budget as the answer. Measured: with thinking on, the
      // planner burned the whole 4 000-token cap on reasoning and returned half a JSON object
      // ("Unexpected end of JSON input", two briefs drew no screens at all). So the cap grows with
      // the mode rather than leaving a flag that quietly breaks the planner.
      max_tokens: PLAN_THINKING ? Math.max(maxTokens, 12000) : maxTokens,
      temperature: PLAN_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent(user, images) },
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
  // Haiku by default: local testing is about seeing a change land, and a screen that takes a minute
  // to draw is not a test. CLAUDE_CLI_MODEL overrides it when a run needs the bigger model.
  args.push('--model', CLI_MODEL)
  // Without an API key in its environment the CLI uses the logged-in subscription, never API billing.
  // Thinking is off, as it is on DeepSeek: with it on, Haiku spent 8 900 output tokens and 89s on one
  // plan instead of 3 100 and 32s, which reads as a hang. MAX_THINKING_TOKENS from the environment wins.
  const { ANTHROPIC_API_KEY: _key, ...rest } = process.env
  const env = { ...rest, MAX_THINKING_TOKENS: process.env.MAX_THINKING_TOKENS ?? '0' }
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
          reportUsage({ prompt_tokens: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), prompt_cache_hit_tokens: u.cache_read_input_tokens ?? 0, cache_write_tokens: u.cache_creation_input_tokens ?? 0, completion_tokens: u.output_tokens ?? 0 }, onUsage)
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

