import { createFileRoute } from '@tanstack/react-router'
import { userFrom } from '@/server/auth'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Project } from '@/app/Models/Project'
import { applyThemeOverride, parseTheme } from '@/lib/theme-override'

// DSH-11: a dashboard card's thumbnail is the project's first screen, served as its own page so the
// card can load it lazily in an iframe. Only the owner (or an admin) gets it; anyone else gets the same 404 as a
// screen that does not exist. The project's theme is applied the way the canvas applies it.
export const Route = createFileRoute('/api/thumb/$screenId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await userFrom(request)
        const screen = user ? await Screen.find(params.screenId) : undefined
        // The owner, or an admin (ADM-05) — the panel shows every project's cover the same way.
        const project = screen && !screen.deletedAt && screen.html ? (user!.admin ? await Project.find(screen.projectId) : await Project.findOwned(screen.projectId, user!.id)) : undefined
        if (!screen || !project) return new Response('Not found', { status: 404 })
        // CHAT-06: ?v=<versionId> is the screen as it was before a change — the "before" thumbnail.
        const v = new URL(request.url).searchParams.get('v')
        const version = v ? await ScreenVersion.findInScreen(v, screen.id) : undefined
        if (v && !version) return new Response('Not found', { status: 404 })
        return new Response(applyThemeOverride(version?.html ?? screen.html, parseTheme(project.theme)), {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=60', 'x-content-type-options': 'nosniff',
            // Opened on its own, the page still runs in an opaque origin: generated HTML never gets ours.
            'content-security-policy': 'sandbox allow-scripts',
          },
        })
      },
    },
  },
})
