import { notFound } from '@tanstack/react-router'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'

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
}
