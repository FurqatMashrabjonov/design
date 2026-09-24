import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { adminControls, adminSecrets, adminSetSecret, adminSetSetting, adminTestSecret } from '../server/admin-fns'
import { Badge, date, money, PageTitle, Panel } from '../admin/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ADM-08: the switches that used to need a deploy — pause, limits, budget — and the audit trail.
// ADM-13: the provider keys, entered here instead of .env.
export const Route = createFileRoute('/admin/settings')({
  loader: async () => ({ ...(await adminControls()), keys: await adminSecrets() }),
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
      <PageTitle title="Settings" sub="Changes apply to the next request — no deploy. Every change is logged below." />
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
          <p className="text-xl font-semibold tabular-nums">{d.limits.callsPerDay}</p>
          <p className="text-xs text-muted-foreground">{saved('limits.callsPerDay') ? 'Set here' : 'Default (LIMIT_CALLS_PER_DAY or 150)'}. A 6-screen app is about 8 calls.</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); set('limits.callsPerDay', calls.trim() || null, calls.trim() ? `Limit set to ${calls.trim()}` : 'Limit back to default') }}>
            <Input inputMode="numeric" value={calls} onChange={(e) => setCalls(e.target.value)} placeholder="default" aria-label="Daily call limit" className="h-9" />
            <Button type="submit" variant="outline">Save</Button>
          </form>
        </Panel>
        <Panel title="Daily budget (all users)">
          <p className="text-xl font-semibold tabular-nums">{money(d.limits.dailyBudgetUsd)}</p>
          <p className="text-xs text-muted-foreground">{saved('limits.dailyBudgetUsd') ? 'Set here' : 'Default (LLM_DAILY_BUDGET_USD or $5)'}. Generation pauses for the day when it is reached.</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); set('limits.dailyBudgetUsd', budget.trim() || null, budget.trim() ? `Budget set to $${budget.trim()}` : 'Budget back to default') }}>
            <Input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="default" aria-label="Daily budget in dollars" className="h-9" />
            <Button type="submit" variant="outline">Save</Button>
          </form>
        </Panel>
      </div>

      <Keys keys={d.keys} onChange={() => router.invalidate()} />

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

type KeyRow = Awaited<ReturnType<typeof adminSecrets>>[number]

/** ADM-13: one row per provider key. A key is typed in, saved sealed, and never shown again — only its last four. */
function Keys({ keys, onChange }: { keys: KeyRow[]; onChange: () => void }) {
  const [editing, setEditing] = useState<KeyRow['name'] | null>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const label = (name: KeyRow['name']) => keys.find((k) => k.name === name)?.label ?? name

  async function save(name: KeyRow['name'], v: string | null) {
    setBusy(name)
    try {
      await adminSetSecret({ data: { name, value: v } })
      toast.success(v === null ? `${label(name)}: back to .env` : `${label(name)} saved`)
      setEditing(null)
      setValue('')
      onChange()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }
  async function test(name: KeyRow['name']) {
    setBusy(name)
    try {
      const r = await adminTestSecret({ data: { name } })
      if (r.ok) toast.success(`${label(name)}: ${r.detail}`)
      else toast.error(`${label(name)}: ${r.detail}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel title="API keys" className="mt-4">
      <p className="mb-3 text-xs text-muted-foreground">A key saved here wins over .env and is stored encrypted; after saving you only ever see its last four characters. Remove it to fall back to .env.</p>
      <ul className="divide-y text-sm">
        {keys.map((k) => (
          <li key={k.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
            <div className="w-48 min-w-0">
              <p className="font-medium">{k.label}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{k.name}</p>
            </div>
            <div className="w-28">{k.source === 'admin' ? <Badge tone="good">Admin</Badge> : k.source === 'env' ? <Badge>.env</Badge> : <Badge tone="bad">Missing</Badge>}</div>
            <span className="w-20 font-mono text-xs text-muted-foreground">{k.last4 ? `••••${k.last4}` : '—'}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{k.updatedAt ? `${date(k.updatedAt)}${k.updatedBy ? ` · ${k.updatedBy}` : ''}` : ''}</span>
            {editing === k.name ? (
              <form
                className="flex w-full gap-2 sm:w-auto"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (value.trim()) save(k.name, value.trim())
                }}
              >
                <Input type="password" autoComplete="off" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste the key" aria-label={`${k.label} key`} className="h-8 sm:w-64" />
                <Button type="submit" size="sm" disabled={busy === k.name || !value.trim()}>Save</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => (setEditing(null), setValue(''))}>Cancel</Button>
              </form>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => (setEditing(k.name), setValue(''))}>{k.source === 'admin' ? 'Replace' : 'Set'}</Button>
                <Button size="sm" variant="outline" disabled={k.source === 'missing' || busy === k.name} onClick={() => test(k.name)}>Test</Button>
                {k.source === 'admin' && (
                  <Button size="sm" variant="ghost" disabled={busy === k.name} onClick={() => save(k.name, null)}>Remove</Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
