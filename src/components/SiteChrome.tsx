import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

// UI-15: the public pages share the landing's header and footer. Before, only the landing had a
// site header; pricing, playbook and the system pages had a bare "← Design" link and login had no
// brand at all, so leaving the landing felt like leaving the product.

import { BRAND } from '@/lib/brand'
import { MARK_S, WORDMARK, WORDMARK_VIEWBOX } from '@/lib/brand-paths'
export { BRAND }

const link = 'rounded-sm transition-colors duration-(--duration-base) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** The logo: a lime phone with an S, tilted, on an ink tile (fixed colours, the same in light and dark). The one
 *  mark, used by every surface; public/favicon.svg and docs/brand are drawn from the same paths. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-block size-7 shrink-0 overflow-hidden rounded-[22%] shadow-1', className)}>
      <svg viewBox="0 0 100 100" className="block size-full" aria-hidden>
        <rect width="100" height="100" fill="#1a1511" />
        <g transform="rotate(-10 50 50)">
          <rect x="23" y="13" width="54" height="74" rx="14" fill="#c6f648" />
          <rect x="43" y="18" width="14" height="4.5" rx="2.25" fill="#1a1511" />
          <path d={MARK_S} fill="#1a1511" />
        </g>
      </svg>
    </span>
  )
}

/** "screenspell" in the logo's own letters; takes the text colour. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox={WORDMARK_VIEWBOX} className={cn('h-[.8em] w-auto', className)} role="img" aria-label={BRAND}>
      <path d={WORDMARK} fill="currentColor" />
    </svg>
  )
}

export function BrandLink() {
  return (
    <Link to="/" className={cn('flex items-center gap-2 text-foreground', link)} aria-label={BRAND}>
      <BrandMark />
      <Wordmark className="h-3.5" />
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
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a href={`${home}#examples`} className={link}>Examples</a>
          <Link to="/pricing" className={link}>Pricing</Link>
          <a href={`${home}#faq`} className={link}>FAQ</a>
          <Link to="/contact" className={link}>Contact</Link>
          <Link to="/terms" className={link}>Terms</Link>
          <Link to="/privacy" className={link}>Privacy</Link>
          <Link to="/refunds" className={link}>Refunds</Link>
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
