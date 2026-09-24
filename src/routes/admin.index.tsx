import type { ReactNode } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { adminOverviewV2 } from '../server/overview-fns'
import { Badge, DailyChart, date, Kpi, money, PageTitle, Panel, pct, secs } from '../admin/ui'

// ADM-02 / ADM-12: business, product and system at a glance, with alerts for what is wrong now.
export const Route = createFileRoute('/admin/')({
  validateSearch: (s: Record<string, unknown>): { days?: 1 | 7 | 30 } => (s.days === 1 || s.days === 30 ? { days: s.days } : {}),
  loaderDeps: ({ search }) => ({ days: search.days ?? 7 }),
  loader: ({ deps }) => adminOverviewV2({ data: { days: deps.days } }),
  component: Overview,
})

const credits = (n: number) => n.toLocaleString('en')
const ms = (n: number) => (n ? `${Math.round(n)}ms` : '—')

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{children}</div>
    </section>
  )
}

function Overview() {
  const o = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const c = o.current, p = o.previous
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

      {o.alerts.length > 0 && (
        <ul className="space-y-2" aria-label="Alerts">
          {o.alerts.map((a, i) => (
            <li key={i}>
              <a href={a.href} className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 hover:bg-red-500/15 dark:text-red-400">
                <Badge tone="bad">{a.key}</Badge>
                <span className="min-w-0 flex-1">{a.text}</span>
                <span aria-hidden>→</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <Row title="Business">
        <Kpi label="MRR (now)" now={o.subs.mrr} format={money} />
        <Kpi label="Active plans (now)" now={o.subs.starter + o.subs.pro} value={<>{o.subs.starter + o.subs.pro} <span className="text-xs font-normal text-muted-foreground">{o.subs.starter} Starter · {o.subs.pro} Pro</span></>} />
        <Kpi label="New paying users" now={c.newPaying} before={p.newPaying} />
        <Kpi label="Churned plans" now={c.churned} before={p.churned} good="down" />
        <Kpi label="Credits sold / spent" now={c.creditsSold} before={p.creditsSold} value={<>{credits(c.creditsSold)} <span className="text-xs font-normal text-muted-foreground">/ {credits(c.creditsSpent)}</span></>} />
        <Kpi label="Gross margin (estimate)" now={c.margin} before={p.margin} format={money} value={<span title={`Revenue est. ${money(c.revenue)} − LLM ${money(c.spend)} − fees ${money(c.fees)} (4% + $0.40 per payment)`}>{c.margin < 0 ? '−' : ''}{money(Math.abs(c.margin))}</span>} />
      </Row>

      <Row title="Product">
        <Kpi label="Signups" now={c.signups} before={p.signups} />
        <Kpi label="Activation (made a project)" now={c.signups ? c.activated / c.signups : 0} before={p.signups ? p.activated / p.signups : undefined} format={pct} />
        <Kpi label="Apps generated" now={c.apps} before={p.apps} />
        <Kpi label="Screens drawn" now={c.screens} before={p.screens} value={<>{c.screens} <span className="text-xs font-normal text-muted-foreground">{pct(c.failedRate)} failed</span></>} />
        <Kpi label="Cost per app" now={c.costPerApp} before={p.costPerApp} format={money} good="down" />
        <Kpi label="p95 generation" now={c.p95GenMs} before={p.p95GenMs} format={secs} good="down" />
        <Kpi label="Active users" now={c.activeUsers} before={p.activeUsers} />
        <Kpi label="LLM spend" now={c.spend} before={p.spend} format={money} good="down" />
      </Row>

      <Row title="System">
        <Kpi label="Requests" now={c.requests} before={p.requests} good="none" />
        <Kpi label="5xx rate" now={c.rate5xx} before={p.rate5xx} format={pct} good="down" />
        <Kpi label="p95 latency (no API streams)" now={c.p95ReqMs} before={p.p95ReqMs} format={ms} good="down" />
        <Kpi label="Server errors" now={c.errors} before={p.errors} good="down" value={<>{c.errors} <span className="text-xs font-normal text-muted-foreground">{c.errorKinds} distinct</span></>} />
        <Kpi label="LLM error rate" now={c.llmFailRate} before={p.llmFailRate} format={pct} good="down" />
        <div className="rounded-2xl border bg-background p-4 text-sm">
          <p className="text-xs text-muted-foreground">Right now</p>
          <p className="mt-1.5">{o.now.paused ? <Badge tone="bad">Paused</Badge> : <Badge tone="good">Running</Badge>} <span className="tabular-nums">{o.now.running} busy</span></p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">{money(o.now.spentToday)} of {money(o.now.budget)} today</p>
        </div>
      </Row>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Signups and screens · 30 days">
          <DailyChart rows={o.series} series={[{ key: 'screens', label: 'Screens', color: '#2F6BFF' }, { key: 'signups', label: 'Signups', color: '#16a34a' }]} />
        </Panel>
        <Panel title="Revenue (estimate) and LLM spend · 30 days">
          <DailyChart rows={o.series} series={[{ key: 'revenue', label: 'Revenue (est.)', color: '#16a34a' }, { key: 'spend', label: 'LLM spend', color: '#e2a400' }]} format={money} />
        </Panel>
      </div>

      <Panel title="Latest errors" className="mt-4" right={<Link to="/admin/errors" className="text-xs text-muted-foreground hover:underline">All errors →</Link>}>
        {o.errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors.</p>
        ) : (
          <ul className="divide-y text-sm">
            {o.errors.map((e) => (
              <li key={`${e.source}-${e.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{date(Number(e.createdAt))}</span>
                <Badge tone={e.source === 'server' ? 'bad' : 'warn'}>{e.source === 'server' ? 'server' : 'LLM'}</Badge>
                <span className="min-w-0 flex-1 truncate font-mono text-xs" title={e.message}>{e.message}</span>
                {e.detail && <span className="text-xs text-muted-foreground">{e.detail}</span>}
                {e.requestId && <Link to="/admin/requests/$requestId" params={{ requestId: e.requestId }} className="text-xs text-muted-foreground hover:underline">request →</Link>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
