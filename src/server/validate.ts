// Input checks for server functions (SEC-02). Data from the browser is unknown until one of these
// says otherwise; a failed check is a 400 with a plain message, before any controller runs.
import { HttpError } from './auth'

const bad = (what: string) => new HttpError(400, `Invalid ${what}`)

export function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw bad('request')
  return v as Record<string, unknown>
}

export function str(v: unknown, max: number): string {
  if (typeof v !== 'string' || v.length > max) throw bad('text')
  return v
}

/** Ids are uuids, or the app's own short tokens (message ids, element ids). */
export function idOf(v: unknown): string {
  if (typeof v !== 'string' || !/^[\w-]{1,80}$/.test(v)) throw bad('id')
  return v
}

export function num(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1e7) throw bad('number')
  return v
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T {
  if (!allowed.includes(v as T)) throw bad('value')
  return v as T
}
