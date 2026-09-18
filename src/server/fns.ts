import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { db, type Project, type Screen } from './db'
import { complete, extractArtifact, systemPrompt } from './llm'

export const listProjects = createServerFn({ method: 'GET' }).handler(
  async () => db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[],
)

export const getProject = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined
    if (!project) throw notFound()
    const screens = db
      .prepare('SELECT * FROM screens WHERE project_id = ? ORDER BY created_at DESC')
      .all(id) as Screen[]
    return { project, screens }
  })

export const generateScreen = createServerFn({ method: 'POST' })
  .validator((d: { prompt: string; projectId?: string; device?: string }) => {
    const prompt = d.prompt?.trim()
    if (!prompt || prompt.length > 4000) throw new Error('Prompt must be 1-4000 characters')
    const device = d.device === 'mobile' ? 'mobile' : 'desktop'
    return { prompt, projectId: d.projectId, device }
  })
  .handler(async ({ data }) => {
    let project = data.projectId
      ? (db.prepare('SELECT * FROM projects WHERE id = ?').get(data.projectId) as Project | undefined)
      : undefined
    if (data.projectId && !project) throw notFound()

    const reply = await complete(
      systemPrompt(project?.design_system ?? 'minimal', project?.device ?? data.device),
      data.prompt,
    )
    const { title, html } = extractArtifact(reply)
    if (!html.includes('<')) throw new Error('Model returned no HTML')

    if (!project) {
      const id = crypto.randomUUID()
      db.prepare('INSERT INTO projects (id, name, device) VALUES (?, ?, ?)').run(id, title, data.device)
      project = { id } as Project
    }
    const screenId = crypto.randomUUID()
    db.prepare('INSERT INTO screens (id, project_id, name, prompt, html) VALUES (?, ?, ?, ?, ?)').run(
      screenId,
      project.id,
      title,
      data.prompt,
      html,
    )
    return { projectId: project.id, screenId }
  })
