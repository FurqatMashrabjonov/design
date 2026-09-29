import { useMemo, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Send, FlaskConical, RotateCcw, Save } from 'lucide-react'
import { adminEmail, adminSaveEmailTemplate, adminSendCampaign, adminSendTestEmail } from '../server/admin-fns'
import { Badge, Callout, date, PageTitle, Panel, Segmented, tbl } from '../admin/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { renderEmail, SYSTEM_EMAILS, type EmailContent, type SystemEmail } from '@/lib/emails'

// EML-03: everything about email in one place — is it connected and how much went out today; a message to the
// waitlist, to every user or to one person (a test to yourself first); the words of the emails the product sends by
// itself; and every mail and send, logged. The preview is the same renderer the server sends with.
export const Route = createFileRoute('/admin/email')({
  loader: () => adminEmail(),
  component: EmailPage,
})

type Tab = 'compose' | 'templates' | 'history'
type Audience = 'waitlist' | 'users' | 'one'
const EMPTY: EmailContent = { subject: '', heading: '', body: '', button: '' }
const statusTone = { sent: 'good', logged: 'neutral', failed: 'bad', skipped: 'warn' } as const

function EmailPage() {
  const d = Route.useLoaderData()
  const [tab, setTab] = useState<Tab>('compose')
  return (
    <>
      <PageTitle
        title="Email"
        sub="Sign-in links, the waitlist confirmation and your announcements — one provider, every mail logged."
        right={<Segmented label="Section" value={tab} options={[{ value: 'compose', label: 'Compose' }, { value: 'templates', label: 'Templates' }, { value: 'history', label: 'History' }]} onChange={setTab} />}
      />
      {!d.ready && (
        <Callout tone="warn" className="mb-4">
          Email is not connected, so mails are only written to the server log. Add the Resend key in Settings → API keys{d.from ? '' : ' and set EMAIL_FROM'}.
        </Callout>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Provider" value={d.ready ? 'Resend' : 'Not connected'} sub={d.from ?? 'no sender set'} tone={d.ready ? 'good' : 'warn'} />
        <Stat label="Sent · 24h" value={`${d.sentToday} / ${d.dailyLimit}`} sub={d.failedToday ? `${d.failedToday} failed` : 'free plan limit'} tone={d.failedToday ? 'bad' : undefined} />
        <Stat label="Reachable" value={`${d.waitlist} waitlist · ${d.users} users`} sub="minus unsubscribed" />
        <Stat label="Unsubscribed" value={String(d.unsubscribed)} sub="get sign-in links only" />
      </div>
      {tab === 'compose' && <Compose counts={{ waitlist: d.waitlist, users: d.users }} max={d.campaignMax} />}
      {tab === 'templates' && <Templates templates={d.templates} />}
      {tab === 'history' && <History recent={d.recent} campaigns={d.campaigns} />}
    </>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums">{tone ? <Badge tone={tone}>{value}</Badge> : value}</p>
      {sub && <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

/** Subject, heading, text and an optional button, with the email as it will arrive beside them. */
function Editor(props: { value: EmailContent; onChange: (c: EmailContent) => void; url?: string; onUrl?: (u: string) => void; urlNote?: string; children?: React.ReactNode }) {
  const c = props.value
  const set = (k: keyof EmailContent) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => props.onChange({ ...c, [k]: e.target.value })
  const preview = useMemo(() => renderEmail({ ...c, subject: c.subject || '(no subject)', heading: c.heading || ' ', body: c.body || ' ' }, { url: props.url || (props.urlNote ? '#' : undefined), unsubscribeUrl: props.onUrl ? '#' : undefined }), [c, props.url, props.urlNote, props.onUrl])
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid content-start gap-3">
        {props.children}
        <Field label="Subject">
          <Input value={c.subject} onChange={set('subject')} maxLength={200} placeholder="You're in — design your first app" />
        </Field>
        <Field label="Heading">
          <Input value={c.heading} onChange={set('heading')} maxLength={200} placeholder="Your spot is open" />
        </Field>
        <Field label="Text" hint="A blank line starts a new paragraph. {{brand}} becomes the product's name.">
          <Textarea value={c.body} onChange={set('body')} rows={9} maxLength={5000} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Button (optional)">
            <Input value={c.button ?? ''} onChange={set('button')} maxLength={60} placeholder="Start designing" />
          </Field>
          {props.onUrl ? (
            <Field label="Button link">
              <Input value={props.url ?? ''} onChange={(e) => props.onUrl!(e.target.value)} maxLength={500} placeholder="https://…" />
            </Field>
          ) : (
            props.urlNote && <p className="self-end pb-2 text-xs text-muted-foreground">{props.urlNote}</p>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className="mb-2 truncate text-sm">
          <span className="text-muted-foreground">Subject:</span> <span className="font-medium">{preview.subject}</span>
        </p>
        {/* A sandboxed page of its own: the email's html never runs in the admin. */}
        <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="h-[520px] w-full rounded-lg border border-border bg-white" />
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  )
}

function Compose({ counts, max }: { counts: { waitlist: number; users: number }; max: number }) {
  const router = useRouter()
  const [audience, setAudience] = useState<Audience>('waitlist')
  const [to, setTo] = useState('')
  const [content, setContent] = useState<EmailContent>(EMPTY)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<'test' | 'send' | null>(null)
  const [confirm, setConfirm] = useState(false)
  const count = audience === 'one' ? (to ? 1 : 0) : counts[audience]
  const draft = { content: { ...content, button: content.button || undefined }, url: url || undefined }

  async function test() {
    setBusy('test')
    try {
      const r = await adminSendTestEmail({ data: draft })
      toast.success(`Test sent to ${r.to}`)
      router.invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }
  async function send() {
    setConfirm(false)
    setBusy('send')
    try {
      const r = await adminSendCampaign({ data: { audience, to: audience === 'one' ? to : undefined, ...draft } })
      toast.success(`Sent to ${r.sent} of ${r.recipients}${r.failed ? ` — ${r.failed} failed (see History)` : ''}`)
      setContent(EMPTY)
      setUrl('')
      router.invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const ready = content.subject.trim() && content.heading.trim() && content.body.trim() && (audience !== 'one' || to.trim())
  return (
    <Panel title="New email">
      <Editor value={content} onChange={setContent} url={url} onUrl={setUrl}>
        <Field label="To">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Audience"
              value={audience}
              onChange={setAudience}
              options={[
                { value: 'waitlist', label: `Waitlist · ${counts.waitlist}` },
                { value: 'users', label: `All users · ${counts.users}` },
                { value: 'one', label: 'One person' },
              ]}
            />
            {audience === 'one' && <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" className="w-60" />}
          </div>
        </Field>
      </Editor>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <p className="mr-auto text-xs text-muted-foreground">Every email carries an unsubscribe link. At most {max} people a send.</p>
        <Button variant="outline" disabled={!ready || busy !== null} onClick={test}>
          <FlaskConical /> {busy === 'test' ? 'Sending…' : 'Send test to me'}
        </Button>
        <Button disabled={!ready || busy !== null || count === 0} onClick={() => setConfirm(true)}>
          <Send /> {busy === 'send' ? 'Sending…' : `Send to ${count} ${count === 1 ? 'person' : 'people'}`}
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send “{content.subject}” to {count} {count === 1 ? 'person' : 'people'}?
            </AlertDialogTitle>
            <AlertDialogDescription>An email cannot be unsent. Send a test to yourself first if you have not.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  )
}

function Templates({ templates }: { templates: { kind: SystemEmail; label: string; about: string; content: EmailContent; changed: boolean }[] }) {
  const router = useRouter()
  const [kind, setKind] = useState<SystemEmail>(templates[0]!.kind)
  const current = templates.find((t) => t.kind === kind)!
  const [drafts, setDrafts] = useState<Partial<Record<SystemEmail, EmailContent>>>({})
  const content = drafts[kind] ?? current.content
  const dirty = !!drafts[kind]

  async function save(reset = false) {
    try {
      await adminSaveEmailTemplate({ data: { kind, content: reset ? null : { ...content, button: content.button || undefined } } })
      setDrafts((d) => ({ ...d, [kind]: undefined }))
      toast.success(reset ? 'Back to the default words' : 'Saved — the next email uses these words')
      router.invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Panel
      title="Emails the product sends"
      right={<Segmented label="Email" value={kind} onChange={setKind} options={templates.map((t) => ({ value: t.kind, label: t.label }))} />}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {current.about} {current.changed && <Badge tone="warn">edited</Badge>}
      </p>
      <Editor value={content} onChange={(c) => setDrafts((d) => ({ ...d, [kind]: c }))} urlNote={'button' in SYSTEM_EMAILS[kind].content ? 'The button opens the sign-in link.' : undefined} />
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        {current.changed && (
          <Button variant="outline" onClick={() => save(true)}>
            <RotateCcw /> Reset to default
          </Button>
        )}
        <Button disabled={!dirty} onClick={() => save()}>
          <Save /> Save
        </Button>
      </div>
    </Panel>
  )
}

type EmailRow = { id: number; toEmail: string; subject: string; tag: string; status: string; error: string | null; createdAt: number }
type CampaignRow = { id: number; audience: string; subject: string; recipients: number; sent: number; failed: number; createdAt: number }

function History({ recent, campaigns }: { recent: EmailRow[]; campaigns: CampaignRow[] }) {
  return (
    <div className="grid gap-4">
      <Panel title="Sends">
        <table className={tbl.table}>
          <thead className={tbl.head}>
            <tr>
              <th className={tbl.th}>When</th>
              <th className={tbl.th}>To</th>
              <th className={tbl.th}>Subject</th>
              <th className={`${tbl.th} text-right`}>Sent</th>
              <th className={`${tbl.th} text-right`}>Failed</th>
            </tr>
          </thead>
          <tbody className={tbl.body}>
            {campaigns.length === 0 ? (
              <tr><td colSpan={5} className={`${tbl.td} text-muted-foreground`}>No sends yet.</td></tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id}>
                  <td className={`${tbl.td} whitespace-nowrap`}>{date(c.createdAt)}</td>
                  <td className={tbl.td}>{c.audience.replace(/^one:/, '')}</td>
                  <td className={tbl.td}>{c.subject}</td>
                  <td className={`${tbl.td} text-right tabular-nums`}>{c.sent} / {c.recipients}</td>
                  <td className={`${tbl.td} text-right tabular-nums`}>{c.failed || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
      <Panel title="Every email · latest 100">
        <table className={tbl.table}>
          <thead className={tbl.head}>
            <tr>
              <th className={tbl.th}>When</th>
              <th className={tbl.th}>To</th>
              <th className={tbl.th}>Subject</th>
              <th className={tbl.th}>Kind</th>
              <th className={tbl.th}>Status</th>
            </tr>
          </thead>
          <tbody className={tbl.body}>
            {recent.length === 0 ? (
              <tr><td colSpan={5} className={`${tbl.td} text-muted-foreground`}>No email yet.</td></tr>
            ) : (
              recent.map((e) => (
                <tr key={e.id}>
                  <td className={`${tbl.td} whitespace-nowrap`}>{date(e.createdAt)}</td>
                  <td className={tbl.td}>{e.toEmail}</td>
                  <td className={tbl.td}>{e.subject}</td>
                  <td className={tbl.td}>{e.tag}</td>
                  <td className={tbl.td} title={e.error ?? undefined}>
                    <Badge tone={statusTone[e.status as keyof typeof statusTone] ?? 'neutral'}>{e.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
