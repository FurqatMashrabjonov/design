import type { Plan } from './PlannerService.ts'
import type { ReferenceStyle } from './ReferenceService.ts'

// CHAT-08: a plan that was drawn up but not yet approved, by project. The approve request names
// the project; the plan itself never travels back through the client, so what gets drawn is what
// the planner produced plus the person's edits (a rename, a removed screen) — nothing invented.
// ponytail: in memory, like PlanRuns; a restart forgets it and the client is told to plan again.
export type PendingPlan = { plan: Plan; brief: string; screenIds: string[]; at: number; /** IMG-01: the reference picture in words, so approval does not pay to read it again. */ reference?: ReferenceStyle }
const pending = new Map<string, PendingPlan>()
const TTL_MS = 30 * 60 * 1000

export const PendingPlans = {
  set(projectId: string, p: Omit<PendingPlan, 'at'>) {
    pending.set(projectId, { ...p, at: Date.now() })
  },
  take(projectId: string): PendingPlan | undefined {
    const p = pending.get(projectId)
    pending.delete(projectId)
    return p && Date.now() - p.at < TTL_MS ? p : undefined
  },
  has: (projectId: string) => pending.has(projectId),
}
