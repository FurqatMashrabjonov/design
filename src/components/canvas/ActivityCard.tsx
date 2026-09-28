import { useEffect, useRef, useState } from 'react'
import { Check, CircleX, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// CHAT-02: what the agent is doing right now, as steps — the same facts the finished message's
// "Agent log" will hold, shown while they happen. Never model tokens: the pipeline's events are the
// only source (architecture rule: the conversation is written by the controllers, in code).

/** What the card needs from a plan event (PlanEvent 'plan'). */
export type PlanShape = { appName: string; screens: { name: string }[] }

export type ScreenStatus = 'pending' | 'running' | 'done' | 'error'

export type Activity =
  | { kind: 'planning'; startedAt: number }
  | { kind: 'drawing'; startedAt: number; plan: PlanShape; status: Record<number, ScreenStatus>; photos: Record<number, number>; errors: Record<number, string>; onFocus: (index: number) => void }
  | { kind: 'editing'; startedAt: number; target: string; parts: string[] }
  | { kind: 'waiting'; startedAt: number; text: string }

/** Seconds since `since`, ticking. */
export function useElapsed(since: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return Math.max(0, Math.round((now - since) / 1000))
}

type StepState = 'done' | 'running' | 'pending' | 'error'

function Step(props: { state: StepState; label: string; detail?: string; error?: string; onClick?: () => void; small?: boolean }) {
  const Tag = props.onClick ? 'button' : 'div'
  return (
    <Tag
      type={props.onClick ? 'button' : undefined}
      onClick={props.onClick}
      className={cn(
        'od-fade flex w-full items-start gap-2 rounded-md px-1 py-0.5 text-left transition-colors duration-(--duration-base)',
        props.small ? 'text-xs' : 'text-sm',
        props.onClick && 'hover:bg-muted/70',
        props.state === 'running' && 'font-medium text-foreground',
        props.state === 'done' && 'text-muted-foreground',
        props.state === 'pending' && 'text-muted-foreground/60',
      )}
      title={props.onClick ? 'Show on the canvas' : undefined}
    >
      <span className={cn('grid shrink-0 place-items-center', props.small ? 'h-4 w-3.5' : 'h-5 w-3.5')}>
        {props.state === 'done' ? (
          <Check className="size-3.5" />
        ) : props.state === 'running' ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : props.state === 'error' ? (
          <CircleX className="size-3.5 text-destructive" />
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{props.label}</span>
        {props.error && <span className="block truncate font-normal text-destructive">{props.error}</span>}
      </span>
      {props.detail && <span className="shrink-0 font-normal tabular-nums text-muted-foreground">{props.detail}</span>}
    </Tag>
  )
}

const secs = (ms: number) => `${Math.max(0, Math.round(ms / 1000))}s`

/** Per-step timing, from when this card first saw a step running to when it saw it finish. */
function useStepClock() {
  const clock = useRef(new Map<string, { start?: number; end?: number }>())
  // ponytail: recorded while rendering (idempotent); a step that finished before the card mounted shows no time.
  return (key: string, state: StepState, startedAt?: number) => {
    const now = Date.now()
    const t = clock.current.get(key) ?? {}
    clock.current.set(key, t)
    if (state === 'running' && t.start === undefined) t.start = startedAt ?? now
    if ((state === 'done' || state === 'error') && t.start !== undefined && t.end === undefined) t.end = now
    return t.start === undefined || state === 'pending' ? undefined : secs((t.end ?? now) - t.start)
  }
}

export function ActivityCard({ activity }: { activity: Activity }) {
  useElapsed(activity.startedAt) // re-renders every second, so running steps tick
  const timeOf = useStepClock()
  const total = secs(Date.now() - activity.startedAt)
  const card = 'od-rise space-y-2 rounded-2xl border bg-card p-3 shadow-1'
  if (activity.kind !== 'drawing')
    return (
      <div className={card} aria-live="polite">
        {activity.kind === 'planning' && <Step state="running" label="Planning the app" detail={timeOf('plan', 'running', activity.startedAt)} />}
        {activity.kind === 'waiting' && <Step state="running" label={activity.text} detail={total} />}
        {activity.kind === 'editing' && (
          <>
            <Step state="running" label={`Working on “${activity.target}”`} detail={total} />
            {activity.parts.length > 0 && (
              <p className="pl-6.5 text-xs text-muted-foreground">
                Editing {activity.parts.length} part{activity.parts.length === 1 ? '' : 's'}: {activity.parts.slice(0, 4).join(', ')}
                {activity.parts.length > 4 ? '…' : ''}
              </p>
            )}
          </>
        )}
      </div>
    )

  const screens = activity.plan.screens
  const finished = screens.filter((_, i) => activity.status[i] === 'done' || activity.status[i] === 'error').length
  const allDone = finished === screens.length
  return (
    <div className={card} aria-live="polite">
      <div className="flex items-center gap-2 px-1 text-sm">
        <span className="min-w-0 flex-1 truncate font-medium">
          {allDone ? `Drew ${screens.length} screens` : `Drawing ${screens.length} screens`}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {finished}/{screens.length} · {total}
        </span>
      </div>
      <div className="od-progress mx-1" role="progressbar" aria-valuemin={0} aria-valuemax={screens.length} aria-valuenow={finished}>
        <span style={{ width: `${Math.max(4, (finished / Math.max(1, screens.length)) * 100)}%` }} />
      </div>
      <ol className="space-y-px">
        <li>
          <Step small state="done" label="Planned the app" detail={timeOf('plan', 'done')} />
        </li>
        {screens.map((s, i) => {
          const st = activity.status[i] ?? 'pending'
          const photos = activity.photos[i] ?? 0
          const time = timeOf(`screen-${i}`, st)
          return (
            <li key={i}>
              <Step
                small
                state={st}
                label={s.name}
                error={st === 'error' ? (activity.errors[i] ?? 'Failed') : undefined}
                detail={st === 'running' && photos ? `${photos} photo${photos === 1 ? '' : 's'} · ${time ?? ''}` : time}
                onClick={st === 'pending' ? undefined : () => activity.onFocus(i)}
              />
            </li>
          )
        })}
      </ol>
    </div>
  )
}
