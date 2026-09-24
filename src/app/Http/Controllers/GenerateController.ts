import { artBlock, artDirection } from '@/lib/art-direction'
import { parseRefImages, refImageNote } from '@/lib/ref-images'
import { referenceBlock } from '@/app/Services/ReferenceService'
import { FeedbackController } from '@/app/Http/Controllers/FeedbackController'
import { Project, type ProjectRow } from '@/app/Models/Project'
import { Screen, type ScreenRow } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { KitService } from '@/app/Services/KitService'
import { DesignSystemService } from '@/app/Services/DesignSystemService'
import { streamCompletion } from '@/app/Services/LlmService'
import { resolveImages } from '@/app/Services/ImageService'
import { composeSystemPrompt, composeElementEditPrompt } from '@/app/Services/PromptComposer'
import { extractArtifact, ERROR_MARK } from '@/artifact'
import { nextFramePosition } from '@/canvas'
import { annotateHtml } from '@/lib/element-annotator'
import { extractElement, patchElement } from '@/lib/element-patcher'
import { annotateElements, elementInfo } from '@/lib/element-ops'
import { applyEdits, EDIT_MODE, parseAffects, parseEdits } from '@/lib/screen-patch'
import { normalizeScreen } from '@/lib/screen-normalizer'
import { componentSheet } from '@/app/Services/ComponentSheetService'
import { navClearance, type NavStyle } from '@/app/Services/ShellService'
import { dataBlock, navStyleFor, parseNavigation, parseStoredPlan, screenBrief, shellContract, shellPartsFor, slotForAddedScreen, type ScreenSlot } from '@/app/Services/ScreenContext'
import { screenTitle } from '@/app/Services/PlannerService'
import { autofixScreen } from '@/lib/design-lint'
import { contentBlock, contentSeed, localeOf } from '@/lib/content-seed'
import { Message } from '@/app/Models/Message'
import { changeReply, formatTokens, friendlyError, type MessageKind } from '@/lib/agent-messages'

