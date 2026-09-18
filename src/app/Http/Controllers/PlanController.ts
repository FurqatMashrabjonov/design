import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { streamCompletion } from '@/app/Services/LlmService'
import { composeSystemPrompt } from '@/app/Services/PromptComposer'
import { planScreensWithRetry } from '@/app/Services/PlannerService'
import { mapLimit } from '@/app/Services/Pool'
import { extractArtifact } from '@/artifact'
import { frameSize, FRAME_GAP } from '@/canvas'

// POST { projectId, brief } -> newline-delimited JSON events (see PlanEvent in src/generatePlan.ts).
// Only used to seed a brand-new, empty project — positions are assigned by plan order (0, 1, 2, ...).
export const PlanController = {
  async stream(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const brief = typeof body.brief === 'string' ? body.brief.trim() : ''
    if (!brief || brief.length > 4000) return new Response('Brief must be 1-4000 characters', { status: 400 })
    const project = Project.find(String(body.projectId ?? ''))
    if (!project) return new Response('Project not found', { status: 404 })

    const enc = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          try {
            controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'))
          } catch {}
        }
        try {
          const plan = await planScreensWithRetry(brief, project.device)
          Project.rename(project.id, plan.appName)
          send({ type: 'plan', ...plan })

          const system = composeSystemPrompt(project.designSystem, project.device)
          const fw = frameSize(project.device).width
          const screenNames = plan.screens.map((s) => s.name).join(', ')

          await mapLimit(plan.screens, 3, async (s, i) => {
            send({ type: 'screen_start', index: i, name: s.name })
            const user = `App: ${plan.appName} — ${plan.summary}\nOther screens in this app: ${screenNames}\n\nDesign this one screen: ${s.name}\n${s.description}`
            try {
              let text = ''
              for await (const d of streamCompletion(system, user)) {
                text += d
                send({ type: 'screen_delta', index: i, text })
              }
              const { title, html } = extractArtifact(text)
              if (!/<\/html>/i.test(html)) throw new Error('Model returned incomplete HTML')
              const screen = Screen.create({
                id: crypto.randomUUID(),
                projectId: project.id,
                name: title || s.name,
                prompt: s.description,
                html,
                x: i * (fw + FRAME_GAP),
                y: 0,
              })
              send({ type: 'screen_done', index: i, screenId: screen.id, name: screen.name })
            } catch (e) {
              send({ type: 'screen_error', index: i, message: e instanceof Error ? e.message : String(e) })
            }
          })
          send({ type: 'done' })
        } catch (e) {
          send({ type: 'error', message: e instanceof Error ? e.message : String(e) })
        }
        try {
          controller.close()
        } catch {}
      },
    })

    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } })
  },
}
