import { eq, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { secrets } from '@/database/schema'
import { open, seal } from './secret-box'
import { setKeySource, setSettingSource } from './LlmService'
import { Setting } from '@/app/Models/Setting'

// ADM-13: the provider keys, entered in the admin panel or, failing that, from the environment. A key
// saved in the panel wins over .env, so a key is rotated without a deploy; removing it falls back.
// Values are sealed at rest and cached decrypted for a minute (a key changed on another server is
// picked up within that); nothing here ever returns a value to the browser.

export const SECRET_NAMES = ['DEEPSEEK_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'PEXELS_API_KEY', 'POLAR_ACCESS_TOKEN', 'POLAR_WEBHOOK_SECRET'] as const
export type SecretName = (typeof SECRET_NAMES)[number]
const LABEL: Record<SecretName, string> = {
  DEEPSEEK_API_KEY: 'DeepSeek',
  GEMINI_API_KEY: 'Google Gemini',
  ANTHROPIC_API_KEY: 'Anthropic (Claude)',
  PEXELS_API_KEY: 'Pexels (photos)',
  POLAR_ACCESS_TOKEN: 'Polar (payments)',
  POLAR_WEBHOOK_SECRET: 'Polar webhook secret',
}

const TTL_MS = 60_000
/** The panel's value per key (undefined: none saved), refreshed after a minute. */
const cache = new Map<SecretName, { value: string | undefined; at: number }>()
const tail = (v: string) => v.slice(-4)

export const SecretService = {
  /** The key in force: the panel's, else the environment's, else undefined. */
  async get(name: SecretName): Promise<string | undefined> {
    let hit = cache.get(name)
    if (!hit || Date.now() - hit.at >= TTL_MS) {
      const row = (await db.select({ sealed: secrets.sealed }).from(secrets).where(eq(secrets.name, name)))[0]
      let value: string | undefined
      if (row) {
        try {
          value = open(row.sealed)
        } catch (e) {
          // A row sealed with another SECRETS_KEY cannot be read: say so, and fall back to .env.
          console.error(`[secrets] ${name} could not be decrypted (${e instanceof Error ? e.message : e}); using the environment`)
        }
      }
      hit = { value, at: Date.now() }
      cache.set(name, hit)
    }
    // Only the panel's value is cached; the environment is read as it is now.
    return hit.value ?? (process.env[name] || undefined)
  },

  /** Saves (sealed) or, with null, removes the panel's key — the environment's applies again. */
  async set(name: SecretName, value: string | null, adminId: string) {
    if (value === null) await db.delete(secrets).where(eq(secrets.name, name))
    else {
      const row = { name, sealed: seal(value), last4: tail(value), updatedBy: adminId, updatedAt: Math.floor(Date.now() / 1000) }
      await db.insert(secrets).values(row).onConflictDoUpdate({ target: secrets.name, set: row })
    }
    cache.delete(name)
  },

  /** What the panel shows: where each key comes from and its last four characters — never the key. */
  async status() {
    const rows = await db
      .select({ name: secrets.name, last4: secrets.last4, updatedAt: secrets.updatedAt, updatedBy: sql<string | null>`(SELECT email FROM "user" u WHERE u.id = ${secrets.updatedBy})` })
      .from(secrets)
    return SECRET_NAMES.map((name) => {
      const saved = rows.find((r) => r.name === name)
      const env = process.env[name]
      return {
        name,
        label: LABEL[name],
        source: saved ? ('admin' as const) : env ? ('env' as const) : ('missing' as const),
        last4: saved ? saved.last4 : env ? tail(env) : null,
        updatedAt: saved?.updatedAt ?? null,
        updatedBy: saved?.updatedBy ?? null,
      }
    })
  },

  /**
   * "Test connection": one cheap authenticated read against the provider. Only the outcome travels
   * back — never a response body, which could echo a URL with the key in it.
   */
  async test(name: SecretName): Promise<{ ok: boolean; detail: string }> {
    const key = await SecretService.get(name)
    if (!key) return { ok: false, detail: 'No key set' }
    const polar = process.env.POLAR_SERVER === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh'
    const probe: Record<SecretName, (() => Promise<Response>) | null> = {
      DEEPSEEK_API_KEY: () => fetch('https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${key}` } }),
      GEMINI_API_KEY: () => fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } }),
      ANTHROPIC_API_KEY: () => fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } }),
      PEXELS_API_KEY: () => fetch('https://api.pexels.com/v1/search?query=test&per_page=1', { headers: { Authorization: key } }),
      POLAR_ACCESS_TOKEN: () => fetch(`${polar}/v1/organizations/`, { headers: { Authorization: `Bearer ${key}` } }),
      POLAR_WEBHOOK_SECRET: null,
    }
    const run = probe[name]
    if (!run) return /^whsec_[A-Za-z0-9+/=]{16,}$/.test(key) ? { ok: true, detail: 'Looks like a webhook secret (checked on the next webhook)' } : { ok: false, detail: 'Expected whsec_…' }
    try {
      const res = await run()
      if (res.ok) return { ok: true, detail: `Connected (${res.status})` }
      // A read that carries nothing but the key: 400 (Gemini's answer to a bad key), 401 or 403 all mean the key.
      return { ok: false, detail: [400, 401, 403].includes(res.status) ? `Rejected by the provider (${res.status})` : `Provider answered ${res.status}` }
    } catch {
      return { ok: false, detail: 'Could not reach the provider' }
    }
  },
}

// The model calls read their key through here (LlmService stays free of the database).
setKeySource((name) => SecretService.get(name))
// LLM-07: …and the model each call site runs on (llm.model.*, llm.fallback), which an admin sets.
setSettingSource((key) => Setting.get(key))
