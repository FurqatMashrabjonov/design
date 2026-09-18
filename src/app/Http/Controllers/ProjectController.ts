import { notFound } from '@tanstack/react-router'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { DesignSystemService } from '@/app/Services/DesignSystemService'

export const ProjectController = {
  index() {
    return { projects: Project.all(), designSystems: DesignSystemService.list() }
  },

  show(id: string) {
    const project = Project.find(id)
    if (!project) throw notFound()
    return { project, screens: Screen.forProject(id) }
  },

  store(data: { device: string; designSystem: string }) {
    DesignSystemService.assertExists(data.designSystem)
    const device = data.device === 'mobile' ? 'mobile' : 'desktop'
    return Project.create({ id: crypto.randomUUID(), name: 'Untitled', designSystem: data.designSystem, device })
  },

  moveScreen(data: { id: string; x: number; y: number }) {
    Screen.move(data.id, data.x, data.y)
  },

  destroy(id: string) {
    if (!Project.find(id)) throw notFound()
    Project.delete(id)
  },
}
