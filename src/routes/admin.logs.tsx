import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { telescopeLogs } from '../server/telescope-fns'
import { Badge, date, PageTitle } from '../admin/ui'
import { levelTone, Pager } from '../admin/telescope-ui'

// OBS-11: what the server printed, newest first; "Live" polls every 3s for newer lines.
const LEVELS = ['info', 'warn', 'error'] as const
type Search = { level?: (typeof LEVELS)[number]; q?: string; page?: number }

export const Route = createFileRoute('/admin/logs')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    level: LEVELS.find((l) => l === s.level),
    q: typeof s.q === 'string' && s.q.trim() ? s.q.trim().slice(0, 200) : undefined,
    page: Number.isInteger(Number(s.page)) && Number(s.page) > 1 ? Number(s.page) : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps: s }) => telescopeLogs({ data: { level: s.level, q: s.q, page: s.page ? s.page - 1 : 0 } }),
  component: LogsPage,
})

type Row = Awaited<ReturnType<typeof telescopeLogs>>['rows'][number]

function LogsPage() {
  const d = Route.useLoaderData()
  const s = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [fresh, setFresh] = useState<Row[]>([])
  const [live, setLive] = useState(false)
  useEffect(() => setFresh([]), [d])
  const rows = [...fresh, ...d.rows]

  // Live: only on the first page, only while the tab is visible.
  const newest = rows[0]?.id ?? 0
  useEffect(() => {
    if (!live || s.page) return
    const t = setInterval(async () => {
      if (document.hidden) return
      const r = await telescopeLogs({ data: { level: s.level, q: s.q, afterId: newest } }).catch(() => null)
      if (r?.rows.length) setFresh((f) => [...r.rows, ...f].slice(0, 500))
    }, 3000)
    return () => clearInterval(t)
  }, [live, newest, s.level, s.q, s.page])

  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    navigate({ search: (old) => ({ ...old, q: q || undefined, page: undefined }) })
  }
  return (
    <>
      <PageTitle
        title="Logs"
        sub={`${d.total + fresh.length} lines · kept 7 days`}
        right={
          <button type="button" onClick={() => setLive((v) => !v)} disabled={!!s.page} className={`h-8 rounded-lg border px-3 text-sm disabled:opacity-40 ${live ? 'bg-foreground text-background' : 'bg-background'}`} aria-pressed={live}>
            {live ? '● Live' : 'Live'}
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 text-sm" role="group" aria-label="Level">
          {([undefined, ...LEVELS] as const).map((l) => (
            <button key={l ?? 'all'} type="button" onClick={() => navigate({ search: (old) => ({ ...old, level: l, page: undefined }) })} className={`h-8 rounded-lg border px-3 ${s.level === l ? 'bg-foreground text-background' : 'bg-background'}`}>
              {l ?? 'all'}
            </button>
          ))}
        </div>
        <form onSubmit={search} key={s.q ?? ''} className="flex gap-2">
          <input name="q" defaultValue={s.q} placeholder="Search messages" aria-label="Search messages" className="h-8 w-56 rounded-lg border bg-background px-2 text-sm" />
          <button type="submit" className="h-8 rounded-lg border bg-background px-3 text-sm">Search</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>{['Time', 'Level', 'Message', 'Request'].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{date(l.createdAt)}</td>
                <td className="px-3 py-2"><Badge tone={levelTone(l.level)}>{l.level}</Badge></td>
                <td className="px-3 py-2">
                  <p className="font-mono text-xs break-all whitespace-pre-wrap">{l.message}</p>
                  {l.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted-foreground">Stack</summary>
                      <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-muted p-2 text-[11px]">{l.stack}</pre>
                    </details>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {l.requestId ? <Link to="/admin/requests/$requestId" params={{ requestId: l.requestId }} className="font-mono text-muted-foreground hover:underline">{l.requestId.slice(0, 8)}</Link> : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">No log lines match.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={d.page} pages={Math.max(1, Math.ceil(d.total / d.pageSize))} total={d.total} size={d.pageSize} go={(p) => navigate({ search: (old) => ({ ...old, page: p > 0 ? p + 1 : undefined }) })} />
    </>
  )
}
