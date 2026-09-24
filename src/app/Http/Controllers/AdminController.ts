import { notFound } from '@tanstack/react-router'
import { AdminStatsService } from '@/app/Services/AdminStatsService'
import { ProjectController } from './ProjectController'
import { Project } from '@/app/Models/Project'
import { User } from '@/app/Models/User'
import { Setting } from '@/app/Models/Setting'
import { AdminAction } from '@/app/Models/AdminAction'
import { Credit } from '@/app/Models/Credit'
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
  users: () => AdminStatsService.users().map((u) => ({ ...u, role: isAdmin(u) ? 'admin' : u.role })),
  user(id: string) {
    const u = AdminStatsService.user(id)
    if (!u) throw notFound()
    return { ...u, user: { ...u.user, role: isAdmin(u.user) ? 'admin' : u.user.role } }
  },
  project(id: string) {
    const p = Project.find(id)
    if (!p) throw notFound()
    const show = ProjectController.show(id)
    // Screens are shown through /api/thumb, so their HTML does not travel with the page.
    return {
      project: show.project,
      screens: show.screens.map(({ html, ...s }) => ({ id: s.id, name: s.name, screenType: s.screenType, error: s.error, deletedAt: s.deletedAt, createdAt: s.createdAt, rating: s.rating, drawn: html !== '' })),
      messages: show.messages,
      owner: p.userId ? { id: p.userId, email: User.find(p.userId)?.email ?? null } : null,
    }
  },
  generations: (f: { onlyErrors?: boolean }) => ({ calls: AdminStatsService.calls(f), ...AdminStatsService.quality() }),
  controls: () => AdminStatsService.controls(),

  ban(adminId: string, d: { userId: string; reason: string }) {
    const target = User.find(d.userId)
    if (!target) throw notFound()
    if (d.userId === adminId) throw new Error('You cannot ban yourself')
    User.setBan(d.userId, true, d.reason || null)
    AdminAction.log(adminId, 'ban', target.email, d.reason || null)
  },
  unban(adminId: string, userId: string) {
    const target = User.find(userId)
    if (!target) throw notFound()
    User.setBan(userId, false)
    AdminAction.log(adminId, 'unban', target.email)
  },
  revokeSessions(adminId: string, userId: string) {
    const target = User.find(userId)
    if (!target) throw notFound()
    User.revokeSessions(userId)
    AdminAction.log(adminId, 'revoke-sessions', target.email)
  },
  setRole(adminId: string, d: { userId: string; role: 'admin' | 'user' }) {
    const target = User.find(d.userId)
    if (!target) throw notFound()
    if (d.userId === adminId && d.role !== 'admin') throw new Error('You cannot remove your own admin role')
    User.setRole(d.userId, d.role)
    AdminAction.log(adminId, 'set-role', target.email, d.role)
  },
  setUserLimit(adminId: string, d: { userId: string; limit: number | null }) {
    const target = User.find(d.userId)
    if (!target) throw notFound()
    Setting.set(`limits.user.${d.userId}`, d.limit === null ? null : String(d.limit))
    AdminAction.log(adminId, 'set-user-limit', target.email, d.limit === null ? 'default' : String(d.limit))
  },
  /** BIL-04: credits by hand (a refund, a gift, a correction) — a ledger row, and a log line. */
  grantCredits(adminId: string, d: { userId: string; amount: number; note: string }) {
    const target = User.find(d.userId)
    if (!target) throw notFound()
    Credit.add({ userId: d.userId, delta: d.amount, kind: 'admin', note: d.note || undefined })
    AdminAction.log(adminId, 'grant-credits', target.email, `${d.amount > 0 ? '+' : ''}${d.amount}${d.note ? ` · ${d.note}` : ''}`)
  },
  setSetting(adminId: string, d: { key: AdminSettingKey; value: string | null }) {
    if (d.value !== null && !ADMIN_SETTINGS[d.key](d.value)) throw new Error('Invalid value')
    Setting.set(d.key, d.value)
    AdminAction.log(adminId, 'set-setting', d.key, d.value ?? 'default')
  },

}
