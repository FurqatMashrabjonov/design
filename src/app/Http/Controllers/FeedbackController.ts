import { notFound } from '@tanstack/react-router'
import { Screen } from '@/app/Models/Screen'
import { Project } from '@/app/Models/Project'
import { Feedback, type FeedbackValue } from '@/app/Models/Feedback'

/** What produced a screen, read back from its stored spec ("Screen pattern (detail, layout b)"). */
export function patternOf(spec: string | null): { archetype: string | null; variant: string | null } {
  const m = spec?.match(/Screen pattern \(([a-z-]+)(?:, layout ([a-z]))?\)/)
  return { archetype: m?.[1] ?? null, variant: m?.[2] ?? null }
}

export const FeedbackController = {
  // FB-01. The value comes from the browser: only the three known values are accepted.
  async rate(data: { projectId: string; screenId: string; value: unknown }) {
    const value = data.value === 'up' || data.value === 'down' ? data.value : data.value === null ? null : undefined
    if (value === undefined) throw new Error('Rating must be up, down or null')
    await FeedbackController.record(data.projectId, data.screenId, value)
  },

  async record(projectId: string, screenId: string, value: FeedbackValue | null) {
    const project = await Project.find(projectId)
    const screen = await Screen.findInProject(screenId, projectId)
    if (!project || !screen) throw notFound()
    await Feedback.record({ projectId, screenId, value, designSystem: project.designSystem, ...patternOf(screen.spec) })
  },
}
