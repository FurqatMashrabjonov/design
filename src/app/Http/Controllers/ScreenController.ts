import { notFound } from '@tanstack/react-router'
import { Screen } from '@/app/Models/Screen'
import { Project } from '@/app/Models/Project'
import { nextFramePosition } from '@/canvas'

export const ScreenController = {
  rename(data: { id: string; projectId: string; name: string }) {
    const name = data.name.trim().slice(0, 80)
    if (!name) throw new Error('Name cannot be empty')
    if (!Screen.findInProject(data.id, data.projectId)) throw notFound()
    Screen.rename(data.id, name)
  },

  destroy(data: { id: string; projectId: string }) {
    if (!Screen.findInProject(data.id, data.projectId)) throw notFound()
    Screen.delete(data.id)
  },

  // Copies a screen's content as a new screen, placed to the right of the rest — for trying a
  // variant without losing the original.
  duplicate(data: { id: string; projectId: string }) {
    const source = Screen.findInProject(data.id, data.projectId)
    const project = Project.find(data.projectId)
    if (!source || !project) throw notFound()
    const pos = nextFramePosition(Screen.positions(project.id), project.device)
    return Screen.create({
      id: crypto.randomUUID(),
      projectId: project.id,
      name: `${source.name} copy`,
      prompt: source.prompt,
      html: source.html,
      x: pos.x,
      y: pos.y,
    })
  },
}
