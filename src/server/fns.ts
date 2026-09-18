import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { db, snapshotScreen, type Project, type Screen, type ScreenVersion } from './db'
import { listDesignSystems } from './llm'

export const getHome = createServerFn({ method: 'GET' }).handler(async () => ({
  projects: db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[],
  designSystems: listDesignSystems(),
}))

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

export const moveScreen = createServerFn({ method: 'POST' })
  .validator((d: { id: string; x: number; y: number }) => d)
  .handler(async ({ data }) => {
    db.prepare('UPDATE screens SET x = ?, y = ? WHERE id = ?').run(data.x, data.y, data.id)
  })

export const getScreenVersions = createServerFn({ method: 'GET' })
  .validator((screenId: string) => screenId)
  .handler(async ({ data: screenId }) =>
    db.prepare('SELECT * FROM screen_versions WHERE screen_id = ? ORDER BY created_at DESC').all(screenId) as ScreenVersion[],
  )

// Restoring is itself an edit: the current row is snapshotted (so restoring never loses work),
// then overwritten with the chosen version's content.
export const restoreVersion = createServerFn({ method: 'POST' })
  .validator((d: { screenId: string; versionId: string }) => d)
  .handler(async ({ data }) => {
    const current = db.prepare('SELECT * FROM screens WHERE id = ?').get(data.screenId) as Screen | undefined
    const version = db.prepare('SELECT * FROM screen_versions WHERE id = ? AND screen_id = ?').get(data.versionId, data.screenId) as
      | ScreenVersion
      | undefined
    if (!current || !version) throw notFound()
    snapshotScreen(current)
    db.prepare('UPDATE screens SET name = ?, prompt = ?, html = ? WHERE id = ?').run(
      version.name,
      version.prompt,
      version.html,
      data.screenId,
    )
  })

// Creates an empty project up front so the client can navigate into the workspace immediately;
// /api/generate-plan fills it with screens and renames it from the planner's appName.
export const createProject = createServerFn({ method: 'POST' })
  .validator((d: { device: string; designSystem: string }) => d)
  .handler(async ({ data }) => {
    if (!listDesignSystems().some((d2) => d2.id === data.designSystem)) throw new Error('Unknown design system')
    const id = crypto.randomUUID()
    const device = data.device === 'mobile' ? 'mobile' : 'desktop'
    db.prepare('INSERT INTO projects (id, name, design_system, device) VALUES (?, ?, ?, ?)').run(
      id,
      'Untitled',
      data.designSystem,
      device,
    )
    return { id }
  })
