import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Check, Loader2, CircleX, Circle, Sparkles, X } from 'lucide-react'
import { getSession, getProject, moveScreen, deleteProject, renameProject, renameScreen, deleteScreen, duplicateScreen, saveTheme, saveScreenHeight, revertMessage, stepVersion, restoreScreen, rateScreen, getElementInfo, editElementText, elementAction, replaceElementPhoto, themeFromChat } from '../server/fns'
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
import { ElementPanel, type ElementInfo } from '@/components/canvas/ElementPanel'
import { routeIntent } from '@/lib/intent'
import { UndoStack, messageStep, pairStep } from '@/lib/undo-stack'
import { exportApp } from '@/lib/export-app'
import { zip } from '@/lib/zip'
import { designSystemSample } from '@/lib/ds-sample'
import type { AuditFinding } from '@/lib/render-audit'
import { FrameToolbar, FrameHandle } from '@/components/canvas/FrameToolbar'
import { FrameContextMenu } from '@/components/canvas/FrameContextMenu'
import { CodeDialog } from '@/components/canvas/CodeDialog'
import { ShortcutsDialog } from '@/components/canvas/ShortcutsDialog'
import { ThemePanel } from '@/components/canvas/ThemePanel'
import { applyThemeOverride, parseTheme, type Theme } from '@/lib/theme-override'
import { extractRootBlock, parseDeclarations } from '@/lib/screen-normalizer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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

type ScreenStatus = 'pending' | 'running' | 'done' | 'error'

// Tall enough for the design-system sample at phone width (measured; see lib/ds-sample.ts).
const DS_FRAME_HEIGHT_MOBILE = 1100

