import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { PAGE_SIZE, type TableQuery } from './table-query'

// Shared pieces of the admin panel: KPI cards, a sortable/searchable table, a daily chart, formats.
// UI-18: every admin page draws its tables, filters, pagers, callouts and status colours from here, on
// the studio's tokens — no Tailwind palette colours and no hex, so both themes hold.

/** The table look every admin table shares: DataTable, ServerTable and the hand-built log tables. */
export const tbl = {
  wrap: 'overflow-x-auto rounded-md border border-border bg-card shadow-1',
  table: 'w-full text-md',
  head: 'bg-muted/60 text-xs text-muted-foreground',
  th: 'px-3 py-2 text-left font-medium whitespace-nowrap',
  body: 'divide-y divide-border',
  td: 'px-3 py-2 align-middle',
  row: 'cursor-pointer transition-colors duration-(--duration-fast) hover:bg-muted/50',
  empty: 'px-3 py-10 text-center text-muted-foreground',
}

/** A native select or date input that looks like the shared Input. */
export const control = 'h-8 rounded-lg border border-input bg-card px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const sortButton = 'inline-flex items-center gap-1 rounded-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'

export type Tone = 'neutral' | 'good' | 'bad' | 'warn'

/** Status as text colour: a number that is good news, bad news, or worth a look. */
export const toneText: Record<Tone, string> = { neutral: 'text-muted-foreground', good: 'text-success', bad: 'text-destructive', warn: 'text-warning' }

/** One pager for every table: the range shown and two outline icon buttons. */
export function Pager({ from, to, total, onPrev, onNext, canPrev, canNext }: { from: number; to: number; total: number; onPrev: () => void; onNext: () => void; canPrev: boolean; canNext: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <span className="tabular-nums">{total === 0 ? '0' : `${from}–${to}`} of {total}</span>
      <Button variant="outline" size="icon-sm" disabled={!canPrev} onClick={onPrev} aria-label="Previous page"><ChevronLeft /></Button>
      <Button variant="outline" size="icon-sm" disabled={!canNext} onClick={onNext} aria-label="Next page"><ChevronRight /></Button>
    </div>
  )
}

/** A small either/or control: a range, a level. The chosen one is a raised chip, not a colour. */
export function Segmented<V extends string | number | undefined>({ value, options, onChange, label }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; label: string }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-sm shadow-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value ?? 'all')}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('h-7 rounded-sm px-3 outline-none transition-colors duration-(--duration-fast) focus-visible:ring-2 focus-visible:ring-ring', value === o.value ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A line that needs attention — an alert, a failed webhook, an open circuit. */
export function Callout({ tone = 'bad', children, className }: { tone?: 'bad' | 'warn'; children: ReactNode; className?: string }) {
  const cls = tone === 'bad' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-warning/30 bg-warning/10 text-warning'
  return <div className={cn('rounded-md border px-4 py-3 text-sm', cls, className)}>{children}</div>
}

/** The heading of a group of panels on a page. */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('mb-3 text-md font-semibold', className)}>{children}</h2>
}

