// TanStack server functions — the thin route-to-controller binding layer (routes/web.php's role).
// Every function here checks who is asking and that they own what they name (B1, OWN-02), and
// validates its input at the boundary (SEC-02): what reaches a controller is well-typed and theirs.
import { createServerFn } from '@tanstack/react-start'
import { ProjectController } from '@/app/Http/Controllers/ProjectController'
import { HistoryController } from '@/app/Http/Controllers/HistoryController'
import { ScreenController } from '@/app/Http/Controllers/ScreenController'
import { FeedbackController } from '@/app/Http/Controllers/FeedbackController'
import { ShareController, EMAIL, cleanRef } from '@/app/Http/Controllers/ShareController'
import { EmailService, validUnsubscribe } from '@/app/Services/EmailService'
import { CreditService } from '@/app/Services/CreditService'
import { BillingController } from '@/app/Http/Controllers/BillingController'
import { PRODUCTS } from '@/lib/credit-prices'
import { Credit } from '@/app/Models/Credit'
import { requireProject, requireScreen, requireUser, userFrom } from './auth'
import { publicOrigin } from './guard'
import { AccessService } from '@/app/Services/AccessService'
import { getRequest } from '@tanstack/react-start/server'
import { signInMethods } from '@/app/Services/AuthService'
import { str, num, obj, oneOf, idOf } from './validate'

// --- account ---

/** The signed-in user (or null) and how one can sign in — for the login page and the account menu. */
export const getSession = createServerFn({ method: 'GET' }).handler(async () => ({ user: await userFrom(getRequest()), methods: signInMethods }))

/** ACC-01: public — whether the site is waitlist-only, so the pages show the waitlist instead of sign-in. */
export const getAccess = createServerFn({ method: 'GET' }).handler(async () => ({ mode: await AccessService.mode() }))


// --- projects ---

/** BIL-08: the signed-in user's credit balance, for the top bar and the dashboard. */
export const getCredits = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  await CreditService.refresh(user.id) // a new month of a plan lands the first time it is looked at
  const limits = await CreditService.limitsFor(user.id, user.admin)
  return { balance: await Credit.balance(user.id), plan: limits.plan === 'free' ? null : limits.plan, canExport: limits.export }
})

/** BIL-09: a hosted checkout for one product; the page goes to the returned URL. */
export const startCheckout = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ key: oneOf(obj(d).key, PRODUCTS.map((p) => p.key)) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    return BillingController.checkout(user, data.key, publicOrigin(getRequest()))
  })

/** BIL-21: everything the billing page shows, for the signed-in person. */
export const getBilling = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  return BillingController.page(user.id, user.admin)
})

/** BIL-25: the signed-in person asks to be told when payments open. */
export const notifyWhenPaymentsOpen = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ key: oneOf(obj(d).key, PRODUCTS.map((p) => p.key)) }))
  .handler(async ({ data }) => BillingController.notifyWhenOpen(await requireUser(), data.key))

/** BIL-11: the provider's billing portal for the signed-in user. */
export const openBillingPortal = createServerFn({ method: 'POST' }).handler(async () => BillingController.portal((await requireUser()).id, publicOrigin(getRequest())))

export const getHome = createServerFn({ method: 'GET' }).handler(async () => ProjectController.index((await requireUser()).id))

export const getProject = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => ProjectController.show((await requireProject(data)).project.id))

export const createProject = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    return { brief: o.brief === undefined ? undefined : str(o.brief, 4000) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    return ProjectController.store({ ...data, userId: user.id, admin: user.admin })
  })

export const renameProject = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), name: str(obj(d).name, 200) }))
  .handler(async ({ data }) => (await requireProject(data.id), ProjectController.rename(data)))

export const deleteProject = createServerFn({ method: 'POST' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => (await requireProject(data), ProjectController.destroy(data)))

/** SHR-02: the owner turns the public preview link on or off. */
export const shareProject = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), on: obj(d).on === true }))
  .handler(async ({ data }) => (await requireProject(data.id), ShareController.share(data)))

/** SHR-02: a shared preview — public, keyed by the unguessable token alone; a wrong token is a 404. */
export const getSharedProject = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ token: idOf(obj(d).token), ref: cleanRef(obj(d).ref) }))
  .handler(async ({ data }) => ShareController.shared(data.token, data.ref))

/** WLT-01: a waitlist sign-up from a shared preview — public. */
export const joinWaitlist = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const email = str(o.email, 254).trim()
    if (!EMAIL.test(email)) throw new Error('Enter a valid email')
    const note = o.note === undefined || o.note === '' ? null : str(o.note, 1000).trim() || null
    return { token: o.token === undefined ? null : idOf(o.token), email, ref: cleanRef(o.ref), note }
  })
  // ponytail: no per-IP limit; an email is stored once, so a bot fills rows, not credits. Add one if spam shows up.
  .handler(async ({ data }) => ShareController.join(data))

/** EML-03: the unsubscribe link — public, keyed by the address and its HMAC; a wrong pair changes nothing. */
export const unsubscribe = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ email: str(obj(d).email, 254).toLowerCase(), token: str(obj(d).token, 64) }))
  .handler(async ({ data }) => {
    if (!validUnsubscribe(data.email, data.token)) throw new Error('This unsubscribe link is not valid')
    await EmailService.suppress(data.email)
    return { ok: true }
  })

export const favoriteProject = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), favorite: obj(d).favorite === true }))
  .handler(async ({ data }) => (await requireProject(data.id), ProjectController.favorite(data)))

export const revertMessage = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ projectId: idOf(obj(d).projectId), messageId: idOf(obj(d).messageId) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), HistoryController.revertMessage(data)))

// --- screens ---

export const moveScreen = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), x: num(obj(d).x), y: num(obj(d).y) }))
  .handler(async ({ data }) => (await requireScreen(data.id), ProjectController.moveScreen(data)))

export const saveAppTheme = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ projectId: idOf(obj(d).projectId), theme: obj(obj(d).theme) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), ProjectController.saveAppTheme(data)))

export const saveScreenHeight = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), height: num(obj(d).height) }))
  .handler(async ({ data }) => (await requireScreen(data.id), ProjectController.saveScreenHeight(data)))

const screenRef = (d: unknown) => ({ id: idOf(obj(d).id), projectId: idOf(obj(d).projectId) })

export const getScreenCode = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ id: idOf(obj(d).id), projectId: idOf(obj(d).projectId) }))
  .handler(async ({ data }) => (await requireProject(data.projectId), ScreenController.code(data)))

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

