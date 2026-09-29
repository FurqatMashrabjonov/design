import { createHmac, timingSafeEqual } from 'node:crypto'
import { desc, sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { emailCampaigns, emails, emailSuppressions } from '@/database/schema'
import { all, one, unixNow, DAY } from '@/database/query'
import { Setting } from '@/app/Models/Setting'
import { renderEmail, SYSTEM_EMAILS, type EmailContent, type RenderedEmail, type SystemEmail } from '@/lib/emails'
import { SecretService } from './SecretService'

// EML-01: every email the product sends goes through here — one provider, Resend (2026-09-29: 3 000 a month and
// 100 a day free, one verified domain; a plain HTTPS call, so no SDK). The key is RESEND_API_KEY (admin panel or
// .env), the sender EMAIL_FROM ("Design <hello@your-domain>", on the domain verified in Resend with its SPF and DKIM
// records). With no key, development prints the mail to the server log and keeps the last one for tests;
// production refuses, so nothing claims to be sent that was not.
// EML-03: every mail is logged in `emails`; system emails take their words from the admin's template (settings,
// email.template.<kind>) or the default; a bulk send (a campaign) goes to an audience minus who unsubscribed, with an
// unsubscribe link and header, at most CAMPAIGN_MAX a send and paced for Resend's 2 requests a second.

export type Mail = RenderedEmail & { to: string; tag: string; headers?: Record<string, string> }

/** The last mail "sent" without a provider — development and tests only. */
export const devMail: { last: Mail | null } = { last: null }

/** Resend's free plan: 100 a day. ponytail: one campaign stays under it; raise with the plan. */
export const DAILY_LIMIT = 100
export const CAMPAIGN_MAX = 100

let send: (m: Mail, key: string, from: string) => Promise<{ id: string }> = async (m, key, from) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, tags: [{ name: 'kind', value: m.tag }], ...(m.headers && { headers: m.headers }) }),
  })
  // Only the status travels on: a provider body could echo the address or the key's name.
  if (!res.ok) throw new Error(`Email provider answered ${res.status}`)
  return { id: String(((await res.json()) as { id?: unknown }).id ?? '') }
}
let pace = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Tests swap the transport (and the pause between bulk mails); nothing else does. */
export const setEmailTransport = (t: typeof send, p?: typeof pace) => {
  send = t
  if (p) pace = p
}

/** The sender. Until the domain is verified, development sends from Resend's own test address, which only
 *  delivers to the Resend account's owner — enough to see a real mail land. */
const sender = () => process.env.EMAIL_FROM || (process.env.NODE_ENV === 'production' ? undefined : 'Design <onboarding@resend.dev>')
const appUrl = () => (process.env.BETTER_AUTH_URL || 'http://localhost:3000').replace(/\/$/, '')

// The unsubscribe link carries the address and an HMAC of it, so it works without a sign-in and cannot be forged
// for someone else's address.
const unsubKey = () => process.env.BETTER_AUTH_SECRET || process.env.SECRETS_KEY || 'dev-only-unsubscribe'
const signEmail = (email: string) => createHmac('sha256', unsubKey()).update(`unsubscribe:${email}`).digest('base64url').slice(0, 32)
export const unsubscribeUrl = (email: string) => `${appUrl()}/unsubscribe?e=${encodeURIComponent(email)}&t=${signEmail(email)}`
export function validUnsubscribe(email: string, token: string) {
  const want = Buffer.from(signEmail(email))
  const got = Buffer.from(token)
  return got.length === want.length && timingSafeEqual(got, want)
}

export type Audience = 'waitlist' | 'users' | 'one'
export type CampaignInput = { audience: Audience; to?: string; content: EmailContent; url?: string }

async function record(m: Mail, status: 'sent' | 'failed' | 'logged' | 'skipped', extra: { providerId?: string; error?: string; campaignId?: number } = {}) {
  await db.insert(emails).values({ toEmail: m.to, subject: m.subject.slice(0, 300), tag: m.tag, status, providerId: extra.providerId ?? null, error: extra.error?.slice(0, 300) ?? null, campaignId: extra.campaignId ?? null })
}

