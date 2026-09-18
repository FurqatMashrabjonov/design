import { Project, type ProjectRow } from '@/app/Models/Project'
import { Screen, type ScreenRow } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { DesignSystemService } from '@/app/Services/DesignSystemService'
import { streamCompletion } from '@/app/Services/LlmService'
import { composeSystemPrompt } from '@/app/Services/PromptComposer'
import { extractArtifact, ERROR_MARK } from '@/artifact'
import { nextFramePosition } from '@/canvas'

// POST { prompt, projectId?, device?, designSystem?, editScreenId? } -> text/plain stream of the raw model output.
// New project id is returned up front in X-Project-Id; rows are written only after a complete generation.
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

    const userMessage = editScreen
      ? `Current screen HTML:\n\`\`\`html\n${editScreen.html}\n\`\`\`\n\nEdit instruction: ${prompt}\n\nRewrite the full HTML applying this instruction. Keep everything else the same.`
      : prompt

    const deltas = streamCompletion(composeSystemPrompt(project.designSystem, project.device), userMessage)
    // Pull the first chunk before answering so bad key / upstream errors become a real error status
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
        // Enqueue may throw once the client disconnects; keep consuming so the screen still gets saved.
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
          const { title, html } = extractArtifact(text)
          if (!/<\/html>/i.test(html)) throw new Error('Model returned incomplete HTML')
          if (isNew) Project.create({ id: projectRef.id, name: title, designSystem: projectRef.designSystem, device: projectRef.device })

          if (editScreen) {
            ScreenVersion.captureFrom(editScreen) // keep the pre-edit state so History can restore it
            Screen.updateContent(editScreen.id, { name: title, prompt, html })
          } else {
            const pos = nextFramePosition(Screen.positions(projectRef.id), projectRef.device)
            Screen.create({ id: crypto.randomUUID(), projectId: projectRef.id, name: title, prompt, html, x: pos.x, y: pos.y })
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
