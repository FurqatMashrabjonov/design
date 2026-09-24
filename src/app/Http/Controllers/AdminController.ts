import { notFound } from '@tanstack/react-router'
import { AdminStatsService } from '@/app/Services/AdminStatsService'
import { ProjectController } from './ProjectController'
import { Project } from '@/app/Models/Project'
import { User } from '@/app/Models/User'
import { Setting } from '@/app/Models/Setting'
import { AdminAction } from '@/app/Models/AdminAction'
import { Credit } from '@/app/Models/Credit'
import { SecretService, type SecretName } from '@/app/Services/SecretService'
import { isAdmin } from '@/app/Services/AuthService'
import { CSV_MAX_ROWS, toCsv, type CallsQuery, type UsersQuery } from '@/admin/table-query'
import { clearLlmSettings, fallbackModel, isUsableModel, modelFor, MODELS, openCircuits, PRICES, SITES } from '@/app/Services/LlmService'
import { ProviderStatsService } from '@/app/Services/ProviderStatsService'
import { CREDIT_PRICES } from '@/lib/credit-prices'
import { TelescopeService } from '@/app/Services/TelescopeService'
import { BillingController } from './BillingController'

// ADM-01…08. Reads go to AdminStatsService; every write is logged in admin_actions with who did
// it. The caller (server/admin-fns.ts) has already checked that `adminId` is an admin.

const billable = (v: string) => isUsableModel(v) && !!CREDIT_PRICES[v]

/** The settings an admin may change from the panel, and how each value is checked. */
export const ADMIN_SETTINGS = {
  'generation.paused': (v: string) => v === '1',
  'limits.callsPerDay': (v: string) => /^\d{1,6}$/.test(v),
  'limits.dailyBudgetUsd': (v: string) => /^\d{1,5}(\.\d{1,2})?$/.test(v),
  // LLM-07: the model each call site runs on, and the one a failed call is retried on ('' = none).
  // Only a model we can call, price in dollars and charge in credits.
  'llm.model.plan': (v: string) => billable(v),
  'llm.model.screen': (v: string) => billable(v),
  'llm.model.edit': (v: string) => billable(v),
  'llm.fallback': (v: string) => v === '' || billable(v),
} as const
export type AdminSettingKey = keyof typeof ADMIN_SETTINGS

