import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { businessSubscriptionsPage } from '../server/business-fns'
import { Badge, date, ServerTable, type ServerColumn } from '../admin/ui'
import { parseSubsQuery, SUB_STATUSES } from '../admin/table-query'
import { productOf } from '@/lib/credit-prices'

// ADM-15: every subscription as the provider last reported it.
export const Route = createFileRoute('/admin/credits/subscriptions')({
  validateSearch: parseSubsQuery,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => businessSubscriptionsPage({ data: deps }),
  component: SubscriptionsPage,
})

type Row = Awaited<ReturnType<typeof businessSubscriptionsPage>>['rows'][number]

const columns: ServerColumn<Row>[] = [
  { key: 'user', header: 'User', cell: (s) => <Link to="/admin/users/$userId" params={{ userId: s.userId }} className="hover:underline">{s.email ?? s.userId}</Link> },
  { key: 'plan', header: 'Plan', cell: (s) => productOf(s.productKey)?.name ?? s.productKey },
  { key: 'status', header: 'Status', cell: (s) => <Badge tone={s.status === 'active' || s.status === 'trialing' ? 'good' : s.status === 'past_due' || s.status === 'unpaid' ? 'warn' : 'neutral'}>{s.status}</Badge> },
  { key: 'started', header: 'Started', sort: 'started', cell: (s) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(s.startedAt)}</span> },
  { key: 'end', header: 'Period end', sort: 'end', cell: (s) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(s.currentPeriodEnd)}</span> },
  { key: 'cancel', header: 'Cancels at end', cell: (s) => (s.cancelAtPeriodEnd ? <Badge tone="warn">yes</Badge> : '—') },
]

function SubscriptionsPage() {
  const d = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <ServerTable
      rows={d.rows}
      total={d.total}
      columns={columns}
      query={search}
      defaultSort="started"
      onQuery={(patch) => navigate({ search: (s) => parseSubsQuery({ ...s, ...patch }), replace: 'q' in patch })}
      filters={[
        { type: 'select', key: 'status', label: 'Status', options: SUB_STATUSES.map((s) => ({ value: s, label: s })) },
        { type: 'select', key: 'plan', label: 'Plan', options: [{ value: 'starter', label: 'Starter' }, { value: 'pro', label: 'Pro' }] },
      ]}
      empty="No subscriptions match."
    />
  )
}
