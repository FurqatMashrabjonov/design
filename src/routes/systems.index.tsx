import { createFileRoute, Link } from '@tanstack/react-router'
import { getSystems } from '../server/fns'
import { BRAND, Em, Eyebrow, SitePage } from '@/components/SiteChrome'

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
  // UI-16: the systems written for a phone come first — they are the ones the product picks and
  // the landing shows; the brand packages were written for websites and follow.
  const mobile = systems.filter((s) => s.category === 'Mobile')
  const groups = [
    ['Built for phones', 'The systems an app is drawn in when you do not name one.', mobile],
    ['Brand styles', 'Ask for one by name — "like Linear", "Airbnb-style" — and the app is drawn in it.', systems.filter((s) => s.category !== 'Mobile')],
  ] as const
  return (
    <SitePage className="max-w-5xl">
      <h1 className="text-3xl sm:text-5xl">Design <Em>systems</Em></h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        An app is generated in one of these, and every screen of it keeps the same tokens, type and spacing. Open one to read its
        style card and see the palette.
      </p>

      {groups.map(([title, blurb, list]) => (
        <section key={title} className="mt-12">
          <Eyebrow>{title}</Eyebrow>
          <p className="-mt-1 max-w-xl text-sm text-muted-foreground">{blurb}</p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <li key={s.id}>
            <Link
              to="/systems/$id"
              params={{ id: s.id }}
              className="group block overflow-hidden rounded-xl border border-border bg-card shadow-1 outline-none transition duration-(--duration-base) ease-out hover:-translate-y-0.5 hover:shadow-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                <p className="mt-0.5 text-xs uppercase tracking-[.14em] text-muted-foreground">{s.category}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
        </section>
      ))}
    </SitePage>
  )
}
