import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Loader2, Mail } from 'lucide-react'
import { getSession } from '../server/fns'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// AUTH-05: one page, two ways in — Google, or a link sent to your email. No passwords.
export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>): { next?: string } => (typeof s.next === 'string' && s.next.startsWith('/') && !s.next.startsWith('//') ? { next: s.next } : {}),
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
  const { next } = Route.useSearch()
  const callbackURL = next ?? '/'
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function google() {
    setBusy('google')
    setError('')
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL })
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
    const { error } = await authClient.signIn.magicLink({ email, callbackURL })
    setBusy(null)
    if (error) setError(error.message ?? 'Could not send the link')
    else setSent(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">Design app screens from a description.</p>
        </div>
        {sent ? (
          <div className="rounded-xl border bg-card p-5 text-center text-sm">
            <Mail className="mx-auto mb-2 size-6 text-primary" />
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-muted-foreground">We sent a sign-in link to {email}. It works for 15 minutes.</p>
            <button type="button" className="mt-3 text-xs text-muted-foreground underline" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {methods.google && (
              <Button variant="outline" className="h-11 w-full" onClick={google} disabled={busy !== null}>
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
              <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" aria-label="Email" />
              <Button type="submit" className="h-11 w-full" disabled={busy !== null}>
                {busy === 'email' && <Loader2 className="size-4 animate-spin" />}
                Email me a sign-in link
              </Button>
            </form>
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">No password needed. By continuing you agree to the terms of use and privacy policy.</p>
      </div>
    </main>
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
