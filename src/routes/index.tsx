import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getHome } from '../server/fns'
import { generate } from '../generate'
import { extractArtifact } from '../artifact'
import { PromptBox } from '../PromptBox'
import { ScreenFrame } from '../ScreenFrame'

export const Route = createFileRoute('/')({
  loader: () => getHome(),
  component: Home,
})

const selectCls = 'rounded-md bg-neutral-800 px-2 py-1 text-sm'

function Home() {
  const { projects, designSystems } = Route.useLoaderData()
  const navigate = useNavigate()
  const [device, setDevice] = useState('desktop')
  const [designSystem, setDesignSystem] = useState('minimal')
  const [live, setLive] = useState('')

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold">What do you want to design?</h1>
      <p className="mb-8 text-neutral-400">Describe a screen. Get a working UI.</p>

      <PromptBox
        placeholder="A fintech dashboard with balance, recent transactions and a spending chart"
        extra={
          <div className="flex gap-2">
            <select aria-label="Device" value={device} onChange={(e) => setDevice(e.target.value)} className={selectCls}>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
            <select
              aria-label="Design system"
              value={designSystem}
              onChange={(e) => setDesignSystem(e.target.value)}
              className={selectCls}
            >
              {designSystems.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        }
        onSubmit={async (prompt) => {
          try {
            const projectId = await generate({ prompt, device, designSystem }, setLive)
            navigate({ to: '/p/$projectId', params: { projectId } })
          } finally {
            setLive('')
          }
        }}
      />

      {live && (
        <div className="mt-8">
          <ScreenFrame html={extractArtifact(live).html} title="Designing…" device={device} zoom={device === 'desktop' ? 0.95 : 1} />
        </div>
      )}

      {projects.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-sm font-medium text-neutral-400">Projects</h2>
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  to="/p/$projectId"
                  params={{ projectId: p.id }}
                  className="flex justify-between px-4 py-3 hover:bg-neutral-900"
                >
                  <span>{p.name}</span>
                  <span className="text-sm text-neutral-500">
                    {p.device} · {p.design_system}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
