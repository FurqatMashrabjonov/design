import { useEffect } from 'react'
import { createFileRoute, Link, notFound, Outlet } from '@tanstack/react-router'
import { Activity, Gauge, SlidersHorizontal, Users } from 'lucide-react'
import { adminCheck } from '../server/admin-fns'
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

const NAV = [
  { to: '/admin', label: 'Overview', icon: Gauge, exact: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/generations', label: 'Generations', icon: Activity },
  { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
] as const

function AdminShell() {
  const { admin } = Route.useRouteContext()
  // Not in head(): that runs for a refused visitor too and would name the page.
  useEffect(() => {
    document.title = `Admin · ${BRAND}`
  }, [])
  return (
    <div className="flex min-h-screen bg-muted/40 text-foreground">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-background md:flex">
        <Link to="/" className="flex h-14 items-center gap-2 px-4 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-foreground">
            <span className="size-2.5 rounded-sm" style={{ background: '#C6F24E' }} />
          </span>
          {BRAND}
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</span>
        </Link>
        <nav className="space-y-0.5 px-2 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: 'exact' in n }}
              className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-muted font-medium text-foreground' }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t p-3 text-xs">
          <p className="truncate font-medium">{admin.name || admin.email}</p>
          <p className="truncate text-muted-foreground">{admin.email}</p>
          <Link to="/" className="mt-2 inline-block text-muted-foreground underline-offset-2 hover:underline">← Back to the app</Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {/* Phones: the sections as a scrolling row instead of the sidebar. */}
        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-3 py-2 text-sm md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: 'exact' in n }} className="shrink-0 rounded-lg px-2.5 py-1.5 text-muted-foreground" activeProps={{ className: 'bg-muted font-medium text-foreground' }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
