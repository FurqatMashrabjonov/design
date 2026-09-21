// What the agent says in the chat, written in code. Every fact here is already known to the
// pipeline (the plan, the slots, lint, timings), so the reply is exact and costs no tokens.

// direct: an edit made by hand on the canvas (retype, delete, move…), no model involved.
// theme: an app-wide style change routed away from generation ("make it blue").
export type MessageKind = 'plan' | 'add' | 'edit' | 'element' | 'regenerate' | 'revert' | 'error' | 'direct' | 'theme'

export type MessageScreen = {
  id: string
  name: string
  /** The snapshot taken just before this message changed the screen; absent when the message created it. */
  versionId?: string
  created?: boolean
}

export type MessageMeta = {
  screens?: MessageScreen[]
  /** Lines of the agent log: what happened, in order, with numbers. */
  log?: string[]
  durationMs?: number
  /** Set once this message's changes were undone from the chat. */
  reverted?: boolean
  stopped?: boolean
  /** For a theme message: the theme before it, so it can be undone. */
  previousTheme?: unknown
}

export function parseMeta(json: string | null | undefined): MessageMeta {
  try {
    const m = JSON.parse(json ?? 'null')
    return m && typeof m === 'object' ? (m as MessageMeta) : {}
  } catch {
    return {}
  }
}

// Entity kinds come from the planner ("Dish", "Category"), so the usual English endings are handled.
const pluralOf = (w: string) => (/(s|sh|ch|x|z)$/i.test(w) ? `${w}es` : /[^aeiou]y$/i.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`)
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : pluralOf(one)}`
const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

/** Provider and pipeline errors, said the way a person needs to hear them. The raw text goes to the log. */
export function friendlyError(raw: string): string {
  if (/\b402\b|insufficient balance/i.test(raw)) return 'The AI provider account is out of credit, so nothing could be generated. Top it up and try again.'
  if (/\b429\b|too many requests|rate limit/i.test(raw)) return 'The AI provider is rate-limiting requests right now. Wait a minute and try again.'
  if (/incomplete HTML|max_tokens/i.test(raw)) return 'The model stopped before the screen was complete. Trying again usually works; a simpler request helps.'
  if (/fetch failed|network|ECONN|ETIMEDOUT|timed? ?out/i.test(raw)) return 'The connection to the AI provider dropped. Check the network and try again.'
  if (/\b5\d\d\b/.test(raw)) return 'The AI provider had an error on its side. Try again in a moment.'
  if (/abort/i.test(raw)) return 'Stopped.'
  return 'Something went wrong while generating. Try again.'
}

export function planReply(p: {
  appName: string
  summary: string
  drawn: string[]
  failed: string[]
  tabs: string[]
  entities: { kind: string; count: number }[]
  stopped?: boolean
}): string {
  const lines = [`${p.appName} — ${p.summary}`.replace(/ — $/, '')]
  if (p.drawn.length) lines.push(`Designed ${plural(p.drawn.length, 'screen')}: ${list(p.drawn)}.`)
  if (p.tabs.length) lines.push(`Tabs: ${p.tabs.join(' · ')}.`)
  if (p.entities.length) lines.push(`Every screen shares one set of data: ${list(p.entities.map((e) => plural(e.count, e.kind.toLowerCase())))}.`)
  if (p.failed.length) lines.push(`${list(p.failed)} could not be drawn — use “Try again” on ${p.failed.length === 1 ? 'that frame' : 'those frames'}.`)
  if (p.stopped) lines.push('Stopped before the rest were drawn.')
  return lines.join('\n')
}

export function changeReply(p: { kind: 'add' | 'edit' | 'element' | 'regenerate'; screen: string; element?: string | null; version?: number; slot?: string }): string {
  if (p.kind === 'add') return `Added “${p.screen}”${p.slot ? ` ${p.slot}` : ''}.`
  if (p.kind === 'regenerate') return `Redrew “${p.screen}” from its plan.${p.version && p.version > 1 ? ` The previous design is kept as v${p.version - 1}.` : ''}`
  // An element label already carries its quotes (Button “Add to cart”); a bare id does not.
  const element = p.element && (p.element.includes('“') ? p.element : `“${p.element}”`)
  const what = p.kind === 'element' && element ? `${element} on “${p.screen}”` : `“${p.screen}”`
  return `Updated ${what}${p.version ? ` — now v${p.version}` : ''}.`
}

export const formatTokens = (u: { promptTokens: number; cachedTokens: number; completionTokens: number }) =>
  `Tokens: ${u.promptTokens.toLocaleString('en-US')} in (${u.cachedTokens.toLocaleString('en-US')} cached), ${u.completionTokens.toLocaleString('en-US')} out`
