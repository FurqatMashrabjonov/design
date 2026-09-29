import { SecretService } from './SecretService'

// EML-01: every email the product sends goes through here — one provider, Resend (2026-09-29: 3 000 a month and
// 100 a day free, one verified domain; a plain HTTPS call, so no SDK). The key is RESEND_API_KEY (admin panel or
// .env), the sender EMAIL_FROM ("Design <hello@your-domain>", on the domain verified in Resend with its SPF and DKIM
// records). With no key, development prints the mail to the server log and keeps the last one for tests;
// production refuses, so nothing claims to be sent that was not.

export type Mail = { to: string; subject: string; html: string; text: string; tag: string }

/** The last mail "sent" without a provider — development and tests only. */
export const devMail: { last: Mail | null } = { last: null }

let send: (m: Mail, key: string, from: string) => Promise<{ id: string }> = async (m, key, from) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, tags: [{ name: 'kind', value: m.tag }] }),
  })
  // Only the status travels on: a provider body could echo the address or the key's name.
  if (!res.ok) throw new Error(`Email provider answered ${res.status}`)
  return { id: String(((await res.json()) as { id?: unknown }).id ?? '') }
}

/** Tests swap the transport; nothing else does. */
export const setEmailTransport = (t: typeof send) => (send = t)

/** The sender. Until the domain is verified, development sends from Resend's own test address, which only
 *  delivers to the Resend account's owner — enough to see a real mail land. */
const sender = () => process.env.EMAIL_FROM || (process.env.NODE_ENV === 'production' ? undefined : 'Design <onboarding@resend.dev>')

export const EmailService = {
  /** True when mail really leaves the building. */
  async ready() {
    return !!(await SecretService.get('RESEND_API_KEY')) && !!sender()
  },

  async send(m: Mail): Promise<{ id: string } | { logged: true }> {
    const key = await SecretService.get('RESEND_API_KEY')
    const from = sender()
    if (key && from) return send(m, key, from)
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not set up (RESEND_API_KEY and EMAIL_FROM)')
    devMail.last = m
    console.log(`\n[email] ${m.tag} to ${m.to}: ${m.subject}\n${m.text}\n`)
    return { logged: true }
  },
}
