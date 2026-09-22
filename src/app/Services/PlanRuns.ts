// GQ-07: planned runs in progress, by project. A run outlives its browser tab — closing or reloading
// the page no longer throws away a plan that was already paid for — so the only way to stop one is
// Stop, which reaches the run through here. ponytail: in memory, like UsageService's lock; one
// server process. Move to the database if the app runs on several.
const runs = new Map<string, AbortController>()

export const PlanRuns = {
  start(projectId: string): AbortController {
    runs.get(projectId)?.abort()
    const ctl = new AbortController()
    runs.set(projectId, ctl)
    return ctl
  },
  /** Stop: true if a run was going. */
  stop(projectId: string): boolean {
    const ctl = runs.get(projectId)
    ctl?.abort()
    return Boolean(ctl)
  },
  running: (projectId: string) => runs.has(projectId),
  finish(projectId: string, ctl: AbortController) {
    if (runs.get(projectId) === ctl) runs.delete(projectId)
  },
}
