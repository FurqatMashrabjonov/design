import { createFileRoute, Link } from '@tanstack/react-router'
import { telescopeErrors } from '../server/telescope-fns'
import { date, PageTitle, tbl } from '../admin/ui'

// OBS-11: server errors grouped by fingerprint (name + message without ids + where it was thrown).
export const Route = createFileRoute('/admin/errors')({
  loader: () => telescopeErrors(),
  component: ErrorsPage,
})

function ErrorsPage() {
  const groups = Route.useLoaderData()
  return (
    <>
      <PageTitle title="Errors" sub={`${groups.length} distinct errors · kept 7 days`} />
      <div className={tbl.wrap}>
        <table className={tbl.table}>
          <thead className={tbl.head}>
            <tr>{['Error', 'Count', 'First seen', 'Last seen', 'Last request'].map((h) => <th key={h} className={tbl.th}>{h}</th>)}</tr>
          </thead>
          <tbody className={tbl.body}>
            {groups.map((g) => (
              <tr key={g.fingerprint} className="align-top">
                <td className="max-w-xl px-3 py-2">
                  <p className="font-mono text-xs break-all text-destructive">{g.message}</p>
                  {g.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted-foreground">Sample stack</summary>
                      <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-muted p-2 text-xs">{g.stack}</pre>
                    </details>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{g.count}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{date(g.firstSeen)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{date(g.lastSeen)}</td>
                <td className="px-3 py-2 text-xs">
                  {g.requestId ? <Link to="/admin/requests/$requestId" params={{ requestId: g.requestId }} className="font-mono text-muted-foreground hover:underline">{g.requestId.slice(0, 8)}</Link> : '—'}
                </td>
              </tr>
            ))}
            {groups.length === 0 && <tr><td colSpan={5} className={tbl.empty}>No errors in the last 7 days.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
