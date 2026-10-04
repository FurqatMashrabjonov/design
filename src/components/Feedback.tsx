import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { feedbackDue, sendFeedback } from '@/server/fns'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// FDB-10: what people think of the product, asked where it is fresh. One question after the first app is drawn (a
// card beside the canvas, never a modal over the result — asked once, a close counts), and a Feedback entry in the
// account menu for any other time. Both end in the same table; the admin reads them on the Beta page.

const OPEN = 'od:feedback'
/** Opens the feedback dialog (mounted once, in the root). */
export const openFeedback = () => window.dispatchEvent(new Event(OPEN))

/** The project a canvas or preview URL names, so feedback says which app it is about. */
const projectHere = () => (typeof location === 'undefined' ? null : (location.pathname.match(/^\/(?:p|preview)\/([\w-]{1,80})/)?.[1] ?? null))

const WORDS = ['', 'Poor', 'Meh', 'Okay', 'Good', 'Great']

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating" onPointerLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} of 5 — ${WORDS[n]}`}
          onPointerEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="grid size-9 place-items-center rounded-md outline-none transition-transform duration-(--duration-fast) hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star className={cn('size-6', n <= shown ? 'fill-foreground text-foreground' : 'text-muted-foreground/50')} />
        </button>
      ))}
      <span className="ml-2 text-xs text-muted-foreground" aria-hidden>{WORDS[shown]}</span>
    </div>
  )
}

async function send(d: { source: 'first-app' | 'button'; rating: number | null; text: string; projectId: string | null }): Promise<boolean> {
  try {
    await sendFeedback({ data: d })
    return true
  } catch {
    toast.error('Could not send that — try again in a moment.')
    return false
  }
}

/** Mounted once (root): the account menu's "Send feedback". */
export function FeedbackDialog() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  useEffect(() => {
    const on = () => (setRating(0), setText(''), setState('idle'), setOpen(true))
    window.addEventListener(OPEN, on)
    return () => window.removeEventListener(OPEN, on)
  }, [])
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating && !text.trim()) return
    setState('sending')
    setState((await send({ source: 'button', rating: rating || null, text, projectId: projectHere() })) ? 'sent' : 'idle')
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        {state === 'sent' ? (
          <>
            <DialogHeader>
              <DialogTitle>Thank you</DialogTitle>
              <DialogDescription>We read every note — this is what decides what gets built next.</DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>How is Screenspell working for you?</DialogTitle>
              <DialogDescription>What worked, what was off, what you wish it did. A sentence is plenty.</DialogDescription>
            </DialogHeader>
            <Stars value={rating} onChange={setRating} />
            <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={4} placeholder="The screens looked… I expected… I couldn’t find…" aria-label="Your feedback" />
            <Button type="submit" disabled={state === 'sending' || (!rating && !text.trim())}>{state === 'sending' ? 'Sending…' : 'Send feedback'}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * The one question after a person's first app. `drawn` counts the planned runs that finished on this page; a few
 * seconds after one does — time to look at the result first — the card arrives if the question is still owed.
 * Rating first; the words are asked only once a rating is given. A close is recorded, so it is never asked twice.
 */
export function FirstAppFeedback({ projectId, drawn }: { projectId: string; drawn: number }) {
  const [shown, setShown] = useState(false)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  useEffect(() => {
    if (!drawn) return
    let live = true
    const t = setTimeout(() => feedbackDue().then((r) => live && r.due && setShown(true)).catch(() => {}), 6000)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [drawn])
  if (!shown) return null
  const close = () => {
    setShown(false)
    if (state !== 'sent') void sendFeedback({ data: { source: 'first-app', rating: rating || null, text: '', projectId } }).catch(() => {})
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setState((await send({ source: 'first-app', rating, text, projectId })) ? 'sent' : 'idle')
  }
  return (
    <aside className="od-rise pointer-events-auto fixed right-4 top-[72px] z-40 w-[320px] rounded-xl border bg-popover p-4 text-popover-foreground shadow-3" aria-label="Feedback">
      <button type="button" onClick={close} aria-label="Close" className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <X className="size-4" />
      </button>
      {state === 'sent' ? (
        <>
          <p className="text-sm font-semibold">Thank you</p>
          <p className="mt-1 text-xs text-muted-foreground">That goes straight to the person building this.</p>
        </>
      ) : (
        <form onSubmit={submit} className="grid gap-3">
          <div className="pr-6">
            <p className="text-sm font-semibold">How did your first app turn out?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">One tap helps a lot.</p>
          </div>
          <Stars value={rating} onChange={setRating} />
          {rating > 0 && (
            <>
              <Textarea className="od-rise" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} placeholder={rating >= 4 ? 'What did you like most? Anything missing?' : 'What was off, or missing?'} aria-label="Tell us more" />
              <Button type="submit" size="sm" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</Button>
            </>
          )}
        </form>
      )}
    </aside>
  )
}
