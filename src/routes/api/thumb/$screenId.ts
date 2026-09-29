import { createFileRoute } from '@tanstack/react-router'
import { userFrom } from '@/server/auth'
import { Screen } from '@/app/Models/Screen'
import { ScreenVersion } from '@/app/Models/ScreenVersion'
import { Project } from '@/app/Models/Project'
import { screenDocument } from '@/app/Services/ScreenDocument'
import { appLook } from '@/app/Services/JsxGenerator'
import { parseAppTheme, themeFromQuery } from '@/lib/app-theme'

// The page one screen runs in — the canvas, the preview and dashboard cards all frame this. Only the owner
// (or an admin), or anyone with a shared project's token (`?t=`, SHR-02) gets it; anyone else gets the same 404 as a screen that does not exist. `?v=<versionId>`
// is the screen as it was before a change, `?a=<hex>&p=ios|material&dark=1` the look to show (the stored theme
// otherwise), `?static` settles every figure.
export const Route = createFileRoute('/api/thumb/$screenId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const q = new URL(request.url).searchParams
        const user = await userFrom(request)
        const screen = await Screen.find(params.screenId)
        const live = screen && !screen.deletedAt && screen.html ? await Project.find(screen.projectId) : undefined
        // SHR-02: a shared project's screens are open to anyone holding its token (`t`), the current version only.
        const shared = !!live?.shareToken && q.get('t') === live.shareToken && !q.get('v')
        const project = live && (shared || user?.admin || (user && live.userId === user.id)) ? live : undefined
        if (!screen || !project) return new Response('Not found', { status: 404 })
        const v = q.get('v')
        const version = v ? await ScreenVersion.findInScreen(v, screen.id) : undefined
        if (v && !version) return new Response('Not found', { status: 404 })
        const look = appLook(project, themeFromQuery(q, parseAppTheme(project.theme)))
        const page = await screenDocument(version?.html ?? screen.html, look, { slug: screen.slug ?? screen.id })
        return new Response(page, {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=60', 'x-content-type-options': 'nosniff',
            // Opened on its own, the page still runs in an opaque origin: generated code never gets ours.
            'content-security-policy': 'sandbox allow-scripts',
          },
        })
      },
    },
  },
})
