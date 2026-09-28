import { notFound } from '@tanstack/react-router'
import { CreditService } from '@/app/Services/CreditService'
import { PLAN_LIMIT_ERROR } from '@/lib/credit-prices'
import { Credit } from '@/app/Models/Credit'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Feedback } from '@/app/Models/Feedback'
import { Message } from '@/app/Models/Message'
import { PlanRuns } from '@/app/Services/PlanRuns'
import { parseAppTheme } from '@/lib/app-theme'

export const ProjectController = {
  async index(userId: string) {
    return {
      projects: await Project.cardsForUser(userId),
      credits: await Credit.balance(userId),
    }
  },

  async favorite(data: { id: string; favorite: boolean }) {
    await Project.setFavorite(data.id, data.favorite)
  },

  async show(id: string) {
    const project = await Project.find(id)
    if (!project) throw notFound()
    return {
      project,
      // Each screen carries where it stands in its own version timeline, for the ‹ v3 › on the frame.
      screens: await (async () => {
        const ratings = await Feedback.ratings(id)
        return Promise.all((await Screen.forProject(id)).map(async (s) => ({ ...s, version: await ScreenVersion.position(s), rating: ratings.get(s.id) ?? null })))
      })(),
      messages: await Message.forProject(id),
      // GQ-07: a planned run still drawing (its page may have closed); the editor refreshes until it ends.
      planRunning: PlanRuns.running(id),
    }
  },

  // 2026-09-22: the product designs phone apps only; desktop projects made before stay viewable.
  async store(data: { designSystem?: string; brief?: string; userId?: string; admin?: boolean }) {
    // BIL-14: a plan's project count is checked here, on the server, for every way a project is made.
    if (data.userId) {
      const { projects } = await CreditService.limitsFor(data.userId, data.admin)
      if (projects !== null && (await Project.forUser(data.userId)).length >= projects) throw new Error(`${PLAN_LIMIT_ERROR}projects:${projects}`)
    }
    // KON-00: every app is Konsta (iOS); the look is the plan's accent, not a design system.
    return await Project.create({ id: crypto.randomUUID(), name: 'Untitled', designSystem: 'konsta', device: 'mobile', userId: data.userId ?? null })
  },

  async moveScreen(data: { id: string; x: number; y: number }) {
    await Screen.move(data.id, data.x, data.y)
  },

  /** The app's look from the Theme panel (accent, light/dark, iOS/Android), validated; returns what was there before. */
  async saveAppTheme(data: { projectId: string; theme: unknown }) {
    const project = await Project.find(data.projectId)
    if (!project) throw notFound()
    const before = parseAppTheme(project.theme)
    await Project.saveTheme(project.id, parseAppTheme(data.theme))
    return before
  },

  // Reported by the screen's own page, so it is clamped here rather than trusted.
  async saveScreenHeight(data: { id: string; height: number }) {
    if (!Number.isFinite(data.height)) return
    await Screen.saveHeight(data.id, Math.round(Math.min(5000, Math.max(844, data.height))))
  },

  // The name in the top bar, edited in place. Later screens are generated under the new name.
  async rename(data: { id: string; name: string }) {
    const name = data.name.trim().slice(0, 80)
    if (!name) throw new Error('Name cannot be empty')
    if (!await Project.find(data.id)) throw notFound()
    await Project.rename(data.id, name)
  },

  async destroy(id: string) {
    if (!await Project.find(id)) throw notFound()
    await Project.delete(id)
  },
}
