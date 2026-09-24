import type { FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { telescopeWebhooks } from '../server/telescope-fns'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, control, date, PageTitle, tbl } from '../admin/ui'
import { Pager, statusTone } from '../admin/telescope-ui'

// OBS-12: every webhook POST that reached us, newest first; a verified one keeps its payload.
type Search = { type?: string; verified?: 'yes' | 'no'; result?: string; page?: number }

const text = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, 100) : undefined)
const whole = (s: unknown) => (Number.isInteger(Number(s)) && Number(s) > 0 ? Number(s) : undefined)

export const Route = createFileRoute('/admin/webhooks/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    type: text(s.type), verified: s.verified === 'yes' || s.verified === 'no' ? s.verified : undefined, result: text(s.result), page: whole(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps: s }) =>
    telescopeWebhooks({ data: { type: s.type, verified: s.verified ? s.verified === 'yes' : undefined, result: s.result, page: s.page ? s.page - 1 : 0 } }),
  component: WebhooksPage,
})

const field = control

function WebhooksPage() {
  const d = Route.useLoaderData()
  const s = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const set = (patch: Partial<Search>) => navigate({ search: (old) => ({ ...old, ...patch, page: undefined }) })
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    set({ type: text(f.get('type')), result: text(f.get('result')) })
  }
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize))
  return (
    <>
      <PageTitle title="Webhooks" sub={`${d.total} events · kept 7 days`} />
      <form onSubmit={submit} key={JSON.stringify(s)} className="mb-4 flex flex-wrap items-center gap-2">
        <input name="type" defaultValue={s.type} placeholder="Type contains" aria-label="Event type contains" className={`${field} w-44`} />
        <select aria-label="Verified" className={field} value={s.verified ?? ''} onChange={(e) => set({ verified: e.target.value === 'yes' || e.target.value === 'no' ? e.target.value : undefined })}>
          <option value="">Verified or not</option>
          <option value="yes">Verified</option>
          <option value="no">Not verified</option>
        </select>
        <input name="result" defaultValue={s.result} placeholder="Result contains" aria-label="Result contains" className={`${field} w-40`} />
        <Button type="submit" size="sm">Filter</Button>
        <Link to="/admin/webhooks" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-muted-foreground' })}>Clear</Link>
      </form>

      <div className={tbl.wrap}>
        <table className={tbl.table}>
          <thead className={tbl.head}>
            <tr>{['Time', 'Provider', 'Type', 'Event id', 'Signature', 'Result', 'We answered'].map((h) => <th key={h} className={tbl.th}>{h}</th>)}</tr>
          </thead>
          <tbody className={tbl.body}>
            {d.rows.map((r) => (
              <tr key={r.id} className={tbl.row} onClick={() => navigate({ to: '/admin/webhooks/$eventId', params: { eventId: String(r.id) } })}>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{date(r.createdAt)}</td>
                <td className="px-3 py-2 text-xs">{r.provider}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  <Link to="/admin/webhooks/$eventId" params={{ eventId: String(r.id) }} className="hover:underline">{r.eventType ?? '—'}</Link>
                </td>
                <td className="max-w-40 truncate px-3 py-2 font-mono text-xs text-muted-foreground" title={r.eventId ?? ''}>{r.eventId ?? '—'}</td>
                <td className="px-3 py-2">{r.verified ? <Badge tone="good">verified</Badge> : <Badge tone="bad">not verified</Badge>}</td>
                <td className="max-w-56 truncate px-3 py-2 text-xs" title={r.result}>{r.result}</td>
                <td className="px-3 py-2"><Badge tone={statusTone(r.httpStatus)}>{r.httpStatus}</Badge></td>
              </tr>
            ))}
            {d.rows.length === 0 && (
              <tr><td colSpan={7} className={tbl.empty}>No webhook events match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={d.page} pages={pages} total={d.total} size={d.pageSize} go={(p) => navigate({ search: (old) => ({ ...old, page: p > 0 ? p + 1 : undefined }) })} />
    </>
  )
}
