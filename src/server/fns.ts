// TanStack server functions — the thin route-to-controller binding layer (routes/web.php's role).
// Every function here checks who is asking and that they own what they name (B1, OWN-02), and
// validates its input at the boundary (SEC-02): what reaches a controller is well-typed and theirs.
import { createServerFn } from '@tanstack/react-start'
import { ProjectController } from '@/app/Http/Controllers/ProjectController'
import { HistoryController } from '@/app/Http/Controllers/HistoryController'
import { ScreenController } from '@/app/Http/Controllers/ScreenController'
import { ElementController, type ElementAction } from '@/app/Http/Controllers/ElementController'
import { FeedbackController } from '@/app/Http/Controllers/FeedbackController'
import { AccountController } from '@/app/Http/Controllers/AccountController'
import { requireProject, requireScreen, requireUser, userFrom } from './auth'
import { getRequest } from '@tanstack/react-start/server'
import { signInMethods } from '@/app/Services/AuthService'
import { str, num, obj, oneOf, idOf } from './validate'

// --- account ---

/** The signed-in user (or null) and how one can sign in — for the login page and the account menu. */
export const getSession = createServerFn({ method: 'GET' }).handler(async () => ({ user: await userFrom(getRequest()), methods: signInMethods }))

export const deleteAccount = createServerFn({ method: 'POST' }).handler(async () => AccountController.destroy((await requireUser()).id))

// --- projects ---

export const getHome = createServerFn({ method: 'GET' }).handler(async () => ProjectController.index((await requireUser()).id))

export const getProject = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => ProjectController.show((await requireProject(data)).project.id))

export const createProject = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    return { device: oneOf(o.device, ['mobile', 'desktop'] as const), designSystem: str(o.designSystem, 60) }
  })
  .handler(async ({ data }) => ProjectController.store({ ...data, userId: (await requireUser()).id }))

export const renameProject = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), name: str(obj(d).name, 200) }))
  .handler(async ({ data }) => (await requireProject(data.id), ProjectController.rename(data)))

export const deleteProject = createServerFn({ method: 'POST' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => (await requireProject(data), ProjectController.destroy(data)))

export const favoriteProject = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), favorite: obj(d).favorite === true }))
  .handler(async ({ data }) => (await requireProject(data.id), ProjectController.favorite(data)))

export const themeFromChat = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ projectId: idOf(obj(d).projectId), prompt: str(obj(d).prompt, 500) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), ProjectController.themeFromChat(data)))

export const saveTheme = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ projectId: idOf(obj(d).projectId), theme: obj(d).theme }))
  .handler(async ({ data }) => (await requireProject(data.projectId), ProjectController.saveTheme(data)))

export const revertMessage = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ projectId: idOf(obj(d).projectId), messageId: idOf(obj(d).messageId) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), HistoryController.revertMessage(data)))

// --- screens ---

export const moveScreen = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), x: num(obj(d).x), y: num(obj(d).y) }))
  .handler(async ({ data }) => (await requireScreen(data.id), ProjectController.moveScreen(data)))

export const saveScreenHeight = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), height: num(obj(d).height) }))
  .handler(async ({ data }) => (await requireScreen(data.id), ProjectController.saveScreenHeight(data)))

const screenRef = (d: unknown) => ({ id: idOf(obj(d).id), projectId: idOf(obj(d).projectId) })

export const renameScreen = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ ...screenRef(d), name: str(obj(d).name, 200) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), ScreenController.rename(data)))

export const deleteScreen = createServerFn({ method: 'POST' })
  .validator(screenRef)
  .handler(async ({ data }) => (await requireProject(data.projectId), ScreenController.destroy(data)))

export const duplicateScreen = createServerFn({ method: 'POST' })
  .validator(screenRef)
  .handler(async ({ data }) => (await requireProject(data.projectId), ScreenController.duplicate(data)))

export const restoreScreen = createServerFn({ method: 'POST' })
  .validator(screenRef)
  .handler(async ({ data }) => (await requireProject(data.projectId), ScreenController.restore(data)))

export const stepVersion = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ projectId: idOf(obj(d).projectId), screenId: idOf(obj(d).screenId), dir: num(obj(d).dir) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), HistoryController.stepVersion(data)))

export const rateScreen = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ projectId: idOf(obj(d).projectId), screenId: idOf(obj(d).screenId), value: obj(d).value === null ? null : oneOf(obj(d).value, ['up', 'down'] as const) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), FeedbackController.rate(data)))

// --- elements ---

const elementRef = (d: unknown) => ({ projectId: idOf(obj(d).projectId), screenId: idOf(obj(d).screenId), elementId: idOf(obj(d).elementId) })

export const getElementInfo = createServerFn({ method: 'GET' })
  .validator(elementRef)
  .handler(async ({ data }) => (await requireProject(data.projectId), ElementController.info(data)))

export const editElementText = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ ...elementRef(d), text: str(obj(d).text, 2000) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), ElementController.editText(data)))

export const elementAction = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ ...elementRef(d), action: oneOf(obj(d).action, ['delete', 'duplicate', 'up', 'down'] as const) as ElementAction }))
  .handler(async ({ data }) => (await requireProject(data.projectId), ElementController.act(data)))

export const replaceElementPhoto = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ ...elementRef(d), query: str(obj(d).query, 120) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), ElementController.replacePhoto(data)))
