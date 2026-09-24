import { createFileRoute, Link } from '@tanstack/react-router'
import { businessRevenue } from '../server/business-fns'
import { DailyChart, DataTable, Kpi, money, Panel, type Column } from '../admin/ui'
import { productOf } from '@/lib/credit-prices'

// ADM-15: revenue from stored orders; fees are an estimate (4% + $0.40 an order); margin is a user's
// revenue minus what their model calls cost.
export const Route = createFileRoute('/admin/credits/revenue')({
  loader: () => businessRevenue(),
  component: RevenuePage,
})

type Margin = Awaited<ReturnType<typeof businessRevenue>>['top'][number]
type Product = Awaited<ReturnType<typeof businessRevenue>>['byProduct'][number]

const marginColumns: Column<Margin>[] = [
  { key: 'user', header: 'User', cell: (m) => <Link to="/admin/users/$userId" params={{ userId: m.userId }} className="hover:underline">{m.email ?? m.userId}</Link> },
  { key: 'orders', header: 'Orders', cell: (m) => m.orders, sort: (m) => m.orders, className: 'text-right tabular-nums' },
  { key: 'revenue', header: 'Revenue', cell: (m) => money(m.revenue), sort: (m) => m.revenue, className: 'text-right tabular-nums' },
  { key: 'spend', header: 'LLM spend', cell: (m) => money(m.spend), sort: (m) => m.spend, className: 'text-right tabular-nums' },
  { key: 'margin', header: 'Margin', cell: (m) => <span className={m.margin < 0 ? 'text-destructive' : ''}>{m.margin < 0 ? `−${money(-m.margin)}` : money(m.margin)}</span>, sort: (m) => m.margin, className: 'text-right tabular-nums' },
]

const productColumns: Column<Product>[] = [
  { key: 'product', header: 'Plan / pack', cell: (p) => productOf(p.productKey)?.name ?? p.productKey },
  { key: 'orders', header: 'Orders', cell: (p) => p.orders, sort: (p) => p.orders, className: 'text-right tabular-nums' },
  { key: 'revenue', header: 'Gross', cell: (p) => money(p.revenue), sort: (p) => p.revenue, className: 'text-right tabular-nums' },
]

function RevenuePage() {
  const d = Route.useLoaderData()
  const t = d.totals
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={`Gross · ${t.orders} orders`} now={t.gross} format={money} />
        <Kpi label="Refunds" now={t.refunds} format={money} />
        <Kpi label="Fees (est. 4% + $0.40)" now={t.fees} format={money} />
        <Kpi label="Net" now={t.net} format={money} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Revenue · 30 days" className="lg:col-span-2">
          <DailyChart rows={d.byDay} series={[{ key: 'revenue', label: 'Revenue' }]} format={(n) => `$${Math.round(n)}`} />
        </Panel>
        <Panel title="By plan and pack">
          <DataTable rows={d.byProduct} columns={productColumns} initialSort={{ key: 'revenue', desc: true }} empty="No orders yet." />
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Top 20 users by revenue">
          <DataTable rows={d.top} columns={marginColumns} initialSort={{ key: 'revenue', desc: true }} empty="No paying users yet." />
        </Panel>
        <Panel title="20 worst margins">
          <DataTable rows={d.worst} columns={marginColumns} initialSort={{ key: 'margin' }} empty="No spend or revenue yet." />
        </Panel>
      </div>
    </>
  )
}