// POST { prompt, projectId?, device?, designSystem?, editScreenId?, editElementId?, regenerateScreenId? } -> text/plain stream
// regenerateScreenId redraws that screen from its stored spec — also how a failed screen is retried.
export const GenerateController = {
  // opts.userId: the signed-in owner, set by the API route (server/guard.ts); a new project is theirs.
  async stream(request: Request, opts: { userId?: string } = {}): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const regenerateId = typeof body.regenerateScreenId === 'string' && body.regenerateScreenId ? body.regenerateScreenId : null
    let prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!regenerateId && (!prompt || prompt.length > 4000)) return new Response('Prompt must be 1-4000 characters', { status: 400 })
    // LLM-02: pictures the person attached to this request. Validated here because they come from
    // the browser, and they ride this one request only — an image is prompt tokens every time.
    const refImages = parseRefImages(body.images)

    let project: (Pick<ProjectRow, 'id' | 'designSystem' | 'device'> & Partial<Pick<ProjectRow, 'name' | 'navigation' | 'plan'>>) | undefined
    let isNew = false
    if (body.projectId) {
      project = await Project.find(String(body.projectId))
      if (!project) return new Response('Project not found', { status: 404 })
    } else {
      const designSystem = String(body.designSystem ?? 'minimal')
      if (!DesignSystemService.exists(designSystem)) return new Response('Unknown design system', { status: 400 })
      project = { id: crypto.randomUUID(), designSystem, device: 'mobile' }
      isNew = true
    }

    let editScreen: ScreenRow | undefined
    if (body.editScreenId) {
      editScreen = await Screen.findInProject(String(body.editScreenId), project.id)
      if (!editScreen) return new Response('Screen not found', { status: 404 })
    }

    // Regenerating is "draw this screen again from what it was planned to be", in the same slot.
    let redraw: ScreenRow | undefined
    if (regenerateId) {
      redraw = await Screen.findInProject(regenerateId, project.id)
      if (!redraw) return new Response('Screen not found', { status: 404 })
      prompt = redraw.spec || redraw.prompt
    }

    const editElementId = typeof body.editElementId === 'string' && body.editElementId ? body.editElementId : null

    // GQ-10: the model draws against the app's saved palette, not the catalogue's colours.
    let systemPrompt: string
    let userMessage: string
    let addTo: { nav: NonNullable<ReturnType<typeof parseNavigation>>; slot: ScreenSlot; bar: NavStyle } | undefined

    // The browser addresses elements by the ids annotateElements gives the stored HTML; so does this.
    const editBase = editScreen?.html ? annotateElements(editScreen.html) : ''
    let elementLabel: string | undefined
    if (editScreen && editElementId) {
      const existingElementHtml = extractElement(editBase, editElementId)
      if (!existingElementHtml) return new Response('That element is no longer on this screen — select it again', { status: 409 })
      elementLabel = elementInfo(editBase, editElementId).label
      systemPrompt = composeElementEditPrompt(
        project.designSystem,
        editBase,
        editElementId,
        existingElementHtml,
        prompt
      )
      userMessage = `Please update element with data-od-id="${editElementId}". Instruction: ${prompt}`
    } else if (editScreen) {
      // Edit by parts (lib/screen-patch.ts): the model returns only what changes, addressed by the
      // same ids the canvas shows, and everything else stays byte-identical.
      systemPrompt = `${composeSystemPrompt(project.designSystem)}\n\n---\n\n${EDIT_MODE}`
      const data = dataBlock(parseStoredPlan(project.plan)?.entities ?? [])
      userMessage = [data, `Current screen (${editScreen.name}):\n\`\`\`html\n${editBase}\n\`\`\``, `Change request: ${prompt}`].filter(Boolean).join('\n\n')
    } else {
      systemPrompt = composeSystemPrompt(project.designSystem)
      userMessage = prompt
      // Adding to a planned app: the screen joins that app — its name, its screens, its shell and
      // its house style — instead of being designed from the bare prompt as if it stood alone.
      const nav = isNew ? null : parseNavigation(project.navigation)
      // Screens that were drawn: a failed one has nothing to anchor a style on, and the screen being
      // redrawn must not be listed as its own sibling.
      const siblings = nav ? (await Screen.forProject(project.id)).filter((s) => s.html && s.id !== redraw?.id).sort((a, z) => a.x - z.x) : []
      if (nav && (siblings.length > 0 || redraw)) {
        const slot: ScreenSlot = redraw
          ? { name: redraw.name, screenType: redraw.screenType as ScreenSlot['screenType'], activeTabId: redraw.activeTabId ?? undefined, parentScreen: redraw.parentScreenName ?? undefined }
          : slotForAddedScreen(prompt, nav, siblings)
        const anchor = siblings.find((s) => s.screenType === 'root-tab') ?? siblings[0]
        addTo = { nav, slot, bar: navStyleFor(project.id, nav, { appType: parseStoredPlan(project.plan)?.appType, designSystem: project.designSystem }) }
        const stored = parseStoredPlan(project.plan)
        userMessage = screenBrief({
          app: stored?.summary ? `${project.name ?? 'Untitled'} — ${stored.summary}` : (project.name ?? 'Untitled'),
          data: dataBlock(stored?.entities ?? []),
          // The same direction the planned screens got: seeded by the project, not by the request.
          art: [artBlock(artDirection(project.id, stored?.appType)), referenceBlock(stored?.reference ?? { composition: '', mood: [] })].filter(Boolean).join('\n\n'),
          screenNames: siblings.map((s) => s.name),
          contract: shellContract(slot, nav, addTo.bar),
          sheet: componentSheet(stored?.entities ?? []),
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
    if (!isNew) await Message.add({ projectId: project.id, role: 'user', kind, text: ask, meta: target ? { screens: [{ id: target.id, name: target.name }] } : undefined })
    // Asking for a drawn screen again is a signal about it (FB-01); retrying a failed one is not.
    if (redraw?.html) await FeedbackController.record(project.id, redraw.id, 'regenerate')
    const usage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0 }
    const fail = (raw: string) =>
      Message.add({ projectId: projectRef.id, role: 'agent', kind: 'error', text: friendlyError(raw), meta: { screens: target ? [{ id: target.id, name: target.name }] : [], log: [raw.slice(0, 500)], durationMs: Date.now() - startedAt } })

    // Cancelling the response stream (tab closed, navigation) aborts the upstream LLM call.
    const abort = new AbortController()
    const projectRef = project
    const withRefs = refImages.length ? `${userMessage}\n\n${refImageNote(refImages.length)}` : userMessage
    // LLM-07: an edit (a patch or one element) runs on the edit model; drawing a screen on the screen model.
    const deltas = streamCompletion(systemPrompt, withRefs, abort.signal, (u) => Object.assign(usage, u), refImages, editScreen ? 'edit' : 'screen')
    let first: IteratorResult<string>
    try {
      first = await deltas.next()
    } catch (e) {
      // The provider refused before sending a byte (no balance, rate limit, outage).
      const message = e instanceof Error ? e.message : String(e)
      if (redraw) await Screen.markFailed(redraw.id, message)
      if (!isNew) await fail(message)
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
          let patchNote: { parts: string[]; log: string[] } | undefined

          const normalizeOpts = {
            // GQ-10: a screen added or edited later takes the app's saved palette, not the catalogue's.
            tokensCss: DesignSystemService.readTokensRoot(projectRef.designSystem),
            fontUrls: DesignSystemService.readFontUrls(projectRef.designSystem),
            iconStroke: DesignSystemService.readIconStroke(projectRef.designSystem),
            kitCss: KitService.css(),
          }

          if (editScreen && editElementId) {
            // Extracted element HTML
            const extracted = extractArtifact(text)
            const newElementSnippet = extracted.html || text
            finalHtml = patchElement(editBase, editElementId, newElementSnippet)
            title = editScreen.name
            finalHtml = annotateHtml(await resolveImages(autofixScreen(normalizeScreen(finalHtml, normalizeOpts)), abort.signal, { name: projectRef.name ?? title }))
          } else if (editScreen && parseEdits(text).length > 0) {
            const edits = parseEdits(text)
            const result = applyEdits(editBase, edits)
            if (result.applied.length === 0) throw new Error(`The change did not match anything on the screen (${result.skipped.join('; ')})`)
            title = editScreen.name
            finalHtml = annotateHtml(await resolveImages(autofixScreen(normalizeScreen(result.html, normalizeOpts)), abort.signal, { name: projectRef.name ?? title }))
            patchNote = {
              parts: result.applied.map((a) => (a.op === 'insert' ? `added next to ${a.label}` : a.op === 'delete' ? `removed ${a.label}` : a.label)),
              log: [
                `Edited by parts: ${result.applied.map((a) => `${a.op} ${a.target}`).join(', ')} — ${(text.length / 1024).toFixed(1)} KB returned instead of the whole ${(editBase.length / 1024).toFixed(0)} KB screen`,
                ...result.skipped.map((x) => `Skipped ${x}`),
                // Said to be affected but not edited: the usual way a by-parts edit leaves a stale value behind.
                ...(() => {
                  const edited = new Set(edits.map((e) => e.target))
                  const missed = parseAffects(text).filter((id) => !edited.has(id))
                  return missed.length ? [`Listed as affected but not edited: ${missed.join(', ')} — check them`] : []
                })(),
              ],
            }
          } else {
            const extracted = extractArtifact(text)
            // A new project takes the model's title whole (it names the project); a screen added to
            // an app keeps the app's name off its own ("GoBite — Cart" → "Cart"), like the planned run.
            title = isNew ? extracted.title : screenTitle(extracted.title, projectRef.name ?? '')
            if (editScreen && title === 'Untitled') title = editScreen.name
            const shell = addTo && shellPartsFor(addTo.slot, addTo.nav, title, addTo.bar)
            finalHtml = annotateHtml(await resolveImages(autofixScreen(normalizeScreen(extracted.html, { ...normalizeOpts, shell, navClearance: navClearance(addTo?.bar ?? 'island') })), abort.signal, { name: projectRef.name ?? title }))
            if (!/<\/html>/i.test(finalHtml)) throw new Error('Model returned incomplete HTML')
          }

          if (isNew) {
            await Project.create({
              id: projectRef.id,
              name: title,
              designSystem: projectRef.designSystem,
              device: projectRef.device,
              userId: opts.userId ?? null,
            })
          }

          let changed: { id: string; name: string; versionId?: string; created?: boolean }
          if (redraw) {
            // A screen that failed has no design worth keeping as a version.
            const versionId = redraw.html ? await ScreenVersion.captureFrom(redraw) : undefined
            const name = title === 'Untitled' ? redraw.name : title
            await Screen.updateContent(redraw.id, { name, prompt: redraw.prompt, html: finalHtml })
            changed = { id: redraw.id, name, versionId }
          } else if (editScreen) {
            const versionId = await ScreenVersion.captureFrom(editScreen)
            await Screen.updateContent(editScreen.id, { name: title, prompt, html: finalHtml })
            changed = { id: editScreen.id, name: title, versionId }
          } else {
            const pos = nextFramePosition(await Screen.positions(projectRef.id), projectRef.device)
            const id = crypto.randomUUID()
            changed = { id, name: title, created: true }
            await Screen.create({
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

          if (isNew) await Message.add({ projectId: projectRef.id, role: 'user', kind, text: ask })
          const slot = addTo && (addTo.slot.screenType === 'root-tab' ? `as the ${addTo.nav.tabs.find((t) => t.id === addTo!.slot.activeTabId)?.label ?? ''} tab` : addTo.slot.parentScreen ? `under “${addTo.slot.parentScreen}”` : '')
          const photos = (finalHtml.match(/data-od-(img|avatar)-resolved/g) ?? []).length
          await Message.add({
            projectId: projectRef.id,
            role: 'agent',
            kind,
            text: changeReply({ kind: kind as 'add' | 'edit' | 'element' | 'regenerate', screen: changed.name, element: elementLabel ?? editElementId, parts: patchNote?.parts, version: changed.created ? undefined : await ScreenVersion.count(changed.id) + 1, slot: slot || undefined }),
            meta: {
              screens: [changed],
              log: [...(patchNote?.log ?? []), `${changed.name} — ${((Date.now() - startedAt) / 1000).toFixed(1)}s, ${Math.round(finalHtml.length / 1024)} KB${photos ? `, ${photos} photo${photos === 1 ? '' : 's'}` : ''}`, ...(usage.promptTokens ? [formatTokens(usage)] : [])],
              durationMs: Date.now() - startedAt,
            },
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          if (redraw && !abort.signal.aborted) await Screen.markFailed(redraw.id, message)
          if (abort.signal.aborted) {
            // Stop (or a closed tab): nothing was saved, and the conversation says so.
            if (!isNew) await Message.add({ projectId: projectRef.id, role: 'agent', kind, text: 'Stopped — nothing was changed.', meta: { stopped: true, durationMs: Date.now() - startedAt } })
          } else if (!isNew || (await Project.find(projectRef.id))) await fail(message)
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
