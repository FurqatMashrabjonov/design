import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getProject, moveScreen } from '../server/fns'
import { generate } from '../generate'
import { extractArtifact } from '../artifact'
import { frameSize, nextFramePosition } from '../canvas'
import { PromptBox } from '../PromptBox'
import { ScreenFrame } from '../ScreenFrame'
import { Canvas, type CanvasFrame } from '@/components/canvas/Canvas'
import { TopBar } from '@/components/canvas/TopBar'
import { Sidebar } from '@/components/canvas/Sidebar'
import { ScreensList } from '@/components/canvas/ScreensList'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/p/$projectId')({
  loader: ({ params }) => getProject({ data: params.projectId }),
  component: ProjectPage,
})

function ProjectPage() {
  const { project, screens } = Route.useLoaderData()
  const router = useRouter()
  const [live, setLive] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const f = frameSize(project.device)
  const selectedScreen = screens.find((s) => s.id === selected)
  // Editing an existing screen: the live preview takes over its spot. New screen: it lands to the right of the rest.
  const livePos = selectedScreen ? { x: selectedScreen.x, y: selectedScreen.y } : nextFramePosition(screens, project.device)
  const liveFrame: CanvasFrame | null = live ? { id: '__live__', ...livePos, width: f.width, height: f.height } : null
  const visibleScreens = live && selectedScreen ? screens.filter((s) => s.id !== selectedScreen.id) : screens
  const frames: CanvasFrame[] = [
    ...visibleScreens.map((s) => ({ id: s.id, x: s.x, y: s.y, width: f.width, height: f.height })),
    ...(liveFrame ? [liveFrame] : []),
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
        name={project.name}
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
              moveScreen({ data: { id, x, y } })
            }}
            renderFrame={(id) => {
              if (id === '__live__')
                return <ScreenFrame html={extractArtifact(live).html} title="Designing…" device={project.device} streaming />
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
              <div className="min-h-0 flex-1" />
              {selectedScreen && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Editing <Badge variant="secondary">{selectedScreen.name}</Badge>
                </div>
              )}
              <PromptBox
                placeholder={selectedScreen ? 'Describe the change…' : 'Add another screen to this project…'}
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
        />
      </div>
    </div>
  )
}
