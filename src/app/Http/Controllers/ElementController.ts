import { notFound } from '@tanstack/react-router'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Message } from '@/app/Models/Message'
import { resolveImages } from '@/app/Services/ImageService'
import { annotateElements, duplicateElement, elementInfo, ElementOpError, moveElement, removeElement, setElementText, setImageQuery } from '@/lib/element-ops'

export type ElementAction = 'delete' | 'duplicate' | 'up' | 'down'

// Hand edits on the canvas: no model, immediate, and recorded like any other change (a version to
// return to, a line in the conversation that "Undo this step" can act on).
async function change(projectId: string, screenId: string, edit: (html: string, screenName: string) => { html: string; text: string }) {
  const screen = await Screen.findInProject(screenId, projectId)
  if (!screen || !screen.html) throw notFound()
  // The same annotation the browser rendered with, so the id the person clicked exists here too.
  const base = annotateElements(screen.html)
  let result: { html: string; text: string }
  try {
    result = edit(base, screen.name)
  } catch (e) {
    throw new Error(e instanceof ElementOpError ? e.message : 'That change could not be made')
  }
  if (result.html === base) return { changed: false }
  const versionId = await ScreenVersion.captureFrom(screen)
  await Screen.updateContent(screen.id, { name: screen.name, prompt: screen.prompt, html: result.html })
  await Message.add({ projectId, role: 'agent', kind: 'direct', text: result.text, meta: { screens: [{ id: screen.id, name: screen.name, versionId }] } })
  return { changed: true }
}

const clip = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export const ElementController = {
  async info(data: { projectId: string; screenId: string; elementId: string }) {
    const screen = await Screen.findInProject(data.screenId, data.projectId)
    if (!screen || !screen.html) throw notFound()
    try {
      return elementInfo(annotateElements(screen.html), data.elementId)
    } catch {
      return null
    }
  },

  editText(data: { projectId: string; screenId: string; elementId: string; text: string }) {
    if (typeof data.text !== 'string') throw new Error('Text is required')
    return change(data.projectId, data.screenId, (html, screenName) => {
      const { html: out, before } = setElementText(html, data.elementId, data.text)
      return { html: out, text: `Changed text on “${screenName}”: “${clip(before)}” → “${clip(data.text.trim())}”.` }
    })
  },

  act(data: { projectId: string; screenId: string; elementId: string; action: ElementAction }) {
    const verbs: Record<ElementAction, [(html: string, id: string) => string, string]> = {
      delete: [removeElement, 'Deleted'],
      duplicate: [duplicateElement, 'Duplicated'],
      up: [(h, id) => moveElement(h, id, 'up'), 'Moved up'],
      down: [(h, id) => moveElement(h, id, 'down'), 'Moved down'],
    }
    const verb = verbs[data.action]
    if (!verb) throw new Error('Unknown action')
    return change(data.projectId, data.screenId, (html, screenName) => {
      const label = elementInfo(html, data.elementId).label
      return { html: verb[0](html, data.elementId), text: `${verb[1]} ${label} on “${screenName}”.` }
    })
  },

  async replacePhoto(data: { projectId: string; screenId: string; elementId: string; query: string }) {
    if (typeof data.query !== 'string') throw new Error('Describe the photo you want')
    const screen = await Screen.findInProject(data.screenId, data.projectId)
    if (!screen || !screen.html) throw notFound()
    const project = (await Project.find(data.projectId))!
    let html: string
    try {
      html = setImageQuery(annotateElements(screen.html), data.elementId, data.query)
    } catch (e) {
      throw new Error(e instanceof ElementOpError ? e.message : 'That change could not be made')
    }
    const filled = await resolveImages(html, undefined, { name: project.name })
    const found = !/data-od-img-fallback/.test(filled) || /data-od-img-fallback/.test(screen.html)
    return change(data.projectId, data.screenId, () => ({
      html: filled,
      text: found ? `Replaced a photo on “${screen.name}” with “${clip(data.query.trim())}”.` : `No photo matched “${clip(data.query.trim())}” — the slot on “${screen.name}” is empty for now.`,
    }))
  },
}
