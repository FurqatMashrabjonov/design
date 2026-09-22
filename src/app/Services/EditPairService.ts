import { Message } from '@/app/Models/Message'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Project } from '@/app/Models/Project'
import { parseMeta } from '@/lib/agent-messages'
import { patternOf } from '@/app/Http/Controllers/FeedbackController'

// FB-02: every change to a screen as a before/after pair with the request that caused it — the
// raw material for learning what people fix. Nothing extra is stored: the conversation already
// records each change with the snapshot taken before it (messages.meta.screens[].versionId), and
// the design after it is the next snapshot of that screen, or the screen as it is now. A change
// the person later undid is kept and marked, since "undone" is the clearest signal there is.

export type EditPair = {
  projectId: string
  screenId: string
  screenName: string
  kind: string
  request: string
  before: string
  after: string
  undone: boolean
  designSystem: string
  archetype: string | null
  variant: string | null
  at: number
}

const CHANGES = new Set(['edit', 'element', 'direct', 'regenerate'])

export const EditPairService = {
  forProject(projectId: string): EditPair[] {
    const project = Project.find(projectId)
    if (!project) return []
    const messages = Message.forProject(projectId)
    const pairs: EditPair[] = []
    messages.forEach((m, i) => {
      if (m.role !== 'agent' || !CHANGES.has(m.kind)) return
      const meta = parseMeta(m.meta)
      // The ask is the user message just before this answer (hand edits write their own text).
      const ask = [...messages.slice(0, i)].reverse().find((x) => x.role === 'user')
      for (const ref of meta.screens ?? []) {
        if (!ref.versionId) continue
        const screen = Screen.find(ref.id)
        const before = screen && ScreenVersion.findInScreen(ref.versionId, screen.id)
        if (!screen || !before) continue
        const ids = ScreenVersion.ids(screen.id)
        const nextId = ids[ids.indexOf(before.id) + 1]
        const after = nextId ? ScreenVersion.findInScreen(nextId, screen.id)!.html : screen.html
        if (!after || after === before.html) continue
        pairs.push({
          projectId,
          screenId: screen.id,
          screenName: screen.name,
          kind: m.kind,
          request: m.kind === 'direct' ? m.text : (ask?.text ?? ''),
          before: before.html,
          after,
          undone: Boolean(meta.reverted),
          designSystem: project.designSystem,
          ...patternOf(screen.spec),
          at: m.createdAt,
        })
      }
    })
    return pairs
  },
}
