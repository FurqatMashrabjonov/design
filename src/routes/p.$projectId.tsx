import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Check, Loader2, CircleX, Circle, Sparkles } from 'lucide-react'
import { getProject, moveScreen } from '../server/fns'
import { generate } from '../generate'
import { generatePlan } from '../generatePlan'
import type { Plan } from '../server/planner'
import { extractArtifact } from '../artifact'
import { frameSize, nextFramePosition, FRAME_GAP } from '../canvas'
import { PromptBox } from '../PromptBox'
import { ScreenFrame } from '../ScreenFrame'
import { Canvas, type CanvasFrame } from '@/components/canvas/Canvas'
import { TopBar } from '@/components/canvas/TopBar'
import { Sidebar } from '@/components/canvas/Sidebar'
import { ScreensList } from '@/components/canvas/ScreensList'
import { HistoryPanel } from '@/components/canvas/HistoryPanel'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/p/$projectId')({
  validateSearch: (s: Record<string, unknown>): { brief?: string } => (typeof s.brief === 'string' ? { brief: s.brief } : {}),
  loader: ({ params }) => getProject({ data: params.projectId }),
  component: ProjectPage,
})

type ScreenStatus = 'pending' | 'running' | 'done' | 'error'

function ProjectPage() {
  const { project, screens } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const [live, setLive] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  // Multi-screen planning state — only populated when this project was just created from the home page composer.
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planning, setPlanning] = useState(false)
  const [status, setStatus] = useState<Record<number, ScreenStatus>>({})
  const [planErrors, setPlanErrors] = useState<Record<number, string>>({})
  const [planTexts, setPlanTexts] = useState<Record<number, string>>({})
  // Once the real screens (loaded via router.invalidate()) land at the same positions the plan
  // frames used, the plan frames must stop rendering or they'd sit duplicated on top of them.
  const [planFramesSettled, setPlanFramesSettled] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current || screens.length > 0 || !search.brief) return
    started.current = true
    const brief = search.brief
    router.navigate({ to: '.', search: {}, replace: true }) // drop ?brief so a reload never re-triggers
    setPlanning(true)
    generatePlan(project.id, brief, (e) => {
      if (e.type === 'plan') {
        setPlan(e)
        setStatus(Object.fromEntries(e.screens.map((_, i) => [i, 'pending' as ScreenStatus])))
      } else if (e.type === 'screen_start') {
        setStatus((p) => ({ ...p, [e.index]: 'running' }))
      } else if (e.type === 'screen_delta') {
        setPlanTexts((p) => ({ ...p, [e.index]: e.text }))
      } else if (e.type === 'screen_done') {
        setStatus((p) => ({ ...p, [e.index]: 'done' }))
      } else if (e.type === 'screen_error') {
        setStatus((p) => ({ ...p, [e.index]: 'error' }))
        setPlanErrors((p) => ({ ...p, [e.index]: e.message }))
      } else if (e.type === 'done') {
        setPlanning(false)
        router.invalidate().then(() => setPlanFramesSettled(true))
      } else if (e.type === 'error') {
        setPlanning(false)
        toast.error(e.message)
      }
    }).catch((err) => {
      setPlanning(false)
      toast.error(err instanceof Error ? err.message : String(err))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const f = frameSize(project.device)
  const selectedScreen = screens.find((s) => s.id === selected)

  // Editing an existing screen: the live preview takes over its spot. New screen: it lands to the right of the rest.
  const livePos = selectedScreen ? { x: selectedScreen.x, y: selectedScreen.y } : nextFramePosition(screens, project.device)
  const liveFrame: CanvasFrame | null = live ? { id: '__live__', ...livePos, width: f.width, height: f.height } : null
  const visibleScreens = live && selectedScreen ? screens.filter((s) => s.id !== selectedScreen.id) : screens

  const planFrames: CanvasFrame[] =
    plan && !planFramesSettled
      ? plan.screens.map((_, i) => ({ id: `plan-${i}`, x: i * (f.width + FRAME_GAP), y: 0, width: f.width, height: f.height }))
      : []

  const frames: CanvasFrame[] = [
    ...visibleScreens.map((s) => ({ id: s.id, x: s.x, y: s.y, width: f.width, height: f.height })),
    ...(liveFrame ? [liveFrame] : []),
    ...planFrames,
  ]

  function exportSelected() {
    if (!selectedScreen) return
    const blob = new Blob([selectedScreen.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedScreen.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        name={plan?.appName ?? project.name}
        device={project.device}
        designSystem={project.design_system}
        onExport={selectedScreen ? exportSelected : undefined}
      />
      <div className="flex min-h-0 flex-1">
        <div className="relative flex-1">
          <ScreensList screens={screens} selected={selected} onSelect={setSelected} />
          <Canvas
            frames={frames}
            onBackgroundClick={() => setSelected(null)}
            onMove={(id, x, y) => {
              if (id.startsWith('plan-') || id === '__live__') return
              moveScreen({ data: { id, x, y } })
            }}
            renderFrame={(id) => {
              if (id === '__live__')
                return <ScreenFrame html={extractArtifact(live).html} title="Designing…" device={project.device} streaming />
              if (id.startsWith('plan-')) {
                const i = Number(id.slice(5))
                const s = plan!.screens[i]
                const st = status[i]
                if (st === 'pending')
                  return (
                    <div>
                      <p className="mb-2 truncate text-sm font-medium text-muted-foreground">{s.name}</p>
                      <Skeleton style={{ width: f.width, height: f.height }} className="rounded-xl" />
                    </div>
                  )
                return (
                  <ScreenFrame
                    html={extractArtifact(planTexts[i] ?? '').html}
                    title={s.name}
                    device={project.device}
                    streaming={st === 'running'}
                  />
                )
              }
              const s = screens.find((sc) => sc.id === id)!
              return (
                <div onClick={() => setSelected(s.id)}>
                  <ScreenFrame html={s.html} title={s.name} hint={s.prompt} device={project.device} selected={s.id === selected} />
                </div>
              )
            }}
          />
        </div>

        <Sidebar
          chat={
            <>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {plan && <PlanCard plan={plan} status={status} errors={planErrors} />}
              </div>
              {selectedScreen && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Editing <Badge variant="secondary">{selectedScreen.name}</Badge>
                </div>
              )}
              <PromptBox
                placeholder={
                  planning
                    ? 'Designing your screens…'
                    : selectedScreen
                      ? 'Describe the change…'
                      : 'Add another screen to this project…'
                }
                onSubmit={async (prompt) => {
                  try {
                    await generate({ prompt, projectId: project.id, editScreenId: selectedScreen?.id }, setLive)
                    await router.invalidate()
                  } finally {
                    setLive('')
                  }
                }}
              />
            </>
          }
          config={
            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1 text-muted-foreground">Device</div>
                <Badge variant="secondary" className="capitalize">
                  {project.device}
                </Badge>
              </div>
              <div>
                <div className="mb-1 text-muted-foreground">Design system</div>
                <Badge variant="secondary" className="capitalize">
                  {project.design_system}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Device and design system are fixed per project — start a new project to change them.
              </p>
            </div>
          }
          history={<HistoryPanel screenId={selected} onRestored={() => router.invalidate()} />}
        />
      </div>
    </div>
  )
}

function PlanCard(props: { plan: Plan; status: Record<number, ScreenStatus>; errors: Record<number, string> }) {
  const done = Object.values(props.status).filter((s) => s === 'done').length
  const total = props.plan.screens.length
  return (
    <div className="space-y-3 rounded-xl border bg-card p-3.5 text-sm">
      <div className="flex gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">{props.plan.summary}</p>
      </div>
      <ol className="space-y-1.5">
        {props.plan.screens.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <StatusIcon status={props.status[i]} />
            <span className="truncate" title={props.errors[i]}>
              {s.name}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-1">
        {props.plan.tags.map((t) => (
          <Badge key={t} variant="secondary" className="text-xs">
            {t}
          </Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {done === total ? `${total} screens generated` : `Designing… ${done}/${total} done`}
      </p>
    </div>
  )
}

function StatusIcon({ status }: { status?: ScreenStatus }) {
  if (status === 'done') return <Check className="size-3.5 shrink-0 text-primary" />
  if (status === 'running') return <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
  if (status === 'error') return <CircleX className="size-3.5 shrink-0 text-destructive" />
  return <Circle className="size-3.5 shrink-0 text-muted-foreground/40" />
}
