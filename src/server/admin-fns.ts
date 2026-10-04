// ADM-01: the admin panel's server functions. Every one starts with requireAdmin() — anyone else
// gets a 404, the same as a page that does not exist — and validates its input before the controller.
import { createServerFn } from '@tanstack/react-start'
import { AdminController, ADMIN_SETTINGS, type AdminSettingKey } from '@/app/Http/Controllers/AdminController'
import { SECRET_NAMES } from '@/app/Services/SecretService'
import { requireAdmin } from './auth'
import { idOf, num, obj, oneOf, str } from './validate'
import { parseCallsQuery, parseUsersQuery } from '@/admin/table-query'
import { SYSTEM_EMAILS, type EmailContent, type SystemEmail } from '@/lib/emails'
import { EMAIL } from '@/app/Http/Controllers/ShareController'

export const adminCheck = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireAdmin()
  return { email: u.email, name: u.name }
})

export const adminUser = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.user(data)))

export const adminProject = createServerFn({ method: 'GET' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.project(data)))

/** ADM-06: failed screens by cause; the call log itself is adminCallsPage. */
export const adminGenerations = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.generations()))

export const adminSearch = createServerFn({ method: 'GET' })
  .validator((d: unknown) => ({ q: str(obj(d).q ?? '', 100) }))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.search(data.q)))

export const adminControls = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.controls()))

export const adminBan = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ userId: idOf(obj(d).userId), reason: str(obj(d).reason ?? '', 300) }))
  .handler(async ({ data }) => AdminController.ban((await requireAdmin()).id, data))

export const adminUnban = createServerFn({ method: 'POST' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => AdminController.unban((await requireAdmin()).id, data))

export const adminRevokeSessions = createServerFn({ method: 'POST' })
  .validator((id: unknown) => idOf(id))
  .handler(async ({ data }) => AdminController.revokeSessions((await requireAdmin()).id, data))

export const adminSetRole = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ userId: idOf(obj(d).userId), role: oneOf(obj(d).role, ['admin', 'user'] as const) }))
  .handler(async ({ data }) => AdminController.setRole((await requireAdmin()).id, data))

export const adminSetUserLimit = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const limit = o.limit === null ? null : Math.floor(num(o.limit))
    if (limit !== null && limit < 0) throw new Error('Invalid number')
    return { userId: idOf(o.userId), limit }
  })
  .handler(async ({ data }) => AdminController.setUserLimit((await requireAdmin()).id, data))

/** PAY-03 / FDB-10: credit requests and feedback. */
export const adminBeta = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.beta()))

export const adminAnswerCreditRequest = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const amount = o.amount === null ? null : num(o.amount)
    if (amount !== null && (!Number.isInteger(amount) || amount <= 0 || amount > 10_000)) throw new Error('Invalid number')
    const id = num(o.id)
    if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid id')
    return { id, amount }
  })
  .handler(async ({ data }) => AdminController.answerCreditRequest((await requireAdmin()).id, data))

export const adminGrantCredits = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const amount = num(o.amount)
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100_000) throw new Error('Invalid number')
    return { userId: idOf(o.userId), amount, note: str(o.note ?? '', 200) }
  })
  .handler(async ({ data }) => AdminController.grantCredits((await requireAdmin()).id, data))

/** ADM-13: provider keys. A value goes in and is never sent back; the panel sees only its last four. */
export const adminSecrets = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.secrets()))

export const adminSetSecret = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const value = o.value === null ? null : str(o.value, 500).trim()
    if (value !== null && (value.length < 8 || /\s/.test(value))) throw new Error('That does not look like a key')
    return { name: oneOf(o.name, [...SECRET_NAMES]), value }
  })
  .handler(async ({ data }) => AdminController.setSecret((await requireAdmin()).id, data))

export const adminTestSecret = createServerFn({ method: 'POST' })
  .validator((d: unknown) => oneOf(obj(d).name, [...SECRET_NAMES]))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.testSecret(data)))

export const adminSetSetting = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    return { key: oneOf(o.key, Object.keys(ADMIN_SETTINGS) as AdminSettingKey[]), value: o.value === null ? null : str(o.value, 40) }
  })
  .handler(async ({ data }) => AdminController.setSetting((await requireAdmin()).id, data))

/** ADM-11: the users and model-call tables — one page per call, or the whole filter as CSV (capped).
 *  The parser keeps only whitelisted sorts and filter values; anything else becomes the default. */
export const adminUsersPage = createServerFn({ method: 'GET' })
  .validator((d: unknown) => parseUsersQuery(obj(d)))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.usersPage(data)))

export const adminCallsPage = createServerFn({ method: 'GET' })
  .validator((d: unknown) => parseCallsQuery(obj(d)))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.callsPage(data)))

export const adminUsersCsv = createServerFn({ method: 'GET' })
  .validator((d: unknown) => parseUsersQuery(obj(d)))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.usersCsv(data)))

export const adminCallsCsv = createServerFn({ method: 'GET' })
  .validator((d: unknown) => parseCallsQuery(obj(d)))
  .handler(async ({ data }) => (await requireAdmin(), AdminController.callsCsv(data)))

// --- EML-03: email ---

/** An email's words from the editor: subject, heading and body are required; a button is optional. */
function emailContent(v: unknown): EmailContent {
  const o = obj(v)
  const subject = str(o.subject, 200).trim(), heading = str(o.heading, 200).trim(), body = str(o.body, 5000).trim()
  if (!subject || !heading || !body) throw new Error('Subject, heading and text are required')
  const button = o.button === undefined || o.button === '' ? undefined : str(o.button, 60).trim()
  return { subject, heading, body, ...(button && { button }) }
}
/** A button's link: http(s) only, so an email never carries a javascript: or data: link. */
function buttonUrl(v: unknown): string | undefined {
  if (v === undefined || v === '') return undefined
  const u = str(v, 500).trim()
  if (!/^https?:\/\/[^\s]+$/i.test(u)) throw new Error('The button link must start with https://')
  return u
}

export const adminEmail = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.email()))

export const adminSendCampaign = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    const audience = oneOf(o.audience, ['waitlist', 'users', 'one'] as const)
    const to = audience === 'one' ? str(o.to, 254).trim().toLowerCase() : undefined
    if (to !== undefined && !EMAIL.test(to)) throw new Error('Enter a valid email')
    return { audience, to, content: emailContent(o.content), url: buttonUrl(o.url) }
  })
  .handler(async ({ data }) => AdminController.sendCampaign((await requireAdmin()).id, data))

export const adminSendTestEmail = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ content: emailContent(obj(d).content), url: buttonUrl(obj(d).url) }))
  .handler(async ({ data }) => AdminController.sendTest(await requireAdmin(), data))

export const adminSaveEmailTemplate = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const o = obj(d)
    return { kind: oneOf(o.kind, Object.keys(SYSTEM_EMAILS) as SystemEmail[]), content: o.content === null ? null : emailContent(o.content) }
  })
  .handler(async ({ data }) => AdminController.saveEmailTemplate((await requireAdmin()).id, data))
