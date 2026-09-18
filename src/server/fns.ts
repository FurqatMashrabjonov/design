// TanStack server functions — the thin route-to-controller binding layer (routes/web.php's role).
import { createServerFn } from '@tanstack/react-start'
import { ProjectController } from '@/app/Http/Controllers/ProjectController'
import { HistoryController } from '@/app/Http/Controllers/HistoryController'

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

export const getScreenVersions = createServerFn({ method: 'GET' })
  .validator((screenId: string) => screenId)
  .handler(({ data }) => HistoryController.versions(data))

export const restoreVersion = createServerFn({ method: 'POST' })
  .validator((d: { screenId: string; versionId: string }) => d)
  .handler(({ data }) => HistoryController.restore(data))
