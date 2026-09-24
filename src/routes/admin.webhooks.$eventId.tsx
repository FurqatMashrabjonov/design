import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { telescopeReplayWebhook, telescopeWebhook } from '../server/telescope-fns'
import { Badge, date, PageTitle, Panel } from '../admin/ui'
import { statusTone } from '../admin/telescope-ui'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

// OBS-12: one webhook event — what arrived, what we did, the payload; a verified one can be replayed.
export const Route = createFileRoute('/admin/webhooks/$eventId')({
  loader: ({ params }) => telescopeWebhook({ data: params.eventId }),
  component: WebhookPage,
})

function pretty(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}

function WebhookPage() {
  const w = Route.useLoaderData()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null)
  const canReplay = w.verified && w.payload !== null

  async function replay() {
    setBusy(true)
    try {
      const r = await telescopeReplayWebhook({ data: w.id })
      setOutcome({ ok: true, text: r.result })
    } catch (e) {
      setOutcome({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }

  const fields: [string, React.ReactNode][] = [
    ['Time', date(w.createdAt)],
    ['Provider', w.provider],
    ['Type', <span className="font-mono">{w.eventType ?? '—'}</span>],
    ['Event id', <span className="font-mono break-all">{w.eventId ?? '—'}</span>],
    ['Signature', w.verified ? <Badge tone="good">verified</Badge> : <Badge tone="bad">not verified</Badge>],
    ['Result', w.result],
    ['We answered', <Badge tone={statusTone(w.httpStatus)}>{w.httpStatus}</Badge>],
    ['Request', w.requestId ? <Link to="/admin/requests/$requestId" params={{ requestId: w.requestId }} className="font-mono hover:underline">{w.requestId}</Link> : '—'],
  ]
  return (
    <>
      <PageTitle
        title={w.eventType ?? 'Webhook event'}
        sub={`Event #${w.id}`}
        right={
          <div className="flex items-center gap-3">
            <Link to="/admin/webhooks" className="text-sm text-muted-foreground hover:underline">← All webhooks</Link>
            <button type="button" disabled={!canReplay || busy} onClick={() => setConfirm(true)} className="h-8 rounded-lg bg-foreground px-3 text-sm text-background disabled:opacity-40" title={canReplay ? undefined : 'Only a verified event with a stored payload can be replayed'}>
              Replay
            </button>
          </div>
        }
      />
      <div className="grid gap-4">
        {outcome && (
          <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${outcome.ok ? '' : 'border-red-500/40 text-red-600'}`}>
            {outcome.ok ? <>Replayed: <span className="font-medium">{outcome.text}</span></> : <>Replay failed: {outcome.text}</>}
          </p>
        )}
        <Panel title="Event">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            {fields.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="min-w-0">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Payload">
          {w.payload ? (
            <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-3 text-[11px]">{pretty(w.payload)}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">{w.verified ? 'Not stored (not JSON, or over 64 KB).' : 'Not stored: the signature did not verify.'}</p>
          )}
        </Panel>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replay this event?</AlertDialogTitle>
            <AlertDialogDescription>It runs through the webhook handler again. A grant that already happened is not repeated (ledger refs), so a replay is safe; it is logged in the admin log.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={replay}>{busy ? 'Replaying…' : 'Replay'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
