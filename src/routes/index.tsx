import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { generateScreen, listProjects } from '../server/fns'
import { PromptBox } from '../PromptBox'

export const Route = createFileRoute('/')({
  loader: () => listProjects(),
  component: Home,
})

function Home() {
  const projects = Route.useLoaderData()
  const generate = useServerFn(generateScreen)
  const navigate = useNavigate()
  const [device, setDevice] = useState('desktop')

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold">What do you want to design?</h1>
      <p className="mb-8 text-neutral-400">Describe a screen. Get a working UI.</p>

      <PromptBox
        placeholder="A fintech dashboard with balance, recent transactions and a spending chart"
        extra={
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="rounded-md bg-neutral-800 px-2 py-1 text-sm"
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>
        }
        onSubmit={async (prompt) => {
          const { projectId } = await generate({ data: { prompt, device } })
          navigate({ to: '/p/$projectId', params: { projectId } })
        }}
      />

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
                  <span className="text-sm text-neutral-500">{p.device}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
