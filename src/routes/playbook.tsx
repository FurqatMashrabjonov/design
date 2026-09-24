import { createFileRoute, Link } from '@tanstack/react-router'
import { PLAYBOOK } from '@/content/playbook'
import { BRAND, Em, Eyebrow, SitePage } from '@/components/SiteChrome'

// MKT-06: the rules this product holds screens to, in public. The page is the argument: a rule a
// tool only asks a model for is a suggestion, a rule it applies in code is a guarantee.
export const Route = createFileRoute('/playbook')({
  head: () => ({
    meta: [
      { title: `Playbook — ${BRAND}` },
      { name: 'description', content: 'The rules every generated screen is held to: platform minimums, what keeps five screens one app, and the craft applied in code.' },
    ],
  }),
  component: Playbook,
})

function Playbook() {
  return (
    <SitePage className="max-w-4xl">
      <Eyebrow>Playbook</Eyebrow>
      <h1 className="text-3xl sm:text-5xl">Rules in <Em>code</Em>, not in prompts.</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        What every generated screen is held to. Each rule says where it is enforced, because that is the whole difference: a rule
        in a prompt is a suggestion, a rule in code is a guarantee.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2">
        {PLAYBOOK.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-1 outline-none transition-colors duration-(--duration-base) hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            {s.title}
          </a>
        ))}
      </nav>

      {PLAYBOOK.map((section) => (
        <section key={section.id} id={section.id} className="mt-14 scroll-mt-20">
          <h2 className="text-2xl">{section.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{section.blurb}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {section.rules.map((r) => (
              <li key={r.title} className="rounded-lg border border-border bg-card p-5 shadow-1">
                <h3 className="font-medium">{r.title}</h3>
                <p className="mt-2 text-sm">{r.rule}</p>
                <p className="mt-2 text-sm text-muted-foreground">{r.why}</p>
                <p className="mt-4 inline-block rounded-xs bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{r.where}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-16 text-sm text-muted-foreground">
        <Link to="/systems" className="rounded-sm underline decoration-foreground/30 underline-offset-4 hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          See the design systems
        </Link>{' '}
        these rules are applied inside.
      </p>
    </SitePage>
  )
}
