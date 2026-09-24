import { createHmac, timingSafeEqual } from 'node:crypto'

// BIL-10: Standard Webhooks signature check (https://www.standardwebhooks.com), which Polar uses for
// secrets created from 2026-09-08. The signed content is `${id}.${timestamp}.${body}`, the key is the
// base64 part of `whsec_…`, and the header may carry several `v1,<sig>` entries (secret rotation).
// A timestamp more than five minutes off is refused, so a captured request cannot be replayed later.

const TOLERANCE_S = 5 * 60

export function sign(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
}

export function verify(secret: string, h: { id: string | null; timestamp: string | null; signature: string | null }, body: string, nowMs = Date.now()): boolean {
  if (!secret || !h.id || !h.timestamp || !h.signature) return false
  const ts = Number(h.timestamp)
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > TOLERANCE_S) return false
  const want = Buffer.from(sign(secret, h.id, h.timestamp, body))
  return h.signature.split(' ').some((part) => {
    const [version, sig] = part.split(',')
    const got = Buffer.from(sig ?? '')
    return version === 'v1' && got.length === want.length && timingSafeEqual(got, want)
  })
}
