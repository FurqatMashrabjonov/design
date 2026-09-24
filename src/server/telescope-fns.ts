// OBS-10/OBS-11: the admin panel's request log, server log and grouped errors. Admin-only like
// every admin function: requireAdmin() first (anyone else gets a 404), input validated before use.
import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { PURPOSES, TelescopeService, type LogFilters, type OutgoingFilters, type RequestFilters, type WebhookFilters } from '@/app/Services/TelescopeService'
import { AdminController } from '@/app/Http/Controllers/AdminController'
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

// OBS-12: outgoing calls, webhook events, and replaying a verified one (an admin write, logged).
export const telescopeOutgoing = createServerFn({ method: 'GET' })
  .validator((d: unknown): OutgoingFilters => {
    const o = obj(d)
    return {
      purpose: o.purpose ? oneOf(o.purpose, PURPOSES) : undefined,
      status: o.status ? oneOf(o.status, ['2xx', '3xx', '4xx', '5xx', 'error'] as const) : undefined,
      host: o.host ? str(o.host, 200) : undefined,
      slowMs: int(o.slowMs, 3_600_000),
      from: int(o.from, 1e10),
      to: int(o.to, 1e10),
      page: int(o.page, 100_000),
    }
  })
  .handler(async ({ data }) => (await requireAdmin(), TelescopeService.outgoing(data)))

export const telescopeWebhooks = createServerFn({ method: 'GET' })
  .validator((d: unknown): WebhookFilters => {
    const o = obj(d)
    return {
      type: o.type ? str(o.type, 100) : undefined,
      verified: o.verified === undefined ? undefined : oneOf(String(o.verified), ['true', 'false'] as const) === 'true',
      result: o.result ? str(o.result, 200) : undefined,
      page: int(o.page, 100_000),
    }
  })
  .handler(async ({ data }) => (await requireAdmin(), TelescopeService.webhooks(data)))

const eventId = (v: unknown) => {
  const n = int(v, Number.MAX_SAFE_INTEGER)
  if (n === undefined) throw new Error('Invalid id')
  return n
}

export const telescopeWebhook = createServerFn({ method: 'GET' })
  .validator(eventId)
  .handler(async ({ data }) => {
    await requireAdmin()
    const w = await TelescopeService.webhook(data)
    if (!w) throw notFound()
    return w
  })

export const telescopeReplayWebhook = createServerFn({ method: 'POST' })
  .validator(eventId)
  .handler(async ({ data }) => AdminController.replayWebhook((await requireAdmin()).id, data))
