import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { Project } from '@/app/Models/Project'
import { Screen, type ScreenRow } from '@/app/Models/Screen'
import { ProjectController } from '@/app/Http/Controllers/ProjectController'
import { PlanController } from '@/app/Http/Controllers/PlanController'
import { GenerateController, ERROR_MARK } from '@/app/Http/Controllers/GenerateController'
import { ScreenController } from '@/app/Http/Controllers/ScreenController'
import { ShareController } from '@/app/Http/Controllers/ShareController'
import { CreditService } from '@/app/Services/CreditService'
import { ShotService } from '@/app/Services/ShotService'
import { PlanRuns } from '@/app/Services/PlanRuns'
import { parseAppPlan } from '@/app/Services/JsxGenerator'
import { parseAppTheme } from '@/lib/app-theme'
import { PLAN_LIMIT_ERROR } from '@/lib/credit-prices'
import { signLink } from '@/lib/signed-link'
import { guardGeneration } from '@/server/guard'
import type { SessionUser } from '@/server/auth'

// MCP-01: Screenspell as tools for a coding agent (Claude Code, Cursor…). One server per request, bound to the person
// the API key belongs to: every tool sees only that person's projects (another's is "not found", as on the site), a
// tool that calls a model goes through guardGeneration exactly like the studio (limits, credit hold, settle), and an
// export is a short-lived signed link to the same /api/export route, so its plan rule and Free's count hold.

type Out = { content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[]; isError?: boolean }
const text = (t: string): Out => ({ content: [{ type: 'text', text: t }] })
const json = (v: unknown): Out => text(JSON.stringify(v, null, 2))
const fail = (t: string): Out => ({ content: [{ type: 'text', text: t }], isError: true })

const kindOf = (s: ScreenRow) => (s.screenType === 'root-tab' ? 'tab' : s.screenType === 'modal-flow' ? 'modal' : 'push')
const shown = (screens: ScreenRow[]) => screens.filter((s) => s.html && !s.deletedAt)

/** A refused guarded call (402 credits, 429 limits…) as one line the agent can repeat to the person. */
async function refusal(res: Response): Promise<string> {
  const body = await res.text().catch(() => '')
  if (res.status === 402) {
    try {
      const { needed, balance } = JSON.parse(body) as { needed: number; balance: number }
      return `Not enough credits: this needs ${needed}, the balance is ${balance}. Buy credits at /billing.`
    } catch {}
  }
  return body || `Refused (${res.status})`
}

