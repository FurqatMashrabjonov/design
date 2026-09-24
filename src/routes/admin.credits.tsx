import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { PageTitle } from '../admin/ui'

// ADM-15: credits and revenue — the ledger, subscriptions and revenue, one tab each.
export const Route = createFileRoute('/admin/credits')({ component: CreditsLayout })

const TABS = [
  { to: '/admin/credits', label: 'Ledger', exact: true },
  { to: '/admin/credits/subscriptions', label: 'Subscriptions', exact: false },
  { to: '/admin/credits/revenue', label: 'Revenue', exact: false },
] as const

function CreditsLayout() {
  return (
    <>
      <PageTitle title="Credits and revenue" />
      <nav className="mb-5 flex gap-1 border-b text-sm" aria-label="Credits sections">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact, includeSearch: false }}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-muted-foreground hover:text-foreground"
            activeProps={{ className: 'border-foreground! font-medium text-foreground' }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
