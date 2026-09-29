import { useState } from 'react'
import { Globe, Lock, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { shareProject } from '@/server/fns'
import { copyText } from '@/lib/clipboard'

// SHR-02: who can open the preview. Private (the default) is the owner only; Public makes a link anyone can open,
// view only. Turning it off kills the link — turning it on again makes a new one. A link per channel carries `ref`,
// so the admin sees which post brought views and waitlist sign-ups (WLT-01).
const CHANNELS = [
  { ref: 'reddit', label: 'Reddit' },
  { ref: 'x', label: 'X' },
  { ref: 'threads', label: 'Threads' },
]

export function ShareDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; token: string | null; onToken: (t: string | null) => void }) {
  const [busy, setBusy] = useState(false)
  const link = (ref?: string) => (props.token ? `${location.origin}/s/${props.token}${ref ? `?ref=${ref}` : ''}` : '')

  async function set(on: boolean) {
    if (busy || on === !!props.token) return
    setBusy(true)
    try {
      const { token } = await shareProject({ data: { id: props.projectId, on } })
      props.onToken(token)
      toast.success(on ? 'Anyone with the link can now view this app' : 'The link is off — only you can see this app')
    } catch {
      toast.error('Could not change sharing — try again')
    } finally {
      setBusy(false)
    }
  }

  const option = (on: boolean, icon: React.ReactNode, title: string, text: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={on === !!props.token}
      disabled={busy}
      onClick={() => set(on)}
      className={cn(
        'flex flex-1 items-start gap-3 rounded-lg border p-3 text-left outline-none transition-colors duration-(--duration-fast) focus-visible:ring-2 focus-visible:ring-ring',
        on === !!props.token ? 'border-foreground bg-muted/60' : 'border-border hover:bg-muted/40',
      )}
    >
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
    </button>
  )

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share preview</DialogTitle>
          <DialogDescription>A clickable preview of the app. Viewers can tap through it; they cannot edit or export.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Who can view" className="flex gap-2">
          {option(false, <Lock className="size-4" />, 'Private', 'Only you')}
          {option(true, <Globe className="size-4" />, 'Public link', 'Anyone with the link')}
        </div>
        {props.token && (
          <div className="grid gap-3">
            <div className="flex gap-2">
              <Input readOnly value={link()} onFocus={(e) => e.currentTarget.select()} aria-label="Public link" />
              <Button onClick={() => copyText(link(), 'Link copied')}>
                <Copy /> Copy
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              Link for a post, to see which one brings people:
              {CHANNELS.map((c) => (
                <Button key={c.ref} size="sm" variant="outline" className="h-7 rounded-full" onClick={() => copyText(link(c.ref), `${c.label} link copied`)}>
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
