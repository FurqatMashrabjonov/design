import { createFileRoute, Link } from '@tanstack/react-router'
import { telescopeRequest } from '../server/telescope-fns'
import { Badge, date, money, PageTitle, Panel, secs } from '../admin/ui'
import { levelTone, OutgoingStatus, statusTone } from '../admin/telescope-ui'

// OBS-10: one request — what came in, what it logged, the model calls it made, the errors it hit.
export const Route = createFileRoute('/admin/requests/$requestId')({
  loader: ({ params }) => telescopeRequest({ data: params.requestId }),
  component: RequestPage,
})

function RequestPage() {
  const { request: r, logs, calls, outgoing } = Route.useLoaderData()
  const { requestId } = Route.useParams()
  const errors = logs.filter((l) => l.level === 'error')
  const fields: [string, React.ReactNode][] = r
    ? [
        ['Time', date(r.createdAt)],
        ['Method', <span className="font-mono">{r.method}</span>],
        ['Path', <span className="font-mono break-all">{r.path}</span>],
        ['Query', r.query ? <span className="font-mono break-all">{r.query}</span> : '—'],
        ['Status', <Badge tone={statusTone(r.status)}>{r.status}</Badge>],
        ['Duration', `${r.ms} ms`],
        ['Kind', r.kind],
        ['User', r.userId ? <Link to="/admin/users/$userId" params={{ userId: r.userId }} className="hover:underline">{r.email ?? r.userId}</Link> : '—'],
        ['IP (hashed)', <span className="font-mono">{r.ipHash ?? '—'}</span>],
        ['User agent', <span className="break-all">{r.userAgent ?? '—'}</span>],
        ['Response size', r.size === null ? '—' : `${r.size} B`],
      ]
    : []
  return (
    <>
      <PageTitle title={r ? `${r.method} ${r.path}` : 'Request'} sub={`Request ${requestId}`} right={<Link to="/admin/requests" className="text-sm text-muted-foreground hover:underline">← All requests</Link>} />
      <div className="grid gap-4">
        <Panel title="Request">
          {r ? (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              {fields.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Not in the request log (older than 7 days, or work that ran on after its request).</p>
          )}
        </Panel>

        {errors.length > 0 && (
          <Panel title={`Errors (${errors.length})`}>
            <ul className="space-y-3">
              {errors.map((e) => (
                <li key={e.id}>
                  <p className="font-mono text-xs text-red-600 break-all">{e.message}</p>
                  {e.stack && <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-muted p-2 text-[11px]">{e.stack}</pre>}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title={`Logs (${logs.length})`}>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing was logged.</p>
          ) : (
            <ul className="divide-y text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex gap-3 py-1.5">
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{date(l.createdAt)}</span>
                  <Badge tone={levelTone(l.level)}>{l.level}</Badge>
                  <span className="min-w-0 font-mono text-xs break-all whitespace-pre-wrap">{l.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Model calls (${calls.length})`}>
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No model calls.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>{['Model', 'Tokens in/out', 'Time', 'Cost', 'Result'].map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {calls.map((c) => (
                    <tr key={c.id}>
                      <td className="px-2 py-1.5 text-xs">{c.model || c.provider}</td>
                      <td className="px-2 py-1.5 tabular-nums">{c.promptTokens} / {c.completionTokens}</td>
                      <td className="px-2 py-1.5 tabular-nums">{secs(c.ms)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{money(c.costUsd)}</td>
                      <td className="px-2 py-1.5">{c.ok ? <Badge tone="good">ok</Badge> : <span title={c.error ?? ''}><Badge tone="bad">{(c.error ?? 'error').slice(0, 40)}</Badge></span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={`Outgoing calls (${outgoing.length})`}>
          {outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outgoing calls.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>{['Purpose', 'Call', 'Status', 'ms', 'Size'].map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {outgoing.map((o) => (
                    <tr key={o.id}>
                      <td className="px-2 py-1.5 text-xs">{o.purpose}</td>
                      <td className="max-w-md truncate px-2 py-1.5 font-mono text-xs" title={`${o.method} ${o.host}${o.path}${o.query ? `?${o.query}` : ''}`}>{o.method} {o.host}{o.path}{o.query && <span className="text-muted-foreground">?{o.query}</span>}</td>
                      <td className="px-2 py-1.5"><OutgoingStatus status={o.status} error={o.error} /></td>
                      <td className="px-2 py-1.5 tabular-nums">{o.ms}</td>
                      <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{o.size ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
