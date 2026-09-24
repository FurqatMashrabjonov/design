// ADM-12: the admin overview. Admin-only like every admin function: requireAdmin() first (anyone
// else gets a 404), input validated before use.
import { createServerFn } from '@tanstack/react-start'
import { OverviewService } from '@/app/Services/OverviewService'
import { requireAdmin } from './auth'
import { obj, oneOf } from './validate'

export const adminOverviewV2 = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ days: Number(oneOf(String(obj(d).days), ['1', '7', '30'] as const)) as 1 | 7 | 30 }))
  .handler(async ({ data }) => (await requireAdmin(), OverviewService.overview(data.days)))
