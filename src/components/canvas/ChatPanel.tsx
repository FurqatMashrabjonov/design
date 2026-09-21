import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, CircleAlert, Loader2, Undo2 } from 'lucide-react'
import type { MessageRow } from '@/app/Models/Message'
import { parseMeta } from '@/lib/agent-messages'
import { cn } from '@/lib/utils'

// The project's conversation: what was asked and what the agent did about it, with a way back.
export function ChatPanel(props: {
  messages: MessageRow[]
  /** The card for work in progress (plan progress, "Designing…"), rendered after the last message. */
  running?: ReactNode
  screenIds: Set<string>
  onFocusScreen: (id: string) => void
  onRevert: (messageId: string) => Promise<void>
  empty: ReactNode
}) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [props.messages.length, props.running])

  if (props.messages.length === 0 && !props.running) return <div className="min-h-0 flex-1 overflow-y-auto">{props.empty}</div>

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      {props.messages.map((m) => (m.role === 'user' ? <UserMessage key={m.id} message={m} /> : <AgentMessage key={m.id} message={m} {...props} />))}
      {props.running}
      <div ref={endRef} />
    </div>
  )
}

function UserMessage({ message }: { message: MessageRow }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">{message.text}</p>
    </div>
  )
}

function AgentMessage(props: { message: MessageRow; screenIds: Set<string>; onFocusScreen: (id: string) => void; onRevert: (messageId: string) => Promise<void> }) {
  const m = props.message
  const meta = parseMeta(m.meta)
  const [reverting, setReverting] = useState(false)
  const [error, setError] = useState('')
  const isError = m.kind === 'error'
  // Only a step that left something to go back to: a snapshot, or a screen it created that still exists.
  const revertible =
    !meta.reverted &&
    ((m.kind === 'theme' && meta.previousTheme !== undefined) ||
      (['add', 'edit', 'element', 'regenerate', 'direct'].includes(m.kind) && (meta.screens ?? []).some((s) => props.screenIds.has(s.id) && (s.created || s.versionId))))

  return (
    <div className={cn('space-y-2 rounded-xl border bg-card p-3 text-sm', isError && 'border-destructive/40 bg-destructive/5')}>
      <div className="flex gap-2">
        {isError && <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />}
        <p className={cn('whitespace-pre-wrap break-words', meta.reverted && 'text-muted-foreground line-through')}>{m.text}</p>
      </div>

      {(meta.screens ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {meta.screens!.map((s) =>
            props.screenIds.has(s.id) ? (
              <button
                key={s.id}
                type="button"
                onClick={() => props.onFocusScreen(s.id)}
                className="max-w-full truncate rounded-md border bg-background px-2 py-0.5 text-xs hover:border-primary/60 hover:text-primary"
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
            <details className="group min-w-0 flex-1 text-xs text-muted-foreground">
              <summary className="flex cursor-pointer list-none items-center gap-1 hover:text-foreground">
                <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
                Agent log{meta.durationMs ? ` · ${(meta.durationMs / 1000).toFixed(0)}s` : ''}
              </summary>
              <ul className="mt-1.5 space-y-1 border-l pl-3 font-mono text-[11px] leading-snug">
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
            <button
              type="button"
              disabled={reverting}
              onClick={async () => {
                setReverting(true)
                setError('')
                try {
                  await props.onRevert(m.id)
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e))
                } finally {
                  setReverting(false)
                }
              }}
              className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Put the screen back the way it was before this step"
            >
              {reverting ? <Loader2 className="size-3 animate-spin" /> : <Undo2 className="size-3" />}
              Undo this step
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
