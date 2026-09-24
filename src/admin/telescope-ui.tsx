import { Badge, Pager as SharedPager } from './ui'

// OBS-10/OBS-11: small pieces the request, log and error pages share (server-paged, unlike DataTable).

export const statusTone = (s: number) => (s >= 500 ? 'bad' : s >= 400 ? 'warn' : s >= 300 ? 'neutral' : 'good') as 'bad' | 'warn' | 'neutral' | 'good'

export const levelTone = (l: string) => (l === 'error' ? 'bad' : l === 'warn' ? 'warn' : 'neutral') as 'bad' | 'warn' | 'neutral'

/** OBS-12: an outgoing call's HTTP status, or its network error (the message on hover). */
export function OutgoingStatus({ status, error }: { status: number | null; error: string | null }) {
  if (status !== null) return <Badge tone={statusTone(status)}>{status}</Badge>
  return <span title={error ?? ''}><Badge tone="bad">error</Badge></span>
}

/** The log pages' pager: page-numbered, drawn by the shared one. */
export function Pager({ page, pages, total, size, go }: { page: number; pages: number; total: number; size: number; go: (page: number) => void }) {
  if (pages <= 1) return null
  return <SharedPager from={page * size + 1} to={Math.min(total, (page + 1) * size)} total={total} canPrev={page > 0} canNext={page < pages - 1} onPrev={() => go(page - 1)} onNext={() => go(page + 1)} />
}
