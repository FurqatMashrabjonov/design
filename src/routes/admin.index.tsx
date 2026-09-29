import type { ReactNode } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { adminDashboard } from '../server/overview-fns'
import { Badge, DailyChart, date, Kpi, money, PageTitle, Panel, pct, Segmented, tbl, toneText } from '../admin/ui'

// ADM-20: the dashboard — sold, LLM spend and profit first and large, then where the LLM money went (tokens in
// dollars, per model), then the few product numbers an MVP needs. Everything else lives on its own page.
export const Route = createFileRoute('/admin/')({
  validateSearch: (s: Record<string, unknown>): { days?: 1 | 7 | 30 } => (s.days === 1 || s.days === 30 ? { days: s.days } : {}),
  loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
  loader: ({ deps }) => adminDashboard({ data: { days: deps.days } }),
  component: Dashboard,
})

const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(Math.round(n)))
const usd = (n: number) => (Math.abs(n) >= 100 ? `$${Math.round(n).toLocaleString('en')}` : money(n))
const signed = (n: number) => (n < 0 ? `−${usd(-n)}` : usd(n))

/** A delta against the window before, coloured by whether that direction is good. */
function Delta({ now, before, good = 'up' }: { now: number; before: number; good?: 'up' | 'down' }) {
  if (!before) return <span className="text-muted-foreground">no earlier data</span>
  const d = (now - before) / Math.abs(before)
  if (Math.abs(d) < 0.005) return <span className="text-muted-foreground">same as before</span>
  const better = good === 'up' ? d > 0 : d < 0
  return <span className={better ? toneText.good : toneText.bad}>{d > 0 ? '▲' : '▼'} {Math.abs(Math.round(d * 100))}% vs before</span>
}

