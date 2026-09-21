import { notFound } from '@tanstack/react-router'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Message } from '@/app/Models/Message'
import { parseMeta, type MessageScreen } from '@/lib/agent-messages'

export const HistoryController = {
  versions(screenId: string) {
    return ScreenVersion.forScreen(screenId)
  },

  // Restoring is itself an edit: the current row is snapshotted (so restoring never loses work),
  // then overwritten with the chosen version's content.
  restore(data: { screenId: string; versionId: string }) {
    const current = Screen.find(data.screenId)
    const version = ScreenVersion.findInScreen(data.versionId, data.screenId)
    if (!current || !version) throw notFound()
    ScreenVersion.captureFrom(current)
    Screen.updateContent(current.id, { name: version.name, prompt: version.prompt, html: version.html })
  },

  /**
   * "Go back to before this": undoes everything one agent message did. A screen it changed returns
   * to the snapshot taken just before (the current design is kept as a version, so this is itself
   * undoable); a screen it created is removed. The plan message is not revertible — that would be
   * deleting the app.
   */
  revertMessage(data: { projectId: string; messageId: string }) {
    const message = Message.find(data.messageId)
    if (!message || message.projectId !== data.projectId || message.role !== 'agent') throw notFound()
    const meta = parseMeta(message.meta)
    if (message.kind === 'plan' || message.kind === 'error' || message.kind === 'revert' || meta.reverted) throw new Error('This step cannot be undone')

    const touched: MessageScreen[] = []
    for (const ref of meta.screens ?? []) {
      const current = Screen.findInProject(ref.id, data.projectId)
      if (!current) continue
      if (ref.created) {
        Screen.delete(current.id)
        touched.push({ id: current.id, name: current.name })
        continue
      }
      const version = ref.versionId ? ScreenVersion.findInScreen(ref.versionId, current.id) : undefined
      if (!version) continue
      const versionId = ScreenVersion.captureFrom(current)
      Screen.updateContent(current.id, { name: version.name, prompt: version.prompt, html: version.html })
      touched.push({ id: current.id, name: version.name, versionId })
    }
    if (touched.length === 0) throw new Error('Nothing left to undo for this step')

    Message.setMeta(message.id, { ...meta, reverted: true })
    const removed = (meta.screens ?? []).filter((r) => r.created).map((r) => r.name)
    Message.add({
      projectId: data.projectId,
      role: 'agent',
      kind: 'revert',
      text: removed.length ? `Removed “${removed.join('”, “')}”.` : `Went back to the design before that change on “${touched.map((t) => t.name).join('”, “')}”.`,
      meta: { screens: touched.filter((t) => t.versionId) },
    })
  },
}
