import { createFileRoute } from '@tanstack/react-router'
import { userFrom } from '@/server/auth'
import { Screen } from '@/app/Models/Screen'
import { Project } from '@/app/Models/Project'
import { applyThemeOverride, parseTheme } from '@/lib/theme-override'

// DSH-11: a dashboard card's thumbnail is the project's first screen, served as its own page so the
// card can load it lazily in an iframe. Only the owner gets it; anyone else gets the same 404 as a
// screen that does not exist. The project's theme is applied the way the canvas applies it.
export const Route = createFileRoute('/api/thumb/$screenId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await userFrom(request)
        const screen = user ? Screen.find(params.screenId) : undefined
        const project = screen && !screen.deletedAt && screen.html ? Project.findOwned(screen.projectId, user!.id) : undefined
        if (!screen || !project) return new Response('Not found', { status: 404 })
        return new Response(applyThemeOverride(screen.html, parseTheme(project.theme)), {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=60', 'x-content-type-options': 'nosniff',
            // Opened on its own, the page still runs in an opaque origin: generated HTML never gets ours.
            'content-security-policy': 'sandbox allow-scripts',
          },
        })
      },
    },
  },
})
