import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// ADM-13: AES-256-GCM for API keys kept in the database. The master key (32 bytes, base64) lives
// only in the environment (SECRETS_KEY), so a copy of the database alone reads nothing. GCM carries
// its own tag: a sealed value that was changed, or opened with another key, fails instead of
// decrypting to garbage. The format is `v1.<iv>.<tag>.<ciphertext>`, all base64.

export function masterKey(raw = process.env.SECRETS_KEY): Buffer {
  const key = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0)
  if (key.length !== 32) throw new Error('SECRETS_KEY is missing or not 32 bytes of base64 — keys cannot be stored')
  return key
}

export function seal(plain: string, key: Buffer = masterKey()): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join('.')
}

export function open(sealed: string, key: Buffer = masterKey()): string {
  const [v, iv, tag, data] = sealed.split('.')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Not a sealed value')
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8')
}
