import { FeedbackController } from '@/app/Http/Controllers/FeedbackController'
import { checkNote, drawScreen, type AuditOutcome } from '@/app/Http/Controllers/PlanController'
import { Project } from '@/app/Models/Project'
import { Screen, type ScreenRow } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Message } from '@/app/Models/Message'
import { editBrief, elementBrief, parseAppPlan, screenBrief, writeScreen, type AppPlan, type PlannedScreen } from '@/app/Services/JsxGenerator'
import { nextFramePosition } from '@/canvas'
import { parseAppTheme } from '@/lib/app-theme'
import { changeReply, formatTokens, friendlyError, type MessageKind } from '@/lib/agent-messages'
import { parseRefImages } from '@/lib/ref-images'
import { ShotService } from '@/app/Services/ShotService'
import type { RefImage } from '@/app/Services/LlmService'

export const ERROR_MARK = '<!--GEN_ERROR:'

/** REG-02: a spliced element keeps the file's indentation — its later lines sit where the old element's did. */
export function reindent(piece: string, file: string, at: number): string {
  const indent = file.slice(file.lastIndexOf('\n', at - 1) + 1, at).match(/^\s*/)![0]
  const lines = piece.split('\n')
  const rest = lines.slice(1).filter((l) => l.trim())
  const common = rest.length ? Math.min(...rest.map((l) => l.match(/^\s*/)![0].length)) : 0
  return [lines[0], ...lines.slice(1).map((l) => (l.trim() ? indent + l.slice(common) : l))].join('\n')
}

