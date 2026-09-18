import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { streamCompletion } from '@/app/Services/LlmService'
import { composeSystemPrompt } from '@/app/Services/PromptComposer'
import { planScreensWithRetry } from '@/app/Services/PlannerService'
import { mapLimit } from '@/app/Services/Pool'
import { extractArtifact } from '@/artifact'
import { frameSize, FRAME_GAP } from '@/canvas'
import { annotateHtml } from '@/lib/element-annotator'

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

          const tabListStr = plan.navigation.tabs.map((t) => `${t.label}${t.isAction ? ' (Center Action)' : ''}`).join(', ')

          await mapLimit(plan.screens, 3, async (s, i) => {
            send({ type: 'screen_start', index: i, name: s.name })

            const isRoot = s.screenType === 'root-tab'
            const activeTabLabel = plan.navigation.tabs.find((t) => t.id === s.activeTabId)?.label ?? s.name

            const navRules = isRoot
              ? `MANDATORY NAVIGATION BAR CONTRACT:
1. Render the shared bottom navigation bar (<nav data-od-id="bottom-nav" class="fixed bottom-0 inset-x-0 z-40 bg-white/95 border-t border-border flex items-center justify-around h-16">).
2. Use EXACTLY these tabs in this exact order: [${tabListStr}].
3. The active tab is "${activeTabLabel}" — highlight it with text-primary / var(--accent).
4. All other tabs MUST be inactive (text-muted-foreground).
5. Do NOT invent new tabs, change tab names, or alter the tab order.`
              : `MANDATORY DETAIL SCREEN HEADER CONTRACT:
1. This is a detail screen (${s.name}).
2. Include a standard back navigation button in the top header linking back to "${s.parentScreen ?? 'Home'}" (<button class="p-2 -ml-2 text-foreground"><svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>).
3. Display "${s.name}" clearly in the top header.`

            const user = `App: ${plan.appName} — ${plan.summary}
Other screens in this app: ${screenNames}

# APP CONSISTENCY CONTRACT
${navRules}

## Screen to design: ${s.name}
${s.description}`
            try {
              let text = ''
              for await (const d of streamCompletion(system, user)) {
                text += d
                send({ type: 'screen_delta', index: i, text })
              }
              const { title, html } = extractArtifact(text)
              if (!/<\/html>/i.test(html)) throw new Error('Model returned incomplete HTML')
              const annotated = annotateHtml(html)
              const screen = Screen.create({
                id: crypto.randomUUID(),
                projectId: project.id,
                name: title || s.name,
                prompt: s.description,
                html: annotated,
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
