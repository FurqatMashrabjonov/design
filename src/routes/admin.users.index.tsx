import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { adminUsers } from '../server/admin-fns'
import { ago } from '../Dashboard'
import { Badge, DataTable, money, PageTitle, type Column } from '../admin/ui'

// ADM-03: every user, what they did and what it cost (also OBS-05).
export const Route = createFileRoute('/admin/users/')({
  loader: () => adminUsers(),
  component: UsersPage,
})

type Row = Awaited<ReturnType<typeof adminUsers>>[number]

const columns: Column<Row>[] = [
  {
    key: 'user',
    header: 'User',
    sort: (r) => r.email,
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
  { key: 'status', header: 'Status', sort: (r) => (r.banned ? 2 : r.role === 'admin' ? 1 : 0), cell: (r) => (r.banned ? <Badge tone="bad">Banned</Badge> : r.role === 'admin' ? <Badge tone="warn">Admin</Badge> : <Badge>User</Badge>) },
  { key: 'joined', header: 'Joined', sort: (r) => r.createdAt, cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{ago(r.createdAt)}</span> },
  { key: 'seen', header: 'Last seen', sort: (r) => r.lastSeen ?? 0, cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{r.lastSeen ? ago(r.lastSeen) : '—'}</span> },
  { key: 'via', header: 'Via', cell: (r) => <span className="text-xs text-muted-foreground">{r.providers ?? 'email'}</span> },
  { key: 'projects', header: 'Projects', sort: (r) => r.projects, cell: (r) => r.projects, className: 'text-right tabular-nums' },
  { key: 'screens', header: 'Screens', sort: (r) => r.screens, cell: (r) => r.screens, className: 'text-right tabular-nums' },
  { key: 'calls24h', header: 'Calls 24h', sort: (r) => r.calls24h, cell: (r) => r.calls24h, className: 'text-right tabular-nums' },
  { key: 'spend', header: 'Spend', sort: (r) => r.spend, cell: (r) => money(r.spend), className: 'text-right tabular-nums' },
  { key: 'credits', header: 'Credits', sort: (r) => r.credits, cell: (r) => r.credits, className: 'text-right tabular-nums' },
]

function UsersPage() {
  const rows = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <>
      <PageTitle title="Users" sub={`${rows.length} accounts · ${money(rows.reduce((s, r) => s + r.spend, 0))} spent in total`} />
      <DataTable rows={rows} columns={columns} search={(r) => `${r.email} ${r.name}`} initialSort={{ key: 'joined', desc: true }} onRow={(r) => navigate({ to: '/admin/users/$userId', params: { userId: r.id } })} empty="No users yet." />
    </>
  )
}
