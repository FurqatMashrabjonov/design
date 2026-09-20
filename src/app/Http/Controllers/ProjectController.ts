import { notFound } from '@tanstack/react-router'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { DesignSystemService } from '@/app/Services/DesignSystemService'
import { SkillService } from '@/app/Services/SkillService'
import { sanitizeTheme } from '@/lib/theme-override'
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
      screens: Screen.forProject(id),
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
  saveTheme(data: { projectId: string; theme: unknown }) {
    if (!Project.find(data.projectId)) throw notFound()
    const theme = sanitizeTheme(data.theme)
    Project.saveTheme(data.projectId, theme)
    return theme
  },

  destroy(id: string) {
    if (!Project.find(id)) throw notFound()
    Project.delete(id)
  },
}
