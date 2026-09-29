import { BRAND } from '@/lib/brand'

// EML-01: the product's emails — plain, one action each, readable with images off. Each is html + text (the text
// part keeps spam filters and plain-text readers happy). Inline styles only: mail clients drop <style>.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function layout(title: string, body: string, action?: { label: string; url: string }) {
  const button = action
    ? `<p style="margin:28px 0"><a href="${esc(action.url)}" style="background:#16140f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">${esc(action.label)}</a></p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#f6f4ef;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16140f">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
<p style="margin:0 0 24px;font-weight:700;font-size:15px">${esc(BRAND)}</p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${esc(title)}</h1>
${body}${button}
</div>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#7a7568">You got this because this address was entered on ${esc(BRAND)}. If that wasn't you, ignore it.</p>
</body></html>`
}

const p = (t: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#3b382f">${esc(t)}</p>`

/** AUTH-04: the sign-in link (Better Auth's magic link, 15 minutes, once). */
export function magicLinkEmail(url: string) {
  return {
    subject: `Your sign-in link for ${BRAND}`,
    html: layout('Sign in', p('Tap the button to sign in. The link works once and for 15 minutes.'), { label: `Sign in to ${BRAND}`, url }),
    text: `Sign in to ${BRAND}:\n${url}\n\nThe link works once and for 15 minutes. If you did not ask for it, ignore this email.`,
    tag: 'magic-link',
  }
}

/** WLT-01: the answer to a waitlist sign-up. */
export function waitlistEmail() {
  return {
    subject: `You're on the ${BRAND} waitlist`,
    html: layout("You're on the list", p("Thanks for signing up. We're letting people in a few at a time, and we'll email you when your spot opens.") + p('Describe an app in a sentence and get every screen designed in about a minute — then click through it, share it and export it.') + p('Reply to this email with what you want to build — it helps us decide who goes first.')),
    text: `You're on the ${BRAND} waitlist.\n\nWe're letting people in a few at a time, and we'll email you when your spot opens.\n\nReply with what you want to build — it helps us decide who goes first.`,
    tag: 'waitlist',
  }
}
