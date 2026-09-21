import { Project, type ProjectRow } from '@/app/Models/Project'
import { Screen, type ScreenRow } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { DesignSystemService } from '@/app/Services/DesignSystemService'
import { streamCompletion } from '@/app/Services/LlmService'
import { resolveImages } from '@/app/Services/ImageService'
import { composeSystemPrompt, composeElementEditPrompt } from '@/app/Services/PromptComposer'
import { extractArtifact, ERROR_MARK } from '@/artifact'
import { nextFramePosition } from '@/canvas'
import { annotateHtml } from '@/lib/element-annotator'
import { extractElement, patchElement } from '@/lib/element-patcher'
import { normalizeScreen, extractStyleDigest } from '@/lib/screen-normalizer'
import { NAV_CLEARANCE } from '@/app/Services/ShellService'
import { dataBlock, parseNavigation, parseStoredPlan, screenBrief, shellContract, shellPartsFor, slotForAddedScreen, type ScreenSlot } from '@/app/Services/ScreenContext'
import { autofixScreen } from '@/lib/design-lint'
import { contentBlock, contentSeed, localeOf } from '@/lib/content-seed'
import { Message } from '@/app/Models/Message'
import { changeReply, formatTokens, friendlyError, type MessageKind } from '@/lib/agent-messages'

