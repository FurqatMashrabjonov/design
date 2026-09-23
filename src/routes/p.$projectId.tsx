import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CircleX, Sparkles, X } from 'lucide-react'
import { getSession, getProject, moveScreen, deleteProject, renameProject, renameScreen, deleteScreen, duplicateScreen, saveTheme, saveScreenHeight, revertMessage, stepVersion, restoreScreen, rateScreen, getElementInfo, editElementText, elementAction, replaceElementPhoto, themeFromChat } from '../server/fns'
import { generate } from '../generate'
import { generatePlan } from '../generatePlan'
import type { Plan } from '@/app/Services/PlannerService'
import { PENDING_IMAGES } from '../Landing'
import { extractArtifact } from '../artifact'
import { frameSize, nextFramePosition, FRAME_GAP } from '../canvas'
import { PromptBox } from '../PromptBox'
import { ScreenFrame, serializeScreen } from '../ScreenFrame'
import { copyTreesToFigma } from '@/lib/figma-copy'
import { Canvas, type CanvasFrame } from '@/components/canvas/Canvas'
import { TopBar } from '@/components/canvas/TopBar'
import { Sidebar } from '@/components/canvas/Sidebar'
import { ChatPanel } from '@/components/canvas/ChatPanel'
import { ActivityCard, PlanApproval, type Activity, type ScreenStatus } from '@/components/canvas/ActivityCard'
import { parseAffects } from '@/lib/screen-patch'
import { suggestions } from '@/lib/suggestions'
import { friendlyError } from '@/lib/agent-messages'
import { ScreensList } from '@/components/canvas/ScreensList'
import { ElementPanel, type ElementInfo } from '@/components/canvas/ElementPanel'
import { routeIntent } from '@/lib/intent'
import { UndoStack, messageStep, pairStep } from '@/lib/undo-stack'
import { exportApp } from '@/lib/export-app'
import { zip } from '@/lib/zip'
import { designSystemSample } from '@/lib/ds-sample'
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

