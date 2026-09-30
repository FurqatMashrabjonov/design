import { createFileRoute } from '@tanstack/react-router'
import { userFrom } from '@/server/auth'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Project } from '@/app/Models/Project'
import { appLook } from '@/app/Services/JsxGenerator'
import { ShotService } from '@/app/Services/ShotService'
import { parseAppTheme } from '@/lib/app-theme'

// KON-10: a screen as a picture (PNG), for the places that only show it — dashboard cards, the sidebar, the chat's
// before/after. Who may see it is exactly who may see /api/thumb (the owner, an admin, or a shared project's token
// for its current screens). `?v=` is an earlier version. The ETag is the picture's key (source + look), so a
// browser asks again cheaply and a changed screen or theme is a new picture. 404 when it cannot be drawn (no
// Chrome): the page then falls back to the live frame.
export const Route = createFileRoute('/api/shot/$screenId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const q = new URL(request.url).searchParams
        const user = await userFrom(request)
        const screen = await Screen.find(params.screenId)
        const live = screen && !screen.deletedAt && screen.html ? await Project.find(screen.projectId) : undefined
        const shared = !!live?.shareToken && q.get('t') === live.shareToken && !q.get('v')
        const project = live && (shared || user?.admin || (user && live.userId === user.id)) ? live : undefined
        if (!screen || !project) return new Response('Not found', { status: 404 })
        const v = q.get('v')
        const version = v ? await ScreenVersion.findInScreen(v, screen.id) : undefined
        if (v && !version) return new Response('Not found', { status: 404 })
        const source = version?.html ?? screen.html
        const look = appLook(project, parseAppTheme(project.theme))
        const etag = `"${ShotService.key(source, look)}"`
        const headers = { 'cache-control': 'private, no-cache', etag, 'x-content-type-options': 'nosniff' }
        if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
        const image = await ShotService.get(source, look, screen.slug ?? screen.id)
        if (!image) return new Response('Not available', { status: 404 })
        return new Response(new Uint8Array(image), { headers: { ...headers, 'content-type': 'image/png' } })
      },
    },
  },
})
