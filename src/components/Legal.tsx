import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { SitePage } from '@/components/SiteChrome'
import { POLICIES_UPDATED } from '@/lib/brand'

// LEG-01…04: the legal pages share one reading layout — a title, the date, sections, and links to the others.
// Plain words over legalese: each says what the product actually does (checked against the code), not more.

const OTHERS = [
  { to: '/terms', label: 'Terms of use' },
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/refunds', label: 'Refund policy' },
  { to: '/contact', label: 'Contact & support' },
] as const

export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <SitePage className="max-w-2xl">
      <article className="space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated {POLICIES_UPDATED}</p>
          <div className="text-base leading-relaxed text-muted-foreground">{intro}</div>
        </header>
        {children}
        <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm">
          {OTHERS.filter((o) => o.label !== title).map((o) => (
            <Link key={o.to} to={o.to} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {o.label}
            </Link>
          ))}
        </nav>
      </article>
    </SitePage>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed text-foreground/85 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
    </section>
  )
}
