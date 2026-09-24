import { createFileRoute, Link } from '@tanstack/react-router'
import { adminProject } from '../server/admin-fns'
import { Thumb } from '../Dashboard'
import { Badge, date, PageTitle, Panel } from '../admin/ui'

// ADM-05: one project, read only — its screens, plan and conversation. No editing from here.
export const Route = createFileRoute('/admin/projects/$projectId')({
  loader: ({ params }) => adminProject({ data: params.projectId }),
  component: ProjectPage,
})

function ProjectPage() {
  const d = Route.useLoaderData()
  const p = d.project
  let plan: { summary?: string; appType?: string; entities?: { kind: string; items: { name: string }[] }[] } = {}
  try {
    plan = JSON.parse(p.plan ?? '{}')
  } catch {}
  const screens = d.screens.filter((s) => !s.deletedAt)
  return (
    <>
      <PageTitle
        back={d.owner && <Link to="/admin/users/$userId" params={{ userId: d.owner.id }}>← {d.owner.email}</Link>}
        title={p.name}
        sub={`${p.designSystem} · ${p.device} · created ${date(p.createdAt)}`}
      />
      <Panel title={`Screens (${screens.length})`}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {screens.map((s) => (
            <figure key={s.id} className="shrink-0" style={{ width: p.device === 'mobile' ? 180 : 320 }}>
              <div className="overflow-hidden rounded-lg border border-border bg-muted" style={{ height: p.device === 'mobile' ? 390 : 200 }}>
                {s.drawn ? <Thumb screenId={s.id} device={p.device} width={p.device === 'mobile' ? 180 : 320} /> : <div className="grid h-full place-items-center p-3 text-center text-xs text-destructive">{s.error ?? 'Not drawn'}</div>}
              </div>
              <figcaption className="mt-1.5 flex items-center justify-between gap-1 text-xs">
                <span className="truncate">{s.name}</span>
                {s.rating === 'up' ? <Badge tone="good">👍</Badge> : s.rating === 'down' ? <Badge tone="bad">👎</Badge> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </Panel>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Plan">
          <p className="text-sm">{plan.summary ?? '—'}</p>
          {plan.appType && <p className="mt-1 text-xs text-muted-foreground">App type: {plan.appType}</p>}
          {(plan.entities ?? []).map((e) => (
            <p key={e.kind} className="mt-2 text-xs"><span className="font-medium">{e.kind}:</span> <span className="text-muted-foreground">{e.items.map((i) => i.name).join(', ')}</span></p>
          ))}
        </Panel>
        <Panel title="Conversation">
          <ul className="max-h-[420px] space-y-2 overflow-y-auto text-sm">
            {d.messages.map((m) => (
              <li key={m.id} className={`rounded-lg px-3 py-2 ${m.role === 'user' ? 'ml-8 bg-muted' : 'mr-8 border'}`}>
                <p className="text-xs text-muted-foreground">{m.role} · {m.kind} · {date(m.createdAt)}</p>
                <p className="mt-0.5 whitespace-pre-wrap">{m.text}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
