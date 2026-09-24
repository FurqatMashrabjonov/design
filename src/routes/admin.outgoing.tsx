import type { FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { telescopeOutgoing } from '../server/telescope-fns'
import { date, PageTitle } from '../admin/ui'
import { OutgoingStatus, Pager } from '../admin/telescope-ui'

// OBS-12: every HTTP call the server made (model providers, photos, payments), newest first.
type Search = { purpose?: (typeof PURPOSES)[number]; status?: (typeof STATUSES)[number]; host?: string; slow?: number; from?: string; to?: string; page?: number }

// ponytail: mirrors PURPOSES in TelescopeService, which cannot be imported into the browser bundle.
const PURPOSES = ['deepseek', 'gemini', 'anthropic', 'pexels', 'polar', 'google', 'other'] as const
const STATUSES = ['2xx', '3xx', '4xx', '5xx', 'error'] as const
const day = (s: unknown) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined)
const text = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, 200) : undefined)
const whole = (s: unknown) => (Number.isInteger(Number(s)) && Number(s) > 0 ? Number(s) : undefined)
const unix = (d: string | undefined, end = false) => (d ? Math.floor(new Date(`${d}T${end ? '23:59:59' : '00:00:00'}`).getTime() / 1000) : undefined)

export const Route = createFileRoute('/admin/outgoing')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    purpose: PURPOSES.find((m) => m === s.purpose), status: STATUSES.find((m) => m === s.status), host: text(s.host),
    slow: whole(s.slow), from: day(s.from), to: day(s.to), page: whole(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps: s }) =>
    telescopeOutgoing({ data: { purpose: s.purpose, status: s.status, host: s.host, slowMs: s.slow, from: unix(s.from), to: unix(s.to, true), page: s.page ? s.page - 1 : 0 } }),
  component: OutgoingPage,
})

const field = 'h-8 rounded-lg border bg-background px-2 text-sm'

function OutgoingPage() {
  const d = Route.useLoaderData()
  const s = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const set = (patch: Partial<Search>) => navigate({ search: (old) => ({ ...old, ...patch, page: undefined }) })
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    set({ host: text(f.get('host')), slow: whole(f.get('slow')), from: day(f.get('from')), to: day(f.get('to')) })
  }
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize))
  return (
    <>
      <PageTitle title="Outgoing" sub={`${d.total} calls · kept 7 days · no bodies or headers stored`} />
      <form onSubmit={submit} key={JSON.stringify(s)} className="mb-4 flex flex-wrap items-center gap-2">
        <select aria-label="Purpose" className={field} value={s.purpose ?? ''} onChange={(e) => set({ purpose: PURPOSES.find((m) => m === e.target.value) })}>
          <option value="">Any purpose</option>
          {PURPOSES.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select aria-label="Status" className={field} value={s.status ?? ''} onChange={(e) => set({ status: STATUSES.find((m) => m === e.target.value) })}>
          <option value="">Any status</option>
          {STATUSES.map((m) => <option key={m} value={m}>{m === 'error' ? 'network error' : m}</option>)}
        </select>
        <input name="host" defaultValue={s.host} placeholder="Host contains" aria-label="Host contains" className={`${field} w-40`} />
        <input name="slow" type="number" min={1} defaultValue={s.slow} placeholder="Slow ≥ ms" aria-label="Slower than ms" className={`${field} w-28`} />
        <input name="from" type="date" defaultValue={s.from} aria-label="From" className={field} />
        <input name="to" type="date" defaultValue={s.to} aria-label="To" className={field} />
        <button type="submit" className="h-8 rounded-lg bg-foreground px-3 text-sm text-background">Filter</button>
        <Link to="/admin/outgoing" className="text-sm text-muted-foreground hover:underline">Clear</Link>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>{['Time', 'Purpose', 'Method', 'Host', 'Path', 'Status', 'ms', 'Size', 'Request'].map((h) => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {d.rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{date(r.createdAt)}</td>
                <td className="px-3 py-2 text-xs">{r.purpose}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.method}</td>
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{r.host}</td>
                <td className="max-w-md truncate px-3 py-2 font-mono text-xs" title={r.path + (r.query ? `?${r.query}` : '')}>
                  {r.path}
                  {r.query && <span className="text-muted-foreground">?{r.query}</span>}
                </td>
                <td className="px-3 py-2"><OutgoingStatus status={r.status} error={r.error} /></td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.ms >= 1000 ? 'text-amber-600' : ''}`}>{r.ms}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">{r.size ?? '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {r.requestId ? <Link to="/admin/requests/$requestId" params={{ requestId: r.requestId }} className="font-mono hover:underline">{r.requestId.slice(0, 8)}</Link> : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
            {d.rows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No outgoing calls match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={d.page} pages={pages} total={d.total} size={d.pageSize} go={(p) => navigate({ search: (old) => ({ ...old, page: p > 0 ? p + 1 : undefined }) })} />
    </>
  )
}