export const money = (usd: number) => (usd === 0 ? '$0' : usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`)
export const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`)
export const secs = (ms: number) => (ms ? `${(ms / 1000).toFixed(1)}s` : '—')
export const date = (unix: number | null) => (unix ? new Date(unix * 1000).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

export function PageTitle({ title, sub, right, back }: { title: string; sub?: string; right?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && <div className="mb-2 text-sm text-muted-foreground [&_a]:rounded-xs [&_a]:transition-colors [&_a:hover]:text-foreground">{back}</div>}
        <h1 className="truncate text-2xl" title={title}>{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Panel({ title, children, right, className = '' }: { title?: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-lg border border-border bg-card shadow-1', className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-md font-semibold">{title}</h2>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/** A number with its change against the previous period; `good` says which direction is good news. */
export function Kpi({ label, value, now, before, format = String, good = 'up' }: { label: string; value?: ReactNode; now: number; before?: number; format?: (n: number) => string; good?: 'up' | 'down' | 'none' }) {
  const delta = before === undefined || before === 0 ? null : (now - before) / before
  const better = delta === null || good === 'none' ? null : good === 'up' ? delta > 0 : delta < 0
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">{value ?? format(now)}</p>
      <p className="mt-1 h-4 text-xs tabular-nums text-muted-foreground">
        {delta !== null && Math.abs(delta) >= 0.005 ? (
          <span className={better === null ? '' : better ? toneText.good : toneText.bad}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(Math.round(delta * 100))}%
          </span>
        ) : before !== undefined ? (
          <span>was {format(before)}</span>
        ) : null}
      </p>
    </div>
  )
}

const CHART = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-4)']

/** A 30-day area chart; each series is one key of the rows. */
export function DailyChart<T extends { day: string }>({ rows, series, format = (n: number) => String(n), height = 180 }: { rows: T[]; series: { key: keyof T & string; label: string; color?: string }[]; format?: (n: number) => string; height?: number }) {
  // The studio's chart tokens, in the order a chart needs them: lime-green first, then amber, then greys.
  const colorOf = (i: number) => series[i]!.color ?? CHART[i % CHART.length]!
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorOf(i)} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colorOf(i)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} stroke="var(--muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={52} tickFormatter={(n: number) => format(n)} allowDecimals={false} stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--elevation-3)', fontSize: 12 }}
            labelStyle={{ color: 'var(--foreground)' }}
            formatter={(v, name) => [format(Number(v)), series.find((s) => s.key === name)?.label ?? String(name)]}
          />
          {series.map((s, i) => (
            <Area key={s.key} type="monotone" dataKey={s.key as string} stroke={colorOf(i)} strokeWidth={2} fill={`url(#g-${s.key})`} isAnimationActive={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export type Column<T> = { key: string; header: string; cell: (row: T) => ReactNode; sort?: (row: T) => number | string; className?: string }

/** Sort by any column, search across what `search` returns, 25 rows a page. */
export function DataTable<T>({ rows, columns, search, empty = 'Nothing here yet.', initialSort, pageSize = 25, onRow }: { rows: T[]; columns: Column<T>[]; search?: (row: T) => string; empty?: string; initialSort?: { key: string; desc?: boolean }; pageSize?: number; onRow?: (row: T) => void }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(initialSort ?? null)
  const [page, setPage] = useState(0)
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = needle && search ? rows.filter((r) => search(r).toLowerCase().includes(needle)) : rows
    const col = sort && columns.find((c) => c.key === sort.key)
    if (col?.sort) {
      const get = col.sort
      out = [...out].sort((a, b) => {
        const x = get(a), y = get(b)
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
        return sort!.desc ? -c : c
      })
    }
    return out
  }, [rows, q, sort, columns, search])
  const pages = Math.max(1, Math.ceil(shown.length / pageSize))
  const at = Math.min(page, pages - 1)
  return (
    <div>
      {search && (
        <label className="relative mb-3 block w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search" aria-label="Search" className="h-8 bg-card pl-8" />
        </label>
      )}
      <div className={tbl.wrap}>
        <table className={tbl.table}>
          <thead className={tbl.head}>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn(tbl.th, c.className)}>
                  {c.sort ? (
                    <button type="button" className={sortButton} onClick={() => setSort((s) => ({ key: c.key, desc: s?.key === c.key ? !s.desc : true }))}>
                      {c.header}
                      {sort?.key === c.key && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tbl.body}>
            {shown.slice(at * pageSize, (at + 1) * pageSize).map((r, i) => (
              <tr key={i} className={onRow ? tbl.row : ''} onClick={onRow ? () => onRow(r) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={cn(tbl.td, c.className)}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={columns.length} className={tbl.empty}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <Pager from={at * pageSize + 1} to={Math.min(shown.length, (at + 1) * pageSize)} total={shown.length} canPrev={at > 0} canNext={at < pages - 1} onPrev={() => setPage(at - 1)} onNext={() => setPage(at + 1)} />
      )}
    </div>
  )
}

/** A status pill. Tones are the studio's status tokens, tinted, so a pill reads in both themes. */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const cls = { neutral: 'bg-muted text-muted-foreground', good: 'bg-success/12 text-success', bad: 'bg-destructive/10 text-destructive', warn: 'bg-warning/12 text-warning' }[tone]
  return <span className={cn('inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', cls)}>{children}</span>
}

/** A panel that slides over the right edge: full height, scrollable; Esc or the overlay closes it. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-md translate-x-0 translate-y-0 content-start gap-4 overflow-y-auto rounded-none p-5 sm:max-w-md data-open:slide-in-from-right-10 data-open:zoom-in-100 data-closed:slide-out-to-right-10 data-closed:zoom-out-100"
      >
        <DialogTitle className="pr-8 text-base font-semibold">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}

/** One label/value line of a detail panel; use inside a <dl>. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 border-b border-border py-2 text-md last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** A text box that reports its value a moment after typing stops, and follows the URL when it changes. */
function DebouncedInput({ value, onCommit, ms = 250, ...props }: { value: string; onCommit: (v: string) => void; ms?: number } & Omit<ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  const [text, setText] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => setText(value), [value])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <Input
      {...props}
      value={text}
      onChange={(e) => {
        const v = e.target.value
        setText(v)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => onCommit(v), ms)
      }}
    />
  )
}

export type ServerColumn<T> = { key: string; header: string; cell: (row: T) => ReactNode; sort?: string; className?: string }
export type TableFilter =
  | { type: 'select'; key: string; label: string; options: { value: string; label: string }[] }
  | { type: 'dateRange'; from: string; to: string; label: string }
  | { type: 'number'; key: string; label: string; step?: number }
  | { type: 'text'; key: string; label: string }

type Query = TableQuery & Record<string, unknown>

/** ADM-11: a table whose rows come from the server one page at a time. The query lives in the URL; this
 *  only draws it and asks for a change (`onQuery`, a patch). The old rows stay up while the next page
 *  loads. A row opens `detail` in a drawer, or runs `onRow`. */
export function ServerTable<T extends { id: string }>({ rows, total, columns, query, onQuery, filters = [], defaultSort, empty = 'Nothing matches.', detail, detailTitle, onRow, onExport, exportName = 'export' }: {
  rows: T[]; total: number; columns: ServerColumn<T>[]; query: Query; onQuery: (patch: Query) => void; filters?: TableFilter[]; defaultSort: string
  empty?: string; detail?: (row: T) => ReactNode; detailTitle?: (row: T) => ReactNode; onRow?: (row: T) => void; onExport?: () => Promise<string>; exportName?: string
}) {
  const loading = useRouterState({ select: (s) => s.status === 'pending' })
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<T | null>(null) // kept while the drawer closes, so it does not empty mid-animation
  const [exporting, setExporting] = useState(false)
  // Any change but a page turn starts again at the first page.
  const change = (patch: Query) => onQuery({ ...patch, page: undefined })
  const sort = query.sort ?? defaultSort
  const dir = query.dir ?? 'desc'
  const size = query.size ?? PAGE_SIZE
  const page = query.page ?? 0
  const str = (k: string) => (typeof query[k] === 'string' || typeof query[k] === 'number' ? String(query[k]) : '')
  const set = (k: string, v: string) => change({ [k]: v.trim() === '' ? undefined : v.trim() })

  async function exportCsv() {
    if (!onExport) return
    setExporting(true)
    try {
      const url = URL.createObjectURL(new Blob([await onExport()], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportName}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="relative block w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <DebouncedInput value={str('q')} onCommit={(v) => set('q', v)} placeholder="Search" aria-label="Search" className="h-8 bg-card pl-8" />
        </label>
        {filters.map((f) => (
          <label key={f.type === 'dateRange' ? f.from : f.key} className="flex flex-col gap-1 text-xs text-muted-foreground">
            {f.label}
            {f.type === 'select' ? (
              <select value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} className={control}>
                <option value="">All</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'dateRange' ? (
              <span className="flex items-center gap-1">
                <input type="date" aria-label={`${f.label} from`} value={str(f.from)} max={str(f.to) || undefined} onChange={(e) => set(f.from, e.target.value)} className={control} />
                <span aria-hidden>–</span>
                <input type="date" aria-label={`${f.label} to`} value={str(f.to)} min={str(f.from) || undefined} onChange={(e) => set(f.to, e.target.value)} className={control} />
              </span>
            ) : f.type === 'number' ? (
              <DebouncedInput type="number" min={0} step={f.step ?? 'any'} value={str(f.key)} onCommit={(v) => set(f.key, v)} className="h-8 w-24" />
            ) : (
              <DebouncedInput value={str(f.key)} onCommit={(v) => set(f.key, v)} className="h-8 w-40" />
            )}
          </label>
        ))}
        <span className="ml-auto flex items-center gap-2">
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
          {onExport && (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting || total === 0}>
              <Download /> CSV
            </Button>
          )}
        </span>
      </div>
      <div className={cn(tbl.wrap, 'transition-opacity duration-(--duration-base) ease-out', loading && 'opacity-60')} aria-busy={loading}>
        <table className={tbl.table}>
          <thead className={tbl.head}>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn(tbl.th, c.className)} aria-sort={c.sort && sort === c.sort ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sort ? (
                    <button type="button" className={sortButton} onClick={() => change({ sort: c.sort, dir: sort === c.sort && dir === 'desc' ? 'asc' : 'desc' })}>
                      {c.header}
                      {sort === c.sort && (dir === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tbl.body}>
            {rows.map((r) => {
              const click = onRow ? () => onRow(r) : detail ? () => (setRow(r), setOpen(true)) : undefined
              return (
                <tr key={r.id} className={click ? tbl.row : ''} onClick={click}>
                  {columns.map((c) => (
                    <td key={c.key} className={cn(tbl.td, c.className)}>{c.cell(r)}</td>
                  ))}
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className={tbl.empty}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager from={Math.min(total, page * size + 1)} to={Math.min(total, (page + 1) * size)} total={total} canPrev={page > 0} canNext={(page + 1) * size < total} onPrev={() => onQuery({ page: page - 1 || undefined })} onNext={() => onQuery({ page: page + 1 })} />
      {detail && (
        <Drawer open={open} onClose={() => setOpen(false)} title={row && detailTitle ? detailTitle(row) : 'Details'}>
          {row && detail(row)}
        </Drawer>
      )}
    </div>
  )
}