export function mcpServer(user: SessionUser, origin: string): McpServer {
  const server = new McpServer({ name: 'screenspell', version: '1.0.0' }, {
    instructions: 'Screenspell designs mobile apps (iOS and Android) from a sentence. create_app plans and draws a whole app in about a minute; poll get_project until running is false. get_screen returns a screen\'s React (Konsta UI + Tailwind) code and a picture of it — use it as the design to build from. export_project gives a download link for the whole app as a React + Vite project.',
  })
  const owned = (id: string) => Project.findOwned(id, user.id)
  const canvas = (id: string) => `${origin}/p/${id}`
  // A guarded generation, called as the site's own route would be, with this person already known.
  const generate = (path: string, body: object, run: Parameters<typeof guardGeneration>[1]) =>
    guardGeneration(new Request(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), run, user)

  server.registerTool('list_projects', {
    title: 'List apps',
    description: 'The apps in this Screenspell account, newest first.',
    annotations: { readOnlyHint: true },
  }, async () => {
    const rows = await Project.cardsForUser(user.id)
    return json(rows.map((p) => ({ id: p.id, name: p.name, screens: p.screenCount, shared: p.shared, url: canvas(p.id) })))
  })

  server.registerTool('get_project', {
    title: 'Get an app',
    description: 'One app: its plan (summary, tabs, shared data), its screens with ids, its look, and whether it is still being drawn.',
    inputSchema: { project_id: z.string() },
    annotations: { readOnlyHint: true },
  }, async ({ project_id }) => {
    const p = await owned(project_id)
    if (!p) return fail('Project not found')
    const plan = parseAppPlan(p.plan)
    const screens = (await Screen.forProject(p.id)).filter((s) => !s.deletedAt)
    return json({
      id: p.id, name: p.name, url: canvas(p.id), running: PlanRuns.running(p.id),
      summary: plan?.summary ?? null, style: plan?.style ?? null, tabs: plan?.tabs ?? [], data: plan?.data ?? null,
      theme: parseAppTheme(p.theme),
      share: p.shareToken ? `${origin}/s/${p.shareToken}` : null,
      screens: screens.map((s) => ({ id: s.id, slug: s.slug, name: s.name, kind: kindOf(s), ready: !!s.html, error: s.error || undefined })),
    })
  })

  server.registerTool('get_screen', {
    title: 'Get a screen',
    description: 'One screen\'s code exactly as the export ships it (React, Konsta UI, Tailwind, lucide-react, @od/kit) and a PNG of it.',
    inputSchema: { project_id: z.string(), screen_id: z.string() },
    annotations: { readOnlyHint: true },
  }, async ({ project_id, screen_id }) => {
    const p = await owned(project_id)
    const s = p && (await Screen.findInProject(screen_id, p.id))
    if (!p || !s || s.deletedAt || !s.html) return fail('Screen not found')
    const { code } = await ScreenController.code({ id: s.id, projectId: p.id })
    const out: Out = text(`// ${s.name} (${kindOf(s)}, nav id "${s.slug ?? s.id}")\n${code}`)
    const look = await ShotService.lookOf(p.id)
    const png = look && (await ShotService.get(s.html, look, s.slug ?? s.id).catch(() => null))
    if (png) out.content.push({ type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' })
    return out
  })

  server.registerTool('create_app', {
    title: 'Design a new app',
    description: 'Plans and draws a new mobile app from a description (costs credits). Returns at once with the project id; drawing takes about a minute — poll get_project until running is false.',
    inputSchema: { brief: z.string().min(1).max(4000).describe('What the app is and the screens it needs, in plain words') },
  }, async ({ brief }) => {
    let project
    try {
      project = await ProjectController.store({ userId: user.id, admin: user.admin })
    } catch (e) {
      if (e instanceof Error && e.message.startsWith(PLAN_LIMIT_ERROR)) return fail('This plan\'s project limit is reached. Upgrade at /pricing or delete a project.')
      throw e
    }
    const res = await generate('/api/generate-plan', { projectId: project.id, brief }, (req, _u, finish) => PlanController.stream(req, { onFinish: finish }))
    if (!res.ok) {
      await ProjectController.destroy(project.id)
      return fail(await refusal(res))
    }
    // As when a tab closes: the run is detached (GQ-07), keeps drawing and settles its credits when it ends.
    await res.body?.cancel()
    return json({ project_id: project.id, url: canvas(project.id), running: true })
  })

  // Edit and add run to the end (a screen takes 10–40 s), so the agent gets the finished screen back.
  const change = async (projectId: string, body: object): Promise<string | null> => {
    const res = await generate('/api/generate', { projectId, ...body }, (req, userId) => GenerateController.stream(req, { userId }))
    if (!res.ok) return refusal(res)
    const out = await res.text()
    const i = out.indexOf(ERROR_MARK)
    return i < 0 ? null : out.slice(i + ERROR_MARK.length).replace(/-->[\s\S]*$/, '').trim() || 'The change failed'
  }

  server.registerTool('edit_screen', {
    title: 'Change a screen',
    description: 'Changes one screen as described (costs credits) and returns when it is redrawn.',
    inputSchema: { project_id: z.string(), screen_id: z.string(), instruction: z.string().min(1).max(4000) },
  }, async ({ project_id, screen_id, instruction }) => {
    const p = await owned(project_id)
    const s = p && (await Screen.findInProject(screen_id, p.id))
    if (!p || !s || s.deletedAt) return fail('Screen not found')
    const err = await change(p.id, { editScreenId: s.id, prompt: instruction })
    return err ? fail(err) : json({ screen_id: s.id, updated: true, url: canvas(p.id) })
  })

  server.registerTool('add_screen', {
    title: 'Add a screen',
    description: 'Adds a screen to an app (costs credits). Name the screen it opens from ("a leaderboard from Profile"), else it opens from the first tab.',
    inputSchema: { project_id: z.string(), request: z.string().min(1).max(4000) },
  }, async ({ project_id, request }) => {
    const p = await owned(project_id)
    if (!p) return fail('Project not found')
    const before = new Set((await Screen.forProject(p.id)).map((s) => s.id))
    const err = await change(p.id, { prompt: request })
    if (err) return fail(err)
    const added = shown(await Screen.forProject(p.id)).filter((s) => !before.has(s.id))
    return json({ added: added.map((s) => ({ id: s.id, name: s.name, slug: s.slug })), url: canvas(p.id) })
  })

  server.registerTool('export_project', {
    title: 'Export the app\'s code',
    description: 'A download link (valid 10 minutes) for the whole app as a React + Vite project (.zip), or one HTML file. Free accounts have a few exports in all.',
    inputSchema: { project_id: z.string(), format: z.enum(['react', 'html']).default('react') },
  }, async ({ project_id, format }) => {
    const p = await owned(project_id)
    if (!p) return fail('Project not found')
    if (!shown(await Screen.forProject(p.id)).length) return fail('Nothing to export yet')
    const left = await CreditService.exportsLeft(user.id, user.admin)
    if (left === 0) return fail('No exports left on the Free plan. Upgrade at /pricing.')
    const url = `${origin}/api/export/${p.id}?k=${signLink(user.id, `export:${p.id}`)}${format === 'html' ? '&format=html' : ''}`
    return json({ url, expires_in_seconds: 600, exports_left: left === null ? 'unlimited' : left, hint: format === 'react' ? 'curl -L -o app.zip "<url>" && unzip app.zip && npm install && npm run dev' : undefined })
  })

  server.registerTool('share_project', {
    title: 'Share or unshare',
    description: 'Turns the app\'s public preview link on or off. Anyone with the link can tap through the app; off kills the old link.',
    inputSchema: { project_id: z.string(), on: z.boolean() },
  }, async ({ project_id, on }) => {
    const p = await owned(project_id)
    if (!p) return fail('Project not found')
    const { token } = await ShareController.share({ id: p.id, on })
    return json({ share: token ? `${origin}/s/${token}` : null })
  })

  return server
}
