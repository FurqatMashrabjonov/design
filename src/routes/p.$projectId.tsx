import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { getProject } from '../server/fns'
import { generate } from '../generate'
import { extractArtifact } from '../artifact'
import { PromptBox } from '../PromptBox'
import { ScreenFrame } from '../ScreenFrame'

export const Route = createFileRoute('/p/$projectId')({
  loader: ({ params }) => getProject({ data: params.projectId }),
  component: ProjectPage,
})

function ProjectPage() {
  const { project, screens } = Route.useLoaderData()
  const router = useRouter()
  const [live, setLive] = useState('')
  const [zoom, setZoom] = useState(1)

  return (
    <main className="px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Link to="/" className="text-neutral-400 hover:text-white">
          ← Projects
        </Link>
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <span className="text-sm text-neutral-500">
          {project.device} · {project.design_system}
        </span>
        <label className="ml-auto flex items-center gap-2 text-sm text-neutral-400">
          Zoom
          <input
            type="range"
            min={0.25}
            max={1.5}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
      </header>

      <div className="mb-8 max-w-2xl">
        <PromptBox
          placeholder="Add another screen to this project…"
          onSubmit={async (prompt) => {
            try {
              await generate({ prompt, projectId: project.id }, setLive)
              await router.invalidate()
            } finally {
              setLive('')
            }
          }}
        />
      </div>

      <div className="flex flex-wrap items-start gap-8">
        {live && <ScreenFrame html={extractArtifact(live).html} title="Designing…" device={project.device} zoom={zoom} />}
        {screens.map((s) => (
          <ScreenFrame key={s.id} html={s.html} title={s.name} hint={s.prompt} device={project.device} zoom={zoom} />
        ))}
      </div>
    </main>
  )
}
