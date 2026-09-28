import { createFileRoute } from '@tanstack/react-router'
import { userFrom } from '@/server/auth'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { CreditService } from '@/app/Services/CreditService'
import { exportHtml, exportReact, fileSlug } from '@/app/Services/ExportService'
import { parseAppTheme, themeFromQuery } from '@/lib/app-theme'
import { zip } from '@/lib/zip'

// CODE-01: GET /api/export/$projectId → the app as a React + Vite project (.zip); ?format=html → one HTML
// file (CODE-02). Only the owner (or an admin); anyone else gets the same 404 as a missing project. Export follows the plan (BIL-14): a plan
// without it gets 402 { error: 'plan', limit: 'export' }, which the page turns into the upgrade dialog.
// `?a=<hex>&p=ios|material&dark=1` exports the look the studio shows (validated), else the stored one.
export const Route = createFileRoute('/api/export/$projectId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await userFrom(request)
        const project = user ? (user.admin ? await Project.find(params.projectId) : await Project.findOwned(params.projectId, user.id)) : undefined
        if (!user || !project) return new Response('Not found', { status: 404 })
        if (!(await CreditService.limitsFor(user.id, user.admin)).export) {
          return Response.json({ error: 'plan', limit: 'export' }, { status: 402 })
        }
        const q = new URL(request.url).searchParams
        const theme = themeFromQuery(q, parseAppTheme(project.theme))
        const screens = await Screen.forProject(project.id)
        if (!screens.some((s) => s.html)) return new Response('Nothing to export yet', { status: 409 })
        const look = { ...project, theme: JSON.stringify(theme) }
        // CODE-02: ?format=html — one file that opens anywhere.
        if (q.get('format') === 'html') {
          return new Response(await exportHtml(look, screens), {
            headers: { 'content-type': 'text/html; charset=utf-8', 'content-disposition': `attachment; filename="${fileSlug(project.name)}.html"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
              // Generated code never runs as a page of our origin, even if the attachment is opened in place.
              'content-security-policy': 'sandbox allow-scripts' },
          })
        }
        const files = await exportReact(look, screens)
        const body = zip(files)
        return new Response(body as Uint8Array<ArrayBuffer>, {
          headers: {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="${fileSlug(project.name)}.zip"`,
            'cache-control': 'no-store',
          },
        })
      },
    },
  },
})
