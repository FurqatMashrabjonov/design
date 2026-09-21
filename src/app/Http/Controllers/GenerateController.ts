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
import { parseNavigation, screenBrief, shellContract, shellPartsFor, slotForAddedScreen, type ScreenSlot } from '@/app/Services/ScreenContext'
import { autofixScreen } from '@/lib/design-lint'
import { contentBlock, contentSeed, localeOf } from '@/lib/content-seed'

// POST { prompt, projectId?, device?, designSystem?, editScreenId?, editElementId?, skill? } -> text/plain stream
export const GenerateController = {
  async stream(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt || prompt.length > 4000) return new Response('Prompt must be 1-4000 characters', { status: 400 })

    let project: (Pick<ProjectRow, 'id' | 'designSystem' | 'device'> & Partial<Pick<ProjectRow, 'name' | 'navigation'>>) | undefined
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
      const siblings = nav ? Screen.forProject(project.id).sort((a, z) => a.x - z.x) : []
      if (nav && siblings.length > 0) {
        const slot = slotForAddedScreen(prompt, nav, siblings)
        const anchor = siblings.find((s) => s.screenType === 'root-tab') ?? siblings[0]
        addTo = { nav, slot }
        userMessage = screenBrief({
          app: project.name ?? 'Untitled',
          screenNames: siblings.map((s) => s.name),
          contract: shellContract(slot, nav, project.device === 'mobile'),
          digest: extractStyleDigest(anchor.html),
          // No brief is stored with a project, so the app's language is read off the screen it already has —
          // never off the chat message: people ask for an English app's next screen in their own language.
          content: contentBlock(contentSeed(project.id, localeOf(`${anchor.html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').slice(0, 4000)}`))),
          heading: 'Screen to add',
          description: `${prompt}\n\nIf this request does not name a screen, design the most useful screen this app is still missing. Never redesign a screen listed above. Title the artifact with the screen's own name.`,
        })
      }
    }

    // Cancelling the response stream (tab closed, navigation) aborts the upstream LLM call.
    const abort = new AbortController()
    const deltas = streamCompletion(systemPrompt, userMessage, abort.signal)
    let first: IteratorResult<string>
    try {
      first = await deltas.next()
    } catch (e) {
      return new Response(e instanceof Error ? e.message : String(e), { status: 502 })
    }

    const enc = new TextEncoder()
    const projectRef = project
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
            finalHtml = annotateHtml(await resolveImages(autofixScreen(normalizeScreen(finalHtml, normalizeOpts)), abort.signal))
            title = editScreen.name
          } else {
            const extracted = extractArtifact(text)
            title = extracted.title
            const shell = addTo && shellPartsFor(addTo.slot, addTo.nav, projectRef.device === 'mobile', title)
            finalHtml = annotateHtml(await resolveImages(autofixScreen(normalizeScreen(extracted.html, { ...normalizeOpts, shell, navClearance: NAV_CLEARANCE })), abort.signal))
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

          if (editScreen) {
            ScreenVersion.captureFrom(editScreen)
            Screen.updateContent(editScreen.id, { name: title, prompt, html: finalHtml })
          } else {
            const pos = nextFramePosition(Screen.positions(projectRef.id), projectRef.device)
            Screen.create({
              id: crypto.randomUUID(),
              projectId: projectRef.id,
              name: title,
              prompt,
              html: finalHtml,
              x: pos.x,
              y: pos.y,
              screenType: addTo?.slot.screenType,
              activeTabId: addTo?.slot.activeTabId ?? null,
              parentScreenName: addTo?.slot.parentScreen ?? null,
            })
          }
        } catch (e) {
          send(`${ERROR_MARK}${e instanceof Error ? e.message : String(e)}-->`)
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
