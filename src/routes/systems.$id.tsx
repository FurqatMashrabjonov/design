import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getSystem } from '../server/fns'
import { BRAND, PENDING_PROMPT } from '../Landing'
import { Button } from '@/components/ui/button'

// MKT-06: one design system — its style card in full, and the palette drawn from its own tokens
// (the same sample the canvas shows), so the page proves the claim instead of describing it.
export const Route = createFileRoute('/systems/$id')({
  loader: ({ params }) => getSystem({ data: params.id }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? 'Design system'} — ${BRAND}` },
      { name: 'description', content: loaderData?.description || `The ${loaderData?.name} design system: tokens, type and components every generated screen shares.` },
    ],
  }),
  component: System,
})

function System() {
  const s = Route.useLoaderData()
  const navigate = useNavigate()
  // The style card is a short markdown card: headings, bullets, plain lines. Rendering those three
  // shapes is the whole job — a markdown dependency for one page would not pay for itself.
  const lines = s.card.split('\n')
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <Link to="/systems" className="text-sm text-muted-foreground hover:text-foreground">
        ← Design systems
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{s.name}</h1>
          <p className="mt-1 text-xs uppercase tracking-[.12em] text-muted-foreground">{s.category}</p>
        </div>
        <Button
          onClick={() => {
            try {
              sessionStorage.setItem(PENDING_PROMPT, `A mobile app in the ${s.name} style`)
            } catch {}
            navigate({ to: '/' })
          }}
        >
          Design an app in this style
        </Button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-3 text-sm leading-relaxed">
          {lines.map((line, i) => {
            const t = line.trim()
            if (!t) return null
            if (t.startsWith('#')) return <h2 key={i} className="pt-4 text-base font-semibold">{t.replace(/^#+\s*/, '')}</h2>
            if (t.startsWith('- ') || t.startsWith('* '))
              return (
                <p key={i} className="flex gap-2 text-muted-foreground">
                  <span aria-hidden>·</span>
                  <span>{t.slice(2)}</span>
                </p>
              )
            return <p key={i} className="text-muted-foreground">{t}</p>
          })}
        </div>
        <iframe
          title={`${s.name} palette`}
          srcDoc={s.sample}
          sandbox="allow-scripts"
          className="h-[640px] w-full rounded-2xl border bg-card lg:w-[520px]"
        />
      </div>
    </main>
  )
}
