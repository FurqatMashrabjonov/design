// ADM-12: the admin overview. Admin-only like every admin function: requireAdmin() first (anyone
// else gets a 404), input validated before use.
import { createServerFn } from '@tanstack/react-start'
import { DashboardService } from '@/app/Services/DashboardService'
import { requireAdmin } from './auth'
import { obj, oneOf } from './validate'

// ADM-20: sold, LLM spend and profit, tokens in dollars.
export const adminDashboard = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ days: Number(oneOf(String(obj(d).days), ['1', '7', '30'] as const)) as 1 | 7 | 30 }))
  .handler(async ({ data }) => (await requireAdmin(), DashboardService.dashboard(data.days)))
