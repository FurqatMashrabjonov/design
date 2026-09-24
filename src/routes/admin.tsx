import { useEffect, useState, type ReactNode } from 'react'
import { createFileRoute, Link, notFound, Outlet } from '@tanstack/react-router'
import { Activity, ArrowLeft, Bug, Coins, Cpu, Gauge, Globe, PanelLeftClose, PanelLeftOpen, ScrollText, SlidersHorizontal, Users } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { adminCheck } from '../server/admin-fns'
import { CommandPalette, CommandTrigger } from '../admin/CommandPalette'
import { BRAND } from '../Landing'

// ADM-01: the admin panel's shell. Anyone who is not an admin gets the app's ordinary 404 — the
// panel's existence is not confirmed (the server functions check again on every call).
export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    try {
      return { admin: await adminCheck() }
    } catch {
      throw notFound()
    }
  },
  component: AdminShell,
})

// ADM-10: sections in groups, so a new page slots into its group instead of a flat list.
const GROUPS = [
  {
    label: 'Monitor',
    items: [
      { to: '/admin', label: 'Overview', icon: Gauge, exact: true },
      { to: '/admin/requests', label: 'Requests', icon: Globe },
      { to: '/admin/logs', label: 'Logs', icon: ScrollText },
      { to: '/admin/errors', label: 'Errors', icon: Bug },
    ],
  },
  { label: 'AI', items: [{ to: '/admin/generations', label: 'Generations', icon: Activity }, { to: '/admin/providers', label: 'Providers', icon: Cpu }] },
  {
    label: 'Business',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/credits', label: 'Credits', icon: Coins },
    ],
  },
  { label: 'System', items: [{ to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal }] },
] as const
const NAV = GROUPS.flatMap((g) => [...g.items] as (typeof GROUPS)[number]['items'][number][])

const STORE_KEY = 'od:admin-sidebar'

// ADM-10: collapsed, a label moves into a tooltip; open, the label is on screen and no tooltip is needed.
function Tip({ show, label, children }: { show: boolean; label: string; children: ReactNode }) {
  if (!show) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function AdminShell() {
  const { admin } = Route.useRouteContext()
  // SSR renders the open sidebar; the saved choice is read after mount so hydration matches.
  const [collapsed, setCollapsed] = useState(false)
  // Not in head(): that runs for a refused visitor too and would name the page.
  useEffect(() => {
    document.title = `Admin · ${BRAND}`
    try {
      if (localStorage.getItem(STORE_KEY) === 'collapsed') setCollapsed(true)
    } catch {}
  }, [])

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORE_KEY, c ? 'open' : 'collapsed')
      } catch {}
      return !c
    })

  // ADM-10: Ctrl+B / ⌘B, except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'b') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ADM-10: the ⌘K trigger; the palette itself is mounted once, below.
  const searchSlot = <div className={collapsed ? 'flex justify-center pb-2' : 'px-2 pb-2'}><CommandTrigger collapsed={collapsed} /></div>
  const initial = (admin.name || admin.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="flex min-h-screen bg-muted/40 text-foreground">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r bg-background transition-[width] duration-200 md:flex ${collapsed ? 'w-14' : 'w-56'}`}
      >
        {/* ADM-10: collapsed, the brand is just its mark and the toggle sits under it. */}
        <div className={`flex shrink-0 ${collapsed ? 'flex-col items-center gap-1 py-3' : 'h-14 items-center justify-between pl-4 pr-2'}`}>
          <Tip show={collapsed} label={`${BRAND} admin`}>
            <Link to="/" aria-label={collapsed ? BRAND : undefined} className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
              <BrandMark />
              {!collapsed && (
                <>
                  <span className="truncate">{BRAND}</span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</span>
                </>
              )}
            </Link>
          </Tip>
          <Tip show label={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </Tip>
        </div>
        {searchSlot}
        <nav className="flex-1 space-y-3 overflow-y-auto px-2 pt-1 text-sm">
          {GROUPS.map((g) => (
            <div key={g.label} className="space-y-0.5">
              {collapsed ? (
                <div className="mx-2 my-1.5 border-t first:hidden" aria-hidden />
              ) : (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
              )}
              {g.items.map((n) => (
                <Tip key={n.to} show={collapsed} label={n.label}>
                  <Link
                    to={n.to}
                    activeOptions={{ exact: 'exact' in n }}
                    aria-label={collapsed ? n.label : undefined}
                    className={`flex h-9 items-center gap-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground ${collapsed ? 'justify-center' : 'px-2.5'}`}
                    activeProps={{ className: 'bg-muted font-medium text-foreground' }}
                  >
                    <n.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{n.label}</span>}
                  </Link>
                </Tip>
              ))}
            </div>
          ))}
        </nav>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 border-t py-3 text-xs">
            <Tip show label={admin.email}>
              <span className="grid size-8 place-items-center rounded-full bg-muted font-semibold text-muted-foreground">{initial}</span>
            </Tip>
            <Tip show label="Back to the app">
              <Link to="/" aria-label="Back to the app" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <ArrowLeft className="size-4" />
              </Link>
            </Tip>
          </div>
        ) : (
          <div className="border-t p-3 text-xs">
            <p className="truncate font-medium">{admin.name || admin.email}</p>
            <p className="truncate text-muted-foreground">{admin.email}</p>
            <Link to="/" className="mt-2 inline-block text-muted-foreground underline-offset-2 hover:underline">← Back to the app</Link>
          </div>
        )}
      </aside>
      <div className="min-w-0 flex-1">
        {/* Phones: the sections as a scrolling row instead of the sidebar. */}
        <nav className="flex items-center gap-1 overflow-x-auto border-b bg-background px-3 py-2 text-sm md:hidden">
          {/* Phones have no ⌘K: the search opens from here. */}
          <CommandTrigger collapsed />
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: 'exact' in n }} className="shrink-0 rounded-lg px-2.5 py-1.5 text-muted-foreground" activeProps={{ className: 'bg-muted font-medium text-foreground' }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <CommandPalette />
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-foreground">
      <span className="size-2.5 rounded-sm" style={{ background: '#C6F24E' }} />
    </span>
  )
}
