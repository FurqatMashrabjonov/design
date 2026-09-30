import { BRAND, DOMAIN } from '@/lib/brand'

// EML-01/03: the product's emails — plain, one action each, readable with images off. An email is content (subject,
// heading, body, an optional button) put into one layout, as html + text (the text part keeps spam filters and
// plain-text readers happy). Inline styles only: mail clients drop <style>. Pure, so the admin's editor previews
// exactly what is sent. The system emails' content can be changed in the admin (EML-03); these are the defaults.

export type EmailContent = { subject: string; heading: string; body: string; button?: string }
export type RenderedEmail = { subject: string; html: string; text: string }

/** The emails the product sends by itself, what each is for, and its words until an admin changes them. */
export const SYSTEM_EMAILS = {
  'magic-link': {
    label: 'Sign-in link',
    about: 'Sent when someone signs in with their email. The button is the sign-in link (15 minutes, once).',
    content: { subject: 'Your sign-in link for {{brand}}', heading: 'Sign in', body: 'Tap the button to sign in. The link works once and for 15 minutes.', button: 'Sign in to {{brand}}' },
  },
  waitlist: {
    label: 'Waitlist confirmation',
    about: 'Sent once to a new waitlist sign-up from a shared preview.',
    content: {
      subject: "You're on the {{brand}} waitlist",
      heading: "You're on the list",
      body: "Thanks for signing up. We're letting people in a few at a time, and we'll email you when your spot opens.\n\nDescribe an app in a sentence and get every screen designed in about a minute — then click through it, share it and export it.\n\nReply to this email with what you want to build — it helps us decide who goes first.",
    },
  },
} as const satisfies Record<string, { label: string; about: string; content: EmailContent }>
export type SystemEmail = keyof typeof SYSTEM_EMAILS

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const fill = (s: string) => s.replaceAll('{{brand}}', BRAND)
/** Paragraphs are separated by a blank line; a single line break stays a line break. */
const paragraphs = (body: string) => fill(body).trim().split(/\n\s*\n/).filter(Boolean)

/**
 * The email as sent. `url` is where the button goes (no url, no button); `unsubscribeUrl` adds the footer link a
 * bulk email must carry — a transactional one (sign-in, a confirmation of what they just did) has none.
 */
export function renderEmail(c: EmailContent, o: { url?: string; unsubscribeUrl?: string } = {}): RenderedEmail {
  const heading = fill(c.heading)
  const paras = paragraphs(c.body)
  const button = o.url && c.button ? { label: fill(c.button), url: o.url } : undefined
  const why = o.unsubscribeUrl
    ? `You're getting this because you signed up on ${esc(BRAND)}. <a href="${esc(o.unsubscribeUrl)}" style="color:#7a7568">Unsubscribe</a>.`
    : `You got this because this address was entered on ${esc(BRAND)}. If that wasn't you, ignore it.`
  const html = `<!doctype html><html><body style="margin:0;background:#f6f4ef;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16140f">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
<p style="margin:0 0 24px;font-weight:700;font-size:15px"><img src="https://${DOMAIN}/email-logo.png" width="28" height="28" alt="" style="vertical-align:middle;margin-right:8px;border:0">${esc(BRAND)}</p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${esc(heading)}</h1>
${paras.map((t) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#3b382f">${esc(t).replace(/\n/g, '<br>')}</p>`).join('\n')}${
    button ? `\n<p style="margin:28px 0"><a href="${esc(button.url)}" style="background:#16140f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">${esc(button.label)}</a></p>` : ''
  }
</div>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#7a7568">${why}</p>
</body></html>`
  const text = [heading, ...paras, button && `${button.label}: ${button.url}`, o.unsubscribeUrl && `Unsubscribe: ${o.unsubscribeUrl}`].filter(Boolean).join('\n\n')
  return { subject: fill(c.subject), html, text }
}
