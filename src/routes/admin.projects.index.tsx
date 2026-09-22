import { createFileRoute, Link } from '@tanstack/react-router'
import { adminProjects } from '../server/admin-fns'
import { ago, Thumb } from '../Dashboard'
import { Badge, DataTable, PageTitle, type Column } from '../admin/ui'

// ADM-05: every project in the product, with its owner.
export const Route = createFileRoute('/admin/projects/')({
  loader: () => adminProjects(),
  component: ProjectsPage,
})

type Row = Awaited<ReturnType<typeof adminProjects>>[number]

const columns: Column<Row>[] = [
  {
    key: 'project',
    header: 'Project',
    sort: (r) => r.name,
    cell: (r) => (
      <Link to="/admin/projects/$projectId" params={{ projectId: r.id }} className="flex items-center gap-3 hover:underline">
        <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md border bg-muted">{r.coverId && <Thumb screenId={r.coverId} device={r.device} width={36} />}</span>
        <span className="font-medium">{r.name}</span>
      </Link>
    ),
  },
  { key: 'owner', header: 'Owner', sort: (r) => r.owner ?? '', cell: (r) => (r.ownerId ? <Link to="/admin/users/$userId" params={{ userId: r.ownerId }} className="text-muted-foreground hover:underline">{r.owner}</Link> : <span className="text-muted-foreground">—</span>) },
  { key: 'system', header: 'System', sort: (r) => r.designSystem, cell: (r) => <span className="text-muted-foreground">{r.designSystem} · {r.device}</span> },
  { key: 'screens', header: 'Screens', sort: (r) => r.screens, cell: (r) => r.screens, className: 'text-right tabular-nums' },
  { key: 'failed', header: 'Failed', sort: (r) => r.failed, cell: (r) => (r.failed ? <Badge tone="bad">{r.failed}</Badge> : <span className="text-muted-foreground">0</span>), className: 'text-right' },
  { key: 'created', header: 'Created', sort: (r) => r.createdAt, cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{ago(r.createdAt)}</span> },
]

function ProjectsPage() {
  const rows = Route.useLoaderData()
  return (
    <>
      <PageTitle title="Projects" sub={`${rows.length} projects · ${rows.reduce((s, r) => s + r.screens, 0)} screens · ${rows.filter((r) => r.failed).length} with failed screens`} />
      <DataTable rows={rows} columns={columns} search={(r) => `${r.name} ${r.owner ?? ''} ${r.designSystem}`} initialSort={{ key: 'created', desc: true }} empty="No projects yet." />
    </>
  )
}
