import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { adminBan, adminGrantCredits, adminRevokeSessions, adminSetRole, adminSetUserLimit, adminUnban, adminUser } from '../server/admin-fns'
import { businessUserRevenue } from '../server/business-fns'
import { ago, Thumb } from '../Dashboard'
import { Badge, DailyChart, DataTable, date, money, PageTitle, Panel, secs } from '../admin/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

// ADM-03 + ADM-04: one user — what they made, did and cost, and what an admin can do about it.
export const Route = createFileRoute('/admin/users/$userId')({
  loader: async ({ params }) => {
    const [d, revenue] = await Promise.all([adminUser({ data: params.userId }), businessUserRevenue({ data: params.userId })])
    return { ...d, revenue }
  },
  component: UserPage,
})

function UserPage() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const u = d.user
  const [confirm, setConfirm] = useState<null | 'ban' | 'sessions' | 'role'>(null)
  const [reason, setReason] = useState('')
  const [limit, setLimit] = useState(d.limit.override ?? '')
  const [grant, setGrant] = useState('')
  const [grantNote, setGrantNote] = useState('')

  async function run(label: string, fn: () => Promise<unknown>) {
    try {
      await fn()
      toast.success(label)
      setConfirm(null)
      router.invalidate()
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
      return false
    }
  }

  return (
    <>
      <Link to="/admin/users" className="text-xs text-muted-foreground hover:underline">← Users</Link>
      <PageTitle
        title={u.name || u.email.split('@')[0]}
        sub={`${u.email} · joined ${ago(u.createdAt)} · last seen ${u.lastSeen ? ago(u.lastSeen) : '—'} · via ${u.providers ?? 'email'}`}
        right={
          <div className="flex flex-wrap gap-2">
            {u.banned ? <Badge tone="bad">Banned{u.banReason ? `: ${u.banReason}` : ''}</Badge> : null}
            {u.role === 'admin' && <Badge tone="warn">Admin</Badge>}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
        {[
          ['Projects', u.projects],
          ['Screens', u.screens],
          ['Calls (24h)', `${u.calls24h} / ${d.limit.effective}`],
          ['Credits', u.credits],
          ['Spend', money(u.spend)],
          [`Revenue · ${d.revenue.orders} orders`, money(d.revenue.revenue)],
          ['Margin', d.revenue.revenue - u.spend < 0 ? `−${money(u.spend - d.revenue.revenue)}` : money(d.revenue.revenue - u.spend)],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl border bg-background p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Actions" className="lg:col-span-1">
          <div className="space-y-3 text-sm">
            {u.banned ? (
              <Button variant="outline" className="w-full" onClick={() => run('Unbanned', () => adminUnban({ data: u.id }))}>Unban</Button>
            ) : (
              <Button variant="destructive" className="w-full" onClick={() => setConfirm('ban')}>Ban user…</Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setConfirm('sessions')}>Sign out everywhere</Button>
            <Button variant="outline" className="w-full" onClick={() => setConfirm('role')}>{u.role === 'admin' ? 'Remove admin role' : 'Make admin'}</Button>
            <form
              className="border-t pt-3"
              onSubmit={(e) => {
                e.preventDefault()
                const n = limit.trim() === '' ? null : Number(limit)
                if (n !== null && (!Number.isInteger(n) || n < 0)) return toast.error('Enter a whole number, or leave empty for the default')
                run(n === null ? 'Limit reset to default' : `Daily limit set to ${n}`, () => adminSetUserLimit({ data: { userId: u.id, limit: n } }))
              }}
            >
              <label className="text-xs text-muted-foreground" htmlFor="limit">Daily call limit (empty = default)</label>
              <div className="mt-1 flex gap-2">
                <Input id="limit" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={String(d.limit.effective)} className="h-9" />
                <Button type="submit" variant="outline">Save</Button>
              </div>
            </form>
          </div>
        </Panel>
        <Panel title={`Credits · ${u.credits}`} className="lg:col-span-2">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(grant)
              if (!Number.isInteger(n) || n === 0) return toast.error('Enter a whole number: positive to give, negative to take')
              run(`${n > 0 ? 'Gave' : 'Took'} ${Math.abs(n)} credits`, () => adminGrantCredits({ data: { userId: u.id, amount: n, note: grantNote } })).then((ok) => ok && (setGrant(''), setGrantNote('')))
            }}
          >
            <Input inputMode="numeric" value={grant} onChange={(e) => setGrant(e.target.value)} placeholder="+100 or -20" aria-label="Credits to give or take" className="h-9 w-32" />
            <Input value={grantNote} onChange={(e) => setGrantNote(e.target.value)} maxLength={200} placeholder="Why (kept in the log)" aria-label="Reason" className="h-9 min-w-0 flex-1" />
            <Button type="submit" variant="outline">Apply</Button>
          </form>
          <ul className="mt-3 max-h-64 divide-y overflow-y-auto text-sm">
            {d.credits.map((c) => (
              <li key={c.id} className="flex items-baseline gap-3 py-1.5">
                <span className="w-32 shrink-0 text-xs text-muted-foreground">{date(c.createdAt)}</span>
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{c.kind}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{c.note ?? ''}</span>
                <span className={`tabular-nums ${c.delta > 0 ? 'text-emerald-700' : ''}`}>{c.delta > 0 ? `+${c.delta}` : c.delta}</span>
              </li>
            ))}
            {d.credits.length === 0 && <li className="py-4 text-center text-muted-foreground">No credit movements yet.</li>}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4">
        <Panel title="Spend and calls · 30 days">
          {d.spendByDay.length ? <DailyChart rows={d.spendByDay} series={[{ key: 'calls', label: 'Calls', color: '#2F6BFF' }]} /> : <p className="text-sm text-muted-foreground">No calls in the last 30 days.</p>}
        </Panel>
      </div>

      <Panel title={`Projects (${d.projects.length})`} className="mt-4">
        {d.projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {d.projects.map((p) => (
              <Link key={p.id} to="/admin/projects/$projectId" params={{ projectId: p.id }} className="group overflow-hidden rounded-xl border hover:shadow-md">
                <div className="relative h-32 overflow-hidden bg-muted">
                  {p.covers[0] && (p.device === 'mobile' ? (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 overflow-hidden rounded-xl border-2 border-foreground/80" style={{ width: 84, height: 182 }}><Thumb screenId={p.covers[0]} device="mobile" width={80} /></div>
                  ) : (
                    <div className="absolute inset-2 overflow-hidden rounded-md border"><Thumb screenId={p.covers[0]} device="desktop" width={180} /></div>
                  ))}
                </div>
                <div className="p-2 text-xs">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-muted-foreground">{p.screenCount} screens · {ago(p.updatedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent activity">
          <ul className="max-h-[420px] divide-y overflow-y-auto text-sm">
            {d.actions.map((m) => (
              <li key={m.id} className="py-2">
                <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                  <span>{m.role === 'user' ? 'Asked' : 'Agent'} · {m.kind} · <Link to="/admin/projects/$projectId" params={{ projectId: m.projectId }} className="hover:underline">{m.project}</Link></span>
                  <span className="shrink-0">{date(m.createdAt)}</span>
                </p>
                <p className="mt-0.5 line-clamp-2">{m.text}</p>
              </li>
            ))}
            {d.actions.length === 0 && <li className="py-6 text-center text-muted-foreground">Nothing yet.</li>}
          </ul>
        </Panel>
        <Panel title="Model calls">
          <DataTable
            rows={d.calls}
            pageSize={10}
            columns={[
              { key: 'when', header: 'When', sort: (c) => c.createdAt, cell: (c) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(c.createdAt)}</span> },
              { key: 'ok', header: 'Result', cell: (c) => (c.ok ? <Badge tone="good">ok</Badge> : <Badge tone="bad" >{(c.error ?? 'error').slice(0, 24)}</Badge>) },
              { key: 'ms', header: 'Time', sort: (c) => c.ms, cell: (c) => secs(c.ms), className: 'text-right tabular-nums' },
              { key: 'cost', header: 'Cost', sort: (c) => c.costUsd, cell: (c) => money(c.costUsd), className: 'text-right tabular-nums' },
            ]}
            empty="No calls."
          />
        </Panel>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'ban' ? `Ban ${u.email}?` : confirm === 'sessions' ? `Sign ${u.email} out everywhere?` : u.role === 'admin' ? `Remove admin from ${u.email}?` : `Make ${u.email} an admin?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'ban'
                ? 'They are signed out now and cannot sign in or generate until you unban them. Their projects stay.'
                : confirm === 'sessions'
                  ? 'Every session of this account ends; they can sign in again.'
                  : u.role === 'admin'
                    ? 'They lose access to this panel (unless their email is in ADMIN_EMAILS).'
                    : 'They will see every user, project and cost, and can ban people.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm === 'ban' && <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Reason (kept in the log)" aria-label="Reason" />}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm === 'ban' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
              onClick={(e) => {
                e.preventDefault()
                if (confirm === 'ban') run('Banned', () => adminBan({ data: { userId: u.id, reason } }))
                else if (confirm === 'sessions') run('Signed out everywhere', () => adminRevokeSessions({ data: u.id }))
                else run('Role changed', () => adminSetRole({ data: { userId: u.id, role: u.role === 'admin' ? 'user' : 'admin' } }))
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
