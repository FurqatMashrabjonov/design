import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { providerOverview } from '../server/provider-fns'
import { adminSetSetting } from '../server/admin-fns'
import { Badge, date, money, PageTitle, Panel, pct, secs } from '../admin/ui'

// ADM-14: which model each call site runs on (switched here, saved as the llm.* settings), how each
// model is doing over the last hour and day, and any circuit the breaker has opened.
export const Route = createFileRoute('/admin/providers')({
  loader: () => providerOverview(),
  component: ProvidersPage,
})

type Data = Awaited<ReturnType<typeof providerOverview>>
type Model = Data['models'][number]
type Stats = Data['health'][number]
type Site = 'plan' | 'screen' | 'edit'

const SITE_LABEL: Record<Site, string> = { plan: 'Plan', screen: 'Screen', edit: 'Edit' }
// What a user pays at each site, from the model's credit row (see CreditService.priceOf).
const creditsFor = (site: Site, c: NonNullable<Model['credits']>) =>
  site === 'plan' ? `${c.plan} cr / plan` : site === 'screen' ? `${c.draw} cr / app drawn · ${c.screen} cr / screen` : `${c.element} cr / element · ${c.screen} cr / edit`
const STATUS = {
  down: { label: 'Down', tone: 'bad' },
  degraded: { label: 'Degraded', tone: 'warn' },
  healthy: { label: 'Healthy', tone: 'good' },
  idle: { label: 'Idle', tone: 'neutral' },
} as const
const field = 'h-9 w-full rounded-lg border bg-background px-2 text-sm'
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })

