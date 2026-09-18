import { createFileRoute } from '@tanstack/react-router'
import { db, type Project } from '../../server/db'
import { listDesignSystems, streamCompletion, systemPrompt } from '../../server/llm'
import { ERROR_MARK, extractArtifact } from '../../artifact'

// POST { prompt, projectId? , device?, designSystem? } -> text/plain stream of the raw model output.
// New project id is returned up front in X-Project-Id; rows are written only after a complete generation.
export const Route = createFileRoute('/api/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}))
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
        if (!prompt || prompt.length > 4000) return new Response('Prompt must be 1-4000 characters', { status: 400 })

        let project: Pick<Project, 'id' | 'design_system' | 'device'> | undefined
        let isNew = false
        if (body.projectId) {
          project = db.prepare('SELECT * FROM projects WHERE id = ?').get(String(body.projectId)) as Project | undefined
          if (!project) return new Response('Project not found', { status: 404 })
        } else {
          const designSystem = String(body.designSystem ?? 'minimal')
          // Whitelist: the id becomes a file path
          if (!listDesignSystems().some((d) => d.id === designSystem))
            return new Response('Unknown design system', { status: 400 })
          project = {
            id: crypto.randomUUID(),
            design_system: designSystem,
            device: body.device === 'mobile' ? 'mobile' : 'desktop',
          }
          isNew = true
        }

        const deltas = streamCompletion(systemPrompt(project.design_system, project.device), prompt)
        // Pull the first chunk before answering so bad key / upstream errors become a real error status
        let first: IteratorResult<string>
        try {
          first = await deltas.next()
        } catch (e) {
          return new Response(e instanceof Error ? e.message : String(e), { status: 502 })
        }

        const enc = new TextEncoder()
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
              if (isNew)
                db.prepare('INSERT INTO projects (id, name, design_system, device) VALUES (?, ?, ?, ?)').run(
                  project.id,
                  title,
                  project.design_system,
                  project.device,
                )
              db.prepare('INSERT INTO screens (id, project_id, name, prompt, html) VALUES (?, ?, ?, ?, ?)').run(
                crypto.randomUUID(),
                project.id,
                title,
                prompt,
                html,
              )
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
    },
  },
})
