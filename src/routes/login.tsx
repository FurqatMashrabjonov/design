import { useState } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Loader2, Mail } from 'lucide-react'
import { getSession } from '../server/fns'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BRAND, BrandLink, BrandMark, DotBackdrop, Em } from '@/components/SiteChrome'
import { WaitlistButton } from '@/components/Waitlist'
import { WAITLIST_ONLY } from '@/lib/access'
import { useAccess } from './__root'

// AUTH-05: one page, two ways in — Google, or a link sent to your email. No passwords.
export const Route = createFileRoute('/login')({
  // `error` is set by Better Auth when it refuses a sign-in (ACC-02: waitlist-only) and sends the person back here.
  validateSearch: (s: Record<string, unknown>): { next?: string; error?: string } => ({
    ...(typeof s.next === 'string' && s.next.startsWith('/') && !s.next.startsWith('//') ? { next: s.next } : {}),
    ...(typeof s.error === 'string' && s.error ? { error: s.error.slice(0, 80) } : {}),
  }),
  beforeLoad: async ({ search }) => {
    const { user } = await getSession()
    if (user) throw redirect({ to: search.next ?? '/' })
  },
  loader: () => getSession(),
  head: () => ({ meta: [{ title: 'Sign in' }] }),
  component: Login,
})

function Login() {
  const { methods } = Route.useLoaderData()
  const { next, error: refused } = Route.useSearch()
  const callbackURL = next ?? '/'
  // ACC-02: a refused sign-in comes back to this page, not to Better Auth's own error page.
  const errorCallbackURL = '/login'
  const access = useAccess()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function google() {
    setBusy('google')
    setError('')
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL, errorCallbackURL })
    if (error) {
      setError(error.message ?? 'Google sign-in failed')
      setBusy(null)
    }
  }

  async function emailLink(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address')
    setBusy('email')
    setError('')
    const { error } = await authClient.signIn.magicLink({ email, callbackURL, errorCallbackURL })
    setBusy(null)
    if (error) setError(error.message ?? 'Could not send the link')
    else setSent(true)
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <DotBackdrop />
      {/* UI-15: the way back and the theme, as on every public page — a sign-in form is not a dead end. */}
      <header className="relative mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <BrandLink />
        <ThemeToggle />
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <BrandMark className="mx-auto mb-5 size-11" />
          <h1 className="text-2xl sm:text-3xl">Sign in to <Em>{BRAND}</Em></h1>
          <p className="text-sm text-muted-foreground">Describe an app idea. Tap through the prototype.</p>
        </div>
        {(access === 'waitlist' || refused) && (
          <div className="rounded-lg border bg-card p-4 text-center text-sm shadow-1">
            <p>{access === 'waitlist' ? WAITLIST_ONLY : 'That sign-in did not work — try again.'}</p>
            {access === 'waitlist' && <WaitlistButton size="sm" className="mt-3 rounded-full" />}
          </div>
        )}
        {sent ? (
          <div className="rounded-lg border bg-card p-5 text-center text-sm shadow-1">
            <Mail className="mx-auto mb-2 size-6 text-foreground" />
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-muted-foreground">We sent a sign-in link to {email}. It works for 15 minutes.</p>
            <Button type="button" variant="link" size="xs" className="mt-3 text-muted-foreground" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {methods.google && (
              <Button variant="outline" size="lg" className="w-full bg-card" onClick={google} disabled={busy !== null}>
                {busy === 'google' ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
                Continue with Google
              </Button>
            )}
            {methods.google && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <form onSubmit={emailLink} className="space-y-2">
              <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-card" aria-label="Email" />
              <Button type="submit" size="lg" className="w-full font-semibold" disabled={busy !== null}>
                {busy === 'email' && <Loader2 className="size-4 animate-spin" />}
                Email me a sign-in link
              </Button>
            </form>
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">No password needed. By continuing you agree to the{' '}
          <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">terms of use</Link> and{' '}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">privacy policy</Link>.
        </p>
      </div>
      </main>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  )
}