// THM-09: the design-system sample is a wide card, so it is not mistaken for a screen. Measured
// against the two-column layout in lib/ds-sample.ts.
const DS_FRAME = { width: 900, height: 640 }

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
  const [focus, setFocus] = useState<{ id: string; key: number } | undefined>(undefined)
  const [fill, setFill] = useState<{ text: string; key: number } | undefined>(undefined)
  // One request at a time; this is what Stop cancels. The server stops spending tokens when the stream closes.
  const inFlight = useRef<AbortController | null>(null)
  const [working, setWorking] = useState(false)
  // CHAT-02: when the current piece of work started, for the live card's clock.
  const [workStarted, setWorkStarted] = useState(0)
  // CHAT-02: the edit that is streaming — its target and the parts it has named so far.
  const [editing, setEditing] = useState<{ target: string; text: string } | null>(null)
  // CHAT-03: a message typed while something ran; it goes out when the run ends.
  const [queued, setQueued] = useState<string | null>(null)
  // CHAT-08: the plan is drawn up and waits for the person before anything is drawn.
  const [awaiting, setAwaiting] = useState(false)
  const gatePref = () => {
    try {
      return localStorage.getItem('od:plan-gate') !== 'off'
    } catch {
      return true
    }
  }

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
  // CHAT-01: Esc anywhere on the page stops the run, as it does in every chat.
  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
  // UI-04: what the Theme panel is pointing at right now. It is never saved; the frames render it
  // instead of the saved theme while the pointer is on a swatch.
  const [themePreview, setThemePreview] = useState<Theme | null>(null)
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

  const onPlanEvent = (e: Parameters<Parameters<typeof generatePlan>[2]>[0], finish: (settle?: boolean) => void) => {
    if (e.type === 'plan') {
      setPlan(e)
      setPlanIds(e.screenIds ?? [])
      setStatus(Object.fromEntries(e.screens.map((_, i) => [i, 'pending' as ScreenStatus])))
      setPlanPhotos({})
    } else if (e.type === 'awaiting') {
      setAwaiting(true)
      finish(false)
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
  }
  function runPlan(request: Parameters<typeof generatePlan>[1]) {
    setPlanning(true)
    const ctl = new AbortController()
    inFlight.current = ctl
    setWorking(true)
    setWorkStarted(Date.now())
    let over = false
    // `settle` is false when the run stops at the plan (CHAT-08): the plan frames stay on the
    // canvas as the slots the approved screens will be drawn into.
    const finish = (settle = true) => {
      if (over) return
      over = true
      inFlight.current = null
      setWorking(false)
      setPlanning(false)
      router.invalidate().then(() => settle && setPlanFramesSettled(true))
    }
    generatePlan(project.id, request, (e) => onPlanEvent(e, finish), ctl.signal).catch((err) => {
      // Stop closes the stream: the screens drawn so far are saved, the rest are not started.
      if (!(err instanceof DOMException && err.name === 'AbortError')) toast.error(err instanceof Error ? err.message : String(err))
      finish()
    })
  }
  useEffect(() => {
    if (started.current || screens.length > 0 || !search.brief) return
    started.current = true
    const brief = search.brief
    router.navigate({ to: '.', search: {}, replace: true }) // drop ?brief so a reload never re-triggers
    // IMG-01: reference pictures the composer handed over. Read once, then cleared, so a reload
    // never pays to look at them again.
    let images: string[] | undefined
    try {
      const raw = sessionStorage.getItem(PENDING_IMAGES)
      sessionStorage.removeItem(PENDING_IMAGES)
      const parsed = raw ? JSON.parse(raw) : null
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) images = parsed.slice(0, 2)
    } catch {}
    runPlan({ brief, gate: gatePref(), images })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // CHAT-08: the person approved the plan (with their edits) — now it is drawn.
  function approvePlan(edits: { keep: number[]; names: Record<number, string> }, askNextTime: boolean) {
    try {
      localStorage.setItem('od:plan-gate', askNextTime ? 'on' : 'off')
    } catch {}
    setAwaiting(false)
    setPlanFramesSettled(false)
    runPlan({ approve: edits })
  }
  function discardPlan() {
    setAwaiting(false)
    setPlan(null)
    setPlanIds([])
    setPlanFramesSettled(true)
  }

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
  const shownTheme = themePreview ?? theme
  const dsFrame: CanvasFrame | null =
    tokens.root && visibleScreens.length > 0
      ? { id: '__ds__', x: Math.min(...visibleScreens.map((s) => s.x)) - DS_FRAME.width - FRAME_GAP, y: Math.min(...visibleScreens.map((s) => s.y)), ...DS_FRAME }
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
    setWorkStarted(Date.now())
    const first = bodies[0]!
    const targetName = first.editScreenId || first.regenerateScreenId ? (screens.find((sc) => sc.id === (first.editScreenId ?? first.regenerateScreenId))?.name ?? 'the screen') : null
    if (targetName) setEditing({ target: bodies.length > 1 ? `${bodies.length} screens` : targetName, text: '' })
    try {
      // An edit streams only the parts that change, which is not a page: keep the screen in view;
      // the streamed text feeds the live card (which parts are being edited).
      const results = await Promise.allSettled(bodies.map((body) => generate(body, body.editScreenId ? (t) => setEditing((e) => (e ? { ...e, text: t } : e)) : setLive, ctl.signal)))
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected' && !(r.reason instanceof DOMException && r.reason.name === 'AbortError'))
      if (failed) toast.error(failed.reason instanceof Error ? failed.reason.message : String(failed.reason))
    } finally {
      inFlight.current = null
      setWorking(false)
      setEditing(null)
      await router.invalidate()
      setLive('')
    }
  }

  // CHAT-01: one truth for "something is running", for the composer's Stop and the live card.
  const running = working || planning || planRunning
  function stopAll() {
    if (planning || planRunning) stopPlan()
    else inFlight.current?.abort()
  }
  // CHAT-03: the queued message goes out the moment the run ends.
  useEffect(() => {
    if (running || !queued) return
    const text = queued
    setQueued(null)
    submitPrompt(text).catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, queued])
  const lastPrompt = [...messages].reverse().find((m) => m.role === 'user')?.text

  // The composer's submit, also used by retry, edit-and-resend and the queue.
  async function submitPrompt(prompt: string, images?: string[]) {
    // A picture means "look like this", which is never a token-only theme change.
    if (!images?.length && routeIntent(prompt, { elementSelected: Boolean(selectedElementId) }).kind === 'theme') {
      const result = await themeFromChat({ data: { projectId: project.id, prompt } })
      if (result.applied) {
        setTheme(result.theme)
        await router.invalidate()
        return
      }
    }
    // Several screens selected: the same instruction goes to each, as its own edit.
    if (multi) await run(selectedIds.map((id) => ({ prompt, projectId: project.id, editScreenId: id, images })))
    else await run({ prompt, projectId: project.id, editScreenId: selectedScreen?.id, editElementId: selectedElementId ?? undefined, images })
  }

  // CHAT-02: what the live card shows, from the page's own state — never a model's words.
  const activity: Activity | null = awaiting
    ? null
    : planning && !plan
      ? { kind: 'planning', startedAt: workStarted }
      : (planning || planRunning) && plan
        ? { kind: 'drawing', startedAt: workStarted, plan, status, errors: planErrors, photos: Object.fromEntries(Object.entries(planPhotos).map(([i, m]) => [i, Object.keys(m).length])), onFocus: (i) => planIds[i] && focusScreen(planIds[i]!) }
        : planRunning
          ? { kind: 'waiting', startedAt: workStarted, text: 'Still designing this app — screens appear as they finish' }
          : working && editing
              ? { kind: 'editing', startedAt: workStarted, target: editing.target, parts: parseAffects(editing.text) }
              : working
                ? { kind: 'waiting', startedAt: workStarted, text: 'Designing a new screen' }
                : null

  // Draws the screen again from what it was planned to be (its stored spec), in the same slot, with
  // the app's context. The current design becomes a version. Also how a failed screen is retried.
  async function regenerateScreen(screen: (typeof screens)[number]) {
    selectScreen(screen.id)
    await run({ prompt: '', projectId: project.id, regenerateScreenId: screen.id })
  }

  // FIG-02/FIG-06: screens as they are rendered, as Figma layers on the clipboard (paste with ⌘V).
  // From a frame: that screen, or every selected screen when it is one of them. From the export
  // menu: the whole app. Each screen arrives as its own group, placed as it sits on the canvas.
  async function copyToFigma(screenId?: string) {
    const drawn = screens.filter((s) => s.html)
    const chosen =
      screenId && !(selectedIds.length > 1 && selectedIds.includes(screenId))
        ? drawn.filter((s) => s.id === screenId)
        : selectedIds.length > 1
          ? drawn.filter((s) => selectedIds.includes(s.id))
          : drawn
    if (chosen.length === 0) return toast.error('Nothing to copy yet')
    const ordered = [...chosen].sort((a, z) => a.y - z.y || a.x - z.x)
    const id = toast.loading(ordered.length === 1 ? 'Preparing layers for Figma…' : `Preparing ${ordered.length} screens for Figma…`)
    try {
      const items = []
      for (const s of ordered) items.push({ tree: await serializeScreen(s.id), x: s.x, y: s.y })
      const { bytes } = await copyTreesToFigma(items, project.name)
      toast.success('Copied — paste into Figma with ⌘V', { id, description: `${ordered.length} screen${ordered.length === 1 ? '' : 's'}, ${Math.round(bytes / 1024)} KB, photos included` })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), { id })
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

  // The same four actions in the frame's ⋯ menu and its right-click menu.
  const frameActions = (s: (typeof screens)[number]) => ({
    onRegenerate: () => regenerateScreen(s),
    onCopyHtml: () => copyHtml(applyThemeOverride(s.html, theme)),
    onCopyFigma: () => copyToFigma(s.id),
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
        onCopyFigma={() => copyToFigma()}
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
                device={project.device}
                onFocusScreen={focusScreen}
                onRevert={async (messageId) => {
                  await revertMessage({ data: { projectId: project.id, messageId } })
                  await router.invalidate()
                }}
                onEdit={(text) => setFill((f) => ({ text, key: (f?.key ?? 0) + 1 }))}
                onResend={(text) => (running ? setQueued(text) : submitPrompt(text).catch((e) => toast.error(e instanceof Error ? e.message : String(e))))}
                suggestions={!selectedScreen ? nextSteps : undefined}
                onSuggest={(text) => setFill((f) => ({ text, key: (f?.key ?? 0) + 1 }))}
                running={awaiting && plan ? <PlanApproval plan={plan} onDraw={approvePlan} onDiscard={discardPlan} askNextTime={gatePref()} /> : activity ? <ActivityCard activity={activity} /> : undefined}
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
              <PromptBox
                placeholder={
                  awaiting
                    ? 'Approve the plan above, or change it…'
                    : planning
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
                attachments
                running={running}
                onStop={stopAll}
                queued={queued}
                onQueue={setQueued}
                lastPrompt={lastPrompt}
                onSubmit={submitPrompt}
              />
            </>
          }
          theme={
            <div className="space-y-6 text-sm">
              <ThemePanel theme={theme} baseAccent={baseAccent} base={baseTokens} onChange={changeTheme} onPreview={setThemePreview} />
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
              if (id === '__ds__') return <ScreenFrame html={dsSample} title="Design system" hint="Built from the design system's tokens; follows the Theme panel" device={project.device} theme={shownTheme} width={DS_FRAME.width} height={DS_FRAME.height} />
              if (id === '__live__')
                return <ScreenFrame html={extractArtifact(live).html} title="Designing…" device={project.device} theme={shownTheme} streaming />
              const planAt = planIds.indexOf(id)
              if (id.startsWith('plan-') || (planAt !== -1 && !screenIds.has(id))) {
                const i = planAt !== -1 ? planAt : Number(id.slice(5))
                const s = plan!.screens[i]!
                const st = status[i]
                if (st === 'pending')
                  return (
                    <div>
                      <p className="mb-2 truncate text-sm font-medium text-muted-foreground">{s.name}</p>
                      <Skeleton style={{ width: f.width, height: f.height, borderRadius: 40 }} />
                    </div>
                  )
                // The same wrapper shape as a saved frame, so React keeps this iframe when the saved
                // screen takes over (LP-04).
                const noop = () => {}
                return (
                  <FrameContextMenu onRename={noop} onDuplicate={noop} onDelete={noop} onRegenerate={noop} onCopyHtml={noop} onCopyFigma={noop} onViewCode={noop} onDownload={noop}>
                    <div>
                      <ScreenFrame
                        html={extractArtifact(planTexts[i] ?? '').html}
                        title={s.name}
                        device={project.device}
                        theme={shownTheme}
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
                      theme={shownTheme}
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
                          selected={selectedIds.includes(s.id)}
                          {...frameActions(s)}
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
        className="flex flex-col items-center justify-center gap-3 border border-dashed border-destructive/40 bg-background p-8 text-center"
        style={{ width: props.width, height: props.height, borderRadius: 40 }}
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