// POST { projectId, prompt, editScreenId?, regenerateScreenId? } → text/plain: empty on success, or an
// ERROR_MARK line. KON-00: every change rewrites the screen's component — an edit hands the model the
// component and the change, a redraw writes it again from its plan, an addition joins the app's plan.
export const GenerateController = {
  async stream(request: Request, _opts: { userId?: string } = {}): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const project = await Project.find(String(body.projectId ?? ''))
    if (!project) return new Response('Project not found', { status: 404 })
    const plan: AppPlan | null = parseAppPlan(project.plan)
    const regenerateId = typeof body.regenerateScreenId === 'string' && body.regenerateScreenId ? body.regenerateScreenId : null
    const editId = typeof body.editScreenId === 'string' && body.editScreenId ? body.editScreenId : null
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!regenerateId && (!prompt || prompt.length > 4000)) return new Response('Prompt must be 1-4000 characters', { status: 400 })
    let images: RefImage[] | undefined
    try {
      images = regenerateId ? undefined : parseRefImages(body.images)
    } catch (e) {
      return new Response(e instanceof Error ? e.message : 'Invalid images', { status: 400 })
    }

    let target: ScreenRow | undefined
    if (regenerateId || editId) {
      target = await Screen.findInProject((regenerateId ?? editId)!, project.id)
      if (!target) return new Response('Screen not found', { status: 404 })
    }
    // REG-02: one element of the screen, named by its place in the stored source (the compiler's data-od-loc).
    const loc = editId && typeof body.element?.loc === 'string' ? /^(\d{1,6}):(\d{1,6})$/.exec(body.element.loc) : null
    const span = loc && target ? { start: Number(loc[1]), end: Number(loc[2]) } : null
    const element = span && span.start < span.end && span.end <= target!.html.length && target!.html[span.start] === '<'
      ? { ...span, source: target!.html.slice(span.start, span.end), label: typeof body.element.label === 'string' ? body.element.label.slice(0, 60) : 'Element' }
      : null
    const kind: MessageKind = regenerateId ? 'regenerate' : element ? 'element' : target ? 'edit' : 'add'
    const planned = (s: ScreenRow): PlannedScreen => ({
      id: s.slug ?? s.id, name: s.name, spec: s.spec || s.prompt,
      kind: s.screenType === 'root-tab' ? 'tab' : s.screenType === 'modal-flow' ? 'modal' : 'push',
      tab: s.activeTabId ?? undefined, parent: plan?.screens.find((p) => p.name === s.parentScreenName)?.id,
    })
    // An added screen joins the plan as a pushed screen from the first tab, with a fresh id.
    const added: PlannedScreen | null = target ? null : { id: `screen-${Math.random().toString(36).slice(2, 7)}`, name: 'New screen', kind: 'push', parent: plan?.screens.find((s) => s.kind === 'tab')?.id, spec: prompt }
    const user = regenerateId && target
      ? plan ? screenBrief(plan, planned(target)) : `Write this screen: ${target.name}. ${target.spec || target.prompt}`
      : target
        ? editBrief(plan, { name: target.name, slug: target.slug }, target.html, prompt)
        : plan ? `${screenBrief({ ...plan, screens: [...plan.screens, added!] }, added!)}\n\nThe person asked for: ${prompt}\nName the screen with a short title in the Navbar.` : `Write one phone screen: ${prompt}`

    const startedAt = Date.now()
    const ask = regenerateId ? `Regenerate “${target!.name}”` : prompt
    await Message.add({ projectId: project.id, role: 'user', kind, text: element ? `${ask} — ${element.label}` : ask, meta: target || images ? { ...(target && { screens: [{ id: target.id, name: target.name }] }), ...(images && { images: images.length }) } : undefined })
    if (regenerateId && target?.html) await FeedbackController.record(project.id, target.id, 'regenerate')
    const usage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0 }
    const tally = (u: typeof usage) => { usage.promptTokens += u.promptTokens; usage.cachedTokens += u.cachedTokens; usage.completionTokens += u.completionTokens }

    const abort = new AbortController()
    const enc = new TextEncoder()
    const stream = new ReadableStream({
      cancel() { abort.abort() },
      async start(controller) {
        const send = (s: string) => { try { controller.enqueue(enc.encode(s)) } catch {} }
        try {
          // KON-13: a screen added, edited or redrawn from chat is measured and repaired like a planned one.
          let checked: AuditOutcome | undefined
          const theme = parseAppTheme(project.theme)
          const look = { accent: theme.accent, dark: theme.dark, platform: 'ios' as const, style: theme.style, tabs: plan?.tabs ?? [] }
          const slug = target?.slug ?? added?.id ?? ''
          // An element: the model writes that element alone, and it is spliced in. If the result does not build, the
          // whole-file edit (told which element) is the fallback, through drawScreen's own retry.
          let first: string | undefined
          if (element && target) {
            const piece = (await writeScreen(elementBrief(plan, { name: target.name, slug: target.slug }, target.html, element.source, prompt), tally, abort.signal, 'edit', images)).trim()
            if (piece.startsWith('<') && !/^import\s|export\s+default/m.test(piece)) first = target.html.slice(0, element.start) + reindent(piece, target.html, element.start) + target.html.slice(element.end)
          }
          const brief = element ? `${user}\n\nChange only this element and leave the rest of the file exactly as it is:\n\`\`\`jsx\n${element.source}\n\`\`\`` : user
          const jsx = await drawScreen(brief, tally, abort.signal, target && !regenerateId ? 'edit' : 'screen', { look, slug, report: (o) => (checked = o) }, images, first)
          let changed: { id: string; name: string; versionId?: string; created?: boolean }
          if (target) {
            const versionId = target.html ? await ScreenVersion.captureFrom(target) : undefined
            await Screen.updateContent(target.id, { name: target.name, prompt: regenerateId ? target.prompt : prompt, html: jsx })
            ShotService.warm(project.id, jsx, target.slug ?? target.id)
            changed = { id: target.id, name: target.name, versionId }
          } else {
            const pos = nextFramePosition(await Screen.positions(project.id), project.device)
            const name = jsx.match(/title=["{]\s*["']?([^"'}]{1,40})/)?.[1]?.trim() || 'New screen'
            const id = crypto.randomUUID()
            await Screen.create({ id, projectId: project.id, name, slug: added!.id, prompt, html: jsx, x: pos.x, y: pos.y, screenType: 'detail-view', parentScreenName: plan?.screens.find((s) => s.id === added!.parent)?.name ?? null, spec: prompt })
            if (plan) await Project.savePlan(project.id, { ...plan, screens: [...plan.screens, { ...added!, name }] })
            changed = { id, name, created: true }
          }
          await Message.add({
            projectId: project.id, role: 'agent', kind,
            text: changeReply({ kind: kind as 'add' | 'edit' | 'element' | 'regenerate', screen: changed.name, element: element?.label, version: changed.created ? undefined : (await ScreenVersion.count(changed.id)) + 1 }),
            meta: { screens: [changed], log: [`${changed.name} — ${((Date.now() - startedAt) / 1000).toFixed(1)}s, ${jsx.length} chars${checkNote(checked)}`, ...(usage.promptTokens ? [formatTokens(usage)] : [])], durationMs: Date.now() - startedAt },
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          if (regenerateId && target && !abort.signal.aborted) await Screen.markFailed(target.id, message)
          await Message.add(abort.signal.aborted
            ? { projectId: project.id, role: 'agent', kind, text: 'Stopped — nothing was changed.', meta: { stopped: true, durationMs: Date.now() - startedAt } }
            : { projectId: project.id, role: 'agent', kind: 'error', text: friendlyError(message), meta: { screens: target ? [{ id: target.id, name: target.name }] : [], log: [message.slice(0, 500)], durationMs: Date.now() - startedAt } })
          send(`${ERROR_MARK}${friendlyError(message)}-->`)
        }
        try { controller.close() } catch {}
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Project-Id': project.id } })
  },
}
