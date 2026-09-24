import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FolderOpen, LayoutGrid, Search, User } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { adminSearch } from '@/server/admin-fns'

// ADM-10: ⌘K palette for the admin panel — pages, users, projects. Mount <CommandPalette /> once in
// the admin layout; <CommandTrigger /> (sidebar) and ⌘K / Ctrl+K open it via one window event.

const EVENT = 'od:admin-palette'
const toggle = () => window.dispatchEvent(new Event(EVENT))

const PAGES = [
  { label: 'Overview', to: '/admin' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Generations', to: '/admin/generations' },
  { label: 'Settings', to: '/admin/settings' },
] as const

type Results = Awaited<ReturnType<typeof adminSearch>>
type Row = { key: string; section: 'Pages' | 'Users' | 'Projects'; label: string; sub?: string; go: () => void }

export function CommandTrigger({ collapsed }: { collapsed?: boolean }) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? 'Search' : undefined}
      title={collapsed ? 'Search (⌘K)' : undefined}
      className={`flex items-center gap-2 rounded-xl border bg-background text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${collapsed ? 'shrink-0 justify-center p-2' : 'w-full px-3 py-2'}`}
    >
      <Search className="size-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-sans text-[11px]">⌘K</kbd>
        </>
      )}
    </button>
  )
}

export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Results>({ users: [], projects: [] })
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onToggle = () => setOpen((o) => !o)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onToggle()
      }
    }
    window.addEventListener(EVENT, onToggle)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(EVENT, onToggle)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setQ('')
      setFound({ users: [], projects: [] })
    }
  }, [open])

  // Debounced server search; a response for text that has since changed is dropped.
  useEffect(() => {
    if (!q.trim()) return setFound({ users: [], projects: [] })
    let stale = false
    const t = setTimeout(() => {
      adminSearch({ data: { q } }).then((r) => !stale && setFound(r), () => {})
    }, 150)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [q])

  const rows = useMemo<Row[]>(() => {
    const done = (fn: () => void) => () => (setOpen(false), fn())
    const needle = q.trim().toLowerCase()
    return [
      ...PAGES.filter((p) => p.label.toLowerCase().includes(needle)).map((p): Row => ({ key: p.to, section: 'Pages', label: p.label, go: done(() => navigate({ to: p.to })) })),
      ...found.users.map((u): Row => ({ key: `u-${u.id}`, section: 'Users', label: u.email, sub: u.name, go: done(() => navigate({ to: '/admin/users/$userId', params: { userId: u.id } })) })),
      ...found.projects.map((p): Row => ({ key: `p-${p.id}`, section: 'Projects', label: p.name, sub: p.owner ?? undefined, go: done(() => navigate({ to: '/admin/projects/$projectId', params: { projectId: p.id } })) })),
    ]
  }, [q, found, navigate])

  useEffect(() => setActive(0), [rows])
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!rows.length) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      rows[active]?.go()
    }
  }

  const Icon = { Pages: LayoutGrid, Users: User, Projects: FolderOpen }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Search the admin panel</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, users, projects…"
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            role="combobox"
            aria-expanded
            aria-controls="admin-palette-list"
            aria-activedescendant={rows[active] ? `admin-palette-${active}` : undefined}
          />
        </div>
        <div ref={listRef} id="admin-palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No results</p>}
          {rows.map((r, i) => {
            const I = Icon[r.section]
            return (
              <div key={r.key}>
                {r.section !== rows[i - 1]?.section && <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">{r.section}</p>}
                <div
                  id={`admin-palette-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={r.go}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm ${i === active ? 'bg-muted' : ''}`}
                >
                  <I className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{r.label}</span>
                  {r.sub && <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">{r.sub}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
