import { createFileRoute } from '@tanstack/react-router'
import { getSharedProject } from '../server/fns'
import { AppPreview } from '@/components/AppPreview'

// SHR-02: a preview the owner made public — no sign-in, view only. `ref` names the post the link was shared in
// (reddit, x, threads…), so the admin sees which one brought views and waitlist sign-ups (WLT-01).
export const Route = createFileRoute('/s/$token')({
  validateSearch: (s: Record<string, unknown>): { s?: string; ref?: string } => ({
    ...(typeof s.s === 'string' && { s: s.s }),
    ...(typeof s.ref === 'string' && { ref: s.ref }),
  }),
  loaderDeps: ({ search }) => ({ ref: search.ref }),
  loader: ({ params, deps }) => getSharedProject({ data: { token: params.token, ref: deps.ref } }),
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.project.name} — made with AI` : 'Shared app' }] }),
  component: SharedPreview,
})

function SharedPreview() {
  const { project, screens, token } = Route.useLoaderData()
  const search = Route.useSearch()
  return <AppPreview project={project} screens={screens} start={search.s} share={{ token, ref: search.ref ?? null }} />
}
