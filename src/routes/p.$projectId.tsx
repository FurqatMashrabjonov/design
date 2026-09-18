import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { generateScreen, getProject } from '../server/fns'
import { PromptBox } from '../PromptBox'

export const Route = createFileRoute('/p/$projectId')({
  loader: ({ params }) => getProject({ data: params.projectId }),
  component: ProjectPage,
})

const FRAME = {
  desktop: { width: 1440, height: 900, scale: 0.5 },
  mobile: { width: 390, height: 844, scale: 0.75 },
}

function ProjectPage() {
  const { project, screens } = Route.useLoaderData()
  const generate = useServerFn(generateScreen)
  const router = useRouter()
  const f = FRAME[project.device as keyof typeof FRAME] ?? FRAME.desktop

  return (
    <main className="px-4 py-6">
      <header className="mb-6 flex items-center gap-4">
        <Link to="/" className="text-neutral-400 hover:text-white">
          ← Projects
        </Link>
        <h1 className="text-xl font-semibold">{project.name}</h1>
      </header>

      <div className="mb-8 max-w-2xl">
        <PromptBox
          placeholder="Add another screen to this project…"
          onSubmit={async (prompt) => {
            await generate({ data: { prompt, projectId: project.id } })
            await router.invalidate()
          }}
        />
      </div>

      <div className="flex flex-wrap gap-8">
        {screens.map((s) => (
          <figure key={s.id}>
            <figcaption className="mb-2 text-sm text-neutral-400" title={s.prompt}>
              {s.name}
            </figcaption>
            <div
              className="overflow-hidden rounded-lg border border-neutral-800 bg-white"
              style={{ width: f.width * f.scale, height: f.height * f.scale }}
            >
              {/* No allow-same-origin: generated JS must not reach this app's origin */}
              <iframe
                title={s.name}
                srcDoc={s.html}
                sandbox="allow-scripts"
                style={{ width: f.width, height: f.height, transform: `scale(${f.scale})`, transformOrigin: '0 0' }}
              />
            </div>
          </figure>
        ))}
      </div>
    </main>
  )
}
