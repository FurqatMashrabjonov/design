import type { FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { telescopeRequests } from '../server/telescope-fns'
import { Badge, date, PageTitle } from '../admin/ui'
import { Pager, statusTone } from '../admin/telescope-ui'

// OBS-10: every HTTP request the server answered, newest first; filters live in the URL.
type Search = { method?: (typeof METHODS)[number]; status?: (typeof STATUSES)[number]; path?: string; email?: string; slow?: number; from?: string; to?: string; page?: number }

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
const STATUSES = ['2xx', '3xx', '4xx', '5xx'] as const
const day = (s: unknown) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined)
const text = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, 200) : undefined)
const whole = (s: unknown) => (Number.isInteger(Number(s)) && Number(s) > 0 ? Number(s) : undefined)
const unix = (d: string | undefined, end = false) => (d ? Math.floor(new Date(`${d}T${end ? '23:59:59' : '00:00:00'}`).getTime() / 1000) : undefined)

export const Route = createFileRoute('/admin/requests/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    method: METHODS.find((m) => m === s.method), status: STATUSES.find((m) => m === s.status), path: text(s.path), email: text(s.email),
    slow: whole(s.slow), from: day(s.from), to: day(s.to), page: whole(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps: s }) =>
    telescopeRequests({ data: { method: s.method, status: s.status, path: s.path, email: s.email, slowMs: s.slow, from: unix(s.from), to: unix(s.to, true), page: s.page ? s.page - 1 : 0 } }),
  component: RequestsPage,
})

const field = 'h-8 rounded-lg border bg-background px-2 text-sm'

function RequestsPage() {
  const d = Route.useLoaderData()
  const s = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const set = (patch: Partial<Search>) => navigate({ search: (old) => ({ ...old, ...patch, page: undefined }) })
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    set({ path: text(f.get('path')), email: text(f.get('email')), slow: whole(f.get('slow')), from: day(f.get('from')), to: day(f.get('to')) })
  }
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize))
  return (
    <>
      <PageTitle title="Requests" sub={`${d.total} requests · kept 7 days`} />
      <form onSubmit={submit} key={JSON.stringify(s)} className="mb-4 flex flex-wrap items-center gap-2">
        <select aria-label="Method" className={field} value={s.method ?? ''} onChange={(e) => set({ method: METHODS.find((m) => m === e.target.value) })}>
          <option value="">Any method</option>
          {METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select aria-label="Status" className={field} value={s.status ?? ''} onChange={(e) => set({ status: STATUSES.find((m) => m === e.target.value) })}>
          <option value="">Any status</option>
          {STATUSES.map((m) => <option key={m}>{m}</option>)}
        </select>
        <input name="path" defaultValue={s.path} placeholder="Path contains" aria-label="Path contains" className={`${field} w-40`} />
        <input name="email" defaultValue={s.email} placeholder="User email" aria-label="User email contains" className={`${field} w-40`} />
        <input name="slow" type="number" min={1} defaultValue={s.slow} placeholder="Slow ≥ ms" aria-label="Slower than ms" className={`${field} w-28`} />
        <input name="from" type="date" defaultValue={s.from} aria-label="From" className={field} />
        <input name="to" type="date" defaultValue={s.to} aria-label="To" className={field} />
        <button type="submit" className="h-8 rounded-lg bg-foreground px-3 text-sm text-background">Filter</button>
        <Link to="/admin/requests" className="text-sm text-muted-foreground hover:underline">Clear</Link>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>{['Time', 'Method', 'Path', 'Status', 'ms', 'User', 'Kind'].map((h) => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {d.rows.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate({ to: '/admin/requests/$requestId', params: { requestId: r.id } })}>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{date(r.createdAt)}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.method}</td>
                <td className="max-w-md truncate px-3 py-2 font-mono text-xs" title={r.path + (r.query ? `?${r.query}` : '')}>
                  <Link to="/admin/requests/$requestId" params={{ requestId: r.id }} className="hover:underline">{r.path}</Link>
                  {r.query && <span className="text-muted-foreground">?{r.query}</span>}
                </td>
                <td className="px-3 py-2"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.ms >= 1000 ? 'text-amber-600' : ''}`}>{r.ms}</td>
                <td className="max-w-48 truncate px-3 py-2 text-xs">{r.email ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.kind}</td>
              </tr>
            ))}
            {d.rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No requests match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={d.page} pages={pages} total={d.total} size={d.pageSize} go={(p) => navigate({ search: (old) => ({ ...old, page: p > 0 ? p + 1 : undefined }) })} />
    </>
  )
}