export const EmailService = {
  /** True when mail really leaves the building. */
  async ready() {
    return !!(await SecretService.get('RESEND_API_KEY')) && !!sender()
  },

  /** One mail, logged whatever happens. A failure is logged and thrown. */
  async send(m: Mail, campaignId?: number): Promise<{ id: string } | { logged: true }> {
    const key = await SecretService.get('RESEND_API_KEY')
    const from = sender()
    if (!key || !from) {
      if (process.env.NODE_ENV === 'production') {
        await record(m, 'failed', { error: 'Email is not set up', campaignId })
        throw new Error('Email is not set up (RESEND_API_KEY and EMAIL_FROM)')
      }
      devMail.last = m
      console.log(`\n[email] ${m.tag} to ${m.to}: ${m.subject}\n${m.text}\n`)
      await record(m, 'logged', { campaignId })
      return { logged: true }
    }
    try {
      const r = await send(m, key, from)
      await record(m, 'sent', { providerId: r.id, campaignId })
      return r
    } catch (e) {
      await record(m, 'failed', { error: e instanceof Error ? e.message : String(e), campaignId })
      throw e
    }
  },

  /** A system email's words: the admin's version, else the default. */
  async template(kind: SystemEmail): Promise<EmailContent> {
    const base: EmailContent = SYSTEM_EMAILS[kind].content
    try {
      const saved = JSON.parse((await Setting.get(`email.template.${kind}`)) ?? 'null') as Partial<EmailContent> | null
      return saved ? { ...base, ...saved } : base
    } catch {
      return base
    }
  },

  /** null puts the default back. */
  async saveTemplate(kind: SystemEmail, content: EmailContent | null) {
    await Setting.set(`email.template.${kind}`, content && JSON.stringify(content))
  },

  /** A system email (sign-in link, waitlist confirmation) to one person, in its current words. Transactional: it
   *  reaches someone who unsubscribed from bulk mail, and carries no unsubscribe link. */
  async system(kind: SystemEmail, to: string, o: { url?: string } = {}) {
    return EmailService.send({ to, tag: kind, ...renderEmail(await EmailService.template(kind), o) })
  },

  /** Who a campaign would reach, minus who unsubscribed. */
  async recipients(audience: Audience, to?: string): Promise<string[]> {
    const list =
      audience === 'one'
        ? [String(to ?? '').toLowerCase()]
        : (await all<{ email: string }>(audience === 'waitlist' ? sql`SELECT email FROM waitlist ORDER BY created_at` : sql`SELECT lower(email) AS email FROM "user" WHERE NOT coalesce(banned, false) ORDER BY created_at`)).map((r) => r.email)
    const off = new Set((await all<{ email: string }>(sql`SELECT email FROM email_suppressions`)).map((r) => r.email))
    return [...new Set(list)].filter((e) => e && !off.has(e))
  },

  /** A bulk send: logged as a campaign, each mail with its unsubscribe link and header, paced, capped. */
  async campaign(adminId: string, c: CampaignInput) {
    const people = await EmailService.recipients(c.audience, c.to)
    if (people.length === 0) throw new Error('Nobody to send to')
    if (people.length > CAMPAIGN_MAX) throw new Error(`${people.length} recipients — at most ${CAMPAIGN_MAX} a send on the current email plan`)
    const sentToday = (await one<{ n: number }>(sql`SELECT count(*)::int AS n FROM emails WHERE status = 'sent' AND created_at > ${unixNow() - DAY}`)).n
    if ((await EmailService.ready()) && sentToday + people.length > DAILY_LIMIT) throw new Error(`That would pass today's ${DAILY_LIMIT}-email limit (${sentToday} sent in the last 24 hours)`)
    const [row] = await db.insert(emailCampaigns).values({ audience: c.audience === 'one' ? `one:${people[0]}` : c.audience, subject: c.content.subject.slice(0, 300), content: JSON.stringify({ ...c.content, url: c.url }), recipients: people.length, adminId }).returning({ id: emailCampaigns.id })
    let sent = 0, failed = 0
    for (const [i, to] of people.entries()) {
      const unsub = unsubscribeUrl(to)
      try {
        await EmailService.send({ to, tag: 'campaign', ...renderEmail(c.content, { url: c.url, unsubscribeUrl: unsub }), headers: { 'List-Unsubscribe': `<${unsub}>` } }, row!.id)
        sent++
      } catch {
        failed++
      }
      if (i < people.length - 1) await pace(550) // Resend: 2 requests a second
    }
    await db.update(emailCampaigns).set({ sent, failed }).where(sql`id = ${row!.id}`)
    return { id: row!.id, recipients: people.length, sent, failed }
  },

  async suppress(email: string, reason = 'unsubscribed') {
    await db.insert(emailSuppressions).values({ email: email.toLowerCase(), reason }).onConflictDoNothing()
  },

  /** The admin's Email page: is it set up, how much went out, the words, the history. */
  async overview() {
    const since = unixNow() - DAY
    const [ready, counts, templates, recent, campaigns] = await Promise.all([
      EmailService.ready(),
      one<{ sentToday: number; failedToday: number; waitlist: number; users: number; unsubscribed: number }>(sql`
        SELECT
          (SELECT count(*)::int FROM emails WHERE status = 'sent' AND created_at > ${since}) AS "sentToday",
          (SELECT count(*)::int FROM emails WHERE status = 'failed' AND created_at > ${since}) AS "failedToday",
          (SELECT count(*)::int FROM waitlist WHERE email NOT IN (SELECT email FROM email_suppressions)) AS waitlist,
          (SELECT count(*)::int FROM "user" WHERE NOT coalesce(banned, false) AND lower(email) NOT IN (SELECT email FROM email_suppressions)) AS users,
          (SELECT count(*)::int FROM email_suppressions) AS unsubscribed
      `),
      Promise.all((Object.keys(SYSTEM_EMAILS) as SystemEmail[]).map(async (kind) => ({ kind, label: SYSTEM_EMAILS[kind].label, about: SYSTEM_EMAILS[kind].about, content: await EmailService.template(kind), changed: (await Setting.get(`email.template.${kind}`)) !== null }))),
      db.select().from(emails).orderBy(desc(emails.createdAt), desc(emails.id)).limit(100),
      db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt), desc(emailCampaigns.id)).limit(20),
    ])
    return { ready, from: sender() ?? null, dailyLimit: DAILY_LIMIT, campaignMax: CAMPAIGN_MAX, ...counts, templates, recent, campaigns }
  },
}