function Hero({ label, value, sub, delta, tone }: { label: string; value: string; sub: ReactNode; delta: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-4xl font-semibold tracking-tight tabular-nums ${tone ? toneText[tone] : ''}`}>{value}</p>
      <p className="mt-2 text-sm tabular-nums text-muted-foreground">{sub}</p>
      <p className="mt-1 text-xs tabular-nums">{delta}</p>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs tabular-nums text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Dashboard() {
  const d = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const c = d.current, p = d.previous
  const range = d.days === 1 ? 'Last 24 hours' : `Last ${d.days} days`
  const inUsd = d.models.reduce((a, m) => a + m.inputUsd, 0)
  const outUsd = d.models.reduce((a, m) => a + m.outputUsd, 0)
  const allIn = c.tokens.input + c.tokens.cached + c.tokens.cacheWrite
  const cacheRate = allIn ? c.tokens.cached / allIn : 0
  return (
    <>
      <PageTitle
        title="Dashboard"
        sub={`${range}, against the ${d.days === 1 ? 'day' : `${d.days} days`} before`}
        right={<Segmented label="Range" value={d.days} options={([1, 7, 30] as const).map((v) => ({ value: v, label: v === 1 ? '24h' : `${v}d` }))} onChange={(v) => navigate({ search: v === 30 ? {} : { days: v } })} />}
      />

      {d.alerts.length > 0 && (
        <ul className="mb-4 space-y-2" aria-label="Alerts">
          {d.alerts.map((a, i) => (
            <li key={i}>
              <a href={a.href} className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive outline-none transition-colors duration-(--duration-fast) hover:bg-destructive/15 focus-visible:ring-2 focus-visible:ring-ring">
                <Badge tone="bad">{a.key}</Badge>
                <span className="min-w-0 flex-1">{a.text}</span>
                <span aria-hidden>→</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Money: in, out, left. */}
      <div className="grid gap-3 md:grid-cols-3">
        <Hero label="Sold" value={usd(c.sold)} sub={<>{c.orders} {c.orders === 1 ? 'order' : 'orders'} · {c.payingUsers} paying · fees ≈ {usd(c.fees)}</>} delta={<Delta now={c.sold} before={p.sold} />} />
        <Hero label="LLM spend" value={usd(c.spend)} sub={<>{c.calls.toLocaleString('en')} calls · {compact(allIn + c.tokens.output)} tokens</>} delta={<Delta now={c.spend} before={p.spend} good="down" />} />
        <Hero
          label="Profit"
          value={signed(c.profit)}
          tone={c.profit < 0 ? 'bad' : c.profit > 0 ? 'good' : undefined}
          sub={<>sold − fees − LLM · margin {c.margin === null ? '—' : pct(c.margin)}</>}
          delta={<Delta now={c.profit} before={p.profit} />}
        />
      </div>

      {/* Where the LLM money went. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="LLM spend by token" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="Input tokens" value={compact(c.tokens.input + c.tokens.cacheWrite)} sub="full price" />
            <Stat label="Cached input" value={compact(c.tokens.cached)} sub={`${pct(cacheRate)} of input`} />
            <Stat label="Input cost" value={usd(inUsd)} sub="incl. cache" />
            <Stat label="Output" value={compact(c.tokens.output)} sub={`${usd(outUsd)} · ${pct(c.spend ? outUsd / c.spend : 0)} of spend`} />
          </div>
          <div className="mt-4 overflow-x-auto">
          <table className={tbl.table}>
            <thead className={tbl.head}>
              <tr>
                <th className={tbl.th}>Model</th>
                <th className={`${tbl.th} text-right`}>Calls</th>
                <th className={`${tbl.th} text-right`}>In / cached</th>
                <th className={`${tbl.th} text-right`}>Out</th>
                <th className={`${tbl.th} text-right`}>In $</th>
                <th className={`${tbl.th} text-right`}>Out $</th>
                <th className={`${tbl.th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className={tbl.body}>
              {d.models.length === 0 ? (
                <tr><td colSpan={7} className={`${tbl.td} text-muted-foreground`}>No model calls in this window.</td></tr>
              ) : (
                d.models.map((m) => (
                  <tr key={m.model}>
                    <td className={tbl.td}>
                      {m.model}
                      {m.failed > 0 && <span className={`ml-2 text-xs ${toneText.bad}`}>{m.failed} failed</span>}
                      {m.usd === 0 && m.calls > 0 && <span className="ml-2 text-xs text-muted-foreground">local · free</span>}
                    </td>
                    <td className={`${tbl.td} text-right tabular-nums`}>{m.calls.toLocaleString('en')}</td>
                    <td className={`${tbl.td} text-right tabular-nums`}>{compact(m.tokens.input + m.tokens.cacheWrite)} / {compact(m.tokens.cached)}</td>
                    <td className={`${tbl.td} text-right tabular-nums`}>{compact(m.tokens.output)}</td>
                    <td className={`${tbl.td} text-right tabular-nums`}>{usd(m.inputUsd)}</td>
                    <td className={`${tbl.td} text-right tabular-nums`}>{usd(m.outputUsd)}</td>
                    <td className={`${tbl.td} text-right font-medium tabular-nums`}>{usd(m.usd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </Panel>

        <Panel title="Unit costs">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Per app" value={usd(c.costPerApp)} sub={`${c.apps} apps`} />
            <Stat label="Per screen" value={usd(c.costPerScreen)} sub={`${c.screens} screens`} />
            <Stat label="Failed calls" value={pct(c.calls ? c.failed / c.calls : 0)} sub={`${c.failed} of ${c.calls}`} />
            <Stat label="Today" value={usd(d.now.spentToday)} sub={d.now.budget > 0 ? `of ${usd(d.now.budget)} budget` : 'no budget set'} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {d.now.paused ? <Badge tone="bad">Paused</Badge> : <Badge tone="good">Running</Badge>} <span className="tabular-nums">{d.now.running} generating now</span>
          </p>
        </Panel>
      </div>

      {/* WLT-01: the build-in-public funnel — shared previews opened, waitlist sign-ups, by the post they came from. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Shared previews → waitlist" right={<span className="text-xs tabular-nums text-muted-foreground">{d.waitlist.total} on the list in all</span>} className="lg:col-span-2">
          <table className={tbl.table}>
            <thead className={tbl.head}>
              <tr>
                <th className={tbl.th}>Post</th>
                <th className={`${tbl.th} text-right`}>Views</th>
                <th className={`${tbl.th} text-right`}>Joined</th>
                <th className={`${tbl.th} text-right`}>Rate</th>
              </tr>
            </thead>
            <tbody className={tbl.body}>
              {d.waitlist.byRef.length === 0 ? (
                <tr><td colSpan={4} className={`${tbl.td} text-muted-foreground`}>No shared previews opened in this window.</td></tr>
              ) : (
                d.waitlist.byRef.map((r) => (
                  <tr key={r.ref}>
                    <td className={tbl.td}>{r.ref}</td>
                    <td className={`${tbl.td} text-right tabular-nums`}>{r.views.toLocaleString('en')}</td>
                    <td className={`${tbl.td} text-right font-medium tabular-nums`}>{r.joined.toLocaleString('en')}</td>
                    <td className={`${tbl.td} text-right tabular-nums`}>{r.views ? pct(r.joined / r.views) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
        <Panel title="Latest sign-ups" className="lg:col-span-3">
          {d.waitlist.latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody yet — share a preview (Share → Public link) and post it.</p>
          ) : (
            <ul className="divide-y divide-border">
              {d.waitlist.latest.map((w) => (
                <li key={w.email} className="py-2 text-sm">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{w.email}</span>
                    <span className="text-xs text-muted-foreground">{[w.app, w.ref, date(w.at)].filter(Boolean).join(' · ')}</span>
                  </p>
                  {w.note && <p className="mt-0.5 text-muted-foreground">“{w.note}”</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Sold and LLM spend · 30 days" className="mt-4">
        <DailyChart rows={d.series} series={[{ key: 'sold', label: 'Sold' }, { key: 'spend', label: 'LLM spend' }]} format={usd} height={220} />
      </Panel>

      {/* The few product numbers an MVP watches. */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Signups" now={c.signups} before={p.signups} />
        <Kpi label="Active users (generated)" now={c.activeUsers} before={p.activeUsers} />
        <Kpi label="Apps generated" now={c.apps} before={p.apps} />
        <Kpi label="MRR (now)" now={d.subs.mrr} format={usd} value={<>{usd(d.subs.mrr)} <span className="text-xs font-normal text-muted-foreground">{d.subs.starter} Starter · {d.subs.pro} Pro</span></>} />
      </div>
    </>
  )
}
