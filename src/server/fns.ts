// TanStack server functions — the thin route-to-controller binding layer (routes/web.php's role).
import { createServerFn } from '@tanstack/react-start'
import { ProjectController } from '@/app/Http/Controllers/ProjectController'
import { HistoryController } from '@/app/Http/Controllers/HistoryController'
import { ScreenController } from '@/app/Http/Controllers/ScreenController'

export const getHome = createServerFn({ method: 'GET' }).handler(() => ProjectController.index())

export const getProject = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(({ data }) => ProjectController.show(data))

export const createProject = createServerFn({ method: 'POST' })
  .validator((d: { device: string; designSystem: string }) => d)
  .handler(({ data }) => ProjectController.store(data))

export const moveScreen = createServerFn({ method: 'POST' })
  .validator((d: { id: string; x: number; y: number }) => d)
  .handler(({ data }) => ProjectController.moveScreen(data))

export const saveTheme = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; theme: unknown }) => d)
  .handler(({ data }) => ProjectController.saveTheme(data))

export const getScreenVersions = createServerFn({ method: 'GET' })
  .validator((screenId: string) => screenId)
  .handler(({ data }) => HistoryController.versions(data))

export const restoreVersion = createServerFn({ method: 'POST' })
  .validator((d: { screenId: string; versionId: string }) => d)
  .handler(({ data }) => HistoryController.restore(data))

export const deleteProject = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(({ data }) => ProjectController.destroy(data))

export const renameScreen = createServerFn({ method: 'POST' })
  .validator((d: { id: string; projectId: string; name: string }) => d)
  .handler(({ data }) => ScreenController.rename(data))

export const deleteScreen = createServerFn({ method: 'POST' })
  .validator((d: { id: string; projectId: string }) => d)
  .handler(({ data }) => ScreenController.destroy(data))

export const duplicateScreen = createServerFn({ method: 'POST' })
  .validator((d: { id: string; projectId: string }) => d)
  .handler(({ data }) => ScreenController.duplicate(data))

export const runCritique = createServerFn({ method: 'POST' })
  .validator((d: { screenId: string; projectId: string }) => d)
  .handler(async ({ data }) => {
    const { Project } = await import('@/app/Models/Project')
    const { Screen } = await import('@/app/Models/Screen')
    const { DesignSystemService } = await import('@/app/Services/DesignSystemService')
    const { critiqueScreen } = await import('@/app/Services/CritiqueService')

    const project = Project.find(data.projectId)
    if (!project) throw new Error('Project not found')
    const screen = Screen.findInProject(data.screenId, data.projectId)
    if (!screen) throw new Error('Screen not found')

    const dsMd = DesignSystemService.readDesignMd(project.designSystem)
    const tokens = DesignSystemService.readTokensCss(project.designSystem)
    const dsContext = `${dsMd}\n\n${tokens ? 'Tokens:\n' + tokens : ''}`

    return critiqueScreen(screen.html, dsContext)
  })

export const applyCritiqueFix = createServerFn({ method: 'POST' })
  .validator((d: { screenId: string; projectId: string; revisedHtml: string }) => d)
  .handler(async ({ data }) => {
    const { Screen } = await import('@/app/Models/Screen')
    const { ScreenVersion } = await import('@/app/Models/ScreenVersion')
    const { annotateHtml } = await import('@/lib/element-annotator')

    const screen = Screen.findInProject(data.screenId, data.projectId)
    if (!screen) throw new Error('Screen not found')

    ScreenVersion.captureFrom(screen)
    const annotated = annotateHtml(data.revisedHtml)
    Screen.updateContent(screen.id, {
      name: screen.name,
      prompt: `${screen.prompt} (Critique revised)`,
      html: annotated,
    })
    return { ok: true }
  })

