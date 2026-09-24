import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { businessActionCalls, businessLedgerCsv, businessLedgerPage } from '../server/business-fns'
import { Badge, date, Field, Kpi, money, secs, ServerTable, type ServerColumn } from '../admin/ui'
import { LEDGER_KINDS, parseLedgerQuery } from '../admin/table-query'

// ADM-15: the credit ledger, paged and filtered on the server; the totals follow the filter.
export const Route = createFileRoute('/admin/credits/')({
  validateSearch: parseLedgerQuery,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => businessLedgerPage({ data: deps }),
  component: LedgerPage,
})

type Row = Awaited<ReturnType<typeof businessLedgerPage>>['rows'][number]

const userLink = (r: Row) => (
  <Link to="/admin/users/$userId" params={{ userId: r.userId }} onClick={(e) => e.stopPropagation()} className="hover:underline">{r.email ?? r.userId}</Link>
)

const columns: ServerColumn<Row>[] = [
  { key: 'when', header: 'When', sort: 'when', cell: (r) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(r.createdAt)}</span> },
  { key: 'user', header: 'User', cell: userLink },
  { key: 'kind', header: 'Kind', cell: (r) => <Badge tone={r.kind === 'expire' ? 'warn' : r.kind === 'purchase' || r.kind === 'subscription' ? 'good' : 'neutral'}>{r.kind}</Badge> },
  { key: 'delta', header: 'Delta', sort: 'delta', cell: (r) => <span className={r.delta < 0 ? 'text-red-600' : 'text-emerald-600'}>{r.delta > 0 ? `+${r.delta}` : r.delta}</span>, className: 'text-right tabular-nums' },
  { key: 'note', header: 'Note', cell: (r) => <span className="text-xs text-muted-foreground">{r.note ?? r.ref ?? ''}</span> },
]

function RowDetail({ r }: { r: Row }) {
  const [calls, setCalls] = useState<Awaited<ReturnType<typeof businessActionCalls>> | null>(null)
  useEffect(() => {
    setCalls(null)
    if (r.actionId) businessActionCalls({ data: r.actionId }).then(setCalls, () => setCalls([]))
  }, [r.actionId])
  return (
    <>
      <dl>
        <Field label="Time">{new Date(r.createdAt * 1000).toLocaleString()}</Field>
        <Field label="User">{userLink(r)}</Field>
        <Field label="Kind">{r.kind}</Field>
        <Field label="Delta">{r.delta}</Field>
        <Field label="Action">{r.actionId ? <span className="font-mono text-xs">{r.actionId}</span> : '—'}</Field>
        <Field label="Ref">{r.ref ? <span className="font-mono text-xs">{r.ref}</span> : '—'}</Field>
        <Field label="Note">{r.note ?? '—'}</Field>
      </dl>
      {r.actionId && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Model calls of this action</h3>
          {!calls ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No model calls.</p>
          ) : (
            <ul className="divide-y text-sm">
              {calls.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{c.model} {c.ok ? '' : <Badge tone="bad">error</Badge>}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{c.promptTokens}/{c.completionTokens} · {secs(c.ms)} · {money(c.costUsd)}</span>
                </li>
              ))}
              <li className="flex justify-between py-2 font-medium"><span>Total</span><span className="tabular-nums">{money(calls.reduce((s, c) => s + c.costUsd, 0))}</span></li>
            </ul>
          )}
        </div>
      )}
    </>
  )
}

function LedgerPage() {
  const d = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Credits granted" now={d.totals.granted} />
        <Kpi label="Spent (holds net of refunds)" now={d.totals.spent} />
        <Kpi label="Expired" now={d.totals.expired} />
      </div>
      <ServerTable
        rows={d.rows}
        total={d.total}
        columns={columns}
        query={search}
        defaultSort="when"
        onQuery={(patch) => navigate({ search: (s) => parseLedgerQuery({ ...s, ...patch }), replace: 'q' in patch || 'user' in patch })}
        filters={[
          { type: 'select', key: 'kind', label: 'Kind', options: LEDGER_KINDS.map((k) => ({ value: k, label: k })) },
          { type: 'select', key: 'sign', label: 'Delta', options: [{ value: 'plus', label: '+ in' }, { value: 'minus', label: '− out' }] },
          { type: 'dateRange', from: 'from', to: 'to', label: 'Date' },
          { type: 'text', key: 'user', label: 'User email' },
        ]}
        detail={(r) => <RowDetail r={r} />}
        detailTitle={(r) => `${r.kind} ${r.delta > 0 ? '+' : ''}${r.delta} · ${date(r.createdAt)}`}
        onExport={() => businessLedgerCsv({ data: search })}
        exportName="credit-ledger"
        empty="No ledger rows match."
      />
    </>
  )
}
