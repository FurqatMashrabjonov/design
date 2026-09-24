import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { buttonVariants, Button } from '@/components/ui/button'
import { DotBackdrop, Em, SiteFooter, SiteHeader } from '@/components/SiteChrome'

// UI-15: a missing page and a crash look like the product, not like the framework's bare text.

function Shell({ code, title, children }: { code: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-24">
        <DotBackdrop />
        <div className="relative max-w-md text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">{code}</p>
          <h1 className="text-4xl sm:text-5xl">{title}</h1>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export function NotFound() {
  return (
    <Shell code="404" title={<>Nothing <Em>here</Em>.</>}>
      <p className="mt-4 text-muted-foreground">This page doesn't exist, or it isn't yours to see.</p>
      <div className="mt-8 flex justify-center gap-2">
        <Link to="/" className={buttonVariants({ size: 'lg', className: 'font-semibold' })}>Go home</Link>
      </div>
    </Shell>
  )
}

export function ErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter()
  if (import.meta.env.DEV) console.error(error)
  return (
    <Shell code="Error" title={<>Something <Em>broke</Em>.</>}>
      <p className="mt-4 text-muted-foreground">Try again, or head home — your projects are saved.</p>
      <div className="mt-8 flex justify-center gap-2">
        <Button size="lg" className="font-semibold" onClick={() => router.invalidate()}>Try again</Button>
        <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>Go home</Link>
      </div>
    </Shell>
  )
}
