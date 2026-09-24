import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getHome, createProject, getSession } from '../server/fns'
import { Landing, PENDING_PROMPT, BRAND } from '../Landing'
import { Dashboard } from '../Dashboard'
import { creditsChanged, reportError } from '../credits'
import { toast } from 'sonner'

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
    createProject({ data: { designSystem: 'auto', brief: prompt } })
      .then(({ id }) => navigate({ to: '/p/$projectId', params: { projectId: id }, search: { brief: prompt } }))
      .catch(reportError)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // BIL-09: back from checkout. The credits come by webhook a moment later, so the balance reloads a few times.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('checkout') !== 'success') return
    history.replaceState(null, '', '/')
    toast.success('Payment received — your credits arrive in a few seconds.')
    const timers = [2000, 5000, 10000].map((ms) => setTimeout(creditsChanged, ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  return <Dashboard projects={data.projects} designSystems={data.designSystems} credits={data.credits} user={user ?? undefined} />
}
