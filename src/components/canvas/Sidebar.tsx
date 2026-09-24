import { useEffect, useState, type ReactNode } from 'react'
import { MessageSquare, PanelLeftClose, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// UI-22: the conversation is a card floating at the left of the canvas, as in Stitch, not a column
// that takes the width away from the screens. It folds to a pill; the choice is remembered.
const KEY = 'od:chat'

export function useChatOpen(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(true)
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(KEY) !== 'closed')
    } catch {}
  }, [])
  return [
    open,
    (next: boolean) => {
      setOpen(next)
      try {
        localStorage.setItem(KEY, next ? 'open' : 'closed')
      } catch {}
    },
  ]
}

/** Where the chat card sits, so the composer and the canvas can keep clear of it. */
export const CHAT_WIDTH = 348
export const EDGE = 12
export const TOP = 68

export function ChatDock(props: { open: boolean; onOpenChange: (open: boolean) => void; count: number; busy?: boolean; children: ReactNode }) {
  // UI-25: both states stay mounted; the card slides out to the left and the pill fades in, and back.
  return (
    <>
      {!props.open && (
        <Button
          variant="outline"
          className="od-fade absolute z-20 h-10 gap-2 rounded-xl bg-card px-3 shadow-2"
          style={{ left: EDGE, top: TOP }}
          onClick={() => props.onOpenChange(true)}
          aria-label="Show the chat"
        >
          <MessageSquare />
          Chat
          {props.busy ? <span className="size-2 animate-pulse rounded-full bg-primary" aria-label="Working" /> : props.count > 0 && <span className="text-xs tabular-nums text-muted-foreground">{props.count}</span>}
        </Button>
      )}
      <aside
        className="od-slide absolute z-20 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2"
        data-side="left"
        data-open={props.open || undefined}
        inert={!props.open}
        style={{ left: EDGE, top: TOP, bottom: EDGE, width: CHAT_WIDTH }}
        aria-label="Chat"
        aria-hidden={!props.open}
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border pr-1.5 pl-3.5">
          <span className="text-md font-semibold">Chat</span>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={() => props.onOpenChange(false)} aria-label="Hide the chat" title="Hide the chat">
            <PanelLeftClose />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3">{props.children}</div>
      </aside>
    </>
  )
}

/** UI-23: a panel that opens from the right rail (the theme), over the canvas. */
export const SIDE_WIDTH = 320
export function SidePanel(props: { title: string; open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  return (
    <aside
      className={cn('od-slide absolute z-20 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-3', props.className)}
      data-side="right"
      data-open={props.open || undefined}
      inert={!props.open}
      aria-hidden={!props.open}
      // Ends above the bottom-right history/zoom cluster instead of covering it.
      style={{ right: 64, top: TOP, bottom: 64, width: SIDE_WIDTH }}
      aria-label={props.title}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border pr-1.5 pl-3.5">
        <span className="truncate text-md font-semibold capitalize">{props.title}</span>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={props.onClose} aria-label={`Close ${props.title}`}>
          <X />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3.5">{props.children}</div>
      </ScrollArea>
    </aside>
  )
}
