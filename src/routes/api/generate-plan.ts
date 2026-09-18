import { createFileRoute } from '@tanstack/react-router'
import { db, type Project } from '../../server/db'
import { streamCompletion } from '../../server/llm'
import { composeSystemPrompt } from '../../server/compose'
import { planScreensWithRetry } from '../../server/planner'
import { mapLimit } from '../../server/pool'
import { extractArtifact } from '../../artifact'
import { frameSize, FRAME_GAP } from '../../canvas'

// POST { projectId, brief } -> newline-delimited JSON events (see PlanEvent in src/generatePlan.ts).
// Only used to seed a brand-new, empty project — positions are assigned by plan order (0, 1, 2, ...).
export const Route = createFileRoute('/api/generate-plan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}))
        const brief = typeof body.brief === 'string' ? body.brief.trim() : ''
        if (!brief || brief.length > 4000) return new Response('Brief must be 1-4000 characters', { status: 400 })
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(String(body.projectId ?? '')) as
          | Project
          | undefined
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
              db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(plan.appName, project.id)
              send({ type: 'plan', ...plan })

              const system = composeSystemPrompt(project.design_system, project.device)
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
                  const screenId = crypto.randomUUID()
                  db.prepare('INSERT INTO screens (id, project_id, name, prompt, html, x, y) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                    screenId,
                    project.id,
                    title || s.name,
                    s.description,
                    html,
                    i * (fw + FRAME_GAP),
                    0,
                  )
                  send({ type: 'screen_done', index: i, screenId, name: title || s.name })
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
    },
  },
})
