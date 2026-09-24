import { notFound } from '@tanstack/react-router'
import { Screen } from '@/app/Models/Screen'
import { Project } from '@/app/Models/Project'
import { nextFramePosition } from '@/canvas'

export const ScreenController = {
  async rename(data: { id: string; projectId: string; name: string }) {
    const name = data.name.trim().slice(0, 80)
    if (!name) throw new Error('Name cannot be empty')
    if (!await Screen.findInProject(data.id, data.projectId)) throw notFound()
    await Screen.rename(data.id, name)
  },

  async destroy(data: { id: string; projectId: string }) {
    if (!await Screen.findInProject(data.id, data.projectId)) throw notFound()
    await Screen.delete(data.id)
  },

  // Cmd+Z after a delete.
  async restore(data: { id: string; projectId: string }) {
    if (!await Screen.findInProject(data.id, data.projectId)) throw notFound()
    await Screen.restore(data.id)
  },

  // Copies a screen's content as a new screen, placed to the right of the rest — for trying a
  // variant without losing the original.
  async duplicate(data: { id: string; projectId: string }) {
    const source = await Screen.findInProject(data.id, data.projectId)
    const project = await Project.find(data.projectId)
    if (!source || !project) throw notFound()
    const pos = nextFramePosition(await Screen.positions(project.id), project.device)
    return await Screen.create({
      id: crypto.randomUUID(),
      projectId: project.id,
      name: `${source.name} copy`,
      prompt: source.prompt,
      html: source.html,
      x: pos.x,
      y: pos.y,
      // A copy of a detail screen is still a detail screen: without these the preview treated it
      // as a tab root and its Back button had nowhere to go.
      screenType: source.screenType,
      activeTabId: source.screenType === 'root-tab' ? null : source.activeTabId,
      parentScreenName: source.parentScreenName,
    })
  },
}
