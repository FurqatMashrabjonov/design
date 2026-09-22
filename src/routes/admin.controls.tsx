import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { adminControls, adminSetSetting } from '../server/admin-fns'
import { Badge, date, money, PageTitle, Panel } from '../admin/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ADM-08: the switches that used to need a deploy — pause, limits, budget — and the audit trail.
export const Route = createFileRoute('/admin/controls')({
  loader: () => adminControls(),
  component: ControlsPage,
})

type Key = 'generation.paused' | 'limits.callsPerDay' | 'limits.dailyBudgetUsd'

function ControlsPage() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const saved = (k: Key) => d.settings.find((s) => s.key === k)?.value ?? null
  const [calls, setCalls] = useState(saved('limits.callsPerDay') ?? '')
  const [budget, setBudget] = useState(saved('limits.dailyBudgetUsd') ?? '')

  async function set(key: Key, value: string | null, label: string) {
    try {
      await adminSetSetting({ data: { key, value } })
      toast.success(label)
      router.invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const paused = d.limits.paused
  return (
    <>
      <PageTitle title="Controls" sub="Changes apply to the next request — no deploy. Every change is logged below." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Generation">
          <p className="text-sm">{paused ? <Badge tone="bad">Paused</Badge> : <Badge tone="good">Running</Badge>}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {d.envPaused ? 'Paused by GENERATION_PAUSED=1 in the server environment — remove it there to resume.' : 'Paused, nobody can start a generation; editing text and moving screens still work.'}
          </p>
          {!d.envPaused && (
            <Button className="mt-3 w-full" variant={paused ? 'default' : 'destructive'} onClick={() => set('generation.paused', paused ? null : '1', paused ? 'Generation resumed' : 'Generation paused')}>
              {paused ? 'Resume generation' : 'Pause generation'}
            </Button>
          )}
        </Panel>
        <Panel title="Daily call limit per user">
          <p className="text-2xl font-semibold tabular-nums">{d.limits.callsPerDay}</p>
          <p className="text-xs text-muted-foreground">{saved('limits.callsPerDay') ? 'Set here' : 'Default (LIMIT_CALLS_PER_DAY or 150)'}. A 6-screen app is about 8 calls.</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); set('limits.callsPerDay', calls.trim() || null, calls.trim() ? `Limit set to ${calls.trim()}` : 'Limit back to default') }}>
            <Input inputMode="numeric" value={calls} onChange={(e) => setCalls(e.target.value)} placeholder="default" aria-label="Daily call limit" className="h-9" />
            <Button type="submit" variant="outline">Save</Button>
          </form>
        </Panel>
        <Panel title="Daily budget (all users)">
          <p className="text-2xl font-semibold tabular-nums">{money(d.limits.dailyBudgetUsd)}</p>
          <p className="text-xs text-muted-foreground">{saved('limits.dailyBudgetUsd') ? 'Set here' : 'Default (LLM_DAILY_BUDGET_USD or $5)'}. Generation pauses for the day when it is reached.</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); set('limits.dailyBudgetUsd', budget.trim() || null, budget.trim() ? `Budget set to $${budget.trim()}` : 'Budget back to default') }}>
            <Input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="default" aria-label="Daily budget in dollars" className="h-9" />
            <Button type="submit" variant="outline">Save</Button>
          </form>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="System">
          <dl className="space-y-2 text-sm">
            {[
              ['Environment', d.system.env],
              ['LLM provider', d.system.provider],
              ['Node', d.system.node],
              ['Database size', `${(d.system.dbBytes / 1024 / 1024).toFixed(1)} MB`],
              ['Users / projects', `${d.system.users} / ${d.system.projects}`],
              ['Screens', d.system.screens],
              ['Model calls logged', d.system.calls],
              ['Cached photos', d.system.images],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="tabular-nums">{v}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel title="Admin log" className="lg:col-span-2">
          <ul className="max-h-96 divide-y overflow-y-auto text-sm">
            {d.actions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
                <span className="w-32 shrink-0 text-xs text-muted-foreground">{date(a.createdAt)}</span>
                <span className="font-medium">{a.action}</span>
                <span className="text-muted-foreground">{a.target ?? ''}{a.detail ? ` → ${a.detail}` : ''}</span>
                <span className="ml-auto text-xs text-muted-foreground">{a.admin ?? '—'}</span>
              </li>
            ))}
            {d.actions.length === 0 && <li className="py-6 text-center text-muted-foreground">No admin actions yet.</li>}
          </ul>
        </Panel>
      </div>
    </>
  )
}
