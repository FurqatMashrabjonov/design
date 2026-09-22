import { createFileRoute } from '@tanstack/react-router'
import { userFrom } from '@/server/auth'
import { Project } from '@/app/Models/Project'
import { PlanRuns } from '@/app/Services/PlanRuns'

// GQ-07: Stop for a planned run. A run no longer ends when its page does, so Stop is its own call.
// Same checks as the generation routes: this site only, signed in, the caller's project.
export const Route = createFileRoute('/api/stop-plan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get('origin')
        if (origin && origin !== new URL(request.url).origin) return new Response('Cross-site request refused', { status: 403 })
        const user = await userFrom(request)
        if (!user) return new Response('Sign in to continue', { status: 401 })
        const body = (await request.json().catch(() => ({}))) as { projectId?: unknown }
        if (!(typeof body.projectId === 'string' && Project.findOwned(body.projectId, user.id))) return new Response('Project not found', { status: 404 })
        return Response.json({ stopped: PlanRuns.stop(body.projectId) })
      },
    },
  },
})
