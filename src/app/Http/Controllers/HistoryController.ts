import { notFound } from '@tanstack/react-router'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Message } from '@/app/Models/Message'
import { Project } from '@/app/Models/Project'
import { sanitizeTheme } from '@/lib/theme-override'
import { parseMeta, type MessageScreen } from '@/lib/agent-messages'

export const HistoryController = {
  /**
   * The ‹ › arrows on a frame. Stepping back from the newest work snapshots it first, so nothing is
   * lost; the screen then shows the chosen version and remembers which (screens.version_id), so the
   * other arrow walks back. Not written to the conversation: the opposite arrow is its undo, and an
   * edit made while an older version is shown simply continues from there.
   */
  async stepVersion(data: { projectId: string; screenId: string; dir: number }) {
    const screen = await Screen.findInProject(data.screenId, data.projectId)
    if (!screen) throw notFound()
    const dir = data.dir < 0 ? -1 : 1
    const atNewest = !screen.versionId
    if (atNewest && (dir > 0 || await ScreenVersion.count(screen.id) === 0)) return await ScreenVersion.position(screen)
    if (atNewest) await ScreenVersion.captureFrom(screen)
    const ids = await ScreenVersion.ids(screen.id)
    const at = atNewest ? ids.length - 1 : ids.indexOf(screen.versionId!)
    const next = at < 0 ? undefined : ids[at + dir]
    if (!next) return await ScreenVersion.position((await Screen.find(screen.id))!)
    const version = (await ScreenVersion.findInScreen(next, screen.id))!
    await Screen.updateContent(screen.id, { name: version.name, prompt: version.prompt, html: version.html, versionId: version.id })
    return await ScreenVersion.position({ id: screen.id, versionId: version.id })
  },

  /**
   * "Go back to before this": undoes everything one agent message did. A screen it changed returns
   * to the snapshot taken just before (the current design is kept as a version); a screen it
   * created is removed (kept as a row, see Screen.delete). The revert message records what it did
   * in the same shape, so reverting the revert is the redo — that is what Shift+Cmd+Z does.
   * Returns the revert message's id. The plan message is not revertible — that would be deleting
   * the app.
   */
  async revertMessage(data: { projectId: string; messageId: string }): Promise<string> {
    const message = await Message.find(data.messageId)
    if (!message || message.projectId !== data.projectId || message.role !== 'agent') throw notFound()
    const meta = parseMeta(message.meta)
    if (message.kind === 'plan' || message.kind === 'error' || meta.reverted) throw new Error('This step cannot be undone')
    const redo = message.kind === 'revert'

    if (meta.previousTheme !== undefined) {
      const project = await Project.find(data.projectId)
      const before = project?.theme ? JSON.parse(project.theme) : {}
      await Project.saveTheme(data.projectId, sanitizeTheme(meta.previousTheme))
      await Message.setMeta(message.id, { ...meta, reverted: true })
      return await Message.add({ projectId: data.projectId, role: 'agent', kind: 'revert', text: redo ? 'Applied the theme change again.' : 'Put the theme back the way it was.', meta: { previousTheme: before } })
    }

    const touched: MessageScreen[] = []
    for (const ref of meta.screens ?? []) {
      const current = await Screen.findInProject(ref.id, data.projectId)
      if (!current) continue
      if (ref.created) {
        await Screen.delete(current.id)
        touched.push({ id: current.id, name: current.name, removed: true })
      } else if (ref.removed) {
        await Screen.restore(current.id)
        touched.push({ id: current.id, name: current.name, created: true })
      } else {
        const version = ref.versionId ? await ScreenVersion.findInScreen(ref.versionId, current.id) : undefined
        if (!version) continue
        const versionId = await ScreenVersion.captureFrom(current)
        await Screen.updateContent(current.id, { name: version.name, prompt: version.prompt, html: version.html })
        touched.push({ id: current.id, name: version.name, versionId })
      }
    }
    if (touched.length === 0) throw new Error('Nothing left to undo for this step')

    await Message.setMeta(message.id, { ...meta, reverted: true })
    const names = (pick: (t: MessageScreen) => boolean) => touched.filter(pick).map((t) => t.name).join('”, “')
    const text = touched.some((t) => t.removed)
      ? `Removed “${names((t) => Boolean(t.removed))}”.`
      : touched.some((t) => t.created)
        ? `Brought back “${names((t) => Boolean(t.created))}”.`
        : redo
          ? `Applied that change again on “${names(() => true)}”.`
          : `Went back to the design before that change on “${names(() => true)}”.`
    return await Message.add({ projectId: data.projectId, role: 'agent', kind: 'revert', text, meta: { screens: touched } })
  },
}
