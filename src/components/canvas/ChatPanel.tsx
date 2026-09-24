import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ChevronRight, CircleAlert, Copy, Loader2, Pencil, Plus, RotateCw, Sparkles, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import type { MessageRow } from '@/app/Models/Message'
import { parseMeta } from '@/lib/agent-messages'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// The project's conversation: what was asked and what the agent did about it, with a way back.
export function ChatPanel(props: {
  messages: MessageRow[]
  /** The card for work in progress (the live activity, a plan awaiting approval), after the last message. */
  running?: ReactNode
  screenIds: Set<string>
  device: string
  onFocusScreen: (id: string) => void
  onRevert: (messageId: string) => Promise<void>
  /** CHAT-04: put this text back in the box (edit & resend), or send it again as it is (retry). */
  onEdit: (text: string) => void
  onResend: (text: string) => void
  /** CHAT-06: what to do next, shown under the last agent message while nothing runs. */
  suggestions?: string[]
  onSuggest?: (text: string) => void
  empty: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  // CHAT-05: follow the conversation only while the reader is at its end. Someone reading an
  // earlier message is not yanked down; a pill tells them there is more below.
  const [atBottom, setAtBottom] = useState(true)
  const [unseen, setUnseen] = useState(0)
  const count = props.messages.length
  const seen = useRef(count)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    if (atBottom) {
      el.scrollTop = el.scrollHeight
      seen.current = count
      setUnseen(0)
    } else if (count > seen.current) {
      setUnseen(count - seen.current)
    }
  }, [count, props.running, atBottom])
  function onScroll() {
    const el = scroller.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAtBottom(near)
    if (near) {
      seen.current = count
      setUnseen(0)
    }
  }

  if (count === 0 && !props.running) return <div className="min-h-0 flex-1 overflow-y-auto">{props.empty}</div>

  const lastAgent = [...props.messages].reverse().find((m) => m.role === 'agent')
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="h-full space-y-4 overflow-y-auto pr-1">
        {props.messages.map((m, i) =>
          m.role === 'user' ? (
            <UserMessage key={m.id} message={m} onEdit={props.onEdit} />
          ) : (
            <AgentMessage key={m.id} message={m} asked={askedBefore(props.messages, i)} {...props}>
              {!props.running && m === lastAgent && props.suggestions && props.suggestions.length > 0 && (
                <Suggestions items={props.suggestions} onPick={(text) => props.onSuggest?.(text)} className="pt-1" />
              )}
            </AgentMessage>
          ),
        )}
        {props.running}
      </div>
      {!atBottom && (
        <button
          type="button"
          onClick={() => {
            const el = scroller.current
            if (el) el.scrollTop = el.scrollHeight
            setAtBottom(true)
          }}
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs shadow-md hover:bg-muted"
        >
          <ArrowDown className="size-3.5" />
          {unseen > 0 ? `${unseen} new` : props.running ? 'New activity' : 'Latest'}
        </button>
      )}
    </div>
  )
}

/** CHAT-06 / UI-13: next steps as chips; picking one puts it in the composer, it never sends. */
export function Suggestions(props: { items: string[]; onPick: (text: string) => void; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', props.className)}>
      {props.items.map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => props.onPick(text)}
          className="inline-flex max-w-full items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-ring/40 hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{text}</span>
        </button>
      ))}
    </div>
  )
}

/** UI-13: a conversation with nothing in it yet — what this panel is for, and a few ways to start. */
export function ChatEmpty(props: { suggestions: string[]; onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col justify-end gap-4 px-1 pb-2">
      <div className="space-y-1.5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <p className="pt-1 text-base font-semibold">What should we design?</p>
        <p className="text-sm text-muted-foreground">Describe a screen or a change. Everything the agent does shows up here, with a way back.</p>
      </div>
      <Suggestions items={props.suggestions} onPick={props.onPick} />
    </div>
  )
}

/** The person's message that this agent message answers — the one right before it. */
function askedBefore(messages: MessageRow[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i]!.role === 'user') return messages[i]!.text
    if (messages[i]!.role === 'agent') return null
  }
  return null
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copied')
  } catch {
    toast.error('Could not copy')
  }
}

function IconAction(props: { title: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button type="button" onClick={props.onClick} title={props.title} aria-label={props.title} className={cn('rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground', props.danger && 'hover:text-destructive')}>
      {props.children}
    </button>
  )
}

function UserMessage({ message, onEdit }: { message: MessageRow; onEdit: (text: string) => void }) {
  return (
    <div className="group flex flex-col items-end gap-0.5">
      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-1">{message.text}</p>
      {/* CHAT-04: the actions every chat has, shown when the pointer is on the message. */}
      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <IconAction title="Edit and resend" onClick={() => onEdit(message.text)}>
          <Pencil className="size-3.5" />
        </IconAction>
        <IconAction title="Copy" onClick={() => copyText(message.text)}>
          <Copy className="size-3.5" />
        </IconAction>
      </div>
    </div>
  )
}

