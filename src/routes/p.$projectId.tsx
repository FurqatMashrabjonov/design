import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Check, Loader2, CircleX, Circle, Sparkles, MousePointerClick, X } from 'lucide-react'
import { getProject, moveScreen, deleteProject, renameScreen, deleteScreen, duplicateScreen, saveTheme, saveScreenHeight } from '../server/fns'
import { generate } from '../generate'
import { generatePlan } from '../generatePlan'
import type { Plan } from '@/app/Services/PlannerService'
import { extractArtifact } from '../artifact'
import { frameSize, nextFramePosition, FRAME_GAP } from '../canvas'
import { PromptBox } from '../PromptBox'
import { ScreenFrame } from '../ScreenFrame'
import { Canvas, type CanvasFrame } from '@/components/canvas/Canvas'
import { TopBar } from '@/components/canvas/TopBar'
import { Sidebar } from '@/components/canvas/Sidebar'
import { ScreensList } from '@/components/canvas/ScreensList'
import { HistoryPanel } from '@/components/canvas/HistoryPanel'
import { CritiquePanel } from '@/components/canvas/CritiquePanel'
import { FrameToolbar } from '@/components/canvas/FrameToolbar'
import { FrameContextMenu } from '@/components/canvas/FrameContextMenu'
import { CodeDialog } from '@/components/canvas/CodeDialog'
import { ThemePanel } from '@/components/canvas/ThemePanel'
import { applyThemeOverride, parseTheme, type Theme } from '@/lib/theme-override'
import { extractRootBlock, parseDeclarations } from '@/lib/screen-normalizer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  const navigate = useNavigate()
  const [live, setLive] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [inspectMode, setInspectMode] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('chat')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [codeScreenId, setCodeScreenId] = useState<string | null>(null)

  // Theme overrides live on the project and are applied at render time, so a change restyles
  // every frame at once with no regeneration. State updates immediately; the save is debounced
  // so dragging a colour picker doesn't write on every tick.
  const [theme, setTheme] = useState<Theme>(() => parseTheme(project.theme))
  const themeSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  function changeTheme(next: Theme) {
    setTheme(next)
    clearTimeout(themeSaveTimer.current)
    themeSaveTimer.current = setTimeout(() => {
      saveTheme({ data: { projectId: project.id, theme: next } }).catch((e) =>
        toast.error(e instanceof Error ? e.message : 'Could not save the theme'),
      )
    }, 400)
  }
  // The design system's own accent, read back from a generated screen (the normalizer put it there).
  const baseAccent = useMemo(() => {
    const drawn = screens.find((sc) => sc.html)
    const block = drawn ? extractRootBlock(drawn.html) : null
    const value = block ? parseDeclarations(block).get('--accent') : undefined
    return value && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#2952cc'
  }, [screens])

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

  // Frames grow to fit their screen. The stored height keeps the canvas laid out correctly on load;
  // the frame re-measures itself once rendered and the new value is saved for next time.
  const [heights, setHeights] = useState<Record<string, number>>({})
  const heightSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const frameHeight = (screen: { id: string; height: number | null }) =>
    heights[screen.id] ?? screen.height ?? f.height
  function reportHeight(id: string, height: number) {
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }))
    clearTimeout(heightSaveTimers.current[id])
    heightSaveTimers.current[id] = setTimeout(() => {
      saveScreenHeight({ data: { id, height } }).catch(() => {}) // layout only; a failed save just re-measures next load
    }, 500)
  }

  // Editing an existing screen: the live preview takes over its spot. New screen: it lands to the right of the rest.
  const livePos = selectedScreen ? { x: selectedScreen.x, y: selectedScreen.y } : nextFramePosition(screens, project.device)
  const liveFrame: CanvasFrame | null = live ? { id: '__live__', ...livePos, width: f.width, height: f.height } : null
  const visibleScreens = live && selectedScreen ? screens.filter((s) => s.id !== selectedScreen.id) : screens

  const planFrames: CanvasFrame[] =
    plan && !planFramesSettled
      ? plan.screens.map((_, i) => ({ id: `plan-${i}`, x: i * (f.width + FRAME_GAP), y: 0, width: f.width, height: f.height }))
      : []

  const frames: CanvasFrame[] = [
    ...visibleScreens.map((s) => ({ id: s.id, x: s.x, y: s.y, width: f.width, height: frameHeight(s) })),
    ...(liveFrame ? [liveFrame] : []),
    ...planFrames,
  ]

  function exportSelected() {
    if (!selectedScreen) return
    const blob = new Blob([applyThemeOverride(selectedScreen.html, theme)], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedScreen.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Draws the screen again from what it was planned to be (its stored spec), in the same slot, with
  // the app's context. The current design becomes a version. Also how a failed screen is retried.
  async function regenerateScreen(screen: (typeof screens)[number]) {
    setSelected(screen.id)
    try {
      await generate({ prompt: '', projectId: project.id, regenerateScreenId: screen.id }, setLive)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      await router.invalidate() // a failure is recorded on the screen too
      setLive('')
    }
  }

  async function copyHtml(html: string) {
    try {
      await navigator.clipboard.writeText(html)
      toast.success('HTML copied')
    } catch {
      toast.error('Could not copy — clipboard access was blocked')
    }
  }

  const codeScreen = screens.find((s) => s.id === codeScreenId) ?? null

  function openPreview() {
    const first = [...screens].sort((a, b) => a.x - b.x)[0]
    const start = screens.find((sc) => sc.id === selected) ?? first
    window.open(`/preview/${project.id}${start ? `?s=${start.id}` : ''}`, '_blank', 'noopener')
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        name={plan?.appName ?? project.name}
        device={project.device}
        designSystem={project.designSystem}
        onExport={selectedScreen ? exportSelected : undefined}
        canPreview={screens.length > 0}
        onPreview={openPreview}
        onDeleteProject={async () => {
          try {
            await deleteProject({ data: project.id })
            navigate({ to: '/' })
          } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e))
          }
        }}
      />
      <div className="flex min-h-0 flex-1">
        <div className="relative flex-1">
          <ScreensList screens={screens} selected={selected} onSelect={setSelected} />
          <Canvas
            frames={frames}
            fitKey={`${screens.length}:${planFrames.length}`}
            onBackgroundClick={() => setSelected(null)}
            onMove={(id, x, y) => {
              if (id.startsWith('plan-') || id === '__live__') return
              moveScreen({ data: { id, x, y } })
            }}
            renderFrame={(id) => {
              if (id === '__live__')
                return <ScreenFrame html={extractArtifact(live).html} title="Designing…" device={project.device} theme={theme} streaming />
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
                    theme={theme}
                    streaming={st === 'running'}
                  />
                )
              }
              const s = screens.find((sc) => sc.id === id)!
              if (!s.html)
                return (
                  <FailedFrame
                    name={s.name}
                    error={s.error}
                    width={f.width}
                    height={f.height}
                    onRetry={() => regenerateScreen(s)}
                    onDelete={async () => {
                      await deleteScreen({ data: { id: s.id, projectId: project.id } })
                      await router.invalidate()
                    }}
                  />
                )
              return (
                <FrameContextMenu
                  onRename={() => setRenamingId(s.id)}
                  onDuplicate={async () => {
                    await duplicateScreen({ data: { id: s.id, projectId: project.id } })
                    await router.invalidate()
                  }}
                  onRegenerate={() => regenerateScreen(s)}
                  onCopyHtml={() => copyHtml(applyThemeOverride(s.html, theme))}
                  onViewCode={() => setCodeScreenId(s.id)}
                  onOpenHistory={() => {
                    setSelected(s.id)
                    setSidebarTab('history')
                  }}
                  onDelete={() => setDeleteTargetId(s.id)}
                >
                  <div onClick={() => setSelected(s.id)}>
                    <ScreenFrame
                      html={s.html}
                      title={s.name}
                      hint={s.prompt}
                      device={project.device}
                      theme={theme}
                      frameId={s.id}
                      height={frameHeight(s)}
                      onHeight={reportHeight}
                      selected={s.id === selected}
                      inspectMode={inspectMode && s.id === selected}
                      selectedElementId={s.id === selected ? selectedElementId : null}
                      onSelectElement={(elId) => {
                        setSelected(s.id)
                        setSelectedElementId(elId)
                        setSidebarTab('chat')
                        toast.info(`Selected element: ${elId}`)
                      }}
                      label={
                        <FrameToolbar
                          name={s.name}
                          hint={s.prompt}
                          editing={renamingId === s.id}
                          onStartRename={() => setRenamingId(s.id)}
                          onCancelRename={() => setRenamingId(null)}
                          onRename={async (name) => {
                            await renameScreen({ data: { id: s.id, projectId: project.id, name } })
                            setRenamingId(null)
                            await router.invalidate()
                          }}
                          onDuplicate={async () => {
                            await duplicateScreen({ data: { id: s.id, projectId: project.id } })
                            await router.invalidate()
                          }}
                          deleteConfirming={deleteTargetId === s.id}
                          onRequestDelete={() => setDeleteTargetId(s.id)}
                          onCancelDelete={() => setDeleteTargetId(null)}
                          onDelete={async () => {
                            await deleteScreen({ data: { id: s.id, projectId: project.id } })
                            if (selected === s.id) setSelected(null)
                            setDeleteTargetId(null)
                            await router.invalidate()
                          }}
                        />
                      }
                    />
                  </div>
                </FrameContextMenu>
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
                <div className="space-y-2 rounded-lg border bg-muted/30 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      Editing <Badge variant="secondary">{selectedScreen.name}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant={inspectMode ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => {
                        setInspectMode(!inspectMode)
                        if (inspectMode) setSelectedElementId(null)
                      }}
                    >
                      <MousePointerClick className="mr-1 size-3" />
                      {inspectMode ? 'Selecting...' : 'Select Element'}
                    </Button>
                  </div>

                  {selectedElementId && (
                    <div className="flex items-center justify-between rounded bg-primary/10 px-2 py-1 text-primary">
                      <span className="truncate font-mono font-medium">
                        Target: [{selectedElementId}]
                      </span>
                      <button
                        type="button"
                        className="ml-1 rounded p-0.5 hover:bg-primary/20"
                        onClick={() => setSelectedElementId(null)}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <PromptBox
                placeholder={
                  planning
                    ? 'Designing your screens…'
                    : selectedElementId
                      ? `Describe changes to [${selectedElementId}]…`
                      : selectedScreen
                        ? 'Describe the change…'
                        : 'Add another screen to this project…'
                }
                onSubmit={async (prompt) => {
                  try {
                    await generate(
                      {
                        prompt,
                        projectId: project.id,
                        editScreenId: selectedScreen?.id,
                        editElementId: selectedElementId ?? undefined,
                      },
                      setLive
                    )
                    setSelectedElementId(null)
                    setInspectMode(false)
                    await router.invalidate()
                  } finally {
                    setLive('')
                  }
                }}
              />
            </>
          }
          jury={
            <CritiquePanel
              selectedScreen={selectedScreen ?? null}
              projectId={project.id}
              onRestored={() => router.invalidate()}
            />
          }
          config={
            <div className="space-y-6 text-sm">
              <ThemePanel theme={theme} baseAccent={baseAccent} onChange={changeTheme} />
              <div>
                <div className="mb-1 text-muted-foreground">Device</div>
                <Badge variant="secondary" className="capitalize">
                  {project.device}
                </Badge>
              </div>
              <div>
                <div className="mb-1 text-muted-foreground">Design system</div>
                <Badge variant="secondary" className="capitalize">
                  {project.designSystem}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Device and design system are fixed per project — start a new project to change them.
              </p>
            </div>
          }
          history={<HistoryPanel screenId={selected} onRestored={() => router.invalidate()} />}
          tab={sidebarTab}
          onTabChange={setSidebarTab}
        />
      </div>

      <CodeDialog screen={codeScreen && { name: codeScreen.name, html: applyThemeOverride(codeScreen.html, theme) }} onOpenChange={(open) => !open && setCodeScreenId(null)} />
    </div>
  )
}

// A planned screen whose generation failed keeps its place on the canvas.
function FailedFrame(props: { name: string; error: string | null; width: number; height: number; onRetry: () => void; onDelete: () => void }) {
  return (
    <figure style={{ width: props.width }}>
      <figcaption className="mb-2 truncate text-sm font-medium text-muted-foreground">{props.name}</figcaption>
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-background p-8 text-center"
        style={{ width: props.width, height: props.height }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <CircleX className="size-8 text-destructive" />
        <p className="text-base font-medium">This screen was not drawn</p>
        <p className="max-w-[280px] text-sm text-muted-foreground">{props.error || 'The generation stopped before the screen was complete.'}</p>
        <div className="mt-2 flex gap-2">
          <Button onClick={props.onRetry}>Try again</Button>
          <Button variant="outline" onClick={props.onDelete}>
            Remove
          </Button>
        </div>
      </div>
    </figure>
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
