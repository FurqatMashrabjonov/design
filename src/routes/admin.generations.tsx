import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { adminGenerations } from '../server/admin-fns'
import { Badge, DataTable, date, money, PageTitle, Panel, secs } from '../admin/ui'

// ADM-06: where generation goes wrong — the model-call log, failed screens by cause, and quality
// by design system and archetype.
export const Route = createFileRoute('/admin/generations')({
  validateSearch: (s: Record<string, unknown>): { errors?: boolean; provider?: 'deepseek' | 'claude-cli' } => ({
    ...(s.errors === true ? { errors: true } : {}),
    ...(s.provider === 'deepseek' || s.provider === 'claude-cli' ? { provider: s.provider } : {}),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => adminGenerations({ data: { onlyErrors: deps.errors === true, provider: deps.provider } }),
  component: GenerationsPage,
})

function GenerationsPage() {
  const d = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const failed = d.calls.filter((c) => !c.ok).length
  return (
    <>
      <PageTitle
        title="Generations"
        sub={`${d.calls.length} latest model calls · ${failed} failed · ${money(d.calls.reduce((s, c) => s + c.costUsd, 0))}`}
        right={
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={() => navigate({ search: (s) => ({ ...s, errors: s.errors ? undefined : true }) })} className={`h-8 rounded-lg border px-3 ${search.errors ? 'bg-foreground text-background' : 'bg-background'}`}>Only errors</button>
            {(['deepseek', 'claude-cli'] as const).map((p) => (
              <button key={p} type="button" onClick={() => navigate({ search: (s) => ({ ...s, provider: s.provider === p ? undefined : p }) })} className={`h-8 rounded-lg border px-3 ${search.provider === p ? 'bg-foreground text-background' : 'bg-background'}`}>{p}</button>
            ))}
          </div>
        }
      />

      <DataTable
        rows={d.calls}
        search={(c) => `${c.email ?? ''} ${c.project ?? ''} ${c.error ?? ''}`}
        initialSort={{ key: 'when', desc: true }}
        columns={[
          { key: 'when', header: 'When', sort: (c) => c.createdAt, cell: (c) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(c.createdAt)}</span> },
          { key: 'who', header: 'User', sort: (c) => c.email ?? '', cell: (c) => (c.userId ? <Link to="/admin/users/$userId" params={{ userId: c.userId }} className="hover:underline">{c.email}</Link> : '—') },
          { key: 'project', header: 'Project', sort: (c) => c.project ?? '', cell: (c) => (c.projectId ? <Link to="/admin/projects/$projectId" params={{ projectId: c.projectId }} className="text-muted-foreground hover:underline">{c.project}</Link> : '—') },
          { key: 'provider', header: 'Provider', sort: (c) => c.provider, cell: (c) => <span className="text-xs text-muted-foreground">{c.provider}</span> },
          { key: 'result', header: 'Result', sort: (c) => c.ok, cell: (c) => (c.ok ? <Badge tone="good">ok</Badge> : <span title={c.error ?? ''}><Badge tone="bad">{(c.error ?? 'error').slice(0, 40)}</Badge></span>) },
          { key: 'tokens', header: 'Tokens in/out', sort: (c) => c.promptTokens + c.completionTokens, cell: (c) => `${c.promptTokens} / ${c.completionTokens}`, className: 'text-right tabular-nums whitespace-nowrap' },
          { key: 'ms', header: 'Time', sort: (c) => c.ms, cell: (c) => secs(c.ms), className: 'text-right tabular-nums' },
          { key: 'cost', header: 'Cost', sort: (c) => c.costUsd, cell: (c) => money(c.costUsd), className: 'text-right tabular-nums' },
        ]}
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
        <Panel title="By design system">
          <DataTable
            rows={d.bySystem}
            pageSize={12}
            initialSort={{ key: 'projects', desc: true }}
            columns={[
              { key: 'system', header: 'System', sort: (r) => r.designSystem, cell: (r) => r.designSystem },
              { key: 'projects', header: 'Projects', sort: (r) => r.projects, cell: (r) => r.projects, className: 'text-right tabular-nums' },
              { key: 'screens', header: 'Screens', sort: (r) => r.screens, cell: (r) => r.screens, className: 'text-right tabular-nums' },
              { key: 'up', header: '👍', sort: (r) => r.up, cell: (r) => r.up, className: 'text-right tabular-nums' },
              { key: 'down', header: '👎', sort: (r) => r.down, cell: (r) => r.down, className: 'text-right tabular-nums' },
              { key: 'regen', header: 'Redrawn', sort: (r) => r.regenerate, cell: (r) => r.regenerate, className: 'text-right tabular-nums' },
            ]}
          />
        </Panel>
        <Panel title="By screen archetype (feedback)">
          <DataTable
            rows={d.byArchetype}
            pageSize={12}
            columns={[
              { key: 'a', header: 'Archetype', sort: (r) => r.archetype, cell: (r) => r.archetype },
              { key: 'up', header: '👍', sort: (r) => r.up, cell: (r) => r.up, className: 'text-right tabular-nums' },
              { key: 'down', header: '👎', sort: (r) => r.down, cell: (r) => r.down, className: 'text-right tabular-nums' },
              { key: 'regen', header: 'Redrawn', sort: (r) => r.regenerate, cell: (r) => r.regenerate, className: 'text-right tabular-nums' },
            ]}
            empty="No feedback yet."
          />
        </Panel>
      </div>
    </>
  )
}
