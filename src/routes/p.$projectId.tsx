import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { askUpgrade, reportError } from '../credits'
import { CircleX, Code2, FileDown, Palette, Plus, Smartphone, X } from 'lucide-react'
import { getSession, getProject, moveScreen, deleteProject, renameProject, renameScreen, deleteScreen, duplicateScreen, getScreenCode, saveScreenHeight, saveAppTheme, revertMessage, stepVersion, restoreScreen, rateScreen } from '../server/fns'
import { generate } from '../generate'
import { generatePlan, type PlanEvent } from '../generatePlan'
import { frameSize, nextFramePosition, FRAME_GAP } from '../canvas'
import { PromptBox } from '../PromptBox'
import { FrameLabel, GeneratingVeil, ScreenFrame, ScreenSkeleton, screenForNav, serializeScreen } from '../ScreenFrame'
import { copyTreesToFigma } from '@/lib/figma-copy'
import { AppLookSwitch, ThemePanel } from '@/components/canvas/ThemePanel'
import { parseAppTheme, themeQuery, type AppTheme } from '@/lib/app-theme'
import { Canvas, RailButton, type CanvasFrame } from '@/components/canvas/Canvas'
import { TopBar } from '@/components/canvas/TopBar'
import { ChatDock, SidePanel, useChatOpen, CHAT_WIDTH, EDGE, SIDE_WIDTH } from '@/components/canvas/Sidebar'
import { ChatEmpty, ChatPanel } from '@/components/canvas/ChatPanel'
import { ActivityCard, type Activity, type PlanShape, type ScreenStatus } from '@/components/canvas/ActivityCard'
import { suggestions } from '@/lib/suggestions'
import { friendlyError } from '@/lib/agent-messages'
import { ScreensList } from '@/components/canvas/ScreensList'
import { UndoStack, messageStep, pairStep } from '@/lib/undo-stack'
import { FrameToolbar, FrameHandle } from '@/components/canvas/FrameToolbar'
import { FrameContextMenu } from '@/components/canvas/FrameContextMenu'
import { ShortcutsDialog } from '@/components/canvas/ShortcutsDialog'
import { ShareDialog } from '@/components/canvas/ShareDialog'
import { CodeDialog } from '@/components/canvas/CodeDialog'
import { FigmaMark, ReactMark } from '@/components/BrandMarks'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/p/$projectId')({
  beforeLoad: async ({ location }) => {
    const { user } = await getSession()
    if (!user) throw redirect({ to: '/login', search: { next: location.href } })
    return { user }
  },
  validateSearch: (s: Record<string, unknown>): { brief?: string } => (typeof s.brief === 'string' ? { brief: s.brief } : {}),
  loader: ({ params }) => getProject({ data: params.projectId }),
  component: ProjectPage,
})

