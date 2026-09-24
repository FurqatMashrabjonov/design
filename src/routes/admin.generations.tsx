import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { adminCallsCsv, adminCallsPage, adminGenerations } from '../server/admin-fns'
import { Badge, date, Field, money, PageTitle, Panel, secs, ServerTable, type ServerColumn } from '../admin/ui'
import { parseCallsQuery } from '../admin/table-query'

// ADM-06: where generation goes wrong — the model-call log and failed screens by cause.
// ADM-11: the log is paged, sorted and filtered on the server; the view lives in the URL.
export const Route = createFileRoute('/admin/generations')({
  validateSearch: parseCallsQuery,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [calls, quality] = await Promise.all([adminCallsPage({ data: deps }), adminGenerations()])
    return { calls, ...quality }
  },
  component: GenerationsPage,
})

type Call = Awaited<ReturnType<typeof adminCallsPage>>['rows'][number]

const columns: ServerColumn<Call>[] = [
  { key: 'when', header: 'When', sort: 'when', cell: (c) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(c.createdAt)}</span> },
  { key: 'who', header: 'User', cell: (c) => (c.userId ? <Link to="/admin/users/$userId" params={{ userId: c.userId }} onClick={(e) => e.stopPropagation()} className="hover:underline">{c.email}</Link> : '—') },
  { key: 'project', header: 'Project', cell: (c) => (c.projectId ? <Link to="/admin/projects/$projectId" params={{ projectId: c.projectId }} onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:underline">{c.project}</Link> : '—') },
  { key: 'model', header: 'Model', cell: (c) => <span className="text-xs text-muted-foreground">{c.model || c.provider}</span> },
  { key: 'result', header: 'Result', cell: (c) => (c.ok ? <Badge tone="good">ok</Badge> : <span title={c.error ?? ''}><Badge tone="bad">{(c.error ?? 'error').slice(0, 40)}</Badge></span>) },
  { key: 'tokens', header: 'Tokens in/out', sort: 'tokens', cell: (c) => `${c.promptTokens} / ${c.completionTokens}`, className: 'text-right tabular-nums whitespace-nowrap' },
  { key: 'ms', header: 'Time', sort: 'ms', cell: (c) => secs(c.ms), className: 'text-right tabular-nums' },
  { key: 'cost', header: 'Cost', sort: 'cost', cell: (c) => money(c.costUsd), className: 'text-right tabular-nums' },
]

function CallDetail({ c }: { c: Call }) {
  return (
    <dl>
      <Field label="Time">{new Date(c.createdAt * 1000).toLocaleString()}</Field>
      <Field label="Result">{c.ok ? <Badge tone="good">ok</Badge> : <Badge tone="bad">error</Badge>}</Field>
      <Field label="User">{c.userId ? <Link to="/admin/users/$userId" params={{ userId: c.userId }} className="hover:underline">{c.email}</Link> : '—'}</Field>
      <Field label="Project">{c.projectId ? <Link to="/admin/projects/$projectId" params={{ projectId: c.projectId }} className="hover:underline">{c.project}</Link> : '—'}</Field>
      <Field label="Model">{c.model || '—'}</Field>
      <Field label="Provider">{c.provider}</Field>
      <Field label="Action">{c.actionId ? <span className="font-mono text-xs">{c.actionId}</span> : '—'}</Field>
      <Field label="Tokens in">{c.promptTokens}</Field>
      <Field label="Cached">{c.cachedTokens}</Field>
      <Field label="Cache write">{c.cacheWriteTokens}</Field>
      <Field label="Tokens out">{c.completionTokens}</Field>
      <Field label="Cost">{money(c.costUsd)}</Field>
      <Field label="Time taken">{secs(c.ms)}</Field>
      {c.error && (
        <Field label="Error">
          <pre className="font-mono text-xs whitespace-pre-wrap text-red-600">{c.error}</pre>
        </Field>
      )}
    </dl>
  )
}

function GenerationsPage() {
  const d = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <>
      <PageTitle title="Generations" sub={`${d.calls.total} model calls match`} />

      <ServerTable
        rows={d.calls.rows}
        total={d.calls.total}
        columns={columns}
        query={search}
        defaultSort="when"
        onQuery={(patch) => navigate({ search: (s) => parseCallsQuery({ ...s, ...patch }), replace: 'q' in patch || 'user' in patch || 'minCost' in patch })}
        filters={[
          { type: 'select', key: 'result', label: 'Result', options: [{ value: 'ok', label: 'ok' }, { value: 'error', label: 'error' }] },
          { type: 'select', key: 'model', label: 'Model', options: d.calls.models.map((m) => ({ value: m, label: m })) },
          { type: 'dateRange', from: 'from', to: 'to', label: 'Date' },
          { type: 'text', key: 'user', label: 'User email' },
          { type: 'number', key: 'minCost', label: 'Min cost $', step: 0.001 },
        ]}
        detail={(c) => <CallDetail c={c} />}
        detailTitle={(c) => `${c.model || c.provider} · ${date(c.createdAt)}`}
        onExport={() => adminCallsCsv({ data: search })}
        exportName="model-calls"
        empty="No model calls match."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Failed screens by cause">
          {d.failures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed screens.</p>
          ) : (
            <ul className="divide-y text-sm">
              {d.failures.map((f) => (
                <li key={f.cause} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate font-mono text-xs">{f.cause}</span>
                  <span className="shrink-0 tabular-nums">{f.count} <span className="text-xs text-muted-foreground">· last {date(f.last)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Latest failed screens">
          <ul className="max-h-80 divide-y overflow-y-auto text-sm">
            {d.failedScreens.map((s) => (
              <li key={s.id} className="py-2">
                <Link to="/admin/projects/$projectId" params={{ projectId: s.projectId }} className="font-medium hover:underline">{s.project} · {s.name}</Link>
                <p className="truncate font-mono text-xs text-red-600">{s.error}</p>
                <p className="text-xs text-muted-foreground">{s.owner ?? '—'} · {date(s.createdAt)}</p>
              </li>
            ))}
            {d.failedScreens.length === 0 && <li className="py-4 text-muted-foreground">None.</li>}
          </ul>
        </Panel>
      </div>
    </>
  )
}
