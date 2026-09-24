import { notFound } from '@tanstack/react-router'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Feedback } from '@/app/Models/Feedback'
import { Message } from '@/app/Models/Message'
import { AUTO, DesignSystemService } from '@/app/Services/DesignSystemService'
import { AppPatternService } from '@/app/Services/AppPatternService'
import { UsageService } from '@/app/Services/UsageService'
import { PlanRuns } from '@/app/Services/PlanRuns'
import { parseTheme, sanitizeTheme } from '@/lib/theme-override'
import { routeIntent } from '@/lib/intent'
import { clampFrameHeight } from '@/lib/frame-height'
import { frameSize } from '@/canvas'

export const ProjectController = {
  index(userId: string) {
    return {
      projects: Project.cardsForUser(userId),
      usage: { calls: UsageService.callsToday(userId), limit: UsageService.limits(userId).callsPerDay },
      designSystems: DesignSystemService.list(),
    }
  },

  favorite(data: { id: string; favorite: boolean }) {
    Project.setFavorite(data.id, data.favorite)
  },

  show(id: string) {
    const project = Project.find(id)
    if (!project) throw notFound()
    return {
      project,
      // Each screen carries where it stands in its own version timeline, for the ‹ v3 › on the frame.
      screens: (() => {
        const ratings = Feedback.ratings(id)
        return Screen.forProject(id).map((s) => ({ ...s, version: ScreenVersion.position(s), rating: ratings.get(s.id) ?? null }))
      })(),
      messages: Message.forProject(id),
      // For the design-system frame on the canvas (lib/ds-sample.ts).
      tokens: { root: DesignSystemService.readTokensRoot(project.designSystem), fonts: DesignSystemService.readFontUrls(project.designSystem) },
      // GQ-07: a planned run still drawing (its page may have closed); the editor refreshes until it ends.
      planRunning: PlanRuns.running(id),
      designSystems: DesignSystemService.list(),
    }
  },

  // 2026-09-22: the product designs phone apps only; desktop projects made before stay viewable.
  store(data: { designSystem: string; brief?: string; userId?: string }) {
    // GQ-03: "auto" means the brief chooses (its named style, else its app type). DS-01: the id is
    // minted first so it can seed the pick — two people typing the same brief get different systems.
    const id = crypto.randomUUID()
    const designSystem =
      data.designSystem === AUTO ? DesignSystemService.autoFor(data.brief ?? '', AppPatternService.classify(data.brief ?? '')?.id, id) : data.designSystem
    DesignSystemService.assertExists(designSystem)
    return Project.create({ id, name: 'Untitled', designSystem, device: 'mobile', userId: data.userId ?? null, designSystemAuto: data.designSystem === AUTO })
  },

  moveScreen(data: { id: string; x: number; y: number }) {
    Screen.move(data.id, data.x, data.y)
  },

  // The number comes from a sandboxed page, so it is clamped here rather than trusted.
  saveScreenHeight(data: { id: string; height: number }) {
    const screen = Screen.find(data.id)
    if (!screen) throw notFound()
    const project = Project.find(screen.projectId)
    const height = clampFrameHeight(data.height, frameSize(project?.device ?? 'desktop').height)
    if (height === null) throw new Error('Height must be a number')
    Screen.saveHeight(data.id, height)
    return height
  },

  // Sanitized here, not just in the panel — this is the boundary where untrusted input arrives.
  /**
   * A chat request that is really a theme change ("make it blue"). Routed again here rather than
   * trusted from the browser; anything that is not clearly a theme change returns applied: false
   * and goes to generation as before.
   */
  themeFromChat(data: { projectId: string; prompt: string }) {
    const project = Project.find(data.projectId)
    if (!project) throw notFound()
    const prompt = typeof data.prompt === 'string' ? data.prompt.trim().slice(0, 500) : ''
    const intent = routeIntent(prompt, { elementSelected: false })
    if (intent.kind !== 'theme') return { applied: false as const }
    const previous = parseTheme(project.theme)
    const next = { ...previous, ...intent.theme }
    if (intent.theme.radius) delete next.radiusPx // "rounder corners" must not stay hidden behind the slider
    const theme = sanitizeTheme(next)
    Project.saveTheme(project.id, theme)
    Message.add({ projectId: project.id, role: 'user', kind: 'theme', text: prompt })
    Message.add({
      projectId: project.id,
      role: 'agent',
      kind: 'theme',
      text: `Changed ${intent.summary} on every screen. No screen was regenerated — it is a theme setting, so it is also in the Theme tab.`,
      meta: { previousTheme: previous },
    })
    return { applied: true as const, theme }
  },

  saveTheme(data: { projectId: string; theme: unknown }) {
    if (!Project.find(data.projectId)) throw notFound()
    const theme = sanitizeTheme(data.theme)
    Project.saveTheme(data.projectId, theme)
    return theme
  },

  // The name in the top bar, edited in place. Later screens are generated under the new name.
  rename(data: { id: string; name: string }) {
    const name = data.name.trim().slice(0, 80)
    if (!name) throw new Error('Name cannot be empty')
    if (!Project.find(data.id)) throw notFound()
    Project.rename(data.id, name)
  },

  destroy(id: string) {
    if (!Project.find(id)) throw notFound()
    Project.delete(id)
  },
}
