import { useEffect, useState } from 'react'
import { Check, Circle, CircleX, Loader2, Sparkles, X } from 'lucide-react'
import type { Plan } from '@/app/Services/PlannerService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// CHAT-02: what the agent is doing right now, as steps — the same facts the finished message's
// "Agent log" will hold, shown while they happen. Never model tokens: the pipeline's events are the
// only source (architecture rule: the conversation is written by the controllers, in code).

export type ScreenStatus = 'pending' | 'running' | 'done' | 'error'

export type Activity =
  | { kind: 'planning'; startedAt: number }
  | { kind: 'drawing'; startedAt: number; plan: Plan; status: Record<number, ScreenStatus>; photos: Record<number, number>; errors: Record<number, string>; onFocus: (index: number) => void }
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

function Step(props: { state: 'done' | 'running' | 'pending' | 'error'; label: string; detail?: string; onClick?: () => void; small?: boolean }) {
  const Icon = props.state === 'done' ? Check : props.state === 'running' ? Loader2 : props.state === 'error' ? CircleX : Circle
  const Tag = props.onClick ? 'button' : 'div'
  return (
    <Tag
      type={props.onClick ? 'button' : undefined}
      onClick={props.onClick}
      className={cn('flex w-full items-center gap-2 text-left', props.small ? 'text-xs' : 'text-sm', props.onClick && 'rounded hover:bg-muted/60', props.state === 'pending' && 'text-muted-foreground')}
      title={props.onClick ? 'Show on the canvas' : undefined}
    >
      <Icon
        className={cn(
          'size-3.5 shrink-0',
          props.state === 'done' && 'text-foreground',
          props.state === 'running' && 'animate-spin text-muted-foreground',
          props.state === 'error' && 'text-destructive',
          props.state === 'pending' && 'text-muted-foreground/40',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{props.label}</span>
      {props.detail && <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{props.detail}</span>}
    </Tag>
  )
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const elapsed = useElapsed(activity.startedAt)
  const time = `${elapsed}s`
  return (
    <div className="space-y-1.5 rounded-xl border bg-card p-3" aria-live="polite">
      {activity.kind === 'planning' && <Step state="running" label="Planning the app" detail={time} />}
      {activity.kind === 'waiting' && <Step state="running" label={activity.text} detail={time} />}
      {activity.kind === 'editing' && (
        <>
          <Step state="running" label={`Working on “${activity.target}”`} detail={time} />
          {activity.parts.length > 0 && (
            <p className="pl-5.5 text-xs text-muted-foreground">
              Editing {activity.parts.length} part{activity.parts.length === 1 ? '' : 's'}: {activity.parts.slice(0, 4).join(', ')}
              {activity.parts.length > 4 ? '…' : ''}
            </p>
          )}
        </>
      )}
      {activity.kind === 'drawing' && (
        <>
          <Step state="done" label="Planned the app" />
          <Step
            state={Object.values(activity.status).every((s) => s === 'done' || s === 'error') ? 'done' : 'running'}
            label={`Drawing ${activity.plan.screens.length} screens`}
            detail={time}
          />
          <ol className="space-y-0.5 pl-5.5">
            {activity.plan.screens.map((s, i) => {
              const st = activity.status[i] ?? 'pending'
              const photos = activity.photos[i] ?? 0
              return (
                <li key={i}>
                  <Step
                    small
                    state={st}
                    label={st === 'error' ? `${s.name} — ${activity.errors[i] ?? 'failed'}` : s.name}
                    detail={st === 'running' && photos ? `${photos} photo${photos === 1 ? '' : 's'}` : undefined}
                    onClick={st === 'pending' ? undefined : () => activity.onFocus(i)}
                  />
                </li>
              )
            })}
          </ol>
        </>
      )}
    </div>
  )
}

// CHAT-08: the plan before anything is drawn. The person renames or removes screens, then draws;
// a wrong plan costs nothing this way, where it used to cost six screens' worth of tokens.
export function PlanApproval(props: {
  plan: Plan
  onDraw: (edits: { keep: number[]; names: Record<number, string> }, askNextTime: boolean) => void
  onDiscard: () => void
  askNextTime: boolean
}) {
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [names, setNames] = useState<Record<number, string>>({})
  const [ask, setAsk] = useState(props.askNextTime)
  const keep = props.plan.screens.map((_, i) => i).filter((i) => !removed.has(i))
  return (
    <div className="space-y-3 rounded-xl border border-lime-500/60 bg-card shadow-1 p-3.5 text-sm">
      <div className="flex gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-foreground" />
        <div className="min-w-0">
          <p className="font-medium">{props.plan.appName}</p>
          <p className="text-muted-foreground">{props.plan.summary}</p>
        </div>
      </div>
      <ol className="space-y-1">
        {props.plan.screens.map((s, i) => (
          <li key={i} className={cn('flex items-center gap-1.5', removed.has(i) && 'opacity-40')}>
            <span className="w-4 shrink-0 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
            <Input
              value={names[i] ?? s.name}
              disabled={removed.has(i)}
              onChange={(e) => setNames((n) => ({ ...n, [i]: e.target.value }))}
              className="h-7 flex-1 text-sm"
              aria-label={`Name of screen ${i + 1}`}
              maxLength={60}
            />
            <button
              type="button"
              onClick={() => setRemoved((r) => { const next = new Set(r); if (next.has(i)) next.delete(i); else next.add(i); return next })}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title={removed.has(i) ? 'Keep this screen' : 'Remove this screen'}
              aria-label={removed.has(i) ? `Keep ${s.name}` : `Remove ${s.name}`}
            >
              {removed.has(i) ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            </button>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        {props.plan.navigation.tabs.length} tabs: {props.plan.navigation.tabs.map((t) => t.label).join(', ')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={keep.length === 0} onClick={() => props.onDraw({ keep, names }, ask)}>
          Draw {keep.length} screen{keep.length === 1 ? '' : 's'}
        </Button>
        <Button size="sm" variant="ghost" onClick={props.onDiscard}>
          Discard
        </Button>
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={!ask} onChange={(e) => setAsk(!e.target.checked)} className="accent-primary" />
          Don't ask next time
        </label>
      </div>
    </div>
  )
}
