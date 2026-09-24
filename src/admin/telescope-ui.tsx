import { ChevronLeft, ChevronRight } from 'lucide-react'

// OBS-10/OBS-11: small pieces the request, log and error pages share (server-paged, unlike DataTable).

export const statusTone = (s: number) => (s >= 500 ? 'bad' : s >= 400 ? 'warn' : s >= 300 ? 'neutral' : 'good') as 'bad' | 'warn' | 'neutral' | 'good'

export const levelTone = (l: string) => (l === 'error' ? 'bad' : l === 'warn' ? 'warn' : 'neutral') as 'bad' | 'warn' | 'neutral'

export function Pager({ page, pages, total, size, go }: { page: number; pages: number; total: number; size: number; go: (page: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <span className="tabular-nums">{page * size + 1}–{Math.min(total, (page + 1) * size)} of {total}</span>
      <button type="button" className="grid size-7 place-items-center rounded-md border disabled:opacity-40" disabled={page === 0} onClick={() => go(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></button>
      <button type="button" className="grid size-7 place-items-center rounded-md border disabled:opacity-40" disabled={page >= pages - 1} onClick={() => go(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></button>
    </div>
  )
}