// KON-00: the canvas and the chat. A screen is a Konsta component the server compiled; each frame points
// at its page. The chat plans an app, adds a screen, changes the selected one or redraws it.
function ProjectPage() {
  const { project, screens, messages, planRunning } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()
  // The app's look (accent, light/dark, iOS/Android) is the project's, applied to every frame at render time.
  // State changes at once; the save is debounced so a colour drag does not write on every tick.
  const [themeOpen, setThemeOpen] = useState(false)
  // SHR-02: whether the preview has a public link (its token), changed in the Share dialog.
  const [shareOpen, setShareOpen] = useState(false)
  const [shareToken, setShareToken] = useState(project.shareToken)
  const [theme, setTheme] = useState<AppTheme>(() => parseAppTheme(project.theme))
  const themeSave = useRef<{ timer?: ReturnType<typeof setTimeout>; before?: AppTheme }>({})
  useEffect(() => { if (!themeSave.current.timer) setTheme(parseAppTheme(project.theme)) }, [project.theme])
  function changeTheme(next: AppTheme) {
    themeSave.current.before ??= theme // one undo step per burst, from where it started
    setTheme(next)
    clearTimeout(themeSave.current.timer)
    themeSave.current.timer = setTimeout(() => {
      const was = themeSave.current.before!
      themeSave.current = {}
      const save = (t: AppTheme) => saveAppTheme({ data: { projectId: project.id, theme: t } })
      save(next).then(() => history.current.record(pairStep(() => save(was).then(() => setTheme(was)), () => save(next).then(() => setTheme(next))))).catch(reportError)
    }, 400)
  }
  // Selection: one or more screens; the last one is primary. Shift+click and the rubber band build the set.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selected = selectedIds.at(-1) ?? null
  const multi = selectedIds.length > 1
  const [chatOpen, setChatOpen] = useChatOpen()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [focus, setFocus] = useState<{ id: string; key: number } | undefined>(undefined)
  const [fill, setFill] = useState<{ text: string; key: number } | undefined>(undefined)
  // One request at a time; this is what Stop cancels.
  const inFlight = useRef<AbortController | null>(null)
  const [working, setWorking] = useState(false)
  const [workStarted, setWorkStarted] = useState(0)
  // The screens a running edit or redraw is changing: they show a shimmer until it ends.
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  // CHAT-03: a message typed while something ran; it goes out when the run ends.
  const [queued, setQueued] = useState<string | null>(null)

  function selectScreen(id: string | null) {
    setSelectedIds(id ? [id] : [])
  }
  function focusScreen(id: string) {
    selectScreen(id)
    setFocus((f) => ({ id, key: (f?.key ?? 0) + 1 }))
  }

  // Cmd+Z / Shift+Cmd+Z (lib/undo-stack.ts): canvas actions record their inverse; changes the
  // conversation recorded are picked up from new agent messages.
  const history = useRef(new UndoStack())
  const revertChain = (messageId: string) => revertMessage({ data: { projectId: project.id, messageId } })
  const seenMessages = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!seenMessages.current) {
      seenMessages.current = new Set(messages.map((m) => m.id))
      return
    }
    for (const m of messages) {
      if (seenMessages.current.has(m.id)) continue
      seenMessages.current.add(m.id)
      if (m.role === 'agent' && ['add', 'edit', 'regenerate'].includes(m.kind)) history.current.record(messageStep(revertChain, m.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])
  async function undo(redo = false) {
    if (working) return
    try {
      if (!(redo ? await history.current.redo() : await history.current.undo())) return
    } catch (e) {
      reportError(e)
    }
    await router.invalidate()
  }

  const screenRef = (id: string) => ({ data: { id, projectId: project.id } })
  const all = <T,>(ids: string[], fn: (id: string) => Promise<T>) => Promise.all(ids.map(fn))
  async function removeScreens(ids: string[]) {
    await all(ids, (id) => deleteScreen(screenRef(id)))
    history.current.record(pairStep(() => all(ids, (id) => restoreScreen(screenRef(id))), () => all(ids, (id) => deleteScreen(screenRef(id)))))
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
    await router.invalidate()
  }
  const removeScreen = (id: string) => removeScreens([id])
  async function copyScreens(ids: string[]) {
    const copies: string[] = []
    for (const id of ids) copies.push((await duplicateScreen(screenRef(id))).id) // one at a time, so each lands right of the last
    history.current.record(pairStep(() => all(copies, (id) => deleteScreen(screenRef(id))), () => all(copies, (id) => restoreScreen(screenRef(id)))))
    await router.invalidate()
  }
  async function renameScreenTo(id: string, name: string) {
    const was = screens.find((s) => s.id === id)?.name ?? name
    const call = (n: string) => renameScreen({ data: { id, projectId: project.id, name: n } })
    await call(name)
    history.current.record(pairStep(() => call(was), () => call(name)))
    await router.invalidate()
  }

  // Keyboard on the canvas (zoom and tool keys live in Canvas.tsx). Nothing fires while typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target
      if (e.key === 'Escape' && running) return stopAll()
      if (t instanceof Element && t.closest('input, textarea, [contenteditable="true"], [role="dialog"], [role="menu"]')) return
      const cmd = (e.metaKey || e.ctrlKey) && !e.altKey
      const chosen = screens.filter((s) => selectedIds.includes(s.id))
      if (e.key === 'Escape') selectScreen(null)
      else if (cmd && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo(e.shiftKey)
      } else if (cmd && e.key.toLowerCase() === 'd' && chosen.length) {
        e.preventDefault()
        copyScreens(chosen.map((s) => s.id))
      } else if (cmd) return
      else if ((e.key === 'Delete' || e.key === 'Backspace') && chosen.length && !working) {
        e.preventDefault()
        removeScreens(chosen.map((s) => s.id)).then(() => toast(chosen.length === 1 ? `Deleted “${chosen[0].name}”` : `Deleted ${chosen.length} screens`, { description: '⌘Z brings it back' }))
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && screens.length > 0) {
        const order = [...screens].filter((s) => s.html).sort((a, z) => a.x - z.x || a.y - z.y)
        if (order.length === 0) return
        const i = order.findIndex((s) => s.id === selected)
        const next = e.key === 'ArrowRight' ? order[i < 0 ? 0 : (i + 1) % order.length] : order[i < 0 ? order.length - 1 : (i - 1 + order.length) % order.length]
        e.preventDefault()
        focusScreen(next.id)
      } else if (e.key === '/') {
        e.preventDefault()
        document.querySelector<HTMLTextAreaElement>('[data-prompt-input]')?.focus()
      } else if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // A planned run: the plan arrives first, then each screen as it is saved.
  const [plan, setPlan] = useState<(PlanShape & { screenIds: string[] }) | null>(null)
  const [planning, setPlanning] = useState(false)
  const [status, setStatus] = useState<Record<number, ScreenStatus>>({})
  const [planErrors, setPlanErrors] = useState<Record<number, string>>({})
  const started = useRef(false)
  function stopPlan() {
    fetch('/api/stop-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id }) }).finally(() => {
      inFlight.current?.abort()
      router.invalidate()
    })
  }
  // GQ-07: back on a project whose planned run is still drawing on the server — refresh until it ends.
  useEffect(() => {
    if (!planRunning || planning) return
    const t = setInterval(() => router.invalidate(), 3000)
    return () => clearInterval(t)
  }, [planRunning, planning, router])

  function onPlanEvent(e: PlanEvent) {
    if (e.type === 'plan') {
      setPlan(e)
      setStatus(Object.fromEntries(e.screens.map((_, i) => [i, 'pending' as ScreenStatus])))
    } else if (e.type === 'screen_start') setStatus((p) => ({ ...p, [e.index]: 'running' }))
    else if (e.type === 'screen_done') {
      setStatus((p) => ({ ...p, [e.index]: 'done' }))
      router.invalidate() // the saved screen takes its slot
    } else if (e.type === 'screen_error') {
      setStatus((p) => ({ ...p, [e.index]: 'error' }))
      setPlanErrors((p) => ({ ...p, [e.index]: e.message }))
    }
  }
  function runPlan(brief: string) {
    setPlanning(true)
    const ctl = new AbortController()
    inFlight.current = ctl
    setWorking(true)
    setWorkStarted(Date.now())
    generatePlan(project.id, { brief }, onPlanEvent, ctl.signal)
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) reportError(err)
      })
      .finally(() => {
        inFlight.current = null
        setWorking(false)
        setPlanning(false)
        router.invalidate().then(() => setPlan(null))
      })
  }
  useEffect(() => {
    if (started.current || screens.length > 0 || !search.brief) return
    started.current = true
    const brief = search.brief
    router.navigate({ to: '.', search: {}, replace: true }) // drop ?brief so a reload never re-triggers
    runPlan(brief)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const f = frameSize(project.device)
  // Frames are as long as their screen's content (reported by the page itself); the stored height lays the
  // canvas out on load, and a new measurement is saved for next time.
  const [heights, setHeights] = useState<Record<string, number>>({})
  const heightTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const frameHeight = (s: { id: string; height: number | null }) => heights[s.id] ?? s.height ?? f.height
  function reportHeight(id: string, h: number) {
    setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }))
    clearTimeout(heightTimers.current[id])
    heightTimers.current[id] = setTimeout(() => saveScreenHeight({ data: { id, height: h } }).catch(() => {}), 600) // layout only
  }
  const screenIds = useMemo(() => new Set(screens.map((sc) => sc.id)), [screens])
  const nextSteps = useMemo(() => {
    let tabs: { id: string; label: string }[] = []
    try {
      tabs = JSON.parse(project.navigation ?? 'null')?.tabs ?? []
    } catch {}
    return suggestions(screens, tabs)
  }, [screens, project.navigation])
  const selectedScreen = screens.find((s) => s.id === selected)

  // Slots for planned screens not saved yet, and for a screen being added.
  const planFrames: CanvasFrame[] = plan
    ? plan.screenIds.flatMap((id, i) => (screenIds.has(id) || status[i] === 'error' ? [] : [{ id, x: i * (f.width + FRAME_GAP), y: 0, width: f.width, height: f.height }]))
    : []
  const addPos = nextFramePosition(screens, project.device)
  // Sorted by id, so dragging never reorders the DOM (moving an iframe reloads it).
  const frames: CanvasFrame[] = [
    ...[...screens.map((s) => ({ id: s.id, x: s.x, y: s.y, width: f.width, height: frameHeight(s) })), ...planFrames].sort((a, z) => (a.id < z.id ? -1 : a.id > z.id ? 1 : 0)),
    ...(adding ? [{ id: '__adding__', ...addPos, width: f.width, height: f.height }] : []),
  ]

  // CODE-01/02: the app as a React + Vite project (.zip) or as one HTML file, in the look the studio shows now.
  async function exportFile(format: 'react' | 'html') {
    const id = toast.loading(format === 'html' ? 'Building the HTML prototype…' : 'Packing the React project…')
    try {
      const res = await fetch(`/api/export/${project.id}?${themeQuery(theme)}${format === 'html' ? '&format=html' : ''}`)
      if (res.status === 402) {
        toast.dismiss(id)
        return askUpgrade('export')
      }
      if (!res.ok) throw new Error((await res.text()) || 'Export failed')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? (format === 'html' ? 'app.html' : 'app.zip')
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(format === 'html' ? 'HTML prototype downloaded' : 'React project downloaded', { id, description: format === 'html' ? 'One file — open it in any browser, send it to anyone' : 'Unzip, then npm install && npm run dev' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), { id })
    }
  }

  // Every generation request goes through here — one, or one per selected screen — under a single Stop.
  async function run(bodies: Parameters<typeof generate>[0][]) {
    const ctl = new AbortController()
    inFlight.current = ctl
    setWorking(true)
    setWorkStarted(Date.now())
    const targets = bodies.map((b) => b.editScreenId ?? b.regenerateScreenId).filter((x): x is string => Boolean(x))
    setBusyIds(targets)
    setAdding(targets.length === 0)
    try {
      const results = await Promise.allSettled(bodies.map((body) => generate(body, () => {}, ctl.signal)))
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected' && !(r.reason instanceof DOMException && r.reason.name === 'AbortError'))
      if (failed) reportError(failed.reason)
    } finally {
      inFlight.current = null
      setWorking(false)
      await router.invalidate()
      setBusyIds([])
      setAdding(false)
    }
  }

  const running = working || planning || planRunning
  function stopAll() {
    if (planning || planRunning) stopPlan()
    else inFlight.current?.abort()
  }
  useEffect(() => {
    if (running || !queued) return
    const text = queued
    setQueued(null)
    submitPrompt(text).catch((e) => reportError(e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, queued])
  const lastPrompt = [...messages].reverse().find((m) => m.role === 'user')?.text

  // No screens yet: the message plans the app. Otherwise it changes the selected screens, or adds one.
  async function submitPrompt(prompt: string) {
    if (screens.length === 0 && !planning) return runPlan(prompt)
    await run(selectedIds.length ? selectedIds.map((id) => ({ prompt, projectId: project.id, editScreenId: id })) : [{ prompt, projectId: project.id }])
  }
  async function regenerateScreen(id: string) {
    selectScreen(id)
    await run([{ prompt: '', projectId: project.id, regenerateScreenId: id }])
  }

  const activity: Activity | null =
    planning && !plan
      ? { kind: 'planning', startedAt: workStarted }
      : planning && plan
        ? { kind: 'drawing', startedAt: workStarted, plan, status, errors: planErrors, photos: {}, onFocus: (i) => plan.screenIds[i] && focusScreen(plan.screenIds[i]!) }
        : planRunning
          ? { kind: 'waiting', startedAt: workStarted, text: 'Still designing this app — screens appear as they finish' }
          : working
            ? { kind: 'waiting', startedAt: workStarted, text: busyIds.length ? `Working on ${busyIds.length === 1 ? `“${screens.find((s) => s.id === busyIds[0])?.name ?? 'the screen'}”` : `${busyIds.length} screens`}` : 'Designing a new screen' }
            : null

  // CODE-03: a screen's code, as the React export ships it.
  const [code, setCode] = useState<{ name: string; code: string } | null>(null)
  async function viewCode(id: string) {
    try {
      setCode(await getScreenCode({ data: { id, projectId: project.id } }))
    } catch (e) {
      reportError(e)
    }
  }

  // FIG-11: screens as Figma layers on the clipboard (paste with ⌘V). From a frame: that screen, or every
  // selected screen when it is one of them; from the Export menu: the selection, else the whole app. Each
  // screen arrives as its own group, placed as it sits on the canvas; photos travel inside the SVG.
  async function copyToFigma(fromId?: string) {
    const drawn = screens.filter((sc) => sc.html)
    const chosen = fromId && !(selectedIds.length > 1 && selectedIds.includes(fromId)) ? drawn.filter((sc) => sc.id === fromId) : selectedIds.length ? drawn.filter((sc) => selectedIds.includes(sc.id)) : drawn
    if (!chosen.length) return toast.error('Nothing to copy yet')
    const ordered = [...chosen].sort((a, z) => a.y - z.y || a.x - z.x)
    const id = toast.loading(ordered.length === 1 ? 'Preparing layers for Figma…' : `Preparing ${ordered.length} screens for Figma…`)
    try {
      const items = []
      for (const sc of ordered) items.push({ tree: await serializeScreen(sc.id), x: sc.x, y: sc.y })
      const { bytes } = await copyTreesToFigma(items, project.name)
      toast.success('Copied — paste into Figma with ⌘V', { id, description: `${ordered.length} screen${ordered.length === 1 ? '' : 's'}, ${Math.round(bytes / 1024)} KB, photos included` })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), { id })
    }
  }

  const frameActions = (id: string) => ({
    onViewCode: () => viewCode(id),
    onCopyFigma: () => copyToFigma(id),
    onRegenerate: () => regenerateScreen(id),
    onPreview: () => window.open(`/preview/${project.id}?s=${id}`, '_blank', 'noopener'),
  })

  const composerSide = Math.max(CHAT_WIDTH + EDGE * 2, themeOpen ? 64 + SIDE_WIDTH + EDGE : 212)
  const composerSuggestions = running || selectedScreen ? [] : nextSteps
  const canvasInsets = { top: 112, bottom: composerSuggestions.length ? 214 : 150, left: chatOpen ? CHAT_WIDTH + EDGE * 2 : EDGE, right: themeOpen ? 64 + SIDE_WIDTH + EDGE : 64 }

  function openPreview() {
    const start = selectedScreen ?? [...screens].sort((a, b) => a.x - b.x)[0]
    window.open(`/preview/${project.id}${start ? `?s=${start.id}` : ''}`, '_blank', 'noopener')
  }

  return (
    <div className="relative h-screen overflow-hidden bg-canvas">
      <TopBar
        name={planning && plan ? plan.appName : project.name}
        onRename={async (name) => {
          const was = project.name
          const save = (n: string) => renameProject({ data: { id: project.id, name: n } })
          await save(name)
          history.current.record(pairStep(() => save(was), () => save(name)))
          await router.invalidate()
        }}
        device={project.device}
        onShare={() => setShareOpen(true)}
        shared={!!shareToken}
        hasScreens={screens.some((s) => s.html)}
        onPreview={openPreview}
        onShortcuts={() => setShortcutsOpen(true)}
        look={<AppLookSwitch theme={theme} onChange={changeTheme} />}
        exports={[
          { label: selectedIds.length ? `Copy ${selectedIds.length === 1 ? 'screen' : `${selectedIds.length} screens`} to Figma` : 'Copy all screens to Figma', hint: 'Editable layers — paste into Figma with ⌘V', icon: <FigmaMark />, onSelect: () => copyToFigma() },
          { label: 'React project (.zip)', hint: 'Every screen as React + Konsta code, ready for npm run dev', icon: <ReactMark />, onSelect: () => exportFile('react') },
          { label: 'HTML prototype (.html)', hint: 'One clickable file — opens in any browser, offline', icon: <FileDown />, onSelect: () => exportFile('html') },
          { label: selectedScreen ? `Code of “${selectedScreen.name}”` : 'Code of a screen', hint: selectedScreen ? 'View and copy this screen’s React code' : 'Select a screen on the canvas first', icon: <Code2 />, disabled: !selectedScreen, onSelect: () => selectedScreen && viewCode(selectedScreen.id) },
        ]}
        onDeleteProject={async () => {
          try {
            await deleteProject({ data: project.id })
            navigate({ to: '/' })
          } catch (e) {
            reportError(e)
          }
        }}
      />
      <div className="absolute inset-0">
        <Canvas
          insets={canvasInsets}
          rail={
            <>
              <ScreensList screens={[...screens].sort((a, b) => a.x - b.x || a.y - b.y).map((sc) => ({ id: sc.id, name: sc.name }))} selected={selected} onSelect={focusScreen} />
              <RailButton label="Style & colour" pressed={themeOpen} onClick={() => setThemeOpen((o) => !o)}>
                <Palette />
              </RailButton>
            </>
          }
          frames={frames}
          fitKey={`${screens.length}:${planFrames.length}`}
          focus={focus}
          selectedIds={selectedIds}
          onMarquee={(ids, additive) => setSelectedIds((prev) => (additive ? [...prev.filter((x) => !ids.includes(x)), ...ids] : ids).filter((id) => screenIds.has(id)))}
          onShortcuts={() => setShortcutsOpen(true)}
          onUndo={(redo) => undo(redo)}
          onBackgroundClick={() => selectScreen(null)}
          onMove={(moves) => {
            const real = moves.flatMap((m) => {
              const was = screens.find((s) => s.id === m.id)
              return !was || (was.x === m.x && was.y === m.y) ? [] : [{ ...m, fromX: was.x, fromY: was.y }]
            })
            if (real.length === 0) return
            const place = (to: 'from' | 'to') => Promise.all(real.map((m) => moveScreen({ data: { id: m.id, x: to === 'to' ? m.x : m.fromX, y: to === 'to' ? m.y : m.fromY } })))
            history.current.record(pairStep(() => place('from'), () => place('to')))
            place('to').then(() => router.invalidate())
          }}
          renderFrame={(id) => {
            const s = screens.find((sc) => sc.id === id)
            if (!s) {
              const i = plan?.screenIds.indexOf(id) ?? -1
              const name = i >= 0 ? plan!.screens[i]!.name : 'New screen'
              return (
                <figure className="relative" style={{ width: f.width }}>
                  <FrameLabel width={f.width}>
                    <figcaption className="flex h-7 items-center truncate text-md font-medium text-muted-foreground">{name}</figcaption>
                  </FrameLabel>
                  <div className="relative overflow-hidden shadow-phone" style={{ width: f.width, height: f.height, borderRadius: 'var(--radius-phone)' }}>
                    <ScreenSkeleton className="absolute inset-0" />
                    <GeneratingVeil show />
                  </div>
                </figure>
              )
            }
            if (!s.html) return <FailedFrame name={s.name} error={s.error} width={f.width} height={f.height} onRetry={() => regenerateScreen(s.id)} onDelete={() => removeScreen(s.id)} />
            return (
              <FrameContextMenu onRename={() => setRenamingId(s.id)} onDuplicate={() => copyScreens([s.id])} {...frameActions(s.id)} onDelete={() => setDeleteTargetId(s.id)}>
                <div
                  onClick={(e) => {
                    if (e.shiftKey) setSelectedIds((ids) => (ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id]))
                    else if (multi || s.id !== selected) selectScreen(s.id)
                  }}
                >
                  <ScreenFrame
                    screenId={s.id}
                    html={s.html}
                    title={s.name}
                    hint={s.prompt}
                    device={project.device}
                    theme={theme}
                    selected={selectedIds.includes(s.id)}
                    solo={!multi}
                    busy={busyIds.includes(s.id)}
                    height={frameHeight(s)}
                    onHeight={(h) => reportHeight(s.id, h)}
                    // A tap on a link or tab in the selected screen shows where it leads, on the canvas.
                    onNav={(nav) => {
                      const target = nav.id ? screenForNav(screens, nav.id) : undefined
                      if (target) focusScreen(target.id)
                    }}
                    label={
                      <FrameToolbar
                        name={s.name}
                        hint={s.prompt}
                        selected={selectedIds.includes(s.id)}
                        {...frameActions(s.id)}
                        version={s.version}
                        rating={s.rating}
                        onRate={async (value) => {
                          await rateScreen({ data: { projectId: project.id, screenId: s.id, value } })
                          await router.invalidate()
                        }}
                        onStepVersion={async (dir) => {
                          const step = (d: number) => stepVersion({ data: { projectId: project.id, screenId: s.id, dir: d } })
                          await step(dir)
                          history.current.record(pairStep(() => step(-dir), () => step(dir)))
                          await router.invalidate()
                        }}
                        editing={renamingId === s.id}
                        onStartRename={() => setRenamingId(s.id)}
                        onCancelRename={() => setRenamingId(null)}
                        onRename={async (name) => {
                          await renameScreenTo(s.id, name)
                          setRenamingId(null)
                        }}
                        onDuplicate={() => copyScreens([s.id])}
                        deleteConfirming={deleteTargetId === s.id}
                        onRequestDelete={() => setDeleteTargetId(s.id)}
                        onCancelDelete={() => setDeleteTargetId(null)}
                        onDelete={async () => {
                          await removeScreen(s.id)
                          setDeleteTargetId(null)
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

      <ChatDock open={chatOpen} onOpenChange={setChatOpen} count={messages.length} busy={running}>
        <ChatPanel
          messages={messages}
          screenIds={screenIds}
          device={project.device}
          onFocusScreen={focusScreen}
          onRevert={async (messageId) => {
            await revertMessage({ data: { projectId: project.id, messageId } })
            await router.invalidate()
          }}
          onEdit={(text) => setFill((x) => ({ text, key: (x?.key ?? 0) + 1 }))}
          onResend={(text) => (running ? setQueued(text) : submitPrompt(text).catch((e) => reportError(e)))}
          running={activity ? <ActivityCard activity={activity} /> : undefined}
          empty={<ChatEmpty suggestions={[]} onPick={(text) => setFill((x) => ({ text, key: (x?.key ?? 0) + 1 }))} />}
        />
      </ChatDock>

      <div className="pointer-events-none absolute bottom-3 z-20 flex flex-col items-center gap-2" style={{ left: composerSide, right: composerSide }}>
        {composerSuggestions.length > 0 && (
          <div className="pointer-events-auto flex max-w-[760px] flex-wrap justify-center gap-1.5">
            {composerSuggestions.slice(0, 3).map((text, i) => (
              <button
                key={text}
                style={{ ['--i' as string]: i }}
                type="button"
                onClick={() => setFill((x) => ({ text, key: (x?.key ?? 0) + 1 }))}
                className="od-rise inline-flex max-w-72 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground/85 shadow-1 transition-[color,background-color,transform] active:scale-[0.97] duration-(--duration-fast) hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{text}</span>
              </button>
            ))}
          </div>
        )}
        <div className="pointer-events-auto w-full max-w-[680px]">
          <PromptBox
            variant="dock"
            top={
              selectedScreen && (
                <div className="od-rise mb-1.5 flex min-w-0 items-center gap-1 px-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => focusScreen(selectedScreen.id)}
                    className="inline-flex min-w-0 items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium transition-colors hover:bg-accent"
                    title={multi ? screens.filter((s) => selectedIds.includes(s.id)).map((s) => s.name).join(', ') : 'Show on the canvas'}
                  >
                    <Smartphone className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{multi ? `${selectedIds.length} screens` : selectedScreen.name}</span>
                  </button>
                  <button type="button" onClick={() => selectScreen(null)} className="ml-auto shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Step out (Esc)" aria-label="Step out">
                    <X className="size-3.5" />
                  </button>
                </div>
              )
            }
            placeholder={
              planning
                ? 'Designing your screens…'
                : multi
                  ? `Describe a change for all ${selectedIds.length} screens…`
                  : selectedScreen
                    ? 'Describe the change…'
                    : screens.length
                      ? 'Add another screen to this app…'
                      : 'Describe your app…'
            }
            fill={fill}
            running={running}
            onStop={stopAll}
            queued={queued}
            onQueue={setQueued}
            lastPrompt={lastPrompt}
            onSubmit={submitPrompt}
          />
        </div>
      </div>

      <SidePanel open={themeOpen} title="Style & colour" onClose={() => setThemeOpen(false)}>
        <ThemePanel theme={theme} onChange={changeTheme} />
      </SidePanel>

      <CodeDialog screen={code} onOpenChange={(open) => !open && setCode(null)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} projectId={project.id} token={shareToken} onToken={setShareToken} />
    </div>
  )
}

// A screen whose generation failed keeps its place on the canvas.
function FailedFrame(props: { name: string; error: string | null; width: number; height: number; onRetry: () => void; onDelete: () => void }) {
  return (
    <figure className="relative" style={{ width: props.width }}>
      <FrameLabel width={props.width}>
        <figcaption className="flex h-7 items-center gap-1 truncate text-md font-medium text-muted-foreground">
          <FrameHandle>
            <span className="truncate">{props.name}</span>
          </FrameHandle>
        </figcaption>
      </FrameLabel>
      <div
        className="flex flex-col items-center justify-center gap-3 border border-dashed border-destructive/40 bg-card p-8 text-center"
        style={{ width: props.width, height: props.height, borderRadius: 'var(--radius-phone)' }}
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