// POST { prompt, projectId?, device?, designSystem?, editScreenId?, editElementId?, regenerateScreenId?, skill? } -> text/plain stream
// regenerateScreenId redraws that screen from its stored spec — also how a failed screen is retried.
export const GenerateController = {
  async stream(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const regenerateId = typeof body.regenerateScreenId === 'string' && body.regenerateScreenId ? body.regenerateScreenId : null
    let prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!regenerateId && (!prompt || prompt.length > 4000)) return new Response('Prompt must be 1-4000 characters', { status: 400 })

    let project: (Pick<ProjectRow, 'id' | 'designSystem' | 'device'> & Partial<Pick<ProjectRow, 'name' | 'navigation' | 'plan'>>) | undefined
    let isNew = false
    if (body.projectId) {
      project = Project.find(String(body.projectId))
      if (!project) return new Response('Project not found', { status: 404 })
    } else {
      const designSystem = String(body.designSystem ?? 'minimal')
      if (!DesignSystemService.exists(designSystem)) return new Response('Unknown design system', { status: 400 })
      project = { id: crypto.randomUUID(), designSystem, device: body.device === 'mobile' ? 'mobile' : 'desktop' }
      isNew = true
    }

    let editScreen: ScreenRow | undefined
    if (body.editScreenId) {
      editScreen = Screen.findInProject(String(body.editScreenId), project.id)
      if (!editScreen) return new Response('Screen not found', { status: 404 })
    }

    // Regenerating is "draw this screen again from what it was planned to be", in the same slot.
    let redraw: ScreenRow | undefined
    if (regenerateId) {
      redraw = Screen.findInProject(regenerateId, project.id)
      if (!redraw) return new Response('Screen not found', { status: 404 })
      prompt = redraw.spec || redraw.prompt
    }

    const editElementId = typeof body.editElementId === 'string' && body.editElementId ? body.editElementId : null
    const skill = typeof body.skill === 'string' ? body.skill : undefined

    let systemPrompt: string
    let userMessage: string
    let addTo: { nav: NonNullable<ReturnType<typeof parseNavigation>>; slot: ScreenSlot } | undefined

    if (editScreen && editElementId) {
      const existingElementHtml = extractElement(editScreen.html, editElementId) ?? ''
      systemPrompt = composeElementEditPrompt(
        project.designSystem,
        project.device,
        editScreen.html,
        editElementId,
        existingElementHtml,
        prompt
      )
      userMessage = `Please update element with data-od-id="${editElementId}". Instruction: ${prompt}`
    } else if (editScreen) {
      systemPrompt = composeSystemPrompt(project.designSystem, project.device, skill)
      userMessage = `Current screen HTML:\n\`\`\`html\n${editScreen.html}\n\`\`\`\n\nEdit instruction: ${prompt}\n\nRewrite the full HTML applying this instruction. Keep everything else the same.`
    } else {
      systemPrompt = composeSystemPrompt(project.designSystem, project.device, skill)
      userMessage = prompt
      // Adding to a planned app: the screen joins that app — its name, its screens, its shell and
      // its house style — instead of being designed from the bare prompt as if it stood alone.
      const nav = isNew ? null : parseNavigation(project.navigation)
      // Screens that were drawn: a failed one has nothing to anchor a style on, and the screen being
      // redrawn must not be listed as its own sibling.
      const siblings = nav ? Screen.forProject(project.id).filter((s) => s.html && s.id !== redraw?.id).sort((a, z) => a.x - z.x) : []
      if (nav && (siblings.length > 0 || redraw)) {
        const slot: ScreenSlot = redraw
          ? { name: redraw.name, screenType: redraw.screenType as ScreenSlot['screenType'], activeTabId: redraw.activeTabId ?? undefined, parentScreen: redraw.parentScreenName ?? undefined }
          : slotForAddedScreen(prompt, nav, siblings)
        const anchor = siblings.find((s) => s.screenType === 'root-tab') ?? siblings[0]
        addTo = { nav, slot }
        const stored = parseStoredPlan(project.plan)
        userMessage = screenBrief({
          app: stored?.summary ? `${project.name ?? 'Untitled'} — ${stored.summary}` : (project.name ?? 'Untitled'),
          data: dataBlock(stored?.entities ?? []),
          screenNames: siblings.map((s) => s.name),
          contract: shellContract(slot, nav, project.device === 'mobile'),
          digest: anchor ? extractStyleDigest(anchor.html) : '',
          // No brief is stored with a project, so the app's language is read off the screen it already has —
          // never off the chat message: people ask for an English app's next screen in their own language.
          content: contentBlock(contentSeed(project.id, localeOf(`${(anchor?.html ?? prompt).replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').slice(0, 4000)}`))),
          heading: redraw ? `Screen to design: ${redraw.name}` : 'Screen to add',
          description: redraw
            ? prompt
            : `${prompt}\n\nIf this request does not name a screen, design the most useful screen this app is still missing. Never redesign a screen listed above. Title the artifact with the screen's own name.`,
        })
      }
    }

    // The conversation: what was asked, then (below) what was done. A brand-new single-screen project
    // has no row yet, so its first exchange is written once the project exists.
    const startedAt = Date.now()
    const kind: MessageKind = redraw ? 'regenerate' : editScreen && editElementId ? 'element' : editScreen ? 'edit' : 'add'
    const ask = redraw ? `Regenerate “${redraw.name}”` : String(body.prompt).trim()
    const target = redraw ?? editScreen
    if (!isNew) Message.add({ projectId: project.id, role: 'user', kind, text: ask, meta: target ? { screens: [{ id: target.id, name: target.name }] } : undefined })
    const usage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0 }
    const fail = (raw: string) =>
      Message.add({ projectId: projectRef.id, role: 'agent', kind: 'error', text: friendlyError(raw), meta: { screens: target ? [{ id: target.id, name: target.name }] : [], log: [raw.slice(0, 500)], durationMs: Date.now() - startedAt } })

    // Cancelling the response stream (tab closed, navigation) aborts the upstream LLM call.
    const abort = new AbortController()
    const projectRef = project
    const deltas = streamCompletion(systemPrompt, userMessage, abort.signal, (u) => Object.assign(usage, u))
    let first: IteratorResult<string>
    try {
      first = await deltas.next()
    } catch (e) {
      // The provider refused before sending a byte (no balance, rate limit, outage).
      const message = e instanceof Error ? e.message : String(e)
      if (redraw) Screen.markFailed(redraw.id, message)
      if (!isNew) fail(message)
      return new Response(friendlyError(message), { status: 502 })
    }

    const enc = new TextEncoder()
    const stream = new ReadableStream({
      cancel() {
        abort.abort()
      },
      async start(controller) {
        const send = (s: string) => {
          try {
            controller.enqueue(enc.encode(s))
          } catch {}
        }
        let text = first.done ? '' : first.value
        send(text)
        try {
          for await (const d of deltas) {
            text += d
            send(d)
          }

          let title: string
          let finalHtml: string

          const normalizeOpts = {
            tokensCss: DesignSystemService.readTokensRoot(projectRef.designSystem),
            fontUrls: DesignSystemService.readFontUrls(projectRef.designSystem),
            iconStroke: DesignSystemService.readIconStroke(projectRef.designSystem),
          }

          if (editScreen && editElementId) {
            // Extracted element HTML
            const extracted = extractArtifact(text)
            const newElementSnippet = extracted.html || text
            finalHtml = patchElement(editScreen.html, editElementId, newElementSnippet)
            title = editScreen.name
            finalHtml = annotateHtml(await resolveImages(autofixScreen(normalizeScreen(finalHtml, normalizeOpts)), abort.signal, { name: projectRef.name ?? title }))
          } else {
            const extracted = extractArtifact(text)
            title = extracted.title
            const shell = addTo && shellPartsFor(addTo.slot, addTo.nav, projectRef.device === 'mobile', title)
            finalHtml = annotateHtml(await resolveImages(autofixScreen(normalizeScreen(extracted.html, { ...normalizeOpts, shell, navClearance: NAV_CLEARANCE })), abort.signal, { name: projectRef.name ?? title }))
            if (!/<\/html>/i.test(finalHtml)) throw new Error('Model returned incomplete HTML')
          }

          if (isNew) {
            Project.create({
              id: projectRef.id,
              name: title,
              designSystem: projectRef.designSystem,
              device: projectRef.device,
            })
          }

          let changed: { id: string; name: string; versionId?: string; created?: boolean }
          if (redraw) {
            // A screen that failed has no design worth keeping as a version.
            const versionId = redraw.html ? ScreenVersion.captureFrom(redraw) : undefined
            const name = title === 'Untitled' ? redraw.name : title
            Screen.updateContent(redraw.id, { name, prompt: redraw.prompt, html: finalHtml })
            changed = { id: redraw.id, name, versionId }
          } else if (editScreen) {
            const versionId = ScreenVersion.captureFrom(editScreen)
            Screen.updateContent(editScreen.id, { name: title, prompt, html: finalHtml })
            changed = { id: editScreen.id, name: title, versionId }
          } else {
            const pos = nextFramePosition(Screen.positions(projectRef.id), projectRef.device)
            const id = crypto.randomUUID()
            changed = { id, name: title, created: true }
            Screen.create({
              id,
              projectId: projectRef.id,
              name: title,
              prompt,
              html: finalHtml,
              x: pos.x,
              y: pos.y,
              screenType: addTo?.slot.screenType,
              activeTabId: addTo?.slot.activeTabId ?? null,
              parentScreenName: addTo?.slot.parentScreen ?? null,
              spec: prompt,
            })
          }

          if (isNew) Message.add({ projectId: projectRef.id, role: 'user', kind, text: ask })
          const slot = addTo && (addTo.slot.screenType === 'root-tab' ? `as the ${addTo.nav.tabs.find((t) => t.id === addTo!.slot.activeTabId)?.label ?? ''} tab` : addTo.slot.parentScreen ? `under “${addTo.slot.parentScreen}”` : '')
          const photos = (finalHtml.match(/data-od-(img|avatar)-resolved/g) ?? []).length
          Message.add({
            projectId: projectRef.id,
            role: 'agent',
            kind,
            text: changeReply({ kind: kind as 'add' | 'edit' | 'element' | 'regenerate', screen: changed.name, element: editElementId, version: changed.created ? undefined : ScreenVersion.count(changed.id) + 1, slot: slot || undefined }),
            meta: {
              screens: [changed],
              log: [`${changed.name} — ${((Date.now() - startedAt) / 1000).toFixed(1)}s, ${Math.round(finalHtml.length / 1024)} KB${photos ? `, ${photos} photo${photos === 1 ? '' : 's'}` : ''}`, ...(usage.promptTokens ? [formatTokens(usage)] : [])],
              durationMs: Date.now() - startedAt,
            },
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          if (redraw && !abort.signal.aborted) Screen.markFailed(redraw.id, message)
          if (abort.signal.aborted) {
            // Stop (or a closed tab): nothing was saved, and the conversation says so.
            if (!isNew) Message.add({ projectId: projectRef.id, role: 'agent', kind, text: 'Stopped — nothing was changed.', meta: { stopped: true, durationMs: Date.now() - startedAt } })
          } else if (!isNew || Project.find(projectRef.id)) fail(message)
          send(`${ERROR_MARK}${friendlyError(message)}-->`)
        }
        try {
          controller.close()
        } catch {}
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Project-Id': project.id },
    })
  },
}
