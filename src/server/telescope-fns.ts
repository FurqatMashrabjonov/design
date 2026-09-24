// OBS-10/OBS-11: the admin panel's request log, server log and grouped errors. Admin-only like
// every admin function: requireAdmin() first (anyone else gets a 404), input validated before use.
import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { TelescopeService, type LogFilters, type RequestFilters } from '@/app/Services/TelescopeService'
import { requireAdmin } from './auth'
import { idOf, obj, oneOf, str } from './validate'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const

/** A whole number in [0, max], or undefined when absent/blank. */
function int(v: unknown, max: number): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0 || n > max) throw new Error('Invalid number')
  return n
}

export const telescopeRequests = createServerFn({ method: 'GET' })
  .validator((d: unknown): RequestFilters => {
    const o = obj(d)
    return {
      method: o.method ? oneOf(o.method, METHODS) : undefined,
      status: o.status ? oneOf(o.status, ['2xx', '3xx', '4xx', '5xx'] as const) : undefined,
      path: o.path ? str(o.path, 200) : undefined,
      email: o.email ? str(o.email, 200) : undefined,
      slowMs: int(o.slowMs, 3_600_000),
      from: int(o.from, 1e10),
      to: int(o.to, 1e10),
      page: int(o.page, 100_000),
    }
  })
  .handler(async ({ data }) => (await requireAdmin(), TelescopeService.requests(data)))

export const telescopeRequest = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => {
    await requireAdmin()
    const r = await TelescopeService.request(data)
    if (!r) throw notFound()
    return r
  })

export const telescopeLogs = createServerFn({ method: 'GET' })
  .validator((d: unknown): LogFilters => {
    const o = obj(d)
    return {
      level: o.level ? oneOf(o.level, ['info', 'warn', 'error'] as const) : undefined,
      q: o.q ? str(o.q, 200) : undefined,
      afterId: int(o.afterId, Number.MAX_SAFE_INTEGER),
      page: int(o.page, 100_000),
    }
  })
  .handler(async ({ data }) => (await requireAdmin(), TelescopeService.logs(data)))

export const telescopeErrors = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), TelescopeService.errors()))
