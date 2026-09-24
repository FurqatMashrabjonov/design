// ADM-15: the Business pages' server functions — credits ledger, subscriptions, revenue. Like
// admin-fns.ts, every one starts with requireAdmin() and validates its input; the table queries go
// through the whitelisting parsers, so an unknown sort or filter value becomes the default.
import { createServerFn } from '@tanstack/react-start'
import { BusinessService } from '@/app/Services/BusinessService'
import { parseLedgerQuery, parseSubsQuery } from '@/admin/table-query'
import { requireAdmin } from './auth'
import { idOf, obj } from './validate'

export const businessLedgerPage = createServerFn({ method: 'GET' })
  .validator((d: unknown) => parseLedgerQuery(obj(d)))
  .handler(async ({ data }) => (await requireAdmin(), BusinessService.ledgerPage(data)))

export const businessLedgerCsv = createServerFn({ method: 'GET' })
  .validator((d: unknown) => parseLedgerQuery(obj(d)))
  .handler(async ({ data }) => (await requireAdmin(), BusinessService.ledgerCsv(data)))

export const businessActionCalls = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => (await requireAdmin(), BusinessService.actionCalls(data)))

export const businessSubscriptionsPage = createServerFn({ method: 'GET' })
  .validator((d: unknown) => parseSubsQuery(obj(d)))
  .handler(async ({ data }) => (await requireAdmin(), BusinessService.subscriptionsPage(data)))

export const businessRevenue = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), BusinessService.revenue()))

export const businessUserRevenue = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => (await requireAdmin(), BusinessService.userRevenue(data)))
