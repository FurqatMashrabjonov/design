import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { adminExportPairs, adminFeedback } from '../server/admin-fns'
import { ago, Thumb } from '../Dashboard'
import { Badge, PageTitle } from '../admin/ui'
import { Button } from '@/components/ui/button'

// ADM-07: the screens people disliked or redrew — the raw material for the next eval cases.
export const Route = createFileRoute('/admin/feedback')({
  loader: () => adminFeedback(),
  component: FeedbackPage,
})

function FeedbackPage() {
  const rows = Route.useLoaderData()
  const [busy, setBusy] = useState(false)
  async function exportPairs() {
    setBusy(true)
    try {
      const jsonl = await adminExportPairs()
      const url = URL.createObjectURL(new Blob([jsonl], { type: 'application/x-ndjson' }))
      const a = Object.assign(document.createElement('a'), { href: url, download: `edit-pairs-${new Date().toISOString().slice(0, 10)}.jsonl` })
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${jsonl ? jsonl.split('\n').length : 0} pairs exported`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageTitle
        title="Feedback"
        sub={`${rows.filter((r) => r.value === 'down').length} 👎 · ${rows.filter((r) => r.value === 'regenerate').length} redrawn (latest 120)`}
        right={<Button variant="outline" onClick={exportPairs} disabled={busy}><Download /> Export edit pairs</Button>}
      />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-background py-16 text-center text-sm text-muted-foreground">No 👎 or redraws yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((f) => (
            <div key={f.id} className="overflow-hidden rounded-2xl border bg-background">
              <div className="relative h-56 overflow-hidden bg-muted">
                {f.alive ? (
                  f.device === 'mobile' ? (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 overflow-hidden rounded-xl border-2 border-foreground/80" style={{ width: 124, height: 268 }}><Thumb screenId={f.screenId} device="mobile" width={120} /></div>
                  ) : (
                    <div className="absolute inset-2 overflow-hidden rounded-md border"><Thumb screenId={f.screenId} device="desktop" width={200} /></div>
                  )
                ) : (
                  <div className="grid h-full place-items-center text-xs text-muted-foreground">Screen since changed or deleted</div>
                )}
                <span className="absolute top-2 left-2">{f.value === 'down' ? <Badge tone="bad">👎</Badge> : <Badge tone="warn">Redrawn</Badge>}</span>
              </div>
              <div className="space-y-0.5 p-3 text-xs">
                <Link to="/admin/projects/$projectId" params={{ projectId: f.projectId }} className="block truncate font-medium hover:underline">{f.project} · {f.screen ?? '—'}</Link>
                <p className="text-muted-foreground">{f.designSystem} · {f.archetype ?? '—'}{f.variant ? ` · ${f.variant}` : ''}</p>
                <p className="text-muted-foreground">{f.owner ?? '—'} · {ago(f.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
