import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { adminOverview } from '../server/admin-fns'
import { DailyChart, Kpi, money, PageTitle, Panel, pct, secs, date, Badge } from '../admin/ui'

// ADM-02: the state of the product at a glance.
export const Route = createFileRoute('/admin/')({
  validateSearch: (s: Record<string, unknown>): { days?: 1 | 7 | 30 } => (s.days === 1 || s.days === 30 ? { days: s.days } : {}),
  loaderDeps: ({ search }) => ({ days: search.days ?? 7 }),
  loader: ({ deps }) => adminOverview({ data: { days: deps.days } }),
  component: Overview,
})

function Overview() {
  const o = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const c = o.current, p = o.previous
  const a = o.activation
  const share = (n: number) => (a.users ? `${Math.round((n / a.users) * 100)}%` : '—')
  const budget = o.now.limits.dailyBudgetUsd
  return (
    <>
      <PageTitle
        title="Overview"
        sub={`Last ${o.days === 1 ? '24 hours' : `${o.days} days`}, against the ${o.days === 1 ? 'day' : `${o.days} days`} before`}
        right={
          <div className="flex rounded-lg border bg-background p-0.5 text-sm">
            {([1, 7, 30] as const).map((d) => (
              <button key={d} type="button" onClick={() => navigate({ search: d === 7 ? {} : { days: d } })} className={`h-7 rounded-md px-3 ${o.days === d ? 'bg-muted font-medium' : 'text-muted-foreground'}`}>
                {d === 1 ? '24h' : `${d}d`}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="New users" now={c.newUsers} before={p.newUsers} />
        <Kpi label="Active users" now={c.activeUsers} before={p.activeUsers} />
        <Kpi label="Screens generated" now={c.screens} before={p.screens} />
        <Kpi label="LLM spend" now={c.spend} before={p.spend} format={money} good="down" />
        <Kpi label="Projects" now={c.projects} before={p.projects} />
        <Kpi label="Model calls" now={c.calls} before={p.calls} />
        <Kpi label="Failed calls" now={c.failRate} before={p.failRate} format={pct} good="down" />
        <Kpi label="👍 share" now={c.upShare ?? 0} value={pct(c.upShare)} before={p.upShare ?? undefined} format={pct} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Right now" className="lg:col-span-1">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Generation</dt><dd>{o.now.limits.paused ? <Badge tone="bad">Paused</Badge> : <Badge tone="good">Running</Badge>}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Running now</dt><dd className="tabular-nums">{o.now.running.length}</dd></div>
            {o.now.running.length > 0 && <dd className="text-xs text-muted-foreground">{o.now.running.join(', ')}</dd>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Spent today</dt><dd className="tabular-nums">{money(o.now.spentToday)} / {money(budget)}</dd></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (o.now.spentToday / Math.max(budget, 0.0001)) * 100)}%` }} /></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Avg call time</dt><dd className="tabular-nums">{secs(c.avgMs)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Failed screens</dt><dd className="tabular-nums">{c.failedScreens}</dd></div>
          </dl>
          <Link to="/admin/controls" className="mt-4 inline-block text-xs text-muted-foreground underline-offset-2 hover:underline">Pause or change limits →</Link>
        </Panel>
        <Panel title="Activation (all time)" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Signed up', a.users, '100%'],
              ['Made a project', a.withProject, share(a.withProject)],
              ['Made 2+ projects', a.twoPlus, share(a.twoPlus)],
              ['Came back after a day', a.returned, share(a.returned)],
            ].map(([label, n, s]) => (
              <div key={label as string}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{n}</p>
                <p className="text-xs text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Signups and screens · 30 days">
          <DailyChart rows={o.series} series={[{ key: 'screens', label: 'Screens', color: '#2F6BFF' }, { key: 'signups', label: 'Signups', color: '#16a34a' }]} />
        </Panel>
        <Panel title="LLM spend · 30 days">
          <DailyChart rows={o.series} series={[{ key: 'spend', label: 'Spend', color: '#e2a400' }]} format={money} />
        </Panel>
        <Panel title="Model calls and failures · 30 days" className="lg:col-span-2">
          <DailyChart rows={o.series} series={[{ key: 'calls', label: 'Calls', color: '#6b7280' }, { key: 'failed', label: 'Failed', color: '#dc2626' }]} />
        </Panel>
      </div>

      <Panel title="Latest errors" className="mt-4" right={<Link to="/admin/generations" search={{ errors: true }} className="text-xs text-muted-foreground hover:underline">All errors →</Link>}>
        {o.now.errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed calls.</p>
        ) : (
          <ul className="divide-y text-sm">
            {o.now.errors.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="w-32 shrink-0 text-xs text-muted-foreground">{date(e.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{e.error ?? 'unknown error'}</span>
                <span className="text-xs text-muted-foreground">{e.email ?? '—'} · {e.project ?? '—'} · {e.provider}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
