import { createHmac, timingSafeEqual } from 'node:crypto'

// MCP-01: a short-lived link that stands in for a session — the MCP `export_project` tool hands an agent a URL it can
// download with no cookie. `sub` is who, `res` what, `exp` when it stops working (unix seconds); the HMAC is keyed by
// the server's own secret, so nobody else can mint one.
const secret = () => process.env.BETTER_AUTH_SECRET || process.env.SECRETS_KEY || 'dev-only-secret'
const mac = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url')

export function signLink(sub: string, res: string, ttlSeconds = 600, now = Math.floor(Date.now() / 1000)): string {
  const payload = Buffer.from(JSON.stringify({ sub, res, exp: now + ttlSeconds })).toString('base64url')
  return `${payload}.${mac(payload)}`
}

/** The `sub` of a valid, unexpired token for `res`, or null. */
export function verifyLink(token: string | null, res: string, now = Math.floor(Date.now() / 1000)): string | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const want = Buffer.from(mac(payload)), got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  try {
    const { sub, res: r, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub: string; res: string; exp: number }
    return r === res && exp > now && typeof sub === 'string' ? sub : null
  } catch {
    return null
  }
}