function ProvidersPage() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const usable = d.models.filter((m) => m.prices && m.credits)
  const label = (id: string) => d.models.find((m) => m.id === id)?.label ?? id

  async function save(key: `llm.model.${Site}` | 'llm.fallback', value: string, what: string) {
    const m = d.models.find((x) => x.id === value)
    if (m && !m.keySet) {
      toast.error(`No ${m.provider} API key — add it in Settings → API keys first`)
      return
    }
    try {
      await adminSetSetting({ data: { key, value } })
      toast.success(`${what}: ${value ? label(value) : 'none'}`)
      router.invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const option = (m: Model) => (
    <option key={m.id} value={m.id}>
      {m.label}{m.keySet ? '' : ' — no API key'}
    </option>
  )

  return (
    <>
      <PageTitle title="Providers" sub="Which model each step runs on, and how each model is doing. Changes apply to the next call." />
      {d.circuits.map((c) => (
        <p key={c.model} className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm">
          Circuit open → {label(c.model)} is down, using {label(c.fallback)} until {hhmm(c.until)}
        </p>
      ))}
      <Panel title="Models in use">
        <div className="grid gap-4 md:grid-cols-4">
          {d.sites.map(({ site, model }) => {
            const s = site as Site
            const cur = d.models.find((m) => m.id === model)
            return (
              <label key={s} className="block text-sm">
                <span className="mb-1 block font-medium">{SITE_LABEL[s]}</span>
                <select className={field} value={model} onChange={(e) => save(`llm.model.${s}`, e.target.value, SITE_LABEL[s])}>
                  {usable.map(option)}
                </select>
                <span className="mt-1 block text-xs text-muted-foreground">{cur?.credits ? creditsFor(s, cur.credits) : '—'}</span>
                {cur && !cur.keySet && <KeyMissing provider={cur.provider} />}
              </label>
            )
          })}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Fallback</span>
            <select className={field} value={d.fallback ?? ''} onChange={(e) => save('llm.fallback', e.target.value, 'Fallback')}>
              <option value="">None</option>
              {usable.map(option)}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">Tried when a call fails before any output, and used while a model is down.</span>
          </label>
        </div>
        {usable.some((m) => !m.keySet) && (
          <p className="mt-4 text-xs text-muted-foreground">
            Models marked “no API key” cannot be selected until their provider key is added in{' '}
            <Link to="/admin/settings" className="underline underline-offset-2">Settings → API keys</Link>.
          </p>
        )}
      </Panel>

      <h2 className="mt-8 mb-3 text-sm font-semibold">Health</h2>
      <div className="grid gap-4">
        {usable.map((m) => (
          <Health key={m.id} model={m} stats={d.health.find((h) => h.model === m.id)} inUse={d.sites.filter((s) => s.model === m.id).map((s) => SITE_LABEL[s.site as Site])} fallback={d.fallback === m.id} />
        ))}
      </div>
    </>
  )
}

function KeyMissing({ provider }: { provider: string }) {
  return (
    <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
      No {provider} API key — calls fail. <Link to="/admin/settings" className="underline underline-offset-2">Add it</Link>
    </span>
  )
}

function Health({ model, stats, inUse, fallback }: { model: Model; stats?: Stats; inUse: string[]; fallback: boolean }) {
  const st = STATUS[stats?.status ?? 'idle']
  const rows: [string, (w: Stats['hour']) => string][] = [
    ['Calls', (w) => String(w.calls)],
    ['Error rate', (w) => pct(w.errorRate)],
    ['p50 latency', (w) => (w.p50 === null ? '—' : secs(w.p50))],
    ['p95 latency', (w) => (w.p95 === null ? '—' : secs(w.p95))],
    ['Cache hits', (w) => pct(w.cacheHit)],
    ['Spent', (w) => money(w.spend)],
  ]
  return (
    <Panel
      title={model.label}
      right={
        <span className="flex items-center gap-2">
          {inUse.map((s) => <Badge key={s}>{s}</Badge>)}
          {fallback && <Badge>Fallback</Badge>}
          <Badge tone={st.tone}>{st.label}</Badge>
        </span>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-1 font-normal" />
              <th className="pb-1 text-right font-normal">60 min</th>
              <th className="pb-1 text-right font-normal">24 h</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map(([name, f]) => (
              <tr key={name} className="border-t">
                <td className="py-1 text-muted-foreground">{name}</td>
                <td className="py-1 text-right">{stats ? f(stats.hour) : '—'}</td>
                <td className="py-1 text-right">{stats ? f(stats.day) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="min-w-0">
          <p className="mb-1 text-xs text-muted-foreground">Calls per hour, last 24 h (errors in red)</p>
          <HourBars hours={stats?.hourly ?? []} />
          <p className="mt-3 text-xs text-muted-foreground">Last error</p>
          {stats?.lastError ? (
            <p className="text-sm">
              <span className="break-words">{stats.lastError.message}</span>{' '}
              <span className="text-xs text-muted-foreground">
                {date(stats.lastError.at)}
                {stats.lastError.requestId && (
                  <>
                    {' · '}
                    <Link to="/admin/requests/$requestId" params={{ requestId: stats.lastError.requestId }} className="underline underline-offset-2">request</Link>
                  </>
                )}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">None in 24 h</p>
          )}
          {!model.keySet && <KeyMissing provider={model.provider} />}
        </div>
      </div>
    </Panel>
  )
}

/** 24 hourly bars, oldest first: the whole bar is calls, the red part errors. */
function HourBars({ hours }: { hours: { calls: number; errors: number }[] }) {
  const max = Math.max(1, ...hours.map((h) => h.calls))
  if (!hours.length) return <div className="h-12 rounded-md bg-muted/50" />
  return (
    <div className="flex h-12 items-end gap-0.5">
      {hours.map((h, i) => (
        <div key={i} title={`${23 - i}h ago: ${h.calls} calls, ${h.errors} errors`} className="flex flex-1 flex-col justify-end rounded-sm bg-muted/50" style={{ height: '100%' }}>
          <div className="w-full rounded-sm bg-foreground/30" style={{ height: `${((h.calls - h.errors) / max) * 100}%` }} />
          <div className="w-full rounded-sm bg-red-500" style={{ height: `${(h.errors / max) * 100}%` }} />
        </div>
      ))}
    </div>
  )
}
