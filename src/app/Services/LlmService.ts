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

/**
 * LLM-04: which provider serves each of our model ids, and the id its API knows it by. Every row
 * needs a PRICES row too (a test holds both tables together): a model we cannot price cannot run.
 * Gemini 2.5 can switch thinking off; Gemini 3 cannot, so it thinks as little as it allows.
 */
export type Provider = 'deepseek' | 'gemini' | 'anthropic'
export type ModelInfo = { provider: Provider; apiModel: string; label: string; reasoningEffort?: string }
export const MODELS: Record<string, ModelInfo> = {
  'deepseek-flash': { provider: 'deepseek', apiModel: 'deepseek-flash', label: 'DeepSeek V4 Flash' },
  'gemini-3.1-flash-lite': { provider: 'gemini', apiModel: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', reasoningEffort: 'minimal' },
  'gemini-2.5-flash': { provider: 'gemini', apiModel: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', reasoningEffort: 'none' },
  'claude-haiku-4-5': { provider: 'anthropic', apiModel: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  'claude-sonnet-5': { provider: 'anthropic', apiModel: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
}

/** One finished model call: how long, whether it worked, what it used. For the spend log (OBS-01). */
export type LlmCall = { provider: string; model: string; ms: number; ok: boolean; error?: string; usage: LlmUsage }
let callListener: ((c: LlmCall) => void | Promise<void>) | undefined
export function onLlmCall(fn: typeof callListener) {
  callListener = fn
}
/** Wraps a call so its duration, outcome and usage are reported once, however it ends — as the model that actually ran. */
async function* tracked(provider: string, model: string, run: (tally: (u: LlmUsage) => void) => AsyncGenerator<string>): AsyncGenerator<string> {
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
    // Awaited, so a call's row is written before the caller moves on (the credit settle reads it).
    await callListener?.({ provider, model, ms: Date.now() - started, ok: !error, error: error?.slice(0, 300), usage })
  }
}

// One listener, set by whoever measures spend (today: eval/run.ts). Called once per completed call.
let usageListener: ((u: LlmUsage) => void) | undefined
export function onLlmUsage(fn: typeof usageListener) {
  usageListener = fn
}
/** Each provider's usage block, in our one shape. */
export const usageOf = {
  deepseek: (u: Record<string, number>): LlmUsage => ({ promptTokens: u.prompt_tokens ?? 0, cachedTokens: u.prompt_cache_hit_tokens ?? 0, completionTokens: u.completion_tokens ?? 0, cacheWriteTokens: 0 }),
  gemini: (u: Record<string, any>): LlmUsage => ({ promptTokens: u.prompt_tokens ?? 0, cachedTokens: u.prompt_tokens_details?.cached_tokens ?? 0, completionTokens: u.completion_tokens ?? 0, cacheWriteTokens: 0 }),
  // Claude's input_tokens leaves out what was read from or written to the cache; ours counts every input token.
  anthropic: (u: Record<string, number>): LlmUsage => {
    const read = u.cache_read_input_tokens ?? 0
    const write = u.cache_creation_input_tokens ?? 0
    return { promptTokens: (u.input_tokens ?? 0) + read + write, cachedTokens: read, cacheWriteTokens: write, completionTokens: u.output_tokens ?? 0 }
  },
}

// The default model this app generates with: DeepSeek V4 Flash. Asked for by name, `deepseek-flash`
// thinks by default; the legacy `deepseek-chat` alias is this same model with thinking off, but an
// alias can be re-pointed, so both the id and the mode are pinned here. LLM-07: an admin may pick
// another model per call site (llm.model.*); this is what applies when none is picked.
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash'
/**
 * ADM-13: where provider keys come from. SecretService registers itself on import (the admin panel's
 * key, else .env); until it does — the plain-node tests, which have no database — it is .env alone.
 */
type KeyName = 'DEEPSEEK_API_KEY' | 'GEMINI_API_KEY' | 'ANTHROPIC_API_KEY'
let keySource: (name: KeyName) => Promise<string | undefined> = async (name) => process.env[name]
export function setKeySource(fn: typeof keySource) {
  keySource = fn
}
const KEY_OF: Record<Provider, { name: KeyName; label: string }> = {
  deepseek: { name: 'DEEPSEEK_API_KEY', label: 'DeepSeek' },
  gemini: { name: 'GEMINI_API_KEY', label: 'Gemini' },
  anthropic: { name: 'ANTHROPIC_API_KEY', label: 'Anthropic' },
}
async function providerKey(p: Provider): Promise<string> {
  const key = await keySource(KEY_OF[p].name)
  if (!key) throw new Error(`No ${KEY_OF[p].label} API key — add one in Admin → Settings → API keys`)
  return key
}

/** BIL-05: the model a credit is priced for when no site is configured. The local CLI (testing only)
 * is billed as the configured model too, so the credit flow can be tried without spending. */
export const BILLED_MODEL = MODEL
// Fail at boot, not after a paid call: a model we cannot price cannot be billed (LLM-05).
if (!PRICES[MODEL] || !MODELS[MODEL]) throw new Error(`DEEPSEEK_MODEL=${MODEL} has no row in PRICES and MODELS`)

/**
 * LLM-07: which model each call site runs on is an admin setting, read at call time. `plan` is the
 * planner (and the reference-picture read), `screen` draws a screen (planned, added, regenerated),
 * `edit` changes one (a patch edit or one element). Settings live in the database, so — like the
 * key — the source is registered by a server module (SecretService); without one, the defaults apply.
 */
export type Site = 'plan' | 'screen' | 'edit'
export const SITES: Site[] = ['plan', 'screen', 'edit']
let settingSource: (key: string) => Promise<string | null | undefined> = async () => undefined
export function setSettingSource(fn: typeof settingSource) {
  settingSource = fn
  settingCache.clear()
}
// A setting is a database read; ten seconds of staleness is fine for a switch an admin flips by hand.
const SETTING_TTL_MS = 10_000
const settingCache = new Map<string, { value: string | null | undefined; at: number }>()
async function setting(key: string) {
  const hit = settingCache.get(key)
  if (hit && Date.now() - hit.at < SETTING_TTL_MS) return hit.value
  const value = await settingSource(key)
  settingCache.set(key, { value, at: Date.now() })
  return value
}
/** After an admin changes a model on this server: the next call reads it (other servers within 10s). */
export function clearLlmSettings() {
  settingCache.clear()
}
/** A model id we can call and price. */
export const isUsableModel = (id: string | null | undefined): id is string => !!id && !!MODELS[id] && !!PRICES[id]
export async function modelFor(site: Site): Promise<string> {
  const v = await setting(`llm.model.${site}`)
  return isUsableModel(v) ? v : MODEL
}
export async function fallbackModel(): Promise<string | undefined> {
  const v = await setting('llm.fallback')
  return isUsableModel(v) ? v : undefined
}

/**
 * ADM-14: the circuit breaker. A model that is Down (ProviderStatsService: at least 5 calls in the last
 * 15 minutes, half of them failed) is skipped for 5 minutes: a site whose primary it is runs straight
 * on the fallback, if one is set and is not Down itself. Then the primary is tried again, and the
 * circuit re-opens only on a failure after that. The health is a database read, so — like settings —
 * its source is registered by a server module and cached 15s; without one no model is ever Down.
 * ponytail: circuit state is in memory, per server process; a shared store if the app runs on several.
 */
export type ModelHealth = { down: boolean; lastFailAt: number } // lastFailAt in ms
let healthSource: (nowMs: number) => Promise<Record<string, ModelHealth>> = async () => ({})
export function setHealthSource(fn: typeof healthSource) {
  healthSource = fn
  healthCache = undefined
  circuits.clear()
}
const HEALTH_TTL_MS = 15_000
export const CIRCUIT_MS = 5 * 60_000
let healthCache: { at: number; value: Promise<Record<string, ModelHealth>> } | undefined
function health(now: number) {
  if (!healthCache || now - healthCache.at >= HEALTH_TTL_MS || now < healthCache.at) healthCache = { at: now, value: healthSource(now).catch(() => ({})) }
  return healthCache.value
}
/** Open circuits: the model skipped, until when (ms), and what ran instead. */
const circuits = new Map<string, { until: number; fallback: string }>()
export const openCircuits = (now = Date.now()) => [...circuits].filter(([, c]) => c.until > now).map(([model, c]) => ({ model, ...c }))

/** The model a site's next call runs on: its primary, or the fallback while the primary's circuit is open. */
export async function effectiveModel(site: Site, now = Date.now()): Promise<{ model: string; primary: string; circuit?: { until: number } }> {
  const primary = await modelFor(site)
  const fallback = await fallbackModel()
  if (!fallback || fallback === primary) return { model: primary, primary }
  const h = await health(now)
  let c = circuits.get(primary)
  if (!(c && now < c.until) && h[primary]?.down && (!c || h[primary]!.lastFailAt > c.until)) {
    c = { until: now + CIRCUIT_MS, fallback }
    circuits.set(primary, c)
  }
  if (!c || now >= c.until || h[fallback]?.down) return { model: primary, primary }
  return { model: fallback, primary, circuit: { until: c.until } }
}

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
// It overrides every site's model and the fallback.
const PROVIDER = process.env.LLM_PROVIDER === 'claude-cli' ? 'claude-cli' : 'deepseek'
const CLI_MODEL = process.env.CLAUDE_CLI_MODEL || 'claude-haiku-4-5-20251001'
function assertLocalProvider() {
  if (process.env.NODE_ENV === 'production') throw new Error('LLM_PROVIDER=claude-cli is for local testing only; unset it in production')
}

/**
 * LLM-02: a reference picture the person attached, as a data URL. `deepseek-flash` reads images
 * natively, so this needs no second provider. An image is charged as prompt tokens and is never a
 * cache hit, so it rides the one request that asked for it — never a whole planned run.
 */
export type RefImage = { dataUrl: string }

// Yields text deltas from the site's model (DeepSeek unless an admin picked another).
// `signal` lets the caller stop the request (and the token spend) when the client goes away.
export async function* streamCompletion(
  system: string,
  user: string,
  signal?: AbortSignal,
  onUsage?: (u: LlmUsage) => void,
  images?: RefImage[],
  site: Site = 'screen',
): AsyncGenerator<string> {
  yield* call(site, 'stream', { system, user, images, signal, maxTokens: 16000, temperature: SCREEN_TEMPERATURE }, onUsage)
}

// Non-streaming, JSON-only completion (planner).
export async function completeJSON(
  system: string,
  user: string,
  maxTokens = 1024,
  onUsage?: (u: LlmUsage) => void,
  images?: RefImage[],
  signal?: AbortSignal,
  site: Site = 'plan',
): Promise<string> {
  let out = ''
  for await (const part of call(site, 'json', { system, user, images, signal, maxTokens, temperature: PLAN_TEMPERATURE }, onUsage)) out += part
  return out
}

/** LLM-04: one request to one provider. `model` is the provider's own id for it. */
export type CallOpts = { model: string; system: string; user: string; images?: RefImage[]; maxTokens: number; temperature: number; signal?: AbortSignal; onUsage: (u: LlmUsage) => void; reasoningEffort?: string }
type Adapter = { stream(o: CallOpts): AsyncGenerator<string>; json(o: CallOpts): Promise<string> }

/**
 * Runs a call on the site's model. LLM-07: if it fails before a single token came back (no key, a
 * network error, 401, 429, 5xx…), it is tried once more on the admin's fallback model; each attempt
 * is its own logged call. Never mid-stream — half a screen from one model and half from another is
 * not a screen. A stop (abort) is never retried.
 */
async function* call(site: Site, mode: 'stream' | 'json', o: Omit<CallOpts, 'model' | 'onUsage'>, onUsage?: (u: LlmUsage) => void): AsyncGenerator<string> {
  const report = (tally: (u: LlmUsage) => void) => (u: LlmUsage) => (tally(u), onUsage?.(u), usageListener?.(u))
  if (PROVIDER === 'claude-cli') {
    yield* tracked('claude-cli', CLI_MODEL, (tally) => viaCli(mode, o, report(tally)))
    return
  }
  const once = (id: string) =>
    tracked(MODELS[id]!.provider, id, (tally) => {
      const m = MODELS[id]!
      const adapter = ADAPTERS[m.provider]
      const opts: CallOpts = { ...o, model: m.apiModel, reasoningEffort: m.reasoningEffort, onUsage: report(tally) }
      return mode === 'stream' ? adapter.stream(opts) : (async function* () { yield await adapter.json(opts) })()
    })
  const pick = await effectiveModel(site)
  const primary = pick.model
  // The row is logged under the model that ran; the reroute is said in the request's server log.
  if (pick.circuit) console.warn(`[llm] circuit open: ${pick.primary} is down, ${site} runs on ${primary} until ${new Date(pick.circuit.until).toISOString()}`)
  let yielded = false
  try {
    for await (const d of once(primary)) {
      yielded = true
      yield d
    }
  } catch (e) {
    const fallback = yielded || o.signal?.aborted ? undefined : await fallbackModel()
    if (!fallback || fallback === primary) throw e
    yield* once(fallback)
  }
}

async function* viaCli(mode: 'stream' | 'json', o: Omit<CallOpts, 'model' | 'onUsage'>, onUsage: (u: LlmUsage) => void): AsyncGenerator<string> {
  if (mode === 'json') {
    let text = ''
    for await (const d of claudeCli(o.system, o.user, o.signal, onUsage)) text += d
    yield jsonOnly(text)
    return
  }
  // The local provider takes text only; the reference picture is described rather than shown.
  const note = o.images?.length ? `${o.user}\n\n(A reference image was attached; the local provider cannot see it.)` : o.user
  yield* claudeCli(o.system, note, o.signal, onUsage)
}

/** The user turn in OpenAI's shape (DeepSeek, Gemini): plain text, or text plus the pictures attached. */
function userContent(user: string, images?: RefImage[]) {
  if (!images?.length) return user
  return [{ type: 'text', text: user }, ...images.map((i) => ({ type: 'image_url', image_url: { url: i.dataUrl } }))]
}
const openaiMessages = (o: CallOpts) => [
  { role: 'system', content: o.system },
  { role: 'user', content: userContent(o.user, o.images) },
]

async function post(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal | undefined, name: string): Promise<Response> {
  const res = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  if (!res.ok || !res.body) throw new Error(`${name} ${res.status}: ${await res.text()}`)
  return res
}

/** The JSON payloads of an SSE body; `: keep-alive` comments, `event:` lines and blanks are skipped. */
async function* sseData(res: Response): AsyncGenerator<any> {
  let buf = ''
  for await (const chunk of res.body!.pipeThrough(new TextDecoderStream())) {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop()!
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      yield JSON.parse(payload)
    }
  }
}

/** Text deltas of an OpenAI-style stream. Usage is reported once, from the last chunk that carried it. */
async function* openaiStream(res: Response, toUsage: (u: any) => LlmUsage, onUsage: (u: LlmUsage) => void): AsyncGenerator<string> {
  let usage: unknown
  try {
    for await (const data of sseData(res)) {
      if (data.usage) usage = data.usage // usage arrives in a final chunk with no choices
      const choice = data.choices?.[0]
      if (choice?.delta?.content) yield choice.delta.content as string
      if (choice?.finish_reason === 'length') throw new Error('Output hit max_tokens, HTML is incomplete. Try a simpler screen.')
    }
  } finally {
    if (usage) onUsage(toUsage(usage))
  }
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const deepseek: Adapter = {
  async *stream(o) {
    const res = await post(DEEPSEEK_URL, { Authorization: `Bearer ${await providerKey('deepseek')}` }, {
      model: o.model,
      thinking: THINKING_OFF,
      // A full HTML screen plus a heavy craft-rules system prompt can run past 8k tokens — DeepSeek allows up to 384k.
      max_tokens: o.maxTokens,
      temperature: o.temperature,
      stream: true,
      stream_options: { include_usage: true }, // usage arrives in a final chunk with no choices
      messages: openaiMessages(o),
    }, o.signal, 'DeepSeek')
    yield* openaiStream(res, usageOf.deepseek, o.onUsage)
  },
  // DeepSeek's response_format:json_object guarantees valid JSON syntax.
  async json(o) {
    const res = await post(DEEPSEEK_URL, { Authorization: `Bearer ${await providerKey('deepseek')}` }, {
      model: o.model,
      thinking: thinkingFor(PLAN_THINKING),
      // Reasoning spends the same output budget as the answer. Measured: with thinking on, the
      // planner burned the whole 4 000-token cap on reasoning and returned half a JSON object
      // ("Unexpected end of JSON input", two briefs drew no screens at all). So the cap grows with
      // the mode rather than leaving a flag that quietly breaks the planner.
      max_tokens: PLAN_THINKING ? Math.max(o.maxTokens, 12000) : o.maxTokens,
      temperature: o.temperature,
      response_format: { type: 'json_object' },
      messages: openaiMessages(o),
    }, o.signal, 'DeepSeek')
    const json = await res.json()
    if (json.usage) o.onUsage(usageOf.deepseek(json.usage))
    return json.choices[0].message.content as string
  },
}

// Gemini through Google's OpenAI-compatible endpoint: the same request shape, the key as a Bearer token.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const geminiBody = (o: CallOpts) => ({ model: o.model, max_tokens: o.maxTokens, temperature: o.temperature, ...(o.reasoningEffort && { reasoning_effort: o.reasoningEffort }), messages: openaiMessages(o) })
const gemini: Adapter = {
  async *stream(o) {
    const res = await post(GEMINI_URL, { Authorization: `Bearer ${await providerKey('gemini')}` }, { ...geminiBody(o), stream: true, stream_options: { include_usage: true } }, o.signal, 'Gemini')
    yield* openaiStream(res, usageOf.gemini, o.onUsage)
  },
  async json(o) {
    const res = await post(GEMINI_URL, { Authorization: `Bearer ${await providerKey('gemini')}` }, { ...geminiBody(o), response_format: { type: 'json_object' } }, o.signal, 'Gemini')
    const json = await res.json()
    if (json.usage) o.onUsage(usageOf.gemini(json.usage))
    return jsonOnly(String(json.choices?.[0]?.message?.content ?? ''))
  },
}

// Claude through the Messages API. The system prompt is one cached block: it is long and the same for
// every screen of a run, so the calls after the first read it at a tenth of the price.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const anthropicHeaders = async () => ({ 'x-api-key': await providerKey('anthropic'), 'anthropic-version': '2023-06-01' })
/** A data URL as a base64 image block; anything else (a remote URL, SVG) is dropped — lib/ref-images.ts admits none. */
function anthropicContent(user: string, images?: RefImage[]) {
  const pics = (images ?? []).flatMap((i) => {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(i.dataUrl)
    return m ? [{ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }] : []
  })
  return [...pics, { type: 'text', text: user }]
}
const anthropicBody = (o: CallOpts) => ({
  model: o.model,
  max_tokens: o.maxTokens,
  // Off, as everywhere (LLM-01): Sonnet 5 thinks unless told not to. No temperature: Sonnet 5 refuses
  // any non-default sampling value (400), and ours is the default, 1.0.
  thinking: THINKING_OFF,
  system: [{ type: 'text', text: o.system, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: anthropicContent(o.user, o.images) }],
})
const anthropic: Adapter = {
  async *stream(o) {
    const res = await post(ANTHROPIC_URL, await anthropicHeaders(), { ...anthropicBody(o), stream: true }, o.signal, 'Anthropic')
    // message_start carries the input side, message_delta the running output count.
    const usage: Record<string, number> = {}
    const add = (u: Record<string, unknown> | undefined) => Object.entries(u ?? {}).forEach(([k, v]) => typeof v === 'number' && (usage[k] = v))
    let stop = ''
    try {
      for await (const ev of sseData(res)) {
        if (ev.type === 'message_start') add(ev.message?.usage)
        else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') yield ev.delta.text as string
        else if (ev.type === 'message_delta') (add(ev.usage), (stop = ev.delta?.stop_reason ?? stop))
        else if (ev.type === 'error') throw new Error(`Anthropic ${ev.error?.type ?? 'error'}: ${ev.error?.message ?? ''}`)
      }
    } finally {
      if (Object.keys(usage).length) o.onUsage(usageOf.anthropic(usage))
    }
    if (stop === 'max_tokens') throw new Error('Output hit max_tokens, HTML is incomplete. Try a simpler screen.')
    if (stop === 'refusal') throw new Error('Anthropic refused the request')
  },
  // No JSON mode: the prompts already ask for JSON, and jsonOnly keeps the object.
  async json(o) {
    const res = await post(ANTHROPIC_URL, await anthropicHeaders(), anthropicBody(o), o.signal, 'Anthropic')
    const json = await res.json()
    if (json.usage) o.onUsage(usageOf.anthropic(json.usage))
    if (json.stop_reason === 'refusal') throw new Error('Anthropic refused the request')
    return jsonOnly((json.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join(''))
  },
}

const ADAPTERS: Record<Provider, Adapter> = { deepseek, gemini, anthropic }

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
          onUsage?.(usageOf.anthropic(ev.usage ?? {}))
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

