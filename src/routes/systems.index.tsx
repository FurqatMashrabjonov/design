import { createFileRoute, Link } from '@tanstack/react-router'
import { getSystems } from '../server/fns'
import { BRAND } from '../Landing'

// MKT-06: the design systems are public. Every generated app is built from one of these, so the
// gallery is both the product's argument and the page a search engine can land on.
export const Route = createFileRoute('/systems/')({
  loader: () => getSystems(),
  head: () => ({
    meta: [
      { title: `Design systems — ${BRAND}` },
      { name: 'description', content: 'Every app is generated in one of these design systems: real tokens, real fonts, one look across every screen.' },
    ],
  }),
  component: Systems,
})

function Systems() {
  const systems = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← {BRAND}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">Design systems</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        An app is generated in one of these, and every screen of it keeps the same tokens, type and spacing. Open one to read its
        style card and see the palette.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {systems.map((s) => (
          <li key={s.id}>
            <Link
              to="/systems/$id"
              params={{ id: s.id }}
              className="group block overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex h-24" aria-hidden>
                {[s.swatch.bg, s.swatch.accent, s.swatch.fg].map((c, i) => (
                  <span key={i} className="flex-1" style={{ background: c ?? 'var(--muted)' }} />
                ))}
              </div>
              <div className="p-4">
                <p className="font-medium" style={{ fontFamily: s.swatch.font ? `"${s.swatch.font}", var(--font-sans)` : undefined }}>
                  {s.name}
                </p>
                <p className="mt-0.5 text-xs uppercase tracking-[.12em] text-muted-foreground">{s.category}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
