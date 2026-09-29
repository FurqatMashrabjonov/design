import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BRAND, SitePage } from '@/components/SiteChrome'
import { Button } from '@/components/ui/button'
import { unsubscribe } from '../server/fns'

// EML-03: where a bulk email's unsubscribe link lands. One button (a link opened by a mail scanner changes
// nothing); after it, no more bulk email to this address — sign-in links still arrive.
export const Route = createFileRoute('/unsubscribe')({
  validateSearch: (s: Record<string, unknown>): { e?: string; t?: string } => ({
    ...(typeof s.e === 'string' && { e: s.e }),
    ...(typeof s.t === 'string' && { t: s.t }),
  }),
  head: () => ({ meta: [{ title: `Unsubscribe — ${BRAND}` }] }),
  component: Unsubscribe,
})

function Unsubscribe() {
  const { e, t } = Route.useSearch()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | { error: string }>('idle')
  async function go() {
    setState('busy')
    try {
      await unsubscribe({ data: { email: e!, token: t! } })
      setState('done')
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : 'Could not unsubscribe' })
    }
  }
  return (
    <SitePage className="max-w-md text-center">
      {state === 'done' ? (
        <>
          <h1 className="text-2xl font-semibold">You're unsubscribed</h1>
          <p className="mt-3 text-muted-foreground">{e} will get no more updates from {BRAND}. Sign-in links still arrive when you ask for one.</p>
        </>
      ) : !e || !t ? (
        <>
          <h1 className="text-2xl font-semibold">This link is incomplete</h1>
          <p className="mt-3 text-muted-foreground">Open the unsubscribe link from the email again.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Unsubscribe from {BRAND} updates?</h1>
          <p className="mt-3 text-muted-foreground">{e} will get no more announcements or invites.</p>
          <Button className="mt-6" onClick={go} disabled={state === 'busy'}>
            {state === 'busy' ? 'Unsubscribing…' : 'Unsubscribe'}
          </Button>
          {typeof state === 'object' && <p className="mt-3 text-sm text-destructive">{state.error}</p>}
        </>
      )}
    </SitePage>
  )
}
