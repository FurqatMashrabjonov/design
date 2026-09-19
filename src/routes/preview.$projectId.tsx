import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Link2, Moon, Pencil, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { getProject } from '../server/fns'
import { frameSize } from '../canvas'
import { orderScreens, screenForBack, screenForTab, withPreviewBridge } from '@/lib/preview-bridge'

export const Route = createFileRoute('/preview/$projectId')({
  validateSearch: (s: Record<string, unknown>): { s?: string } => (typeof s.s === 'string' ? { s: s.s } : {}),
  loader: ({ params }) => getProject({ data: params.projectId }),
  head: () => ({ meta: [{ title: 'Preview' }] }),
  component: PreviewPage,
})

type Theme = 'dark' | 'light'

const STAGE: Record<Theme, { bg: string; fg: string; chip: string; ring: string }> = {
  dark: { bg: '#1a1716', fg: '#f4f2ee', chip: 'rgba(255,255,255,0.08)', ring: 'rgba(255,255,255,0.14)' },
  light: { bg: '#efece6', fg: '#1a1716', chip: 'rgba(0,0,0,0.06)', ring: 'rgba(0,0,0,0.12)' },
}

function PreviewPage() {
  const { project, screens: rows } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const screens = useMemo(() => orderScreens(rows), [rows])
  const currentIndex = Math.max(0, screens.findIndex((s) => s.id === search.s))
  const current = screens[currentIndex]

  const [theme, setTheme] = useState<Theme>('dark')
  const [viewport, setViewport] = useState({ w: 1280, h: 800 })
  const c = STAGE[theme]

  useEffect(() => {
    const read = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  const goTo = useCallback(
    (id: string) => navigate({ to: '.', search: { s: id }, replace: true }),
    [navigate],
  )
  const step = useCallback(
    (delta: number) => {
      const next = screens[currentIndex + delta]
      if (next) goTo(next.id)
    },
    [screens, currentIndex, goTo],
  )

  // The shell inside the frame reports tab and back taps; only trust our own iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow || !e.data) return
      if (e.data.type === 'od:navigate_tab') {
        const target = screenForTab(screens, e.data.tabId)
        if (target) goTo(target.id)
        else toast.info(`No screen was designed for the "${e.data.tabId}" tab`)
      } else if (e.data.type === 'od:navigate_back') {
        const target = screenForBack(screens, e.data.parentName)
        if (target) goTo(target.id)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [screens, goTo])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  const native = frameSize(project.device)
  const isMobile = project.device === 'mobile'
  const bezel = isMobile ? 10 : 0
  // Leave room for the arrows on the sides and a caption below.
  const availH = Math.max(240, viewport.h - 130)
  const availW = Math.max(240, viewport.w - 240)
  const scale = Math.min(1, availH / (native.height + bezel * 2), availW / (native.width + bezel * 2))
  const frameW = native.width * scale
  const frameH = native.height * scale

  const srcDoc = useMemo(() => (current ? withPreviewBridge(current.html) : ''), [current])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Preview link copied')
    } catch {
      toast.error('Could not copy — clipboard access was blocked')
    }
  }

  if (!current) {
    return (
      <div className="flex h-screen items-center justify-center text-sm" style={{ background: c.bg, color: c.fg }}>
        This project has no screens to preview yet.
      </div>
    )
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden" style={{ background: c.bg, color: c.fg }}>
      <div
        className="absolute right-5 top-5 flex items-center overflow-hidden rounded-full"
        style={{ background: c.chip, boxShadow: `inset 0 0 0 1px ${c.ring}` }}
      >
        <ChromeButton label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </ChromeButton>
        <ChromeButton label="Copy preview link" onClick={copyLink}>
          <Link2 className="size-4" />
        </ChromeButton>
        <Link
          to="/p/$projectId"
          params={{ projectId: project.id }}
          aria-label="Back to editor"
          title="Back to editor"
          className="flex size-9 items-center justify-center transition-colors hover:bg-white/10"
        >
          <Pencil className="size-4" />
        </Link>
      </div>

      <div className="flex items-center gap-8">
        <Arrow label="Previous screen" disabled={currentIndex === 0} onClick={() => step(-1)} ring={c.ring} chip={c.chip}>
          <ChevronLeft className="size-5" />
        </Arrow>

        <div
          style={{
            width: frameW + bezel * 2 * scale,
            height: frameH + bezel * 2 * scale,
            borderRadius: isMobile ? 48 * scale : 12,
            background: '#0d0c0c',
            padding: bezel * scale,
            boxShadow: `0 0 0 1px ${c.ring}, 0 30px 80px rgba(0,0,0,0.35)`,
          }}
        >
          <div style={{ width: frameW, height: frameH, overflow: 'hidden', borderRadius: isMobile ? 40 * scale : 8, background: '#fff' }}>
            <iframe
              key={current.id}
              ref={iframeRef}
              title={current.name}
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              style={{ width: native.width, height: native.height, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            />
          </div>
        </div>

        <Arrow label="Next screen" disabled={currentIndex === screens.length - 1} onClick={() => step(1)} ring={c.ring} chip={c.chip}>
          <ChevronRight className="size-5" />
        </Arrow>
      </div>

      <p className="mt-5 text-xs tabular-nums opacity-60">
        {currentIndex + 1} / {screens.length} · {current.name}
      </p>
    </div>
  )
}

function ChromeButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      className="flex size-9 items-center justify-center transition-colors hover:bg-white/10"
    >
      {props.children}
    </button>
  )
}

function Arrow(props: { label: string; disabled: boolean; onClick: () => void; ring: string; chip: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className="flex size-12 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-25"
      style={{ background: props.chip, boxShadow: `inset 0 0 0 1px ${props.ring}` }}
    >
      {props.children}
    </button>
  )
}
