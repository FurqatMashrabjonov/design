import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

// UI-15: the public pages share the landing's header and footer. Before, only the landing had a
// site header; pricing, playbook and the system pages had a bare "← Design" link and login had no
// brand at all, so leaving the landing felt like leaving the product.

export const BRAND = 'Design'

const link = 'rounded-sm transition-colors duration-(--duration-base) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** The logo chip: a lime tile with an ink square. The one mark, used by every surface. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-7 place-items-center rounded-sm bg-primary shadow-1', className)}>
      <span className="size-2.5 rounded-[3px] bg-brand-ink" />
    </span>
  )
}

export function BrandLink() {
  return (
    <Link to="/" className={cn('flex items-center gap-2 font-semibold tracking-tight', link)}>
      <BrandMark />
      {BRAND}
    </Link>
  )
}

/** The one emphasised word of a big heading: Instrument Serif italic over a lime highlighter stroke. */
export function Em({ children }: { children: ReactNode }) {
  return (
    <em className="relative isolate whitespace-nowrap font-serif font-normal italic tracking-normal">
      <span className="absolute inset-x-0 bottom-[.08em] -z-10 h-[.32em] rounded-xs bg-primary dark:bg-primary/45" />
      {children}
    </em>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">{children}</p>
}

/** `/#examples` from any page; on the landing itself the hash alone keeps the scroll smooth. */
export function SiteHeader({ onLanding = false }: { onLanding?: boolean }) {
  const examples = onLanding ? '#examples' : '/#examples'
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <BrandLink />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <a href={examples} className={link}>Examples</a>
          <Link to="/systems" className={link} activeProps={{ className: 'text-foreground' }}>Design systems</Link>
          <Link to="/playbook" className={link} activeProps={{ className: 'text-foreground' }}>Playbook</Link>
          <Link to="/pricing" className={link} activeProps={{ className: 'text-foreground' }}>Pricing</Link>
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'hidden text-muted-foreground sm:inline-flex')}>Sign in</Link>
          <Link to="/login" className={buttonVariants({ className: 'ml-1 font-semibold' })}>Start free</Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter({ onLanding = false }: { onLanding?: boolean }) {
  const home = onLanding ? '' : '/'
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} {BRAND}</span>
        {/* ponytail: Terms / Privacy links land with LEG-01…04. */}
        <div className="flex flex-wrap justify-center gap-6">
          <a href={`${home}#examples`} className={link}>Examples</a>
          <Link to="/systems" className={link}>Design systems</Link>
          <Link to="/playbook" className={link}>Playbook</Link>
          <Link to="/pricing" className={link}>Pricing</Link>
          <a href={`${home}#faq`} className={link}>FAQ</a>
          <Link to="/login" className={link}>Sign in</Link>
        </div>
      </div>
    </footer>
  )
}

/** A public page: header, the page's own content, footer. */
export function SitePage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className={cn('mx-auto w-full flex-1 px-4 py-14', className)}>{children}</main>
      <SiteFooter />
    </div>
  )
}

/** The dotted backdrop the landing's hero sits on, faded out toward the bottom. */
export function DotBackdrop() {
  return <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--canvas-dot)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
}
