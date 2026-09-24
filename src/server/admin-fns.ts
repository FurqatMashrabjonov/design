// ADM-01: the admin panel's server functions. Every one starts with requireAdmin() — anyone else
// gets a 404, the same as a page that does not exist — and validates its input before the controller.
import { createServerFn } from '@tanstack/react-start'
import { AdminController, ADMIN_SETTINGS, type AdminSettingKey } from '@/app/Http/Controllers/AdminController'
import { SECRET_NAMES } from '@/app/Services/SecretService'
import { requireAdmin } from './auth'
import { idOf, num, obj, oneOf, str } from './validate'

export const adminCheck = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireAdmin()
  return { email: u.email, name: u.name }
})

export const adminOverview = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ days: Number(oneOf(String(obj(d).days), ['1', '7', '30'] as const)) as 1 | 7 | 30 }))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.overview(data.days)))

export const adminUsers = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.users()))

export const adminUser = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.user(data)))

export const adminProject = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.project(data)))

export const adminGenerations = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ onlyErrors: obj(d).onlyErrors === true }))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.generations(data)))

export const adminSearch = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ q: str(obj(d).q ?? '', 100) }))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.search(data.q)))

export const adminControls = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.controls()))

export const adminBan = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ userId: idOf(obj(d).userId), reason: str(obj(d).reason ?? '', 300) }))
  .handler(async ({ data }) => AdminController.ban((await requireAdmin()).id, data))

export const adminUnban = createServerFn({ method: 'POST' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => AdminController.unban((await requireAdmin()).id, data))

export const adminRevokeSessions = createServerFn({ method: 'POST' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => AdminController.revokeSessions((await requireAdmin()).id, data))

export const adminSetRole = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ userId: idOf(obj(d).userId), role: oneOf(obj(d).role, ['admin', 'user'] as const) }))
  .handler(async ({ data }) => AdminController.setRole((await requireAdmin()).id, data))

export const adminSetUserLimit = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const limit = o.limit === null ? null : Math.floor(num(o.limit))
    if (limit !== null && limit < 0) throw new Error('Invalid number')
    return { userId: idOf(o.userId), limit }
  })
  .handler(async ({ data }) => AdminController.setUserLimit((await requireAdmin()).id, data))

export const adminGrantCredits = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const amount = num(o.amount)
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100_000) throw new Error('Invalid number')
    return { userId: idOf(o.userId), amount, note: str(o.note ?? '', 200) }
  })
  .handler(async ({ data }) => AdminController.grantCredits((await requireAdmin()).id, data))

/** ADM-13: provider keys. A value goes in and is never sent back; the panel sees only its last four. */
export const adminSecrets = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.secrets()))

export const adminSetSecret = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const value = o.value === null ? null : str(o.value, 500).trim()
    if (value !== null && (value.length < 8 || /\s/.test(value))) throw new Error('That does not look like a key')
    return { name: oneOf(o.name, [...SECRET_NAMES]), value }
  })
  .handler(async ({ data }) => AdminController.setSecret((await requireAdmin()).id, data))

export const adminTestSecret = createServerFn({ method: 'POST' })
  .validator((d: unknown) => oneOf(obj(d).name, [...SECRET_NAMES]))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.testSecret(data)))

export const adminSetSetting = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    return { key: oneOf(o.key, Object.keys(ADMIN_SETTINGS) as AdminSettingKey[]), value: o.value === null ? null : str(o.value, 40) }
  })
  .handler(async ({ data }) => AdminController.setSetting((await requireAdmin()).id, data))