function ProjectPage() {
  const { project, screens, messages, tokens, planRunning } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()
  const [live, setLive] = useState('')
  // Selection: one or more screens (the last one is primary); with exactly one, optionally an element
  // inside it (reported by the frame's edit bridge). Shift+click and the rubber band build the set.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selected = selectedIds.at(-1) ?? null
  const multi = selectedIds.length > 1
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null)
  const [editRequest, setEditRequest] = useState<{ elementId: string; key: number } | undefined>(undefined)
  const [handBusy, setHandBusy] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('chat')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [codeScreenId, setCodeScreenId] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  // Render-audit findings per screen, reported by each frame once it has settled (EYE-01).
  const [audits, setAudits] = useState<Record<string, AuditFinding[]>>({})
  const [focus, setFocus] = useState<{ id: string; key: number } | undefined>(undefined)
  const [fill, setFill] = useState<{ text: string; key: number } | undefined>(undefined)
  // One request at a time; this is what Stop cancels. The server stops spending tokens when the stream closes.
  const inFlight = useRef<AbortController | null>(null)
  const [working, setWorking] = useState(false)

  function selectScreen(id: string | null) {
    if (id !== selected || multi) setSelectedElementId(null)
    setSelectedIds(id ? [id] : [])
  }
  function toggleScreen(id: string) {
    setSelectedElementId(null)
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }
  function selectMany(ids: string[], additive: boolean) {
    setSelectedElementId(null)
    setSelectedIds((prev) => (additive ? [...prev.filter((x) => !ids.includes(x)), ...ids] : ids))
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

  // Cmd+Z / Shift+Cmd+Z (lib/undo-stack.ts). Canvas actions record their own inverse below; changes
  // the conversation recorded are picked up from new agent messages, so hand edits, model edits and
  // theme-from-chat all land on the same stack.
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
      if (m.role === 'agent' && ['add', 'edit', 'element', 'regenerate', 'direct', 'theme'].includes(m.kind)) history.current.record(messageStep(revertChain, m.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])
  async function undo(redo = false) {
    if (working || handBusy) return
    try {
      if (!(redo ? await history.current.redo() : await history.current.undo())) return
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
    await router.invalidate()
  }

  // Keyboard on the canvas (zoom and tool keys live in Canvas.tsx; the `?` sheet lists them all).
  // Nothing fires while typing in a field, a dialog or a menu.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, [contenteditable="true"], [role="dialog"], [role="menu"]')) return
      const cmd = (e.metaKey || e.ctrlKey) && !e.altKey
      const current = screens.find((s) => s.id === selected)
      const chosen = screens.filter((s) => selectedIds.includes(s.id))
      if (e.key === 'Escape') escape()
      else if (cmd && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo(e.shiftKey)
      } else if (cmd && e.key.toLowerCase() === 'd' && chosen.length) {
        e.preventDefault() // not the browser's bookmark
        copyScreens(chosen.map((s) => s.id))
      } else if (cmd) return
      else if ((e.key === 'Delete' || e.key === 'Backspace') && chosen.length && !selectedElementId && !working && !handBusy) {
        e.preventDefault()
        removeScreens(chosen.map((s) => s.id)).then(() => toast(chosen.length === 1 ? `Deleted “${chosen[0].name}”` : `Deleted ${chosen.length} screens`, { description: '⌘Z brings it back' }))
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && screens.length > 0) {
        // Left to right on the canvas, wrapping; with nothing selected → the first / last screen.
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

  // Canvas actions, each recorded with its inverse.
  const screenRef = (id: string) => ({ data: { id, projectId: project.id } })
  const all = <T,>(ids: string[], fn: (id: string) => Promise<T>) => Promise.all(ids.map(fn))
  async function removeScreens(ids: string[]) {
    await all(ids, (id) => deleteScreen(screenRef(id)))
    history.current.record(pairStep(() => all(ids, (id) => restoreScreen(screenRef(id))), () => all(ids, (id) => deleteScreen(screenRef(id)))))
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
    if (ids.includes(selected ?? '')) setSelectedElementId(null)
    await router.invalidate()
  }
  const removeScreen = (id: string) => removeScreens([id])
  async function copyScreens(ids: string[]) {
    const copies: string[] = []
    for (const id of ids) copies.push((await duplicateScreen(screenRef(id))).id) // one at a time, so each lands right of the last
    history.current.record(pairStep(() => all(copies, (id) => deleteScreen(screenRef(id))), () => all(copies, (id) => restoreScreen(screenRef(id)))))
    await router.invalidate()
  }
  const copyScreen = (id: string) => copyScreens([id])
  async function renameScreenTo(id: string, name: string) {
    const was = screens.find((s) => s.id === id)?.name ?? name
    const call = (n: string) => renameScreen({ data: { id, projectId: project.id, name: n } })
    await call(name)
    history.current.record(pairStep(() => call(was), () => call(name)))
    await router.invalidate()
  }

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
  const themeBefore = useRef<Theme>(theme)
  function changeTheme(next: Theme) {
    // One undo step per burst of changes (a colour drag), from the theme it started at.
    if (!themeSavePending.current) themeBefore.current = theme
    setTheme(next)
    clearTimeout(themeSaveTimer.current)
    themeSavePending.current = true
    themeSaveTimer.current = setTimeout(() => {
      const save = (t: Theme) => saveTheme({ data: { projectId: project.id, theme: t } })
      const was = themeBefore.current
      save(next)
        .then(() => history.current.record(pairStep(() => save(was), () => save(next))))
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not save the theme'))
        .finally(() => (themeSavePending.current = false))
    }, 400)
  }
  // The theme can also change on the server (from chat, or undone from chat).
  useEffect(() => {
    if (!themeSavePending.current) setTheme(parseTheme(project.theme))
  }, [project.theme])
  // The design system's own token values, for the Theme panel to show until one is overridden.
  const baseTokens = useMemo(() => {
    const block = extractRootBlock(tokens.root)
    return block ? parseDeclarations(block) : new Map<string, string>()
  }, [tokens.root])
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
  // GQ-07: a planned run lives on the server, so closing its stream does not stop it; Stop does.
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
  const [status, setStatus] = useState<Record<number, ScreenStatus>>({})
  const [planErrors, setPlanErrors] = useState<Record<number, string>>({})
  const [planTexts, setPlanTexts] = useState<Record<number, string>>({})
  // LP-04: plan frames are keyed by the id each screen will be saved under (the server decides
  // them up front), so the frame that streamed is the frame the saved screen lands in.
  const [planIds, setPlanIds] = useState<string[]>([])
  // LP-06: photos found while each planned screen streams, by slot query.
  const [planPhotos, setPlanPhotos] = useState<Record<number, Record<string, string>>>({})
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
        setPlanIds(e.screenIds ?? [])
        setStatus(Object.fromEntries(e.screens.map((_, i) => [i, 'pending' as ScreenStatus])))
      } else if (e.type === 'screen_start') {
        setStatus((p) => ({ ...p, [e.index]: 'running' }))
      } else if (e.type === 'screen_delta') {
        setPlanTexts((p) => ({ ...p, [e.index]: e.text }))
      } else if (e.type === 'screen_image') {
        setPlanPhotos((p) => ({ ...p, [e.index]: { ...p[e.index], [e.query]: e.url } }))
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
      ? plan.screens.flatMap((_, i) => {
          const id = planIds[i] ?? `plan-${i}`
          if (screenIds.has(id)) return [] // the saved screen has taken over this frame
          return [{ id, x: i * (f.width + FRAME_GAP), y: 0, width: f.width, height: heights[id] ?? f.height }]
        })
      : []

  // The design-system frame (THM-08) stands left of the screens; it is drawn from tokens, not stored.
  const dsSample = useMemo(() => designSystemSample(tokens.root, tokens.fonts, project.designSystem.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())), [tokens, project.designSystem])
  const dsHeight = project.device === 'mobile' ? DS_FRAME_HEIGHT_MOBILE : f.height
  const dsFrame: CanvasFrame | null =
    tokens.root && visibleScreens.length > 0
      ? { id: '__ds__', x: Math.min(...visibleScreens.map((s) => s.x)) - f.width - FRAME_GAP, y: Math.min(...visibleScreens.map((s) => s.y)), width: f.width, height: dsHeight }
      : null

  // The order is kept stable on purpose: moving an iframe in the DOM reloads it. The design-system
  // frame goes last, so its arrival moves nothing (LP-04).
  const frames: CanvasFrame[] = [
    // Sorted by id: a plan frame already carries its screen's id, so it keeps its place when the
    // saved screen takes over, and dragging (which changes x) never reorders anything.
    ...[...visibleScreens.map((s) => ({ id: s.id, x: s.x, y: s.y, width: f.width, height: frameHeight(s) })), ...planFrames].sort((a, z) => (a.id < z.id ? -1 : a.id > z.id ? 1 : 0)),
    ...(liveFrame ? [liveFrame] : []),
    ...(dsFrame ? [dsFrame] : []),
  ]

  const fileName = (name: string) => name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'design'
  function save(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function downloadHtml(screen: { name: string; html: string }) {
    save(new Blob([applyThemeOverride(screen.html, theme)], { type: 'text/html' }), `${fileName(screen.name)}.html`)
  }
  // Every drawn screen with the theme baked in, linked like the preview (lib/export-app.ts).
  function downloadApp() {
    const files = exportApp(screens, theme, project.name)
    save(new Blob([zip(files) as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), `${fileName(project.name)}.zip`)
    toast.success(`Exported ${files.length - 1} screens`)
  }
  async function sharePreview() {
    // ponytail: no accounts yet, so the preview link opens for anyone who has it (SHR-02 adds real sharing).
    const first = [...screens].filter((s) => s.html).sort((a, b) => a.x - b.x)[0]
    try {
      await navigator.clipboard.writeText(`${location.origin}/preview/${project.id}${first ? `?s=${first.id}` : ''}`)
      toast.success('Preview link copied', { description: 'Anyone with the link can view the prototype.' })
    } catch {
      toast.error('Could not copy — clipboard access was blocked')
    }
  }

  // Every generation request goes through here — one, or one per selected screen — under a single
  // Stop, and the conversation (which the server writes) is reloaded afterwards whether it worked or not.
  async function run(request: Parameters<typeof generate>[0] | Parameters<typeof generate>[0][]) {
    const bodies = Array.isArray(request) ? request : [request]
    const ctl = new AbortController()
    inFlight.current = ctl
    setWorking(true)
    try {
      // An edit streams only the parts that change, which is not a page: keep the screen in view instead.
      const results = await Promise.allSettled(bodies.map((body) => generate(body, body.editScreenId ? () => {} : setLive, ctl.signal)))
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected' && !(r.reason instanceof DOMException && r.reason.name === 'AbortError'))
      if (failed) toast.error(failed.reason instanceof Error ? failed.reason.message : String(failed.reason))
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

  // The same four actions in the frame's ⋯ menu and its right-click menu.
  const frameActions = (s: (typeof screens)[number]) => ({
    onRegenerate: () => regenerateScreen(s),
    onCopyHtml: () => copyHtml(applyThemeOverride(s.html, theme)),
    onViewCode: () => setCodeScreenId(s.id),
    onDownload: () => downloadHtml(s),
  })

  function openPreview() {
    const first = [...screens].sort((a, b) => a.x - b.x)[0]
    const start = screens.find((sc) => sc.id === selected) ?? first
    window.open(`/preview/${project.id}${start ? `?s=${start.id}` : ''}`, '_blank', 'noopener')
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        // While the plan streams, the project is still "Untitled" on the server; the plan already has the name.
        name={planning && plan ? plan.appName : project.name}
        onRename={async (name) => {
          const was = project.name
          const save = (n: string) => renameProject({ data: { id: project.id, name: n } })
          await save(name)
          history.current.record(pairStep(() => save(was), () => save(name)))
          await router.invalidate()
        }}
        device={project.device}
        designSystem={project.designSystem}
        screenName={selectedScreen?.html && !multi ? selectedScreen.name : null}
        onDownloadScreen={() => selectedScreen && downloadHtml(selectedScreen)}
        onCopyScreenHtml={() => selectedScreen && copyHtml(applyThemeOverride(selectedScreen.html, theme))}
        onDownloadApp={downloadApp}
        onShare={sharePreview}
        hasScreens={screens.some((s) => s.html)}
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
                    <div className="space-y-2">
                      <PlanCard plan={plan} status={status} errors={planErrors} />
                      {/* The planned run has no prompt-box Stop (it started from the dashboard); this is its Stop. */}
                      <button type="button" className="text-xs text-muted-foreground underline" onClick={stopPlan}>
                        Stop generating
                      </button>
                    </div>
                  ) : planRunning && !planning ? (
                    <div className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="flex-1">Still designing this app — screens appear as they finish.</span>
                      <button type="button" className="text-xs underline" onClick={stopPlan}>
                        Stop
                      </button>
                    </div>
                  ) : working ? (
                    <div className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {planning ? 'Planning the app…' : multi ? `Working on ${selectedIds.length} screens…` : selectedScreen ? `Working on “${selectedScreen.name}”…` : 'Designing a new screen…'}
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
                // What the next message will change: the screens, or one element of one screen.
                <div className="flex min-w-0 items-center gap-1 text-xs">
                  <span className="shrink-0 text-muted-foreground">Editing</span>
                  <button
                    type="button"
                    onClick={() => focusScreen(selectedScreen.id)}
                    className="min-w-0 truncate rounded-md border bg-background px-2 py-0.5 hover:border-primary/60"
                    title={multi ? screens.filter((s) => selectedIds.includes(s.id)).map((s) => s.name).join(', ') : 'Show on the canvas'}
                  >
                    {multi ? `${selectedIds.length} screens` : selectedScreen.name}
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
                      : multi
                        ? `Describe a change for all ${selectedIds.length} screens…`
                        : selectedScreen
                          ? 'Describe the change…'
                          : 'Add another screen to this project…'
                }
                fill={fill}
                onStop={() => (planning || planRunning ? stopPlan() : inFlight.current?.abort())}
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
                  // Several screens selected: the same instruction goes to each, as its own edit.
                  if (multi) await run(selectedIds.map((id) => ({ prompt, projectId: project.id, editScreenId: id })))
                  else await run({ prompt, projectId: project.id, editScreenId: selectedScreen?.id, editElementId: selectedElementId ?? undefined })
                }}
              />
            </>
          }
          theme={
            <div className="space-y-6 text-sm">
              <ThemePanel theme={theme} baseAccent={baseAccent} base={baseTokens} onChange={changeTheme} />
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
          tab={sidebarTab}
          onTabChange={setSidebarTab}
        />
        <div className="relative flex-1">
          <ScreensList screens={screens} selected={selected} onSelect={focusScreen} />
          <Canvas
            frames={frames}
            fitKey={`${screens.length}:${planFrames.length}`}
            focus={focus}
            selectedIds={selectedIds}
            onMarquee={(ids, additive) => selectMany(ids.filter((id) => screenIds.has(id)), additive)}
            onShortcuts={() => setShortcutsOpen(true)}
            onBackgroundClick={() => selectScreen(null)}
            onMove={(moves) => {
              const real = moves.flatMap((m) => {
                const was = screens.find((s) => s.id === m.id)
                return !was || (was.x === m.x && was.y === m.y) ? [] : [{ ...m, fromX: was.x, fromY: was.y }]
              })
              if (real.length === 0) return
              const place = (to: 'from' | 'to') => all(real.map((m) => m.id), (id) => {
                const m = real.find((r) => r.id === id)!
                return moveScreen({ data: { id, x: to === 'to' ? m.x : m.fromX, y: to === 'to' ? m.y : m.fromY } })
              })
              history.current.record(pairStep(() => place('from'), () => place('to')))
              // Reload once saved, so positions come from the server (and an undo can move them back).
              place('to').then(() => router.invalidate())
            }}
            renderFrame={(id) => {
              if (id === '__ds__') return <ScreenFrame html={dsSample} title="Design system" hint="Built from the design system's tokens; follows the Theme panel" device={project.device} theme={theme} height={dsHeight} />
              if (id === '__live__')
                return <ScreenFrame html={extractArtifact(live).html} title="Designing…" device={project.device} theme={theme} streaming />
              const planAt = planIds.indexOf(id)
              if (id.startsWith('plan-') || (planAt !== -1 && !screenIds.has(id))) {
                const i = planAt !== -1 ? planAt : Number(id.slice(5))
                const s = plan!.screens[i]!
                const st = status[i]
                if (st === 'pending')
                  return (
                    <div>
                      <p className="mb-2 truncate text-sm font-medium text-muted-foreground">{s.name}</p>
                      <Skeleton style={{ width: f.width, height: f.height }} className="rounded-xl" />
                    </div>
                  )
                // The same wrapper shape as a saved frame, so React keeps this iframe when the saved
                // screen takes over (LP-04).
                const noop = () => {}
                return (
                  <FrameContextMenu onRename={noop} onDuplicate={noop} onDelete={noop} onRegenerate={noop} onCopyHtml={noop} onViewCode={noop} onDownload={noop}>
                    <div>
                      <ScreenFrame
                        html={extractArtifact(planTexts[i] ?? '').html}
                        title={s.name}
                        device={project.device}
                        theme={theme}
                        streaming={st === 'running' || st === 'done'}
                        photos={planPhotos[i]}
                        frameId={planAt !== -1 ? id : undefined}
                        height={planAt !== -1 ? heights[id] : undefined}
                        // Kept in memory only: the screen is not saved yet. Its saved frame starts from it.
                        onHeight={(fid, h) => setHeights((prev) => (prev[fid] === h ? prev : { ...prev, [fid]: h }))}
                      />
                    </div>
                  </FrameContextMenu>
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
                    onDelete={() => removeScreen(s.id)}
                  />
                )
              return (
                <FrameContextMenu
                  onRename={() => setRenamingId(s.id)}
                  onDuplicate={() => copyScreen(s.id)}
                  {...frameActions(s)}
                  onDelete={() => setDeleteTargetId(s.id)}
                >
                  <div
                    onClick={(e) => {
                      if (e.shiftKey) toggleScreen(s.id)
                      else if (multi || s.id !== selected) selectScreen(s.id)
                    }}
                  >
                    <ScreenFrame
                      html={s.html}
                      title={s.name}
                      hint={s.prompt}
                      device={project.device}
                      theme={theme}
                      frameId={s.id}
                      height={frameHeight(s)}
                      onHeight={reportHeight}
                      selected={selectedIds.includes(s.id)}
                      solo={!multi}
                      selectedElementId={s.id === selected ? selectedElementId : null}
                      onSelectElement={(elId) => {
                        if (s.id !== selected) return
                        setSelectedElementId(elId)
                        if (elId) setSidebarTab('chat')
                      }}
                      onEscape={escape}
                      onUndo={(redo) => undo(redo)}
                      onAudit={(findings) => setAudits((a) => ({ ...a, [s.id]: findings }))}
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
                          {...frameActions(s)}
                          version={s.version}
                          rating={s.rating}
                          audit={audits[s.id]}
                          onFixAudit={() => {
                            selectScreen(s.id)
                            run({ prompt: '', projectId: project.id, editScreenId: s.id, fixFindings: audits[s.id] })
                          }}
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
                          onDuplicate={() => copyScreen(s.id)}
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

      </div>

      <CodeDialog screen={codeScreen && { name: codeScreen.name, html: applyThemeOverride(codeScreen.html, theme) }} onOpenChange={(open) => !open && setCodeScreenId(null)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}

// A planned screen whose generation failed keeps its place on the canvas.
function FailedFrame(props: { name: string; error: string | null; width: number; height: number; onRetry: () => void; onDelete: () => void }) {
  return (
    <figure style={{ width: props.width }}>
      <figcaption className="mb-2 flex h-7 items-center gap-1 truncate text-sm font-medium text-muted-foreground">
        <FrameHandle />
        {props.name}
      </figcaption>
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