function AgentMessage(props: {
  message: MessageRow
  asked: string | null
  screenIds: Set<string>
  device: string
  onFocusScreen: (id: string) => void
  onRevert: (messageId: string) => Promise<void>
  onResend: (text: string) => void
  children?: ReactNode
}) {
  const m = props.message
  const meta = parseMeta(m.meta)
  const [reverting, setReverting] = useState(false)
  const [error, setError] = useState('')
  const isError = m.kind === 'error'
  // Only a step that left something to go back to: a snapshot, or a screen it created that still exists.
  // A revert message is revertible too: undoing an undo is the redo.
  const revertible =
    !meta.reverted &&
    (meta.previousTheme !== undefined ||
      (['add', 'edit', 'element', 'regenerate', 'direct', 'revert'].includes(m.kind) && (meta.screens ?? []).some((s) => s.removed || (props.screenIds.has(s.id) && (s.created || s.versionId)))))
  // CHAT-06: a change to an existing screen has a before (the snapshot) and an after (the screen now).
  const changed = !meta.reverted && ['edit', 'element', 'regenerate', 'direct'].includes(m.kind) ? (meta.screens ?? []).find((s) => s.versionId && props.screenIds.has(s.id)) : undefined

  async function revert() {
    setReverting(true)
    setError('')
    try {
      await props.onRevert(m.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setReverting(false)
    }
  }

  return (
    <div className={cn('group space-y-2.5 rounded-2xl rounded-bl-md border bg-card p-3.5 text-sm shadow-1', isError && 'border-destructive/40 bg-destructive/5')}>
      <div className="flex gap-2">
        {isError && <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />}
        <p className={cn('min-w-0 flex-1 whitespace-pre-wrap break-words', meta.reverted && 'text-muted-foreground line-through')}>{m.text}</p>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {props.asked && !isError && (
            <IconAction title="Ask again" onClick={() => props.onResend(props.asked!)}>
              <RotateCw className="size-3.5" />
            </IconAction>
          )}
          <IconAction title="Copy" onClick={() => copyText(m.text)}>
            <Copy className="size-3.5" />
          </IconAction>
        </div>
      </div>

      {isError && props.asked && (
        <Button size="sm" variant="outline" onClick={() => props.onResend(props.asked!)}>
          <RotateCw className="size-3.5" /> Try again
        </Button>
      )}

      {changed && (
        <BeforeAfter screenId={changed.id} versionId={changed.versionId!} device={props.device} onOpen={() => props.onFocusScreen(changed.id)} />
      )}

      {(meta.screens ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {meta.screens!.map((s) =>
            props.screenIds.has(s.id) ? (
              <button
                key={s.id}
                type="button"
                onClick={() => props.onFocusScreen(s.id)}
                className="max-w-full truncate rounded-md border bg-background px-2 py-0.5 text-xs hover:border-ring/40 hover:text-foreground"
                title="Show on the canvas"
              >
                {s.name}
              </button>
            ) : (
              <span key={s.id} className="max-w-full truncate rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                {s.name}
              </span>
            ),
          )}
        </div>
      )}

      {(revertible || (meta.log ?? []).length > 0) && (
        <div className="flex items-start justify-between gap-2 pt-0.5">
          {(meta.log ?? []).length > 0 ? (
            <details className="group/log min-w-0 flex-1 text-xs text-muted-foreground">
              <summary className="flex cursor-pointer list-none items-center gap-1 hover:text-foreground">
                <ChevronRight className="size-3.5 transition-transform group-open/log:rotate-90" />
                Agent log{meta.durationMs ? ` · ${(meta.durationMs / 1000).toFixed(0)}s` : ''}
              </summary>
              <ul className="mt-1.5 space-y-1 border-l pl-3 font-mono text-xs leading-snug">
                {meta.log!.map((line, i) => (
                  <li key={i} className="break-words">
                    {line}
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <span />
          )}
          {revertible && (
            <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 px-2 text-xs" disabled={reverting} onClick={revert} title="Put the screen back the way it was before this step">
              {reverting ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
              {m.kind === 'revert' ? 'Redo' : 'Undo'}
            </Button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {props.children}
    </div>
  )
}

/** CHAT-06: the screen as it was and as it is, small, side by side. */
function BeforeAfter(props: { screenId: string; versionId: string; device: string; onOpen: () => void }) {
  const width = 96
  const frame = (src: string, label: string) => (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-lg border bg-card" style={{ width, height: Math.round(width * 1.6) }}>
        <iframe src={src} title={label} aria-hidden tabIndex={-1} loading="lazy" sandbox="allow-scripts" className="pointer-events-none origin-top-left border-0" style={{ width: 390, height: 390 * 1.6, transform: `scale(${width / 390})` }} />
      </div>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  )
  return (
    <button type="button" onClick={props.onOpen} className="flex items-start gap-3 rounded-lg p-1 text-left hover:bg-muted/60" title="Show on the canvas">
      {frame(`/api/thumb/${props.screenId}?v=${encodeURIComponent(props.versionId)}`, 'Before')}
      <span className="self-center text-muted-foreground">→</span>
      {frame(`/api/thumb/${props.screenId}`, 'After')}
    </button>
  )
}
