import { createFileRoute, redirect } from '@tanstack/react-router'
import { getProject, getSession } from '../server/fns'
import { AppPreview } from '@/components/AppPreview'

export const Route = createFileRoute('/preview/$projectId')({
  beforeLoad: async ({ location }) => {
    const { user } = await getSession()
    if (!user) throw redirect({ to: '/login', search: { next: location.href } })
    return { user }
  },
  validateSearch: (s: Record<string, unknown>): { s?: string } => (typeof s.s === 'string' ? { s: s.s } : {}),
  loader: ({ params }) => getProject({ data: params.projectId }),
  head: () => ({ meta: [{ title: 'Preview' }] }),
  component: PreviewPage,
})

function PreviewPage() {
  const { project, screens } = Route.useLoaderData()
  return <AppPreview project={project} screens={screens} start={Route.useSearch().s} />
}
