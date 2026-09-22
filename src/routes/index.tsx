import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getHome, createProject, getSession } from '../server/fns'
import { Landing, PENDING_PROMPT, BRAND } from '../Landing'
import { Dashboard } from '../Dashboard'

export const Route = createFileRoute('/')({
  // A guest gets the landing page, a signed-in user the dashboard, on the same URL.
  beforeLoad: async () => {
    const { user } = await getSession()
    return { user }
  },
  loader: ({ context }) => (context.user ? getHome() : null),
  head: () => ({
    meta: [
      { title: `${BRAND} — design a whole mobile app from one prompt` },
      { name: 'description', content: 'Describe an app and get every screen in one design language: shared data, one navigation, real photos. Click through it, edit any element, export a prototype.' },
    ],
    links: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap' }],
  }),
  component: Index,
})

function Index() {
  return Route.useLoaderData() ? <Home /> : <Landing />
}

function Home() {
  const data = Route.useLoaderData()!
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()

  // A prompt typed on the landing page before signing in starts its project as soon as we are back.
  const started = useRef(false)
  useEffect(() => {
    let prompt: string | null = null
    try {
      prompt = sessionStorage.getItem(PENDING_PROMPT)
      sessionStorage.removeItem(PENDING_PROMPT)
    } catch {}
    if (!prompt || started.current) return
    started.current = true
    createProject({ data: { designSystem: 'auto', brief: prompt } }).then(({ id }) =>
      navigate({ to: '/p/$projectId', params: { projectId: id }, search: { brief: prompt } }),
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <Dashboard projects={data.projects} designSystems={data.designSystems} usage={data.usage} user={user ?? undefined} />
}
