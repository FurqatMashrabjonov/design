import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Check, Loader2, CircleX, Circle, Sparkles, X } from 'lucide-react'
import { getProject, moveScreen, deleteProject, renameScreen, deleteScreen, duplicateScreen, saveTheme, saveScreenHeight, revertMessage, getElementInfo, editElementText, elementAction, replaceElementPhoto, themeFromChat } from '../server/fns'
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
import { ChatPanel } from '@/components/canvas/ChatPanel'
import { suggestions } from '@/lib/suggestions'
import { friendlyError } from '@/lib/agent-messages'
import { ScreensList } from '@/components/canvas/ScreensList'
import { HistoryPanel } from '@/components/canvas/HistoryPanel'
import { ElementPanel, type ElementInfo } from '@/components/canvas/ElementPanel'
import { routeIntent } from '@/lib/intent'
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
  const { project, screens, messages } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()
  const [live, setLive] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  // Selection: a screen, then optionally one element inside it (reported by the frame's edit bridge).
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null)
  const [editRequest, setEditRequest] = useState<{ elementId: string; key: number } | undefined>(undefined)
  const [handBusy, setHandBusy] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('chat')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [codeScreenId, setCodeScreenId] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ id: string; key: number } | undefined>(undefined)
  const [fill, setFill] = useState<{ text: string; key: number } | undefined>(undefined)
  // One request at a time; this is what Stop cancels. The server stops spending tokens when the stream closes.
  const inFlight = useRef<AbortController | null>(null)
  const [working, setWorking] = useState(false)

  function selectScreen(id: string | null) {
    if (id !== selected) setSelectedElementId(null)
    setSelected(id)
  }
  function focusScreen(id: string) {
    selectScreen(id)
    setFocus((f) => ({ id, key: (f?.key ?? 0) + 1 }))
  }

  // The panel needs to know what was picked; the server says, from the same annotated HTML.
  useEffect(() => {
    setElementInfo(null)
    if (!selected || !selectedElementId) return
    let current = true
    getElementInfo({ data: { projectId: project.id, screenId: selected, elementId: selectedElementId } })
      .then((info) => current && setElementInfo(info))
      .catch(() => {})
    return () => {
      current = false
    }
  }, [selected, selectedElementId, project.id, screens])

  // Esc steps out: element, then screen. (Inside a frame the bridge forwards Esc.)
  function escape() {
    if (selectedElementId) setSelectedElementId(null)
    else selectScreen(null)
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target
      if (e.key !== 'Escape' || (t instanceof Element && t.closest('input, textarea, [contenteditable="true"], [role="dialog"], [role="menu"]'))) return
      escape()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Hand edits: no model, applied at once, recorded in the conversation like any other change.
  async function hand(fn: () => Promise<unknown>, after?: () => void) {
    setHandBusy(true)
    try {
      await fn()
      after?.()
      await router.invalidate()
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setHandBusy(false)
    }
  }

  // Theme overrides live on the project and are applied at render time, so a change restyles
  // every frame at once with no regeneration. State updates immediately; the save is debounced
  // so dragging a colour picker doesn't write on every tick.
  const [theme, setTheme] = useState<Theme>(() => parseTheme(project.theme))
  const themeSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const themeSavePending = useRef(false)
  function changeTheme(next: Theme) {
    setTheme(next)
    clearTimeout(themeSaveTimer.current)
    themeSavePending.current = true
    themeSaveTimer.current = setTimeout(() => {
      saveTheme({ data: { projectId: project.id, theme: next } })
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not save the theme'))
        .finally(() => (themeSavePending.current = false))
    }, 400)
  }
  // The theme can also change on the server (from chat, or undone from chat).
  useEffect(() => {
    if (!themeSavePending.current) setTheme(parseTheme(project.theme))
  }, [project.theme])
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
    const ctl = new AbortController()
    inFlight.current = ctl
    setWorking(true)
    const finish = () => {
      inFlight.current = null
      setWorking(false)
      setPlanning(false)
      router.invalidate().then(() => setPlanFramesSettled(true))
    }
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
      } else if (e.type === 'done' || e.type === 'error') {
        finish() // an error is already a message in the conversation
      }
    }, ctl.signal).catch((err) => {
      // Stop closes the stream: the screens drawn so far are saved, the rest are not started.
      if (!(err instanceof DOMException && err.name === 'AbortError')) toast.error(err instanceof Error ? err.message : String(err))
      finish()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const f = frameSize(project.device)
  const screenIds = useMemo(() => new Set(screens.map((sc) => sc.id)), [screens])
  const nextSteps = useMemo(() => {
    let tabs: { id: string; label: string }[] = []
    try {
      tabs = JSON.parse(project.navigation ?? 'null')?.tabs ?? []
    } catch {}
    return suggestions(screens, tabs)
  }, [screens, project.navigation])
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

  // Every single-screen request goes through here: one at a time, cancellable, and the conversation
  // (which the server writes) is reloaded afterwards whether it worked or not.
  async function run(body: Parameters<typeof generate>[0]) {
    const ctl = new AbortController()
    inFlight.current = ctl
    setWorking(true)
    try {
      // An edit streams only the parts that change, which is not a page: keep the screen in view instead.
      await generate(body, body.editScreenId ? () => {} : setLive, ctl.signal)
    } catch (e) {
      const stopped = e instanceof DOMException && e.name === 'AbortError'
      if (!stopped) toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      inFlight.current = null
      setWorking(false)
      await router.invalidate()
      setLive('')
    }
  }

  // Draws the screen again from what it was planned to be (its stored spec), in the same slot, with
  // the app's context. The current design becomes a version. Also how a failed screen is retried.
  async function regenerateScreen(screen: (typeof screens)[number]) {
    selectScreen(screen.id)
    await run({ prompt: '', projectId: project.id, regenerateScreenId: screen.id })
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
        <Sidebar
          chat={
            <>
              <ChatPanel
                messages={messages}
                screenIds={screenIds}
                onFocusScreen={focusScreen}
                onRevert={async (messageId) => {
                  await revertMessage({ data: { projectId: project.id, messageId } })
                  await router.invalidate()
                }}
                running={
                  planning && plan ? (
                    <PlanCard plan={plan} status={status} errors={planErrors} />
                  ) : working ? (
                    <div className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {planning ? 'Planning the app…' : selectedScreen ? `Working on “${selectedScreen.name}”…` : 'Designing a new screen…'}
                    </div>
                  ) : undefined
                }
                empty={
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                    <Sparkles className="size-5" />
                    <p>Everything you ask for and everything the agent does shows up here, with a way back.</p>
                  </div>
                }
              />
              {selectedScreen && (
                // What the next message will change: the screen, or one element of it.
                <div className="flex min-w-0 items-center gap-1 text-xs">
                  <span className="shrink-0 text-muted-foreground">Editing</span>
                  <button type="button" onClick={() => focusScreen(selectedScreen.id)} className="min-w-0 truncate rounded-md border bg-background px-2 py-0.5 hover:border-primary/60" title="Show on the canvas">
                    {selectedScreen.name}
                  </button>
                  {selectedElementId && (
                    <>
                      <span className="text-muted-foreground">›</span>
                      <span className="min-w-0 truncate rounded-md border border-primary/40 bg-primary/5 px-2 py-0.5 text-primary">{elementInfo?.label ?? 'Element'}</span>
                    </>
                  )}
                  <button type="button" onClick={escape} className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Step out (Esc)" aria-label="Step out">
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
              {!working && !selectedScreen && nextSteps.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {nextSteps.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setFill((f) => ({ text, key: (f?.key ?? 0) + 1 }))}
                      className="max-w-full truncate rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}
              <PromptBox
                placeholder={
                  planning
                    ? 'Designing your screens…'
                    : selectedElementId
                      ? `Describe a change to ${elementInfo?.label ?? 'this element'}…`
                      : selectedScreen
                        ? 'Describe the change…'
                        : 'Add another screen to this project…'
                }
                fill={fill}
                onStop={() => inFlight.current?.abort()}
                onSubmit={async (prompt) => {
                  // "make it blue" is a theme change: instant, every screen, no generation.
                  if (routeIntent(prompt, { elementSelected: Boolean(selectedElementId) }).kind === 'theme') {
                    const result = await themeFromChat({ data: { projectId: project.id, prompt } })
                    if (result.applied) {
                      setTheme(result.theme)
                      await router.invalidate()
                      return
                    }
                  }
                  await run({ prompt, projectId: project.id, editScreenId: selectedScreen?.id, editElementId: selectedElementId ?? undefined })
                }}
              />
            </>
          }
          theme={
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
        <div className="relative flex-1">
          <ScreensList screens={screens} selected={selected} onSelect={focusScreen} />
          <Canvas
            frames={frames}
            fitKey={`${screens.length}:${planFrames.length}`}
            focus={focus}
            onBackgroundClick={() => selectScreen(null)}
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
                    selectScreen(s.id)
                    setSidebarTab('history')
                  }}
                  onDelete={() => setDeleteTargetId(s.id)}
                >
                  <div onClick={() => s.id !== selected && selectScreen(s.id)}>
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
                      selectedElementId={s.id === selected ? selectedElementId : null}
                      onSelectElement={(elId) => {
                        if (s.id !== selected) return
                        setSelectedElementId(elId)
                        if (elId) setSidebarTab('chat')
                      }}
                      onEscape={escape}
                      editRequest={s.id === selected ? editRequest : undefined}
                      onTextEdit={(elementId, text) => hand(() => editElementText({ data: { projectId: project.id, screenId: s.id, elementId, text } }))}
                      panel={
                        s.id === selected && selectedElementId ? (
                          <ElementPanel
                            info={elementInfo}
                            busy={handBusy || working}
                            onAsk={(instruction) => run({ prompt: instruction, projectId: project.id, editScreenId: s.id, editElementId: selectedElementId })}
                            onEditText={() => setEditRequest((r) => ({ elementId: selectedElementId, key: (r?.key ?? 0) + 1 }))}
                            onAction={(action) =>
                              hand(
                                () => elementAction({ data: { projectId: project.id, screenId: s.id, elementId: selectedElementId, action } }),
                                () => action === 'delete' && setSelectedElementId(null),
                              )
                            }
                            onReplacePhoto={(query) => hand(() => replaceElementPhoto({ data: { projectId: project.id, screenId: s.id, elementId: selectedElementId, query } }))}
                          />
                        ) : undefined
                      }
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
                            if (selected === s.id) selectScreen(null)
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
        <p className="max-w-[280px] text-sm text-muted-foreground">{props.error ? friendlyError(props.error) : 'The generation stopped before the screen was complete.'}</p>
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
