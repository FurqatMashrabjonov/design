import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { adminAnswerCreditRequest, adminBeta } from '../server/admin-fns'
import { Badge, DataTable, date, PageTitle, Panel, type Column } from '../admin/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// PAY-03 / FDB-10: the beta's two inboxes. People out of free credits ask for more — grant (a ledger row, once) or
// dismiss; and what people said about the product, after their first app or from the Feedback button.
export const Route = createFileRoute('/admin/beta')({
  loader: () => adminBeta(),
  component: BetaPage,
})

type Data = Awaited<ReturnType<typeof adminBeta>>
type Req = Data['requests'][number]
type Fb = Data['feedback'][number]

const who = (r: { userId: string; email: string | null }) => (
  <Link to="/admin/users/$userId" params={{ userId: r.userId }} className="hover:underline">{r.email ?? r.userId}</Link>
)

function Request({ r, defaultAmount, onDone }: { r: Req; defaultAmount: number; onDone: () => void }) {
  const [amount, setAmount] = useState(String(defaultAmount))
  const [busy, setBusy] = useState(false)
  async function answer(n: number | null) {
    if (n !== null && (!Number.isInteger(n) || n <= 0)) return toast.error('Enter a whole number of credits')
    setBusy(true)
    try {
      await adminAnswerCreditRequest({ data: { id: r.id, amount: n } })
      toast.success(n ? `+${n} credits to ${r.email ?? 'the user'}` : 'Dismissed')
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-medium">{who(r)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{date(r.createdAt)} · balance {r.balance} · {r.apps} app{r.apps === 1 ? '' : 's'}</p>
        {r.note && <p className="mt-1.5 whitespace-pre-wrap text-sm">{r.note}</p>}
      </div>
      {r.status === 'open' ? (
        <div className="flex shrink-0 items-center gap-2">
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Credits to grant" className="h-9 w-20 tabular-nums" />
          <Button size="sm" disabled={busy} onClick={() => answer(Number(amount))}>Grant</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => answer(null)}>Dismiss</Button>
        </div>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">{r.status === 'granted' ? <Badge tone="good">+{r.granted}</Badge> : <Badge>dismissed</Badge>} {date(r.handledAt)}</span>
      )}
    </li>
  )
}

const feedbackColumns: Column<Fb>[] = [
  { key: 'when', header: 'When', sort: (r) => r.createdAt, cell: (r) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(r.createdAt)}</span> },
  { key: 'user', header: 'User', cell: who },
  { key: 'rating', header: 'Rating', sort: (r) => r.rating ?? 0, cell: (r) => (r.rating ? <Badge tone={r.rating >= 4 ? 'good' : r.rating <= 2 ? 'bad' : 'warn'}>{r.rating} / 5</Badge> : '—'), className: 'tabular-nums' },
  { key: 'text', header: 'What they said', cell: (r) => <span className="whitespace-pre-wrap">{r.text ?? ''}</span> },
  { key: 'app', header: 'App', cell: (r) => (r.projectId ? <Link to="/admin/projects/$projectId" params={{ projectId: r.projectId }} className="hover:underline">{r.app ?? 'Untitled'}</Link> : '—') },
  { key: 'source', header: 'From', cell: (r) => <span className="text-xs text-muted-foreground">{r.source === 'first-app' ? 'first app' : 'button'}</span> },
]

function BetaPage() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const open = d.requests.filter((r) => r.status === 'open')
  const answered = d.requests.filter((r) => r.status !== 'open')
  return (
    <>
      <PageTitle title="Beta" sub="Requests for more credits, and what people say about the product." />
      <Panel title={`Credit requests${open.length ? ` · ${open.length} open` : ''}`}>
        {d.requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has asked for more credits yet.</p>
        ) : (
          <ul className="divide-y">
            {open.map((r) => <Request key={r.id} r={r} defaultAmount={d.signupCredits} onDone={() => router.invalidate()} />)}
            {answered.map((r) => <Request key={r.id} r={r} defaultAmount={d.signupCredits} onDone={() => router.invalidate()} />)}
          </ul>
        )}
      </Panel>
      <Panel className="mt-4" title="Feedback" right={d.summary.n ? <span className="text-sm text-muted-foreground tabular-nums">{d.summary.avg} / 5 average · {d.summary.n} rating{d.summary.n === 1 ? '' : 's'}</span> : undefined}>
        <DataTable rows={d.feedback} columns={feedbackColumns} search={(r) => `${r.email ?? ''} ${r.text ?? ''} ${r.app ?? ''}`} empty="No feedback yet." initialSort={{ key: 'when', desc: true }} />
      </Panel>
    </>
  )
}
