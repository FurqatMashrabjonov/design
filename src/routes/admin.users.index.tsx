import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { adminUsersCsv, adminUsersPage } from '../server/admin-fns'
import { ago } from '../Dashboard'
import { Badge, money, PageTitle, ServerTable, type ServerColumn } from '../admin/ui'
import { parseUsersQuery } from '../admin/table-query'

// ADM-03: every user, what they did and what it cost (also OBS-05).
// ADM-11: paged, sorted and filtered on the server; the view lives in the URL.
export const Route = createFileRoute('/admin/users/')({
  validateSearch: parseUsersQuery,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => adminUsersPage({ data: deps }),
  component: UsersPage,
})

type Row = Awaited<ReturnType<typeof adminUsersPage>>['rows'][number]

const columns: ServerColumn<Row>[] = [
  {
    key: 'user',
    header: 'User',
    cell: (r) => (
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[10px] font-semibold">
          {r.image ? <img src={r.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : r.email.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{r.name || r.email.split('@')[0]}</span>
          <span className="block truncate text-xs text-muted-foreground">{r.email}</span>
        </span>
      </div>
    ),
  },
  { key: 'status', header: 'Status', cell: (r) => (r.banned ? <Badge tone="bad">Banned</Badge> : r.role === 'admin' ? <Badge tone="warn">Admin</Badge> : <Badge>User</Badge>) },
  { key: 'joined', header: 'Joined', sort: 'joined', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{ago(r.createdAt)}</span> },
  { key: 'seen', header: 'Last seen', sort: 'seen', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{r.lastSeen ? ago(r.lastSeen) : '—'}</span> },
  { key: 'via', header: 'Via', cell: (r) => <span className="text-xs text-muted-foreground">{r.providers ?? 'email'}</span> },
  { key: 'projects', header: 'Projects', sort: 'projects', cell: (r) => r.projects, className: 'text-right tabular-nums' },
  { key: 'screens', header: 'Screens', sort: 'screens', cell: (r) => r.screens, className: 'text-right tabular-nums' },
  { key: 'calls24h', header: 'Calls 24h', cell: (r) => r.calls24h, className: 'text-right tabular-nums' },
  { key: 'spend', header: 'Spend', sort: 'spend', cell: (r) => money(r.spend), className: 'text-right tabular-nums' },
  { key: 'credits', header: 'Credits', sort: 'credits', cell: (r) => r.credits, className: 'text-right tabular-nums' },
]

function UsersPage() {
  const d = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <>
      <PageTitle title="Users" sub={`${d.total} accounts match`} />
      <ServerTable
        rows={d.rows}
        total={d.total}
        columns={columns}
        query={search}
        defaultSort="joined"
        onQuery={(patch) => navigate({ search: (s) => parseUsersQuery({ ...s, ...patch }), replace: 'q' in patch })}
        filters={[
          { type: 'select', key: 'role', label: 'Role', options: [{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }] },
          { type: 'select', key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'banned', label: 'Banned' }] },
          { type: 'dateRange', from: 'from', to: 'to', label: 'Joined' },
        ]}
        onRow={(r) => navigate({ to: '/admin/users/$userId', params: { userId: r.id } })}
        onExport={() => adminUsersCsv({ data: search })}
        exportName="users"
        empty="No users match."
      />
    </>
  )
}