export const AdminController = {
  overview: (days: 1 | 7 | 30) => AdminStatsService.overview(days),
  // An admin by ADMIN_EMAILS shows as one, though their stored role may still be 'user'.
  users: async () => (await AdminStatsService.users()).map((u) => ({ ...u, role: isAdmin(u) ? 'admin' : u.role })),
  async user(id: string) {
    const u = await AdminStatsService.user(id)
    if (!u) throw notFound()
    return { ...u, user: { ...u.user, role: isAdmin(u.user) ? 'admin' : u.user.role } }
  },
  async project(id: string) {
    const p = await Project.find(id)
    if (!p) throw notFound()
    const show = await ProjectController.show(id)
    // Screens are shown through /api/thumb, so their HTML does not travel with the page.
    return {
      project: show.project,
      screens: show.screens.map(({ html, ...s }) => ({ id: s.id, name: s.name, screenType: s.screenType, error: s.error, deletedAt: s.deletedAt, createdAt: s.createdAt, rating: s.rating, drawn: html !== '' })),
      messages: show.messages,
      owner: p.userId ? { id: p.userId, email: (await User.find(p.userId))?.email ?? null } : null,
    }
  },
  generations: () => AdminStatsService.quality(),
  controls: () => AdminStatsService.controls(),
  search: (q: string) => AdminStatsService.search(q),

  async ban(adminId: string, d: { userId: string; reason: string }) {
    const target = await User.find(d.userId)
    if (!target) throw notFound()
    if (d.userId === adminId) throw new Error('You cannot ban yourself')
    await User.setBan(d.userId, true, d.reason || null)
    await AdminAction.log(adminId, 'ban', target.email, d.reason || null)
  },
  async unban(adminId: string, userId: string) {
    const target = await User.find(userId)
    if (!target) throw notFound()
    await User.setBan(userId, false)
    await AdminAction.log(adminId, 'unban', target.email)
  },
  async revokeSessions(adminId: string, userId: string) {
    const target = await User.find(userId)
    if (!target) throw notFound()
    await User.revokeSessions(userId)
    await AdminAction.log(adminId, 'revoke-sessions', target.email)
  },
  async setRole(adminId: string, d: { userId: string; role: 'admin' | 'user' }) {
    const target = await User.find(d.userId)
    if (!target) throw notFound()
    if (d.userId === adminId && d.role !== 'admin') throw new Error('You cannot remove your own admin role')
    await User.setRole(d.userId, d.role)
    await AdminAction.log(adminId, 'set-role', target.email, d.role)
  },
  async setUserLimit(adminId: string, d: { userId: string; limit: number | null }) {
    const target = await User.find(d.userId)
    if (!target) throw notFound()
    await Setting.set(`limits.user.${d.userId}`, d.limit === null ? null : String(d.limit))
    await AdminAction.log(adminId, 'set-user-limit', target.email, d.limit === null ? 'default' : String(d.limit))
  },
  /** ADM-13: provider keys — where each comes from and its last four characters, never the key. */
  secrets: () => SecretService.status(),
  async setSecret(adminId: string, d: { name: SecretName; value: string | null }) {
    await SecretService.set(d.name, d.value, adminId)
    await AdminAction.log(adminId, d.value === null ? 'remove-key' : 'set-key', d.name, d.value === null ? 'back to .env' : `…${d.value.slice(-4)}`)
  },
  testSecret: (name: SecretName) => SecretService.test(name),

  /** BIL-04: credits by hand (a refund, a gift, a correction) — a ledger row, and a log line. */
  async grantCredits(adminId: string, d: { userId: string; amount: number; note: string }) {
    const target = await User.find(d.userId)
    if (!target) throw notFound()
    await Credit.add({ userId: d.userId, delta: d.amount, kind: 'admin', note: d.note || undefined })
    await AdminAction.log(adminId, 'grant-credits', target.email, `${d.amount > 0 ? '+' : ''}${d.amount}${d.note ? ` · ${d.note}` : ''}`)
  },
  /** OBS-12: a stored, verified webhook run through the handler again. Ledger refs make it grant nothing twice. */
  async replayWebhook(adminId: string, id: number) {
    const w = await TelescopeService.webhook(id)
    if (!w) throw notFound()
    if (!w.verified || !w.payload) throw new Error('Only a verified event with a stored payload can be replayed')
    const result = await BillingController.webhook(JSON.parse(w.payload))
    await AdminAction.log(adminId, 'replay-webhook', `${w.provider} #${w.id}${w.eventType ? ` ${w.eventType}` : ''}`, result)
    return { result }
  },
  async setSetting(adminId: string, d: { key: AdminSettingKey; value: string | null }) {
    if (d.value !== null && !ADMIN_SETTINGS[d.key](d.value)) throw new Error('Invalid value')
    await Setting.set(d.key, d.value)
    if (d.key.startsWith('llm.')) clearLlmSettings() // this server reads the new model at once
    await AdminAction.log(adminId, 'set-setting', d.key, d.value ?? 'default')
  },

  /** ADM-11: the tables, one page at a time, and the same filter as CSV (no paging, capped). */
  async usersPage(q: UsersQuery) {
    const r = await AdminStatsService.usersPage(q)
    return { ...r, rows: r.rows.map((u) => ({ ...u, role: isAdmin(u) ? 'admin' : u.role })) }
  },
  callsPage: (q: CallsQuery) => AdminStatsService.callsPage(q),
  async usersCsv(q: UsersQuery) {
    const { rows } = await AdminStatsService.usersPage(q, { limit: CSV_MAX_ROWS, offset: 0 })
    const iso = (s: number | null) => (s ? new Date(s * 1000).toISOString() : '')
    return toCsv(rows, [
      ['id', (u) => u.id], ['email', (u) => u.email], ['name', (u) => u.name], ['role', (u) => (isAdmin(u) ? 'admin' : u.role)], ['banned', (u) => Boolean(u.banned)],
      ['joined', (u) => iso(u.createdAt)], ['last_seen', (u) => iso(u.lastSeen)], ['via', (u) => u.providers ?? 'email'], ['projects', (u) => u.projects],
      ['screens', (u) => u.screens], ['calls_24h', (u) => u.calls24h], ['calls', (u) => u.calls], ['spend_usd', (u) => u.spend], ['credits', (u) => u.credits],
    ])
  },
  async callsCsv(q: CallsQuery) {
    const { rows } = await AdminStatsService.callsPage(q, { limit: CSV_MAX_ROWS, offset: 0 })
    return toCsv(rows, [
      ['id', (c) => c.id], ['time', (c) => new Date(c.createdAt * 1000).toISOString()], ['user', (c) => c.email], ['project', (c) => c.project],
      ['provider', (c) => c.provider], ['model', (c) => c.model], ['action_id', (c) => c.actionId], ['ok', (c) => c.ok],
      ['prompt_tokens', (c) => c.promptTokens], ['cached_tokens', (c) => c.cachedTokens], ['cache_write_tokens', (c) => c.cacheWriteTokens],
      ['completion_tokens', (c) => c.completionTokens], ['cost_usd', (c) => c.costUsd], ['ms', (c) => c.ms], ['error', (c) => c.error],
    ])
  },
  /** LLM-07: the models an admin can pick, for the Providers page — what each costs and whether its key is set. */
  models: () =>
    Promise.all(
      Object.entries(MODELS).map(async ([id, m]) => ({
        id,
        provider: m.provider,
        label: m.label,
        apiModel: m.apiModel,
        prices: PRICES[id] ?? null,
        credits: CREDIT_PRICES[id] ?? null,
        keySet: !!(await SecretService.get(({ deepseek: 'DEEPSEEK_API_KEY', gemini: 'GEMINI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' } as const)[m.provider])),
      })),
    ),
  /** ADM-14: the Providers page — the models, which one each site runs on, their health, open circuits. */
  async providers() {
    const [models, health, sites, fallback] = await Promise.all([
      AdminController.models(),
      ProviderStatsService.health(),
      Promise.all(SITES.map(async (site) => ({ site, model: await modelFor(site) }))),
      fallbackModel(),
    ])
    return { models, health, sites, fallback: fallback ?? null, circuits: openCircuits(), now: Math.floor(Date.now() / 1000) }
  },
}
