import { Project, type ProjectRow } from '@/app/Models/Project'
import { Screen, type ScreenRow } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { DesignSystemService } from '@/app/Services/DesignSystemService'
import { streamCompletion } from '@/app/Services/LlmService'
import { composeSystemPrompt, composeElementEditPrompt } from '@/app/Services/PromptComposer'
import { extractArtifact, ERROR_MARK } from '@/artifact'
import { nextFramePosition } from '@/canvas'
import { annotateHtml } from '@/lib/element-annotator'
import { extractElement, patchElement } from '@/lib/element-patcher'

// POST { prompt, projectId?, device?, designSystem?, editScreenId?, editElementId?, skill? } -> text/plain stream
export const GenerateController = {
  async stream(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt || prompt.length > 4000) return new Response('Prompt must be 1-4000 characters', { status: 400 })

    let project: Pick<ProjectRow, 'id' | 'designSystem' | 'device'> | undefined
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
    }

    const deltas = streamCompletion(systemPrompt, userMessage)
    let first: IteratorResult<string>
    try {
      first = await deltas.next()
    } catch (e) {
      return new Response(e instanceof Error ? e.message : String(e), { status: 502 })
    }

    const enc = new TextEncoder()
    const projectRef = project
    const stream = new ReadableStream({
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

          if (editScreen && editElementId) {
            // Extracted element HTML
            const extracted = extractArtifact(text)
            const newElementSnippet = extracted.html || text
            finalHtml = patchElement(editScreen.html, editElementId, newElementSnippet)
            finalHtml = annotateHtml(finalHtml)
            title = editScreen.name
          } else {
            const extracted = extractArtifact(text)
            title = extracted.title
            finalHtml = annotateHtml(extracted.html)
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
