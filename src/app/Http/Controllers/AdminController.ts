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

// ADM-01…08. Reads go to AdminStatsService; every write is logged in admin_actions with who did
// it. The caller (server/admin-fns.ts) has already checked that `adminId` is an admin.

/** The settings an admin may change from the panel, and how each value is checked. */
export const ADMIN_SETTINGS = {
  'generation.paused': (v: string) => v === '1',
  'limits.callsPerDay': (v: string) => /^\d{1,6}$/.test(v),
  'limits.dailyBudgetUsd': (v: string) => /^\d{1,5}(\.\d{1,2})?$/.test(v),
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
  generations: async (f: { onlyErrors?: boolean }) => ({ calls: await AdminStatsService.calls(f), ...(await AdminStatsService.quality()) }),
  controls: () => AdminStatsService.controls(),

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
  async setSetting(adminId: string, d: { key: AdminSettingKey; value: string | null }) {
    if (d.value !== null && !ADMIN_SETTINGS[d.key](d.value)) throw new Error('Invalid value')
    await Setting.set(d.key, d.value)
    await AdminAction.log(adminId, 'set-setting', d.key, d.value ?? 'default')
  },

}
