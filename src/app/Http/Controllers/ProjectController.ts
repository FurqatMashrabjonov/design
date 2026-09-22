import { notFound } from '@tanstack/react-router'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Message } from '@/app/Models/Message'
import { DesignSystemService } from '@/app/Services/DesignSystemService'
import { SkillService } from '@/app/Services/SkillService'
import { parseTheme, sanitizeTheme } from '@/lib/theme-override'
import { routeIntent } from '@/lib/intent'
import { clampFrameHeight } from '@/lib/frame-height'
import { frameSize } from '@/canvas'

export const ProjectController = {
  index() {
    return {
      projects: Project.all(),
      designSystems: DesignSystemService.list(),
      skills: SkillService.list(),
    }
  },

  show(id: string) {
    const project = Project.find(id)
    if (!project) throw notFound()
    return {
      project,
      // Each screen carries where it stands in its own version timeline, for the ‹ v3 › on the frame.
      screens: Screen.forProject(id).map((s) => ({ ...s, version: ScreenVersion.position(s) })),
      messages: Message.forProject(id),
      // For the design-system frame on the canvas (lib/ds-sample.ts).
      tokens: { root: DesignSystemService.readTokensRoot(project.designSystem), fonts: DesignSystemService.readFontUrls(project.designSystem) },
      designSystems: DesignSystemService.list(),
      skills: SkillService.list(),
    }
  },

  store(data: { device: string; designSystem: string }) {
    DesignSystemService.assertExists(data.designSystem)
    const device = data.device === 'mobile' ? 'mobile' : 'desktop'
    return Project.create({ id: crypto.randomUUID(), name: 'Untitled', designSystem: data.designSystem, device })
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
