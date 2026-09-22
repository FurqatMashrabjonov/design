import { useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

// Shared pieces of the admin panel: KPI cards, a sortable/searchable table, a daily chart, formats.

export const money = (usd: number) => (usd === 0 ? '$0' : usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`)
export const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`)
export const secs = (ms: number) => (ms ? `${(ms / 1000).toFixed(1)}s` : '—')
export const date = (unix: number | null) => (unix ? new Date(unix * 1000).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Panel({ title, children, right, className = '' }: { title?: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border bg-background ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
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
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value ?? format(now)}</p>
      <p className="mt-1 h-4 text-xs tabular-nums text-muted-foreground">
        {delta !== null && Math.abs(delta) >= 0.005 ? (
          <span className={better === null ? '' : better ? 'text-emerald-600' : 'text-red-600'}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(Math.round(delta * 100))}%
          </span>
        ) : before !== undefined ? (
          <span>was {format(before)}</span>
        ) : null}
      </p>
    </div>
  )
}

/** A 30-day area chart; each series is one key of the rows. */
export function DailyChart<T extends { day: string }>({ rows, series, format = (n: number) => String(n), height = 180 }: { rows: T[]; series: { key: keyof T & string; label: string; color: string }[]; format?: (n: number) => string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} stroke="var(--muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={(n: number) => format(n)} allowDecimals={false} stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: 'var(--foreground)' }}
            formatter={(v, name) => [format(Number(v)), series.find((s) => s.key === name)?.label ?? String(name)]}
          />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key as string} stroke={s.color} strokeWidth={2} fill={`url(#g-${s.key})`} isAnimationActive={false} />
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
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search" aria-label="Search" className="h-8 pl-8" />
        </label>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 text-left font-medium whitespace-nowrap ${c.className ?? ''}`}>
                  {c.sort ? (
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key: c.key, desc: s?.key === c.key ? !s.desc : true }))}>
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
          <tbody className="divide-y">
            {shown.slice(at * pageSize, (at + 1) * pageSize).map((r, i) => (
              <tr key={i} className={onRow ? 'cursor-pointer hover:bg-muted/40' : ''} onClick={onRow ? () => onRow(r) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 align-middle ${c.className ?? ''}`}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{at * pageSize + 1}–{Math.min(shown.length, (at + 1) * pageSize)} of {shown.length}</span>
          <button type="button" className="grid size-7 place-items-center rounded-md border disabled:opacity-40" disabled={at === 0} onClick={() => setPage(at - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></button>
          <button type="button" className="grid size-7 place-items-center rounded-md border disabled:opacity-40" disabled={at >= pages - 1} onClick={() => setPage(at + 1)} aria-label="Next page"><ChevronRight className="size-4" /></button>
        </div>
      )}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' }) {
  const cls = { neutral: 'bg-muted text-muted-foreground', good: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', bad: 'bg-red-500/15 text-red-700 dark:text-red-400', warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' }[tone]
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>
}
