import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { joinWaitlist } from '@/server/fns'

// WLT-01: the waitlist a shared preview collects — an email and, if they like, what they would build or what they
// thought of this app (the feedback the posts ask for). The shared link's token and `ref` go with it, so the admin
// sees which app and which post brought each sign-up. ACC-03: the landing opens the same dialog with no share
// (ref `landing`), carrying the prompt the person typed as their note.
type Share = { token: string; ref: string | null }

export function WaitlistButton({ share, size = 'default', label = 'Join the waitlist', className = 'rounded-full' }: { share?: Share; size?: 'sm' | 'default' | 'lg'; label?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size={size} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <WaitlistDialog open={open} onOpenChange={setOpen} share={share} />
    </>
  )
}

export function WaitlistDialog({ open, onOpenChange, share, note: initialNote = '' }: { open: boolean; onOpenChange: (open: boolean) => void; share?: Share; note?: string }) {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState(initialNote)
  const [state, setState] = useState<'idle' | 'sending' | 'done' | { error: string }>('idle')
  // A prompt typed after the dialog was first opened replaces an untouched note.
  useEffect(() => {
    if (open && initialNote) setNote(initialNote)
  }, [open, initialNote])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      await joinWaitlist({ data: { token: share?.token, ref: share ? share.ref ?? undefined : 'landing', email, note } })
      setState('done')
    } catch (err) {
      setState({ error: err instanceof Error && err.message.length < 80 ? err.message : 'Could not join — try again' })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {state === 'done' ? (
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="size-5 text-success" /> You're on the list
              </DialogTitle>
              <DialogDescription>We'll email you when your spot opens. Thanks for looking!</DialogDescription>
            </DialogHeader>
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Get early access</DialogTitle>
                <DialogDescription>Describe an app, get every screen designed in about a minute. We're letting people in a few at a time.</DialogDescription>
              </DialogHeader>
              <label className="grid gap-1.5 text-sm font-medium">
                Email
                <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>
                  {share ? 'What would you build, or what did you think of this one?' : 'What would you build?'} <span className="font-normal text-muted-foreground">(optional)</span>
                </span>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} />
              </label>
              {typeof state === 'object' && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={state === 'sending'}>
                {state === 'sending' ? 'Joining…' : 'Join the waitlist'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
