// TanStack server functions — the thin route-to-controller binding layer (routes/web.php's role).
// Every function here checks who is asking and that they own what they name (B1, OWN-02), and
// validates its input at the boundary (SEC-02): what reaches a controller is well-typed and theirs.
import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { ProjectController } from '@/app/Http/Controllers/ProjectController'
import { HistoryController } from '@/app/Http/Controllers/HistoryController'
import { ScreenController } from '@/app/Http/Controllers/ScreenController'
import { ElementController, type ElementAction } from '@/app/Http/Controllers/ElementController'
import { FeedbackController } from '@/app/Http/Controllers/FeedbackController'
import { AccountController } from '@/app/Http/Controllers/AccountController'
import { Subscription } from '@/app/Models/Subscription'
import { CreditService } from '@/app/Services/CreditService'
import { BillingController } from '@/app/Http/Controllers/BillingController'
import { PRODUCTS, productOf } from '@/lib/credit-prices'
import { Credit } from '@/app/Models/Credit'
import { requireProject, requireScreen, requireUser, userFrom } from './auth'
import { getRequest } from '@tanstack/react-start/server'
import { signInMethods } from '@/app/Services/AuthService'
import { str, num, obj, oneOf, idOf } from './validate'

// --- account ---

/** The signed-in user (or null) and how one can sign in — for the login page and the account menu. */
export const getSession = createServerFn({ method: 'GET' }).handler(async () => ({ user: await userFrom(getRequest()), methods: signInMethods }))

export const deleteAccount = createServerFn({ method: 'POST' }).handler(async () => AccountController.destroy((await requireUser()).id))

// --- projects ---

/** BIL-08: the signed-in user's credit balance, for the top bar and the dashboard. */
export const getCredits = createServerFn({ method: 'GET' }).handler(async () => {
  const id = (await requireUser()).id
  CreditService.refresh(id) // a new month of a plan lands the first time it is looked at
  return { balance: Credit.balance(id), plan: productOf(Subscription.activeFor(id)?.productKey)?.plan ?? null }
})

/** BIL-09: a hosted checkout for one product; the page goes to the returned URL. */
export const startCheckout = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ key: oneOf(obj(d).key, PRODUCTS.map((p) => p.key)) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    return BillingController.checkout(user, data.key, new URL(getRequest().url).origin)
  })

/** BIL-11: the provider's billing portal for the signed-in user. */
export const openBillingPortal = createServerFn({ method: 'POST' }).handler(async () => BillingController.portal((await requireUser()).id, new URL(getRequest().url).origin))

export const getHome = createServerFn({ method: 'GET' }).handler(async () => ProjectController.index((await requireUser()).id))

export const getProject = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => ProjectController.show((await requireProject(data)).project.id))

export const createProject = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    return { designSystem: str(o.designSystem, 60), brief: o.brief === undefined ? undefined : str(o.brief, 4000) }
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

// --- public pages (MKT-06) ---
// The design systems and their style cards are public: they are the product's argument, and every
// page links back into it. Read-only and unauthenticated on purpose — no project or user is touched.

export const getSystems = createServerFn({ method: 'GET' }).handler(async () => {
  const { DesignSystemService } = await import('@/app/Services/DesignSystemService')
  return DesignSystemService.list().filter((s) => s.hasTokens)
})

export const getSystem = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ id: idOf(d) }))
  .handler(async ({ data }) => {
    const { DesignSystemService } = await import('@/app/Services/DesignSystemService')
    if (!DesignSystemService.exists(data.id)) throw notFound()
    const { designSystemSample } = await import('@/lib/ds-sample')
    const entry = DesignSystemService.list().find((s) => s.id === data.id)
    const name = entry?.name ?? data.id
    return {
      id: data.id,
      name,
      category: entry?.category ?? 'General',
      description: entry?.description ?? '',
      card: DesignSystemService.readStyleCard(data.id),
      sample: designSystemSample(DesignSystemService.readTokensRoot(data.id), DesignSystemService.readFontUrls(data.id), name),
    }
  })
