import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { Message } from '@/app/Models/Message'
import { CreditService } from '@/app/Services/CreditService'
import { PlanRuns } from '@/app/Services/PlanRuns'
import { mapLimit } from '@/app/Services/Pool'
import { compileScreen } from '@/app/Services/ScreenCompiler'
import { lintJsx } from '@/lib/jsx-lint'
import { resolvePhotos } from '@/app/Services/PhotoService'
import { planApp, screenBrief, writeScreen, type AppPlan, type PlannedScreen } from '@/app/Services/JsxGenerator'
import { frameSize, FRAME_GAP } from '@/canvas'
import { formatTokens, friendlyError, planReply, type MessageScreen } from '@/lib/agent-messages'

// POST { projectId, brief } → newline-delimited JSON events (PlanEvent in src/generatePlan.ts).
// KON-00: plan the app once, then write every screen as a Konsta component in parallel. A screen that does
// not compile gets one more try with the compiler's errors; after that it keeps its slot as a failed frame.
// The run is not tied to the response: if the page goes away the events stop, the drawing does not; only
// Stop (PlanRuns.stop) ends it. `onFinish` is called when the run is really over.

/** HIG-10: the lint's one-right-answer fixes applied, its findings logged (Telescope keeps them). */
function linted(jsx: string): string {
  const r = lintJsx(jsx)
  if (r.fixed.length || r.findings.length) console.warn(`[jsx-lint] fixed ${r.fixed.length}: ${r.fixed.join('; ') || '—'} · found ${r.findings.length}: ${r.findings.map((f) => f.rule).join(', ') || '—'}`)
  return r.source
}

/** One screen: written, linted, compiled, and if the compiler refused it, rewritten once with its errors. */
export async function drawScreen(user: string, tally: (u: import('@/app/Services/LlmService').LlmUsage) => void, signal: AbortSignal, site: 'screen' | 'edit' = 'screen'): Promise<string> {
  let jsx = linted(await writeScreen(user, tally, signal, site))
  let built = await compileScreen(jsx)
  if (!built.ok) {
    jsx = linted(await writeScreen(`${user}\n\n# YOUR LAST ATTEMPT DID NOT BUILD\n\`\`\`jsx\n${jsx}\`\`\`\nThe compiler said: ${built.errors.join('; ')}\nWrite the whole file again with those fixed.`, tally, signal, site))
    built = await compileScreen(jsx)
    if (!built.ok) throw new Error(`The screen did not build: ${built.errors.join('; ').slice(0, 300)}`)
  }
  // KON-12: its photos are looked up now, so the page that shows it only reads the cache.
  await resolvePhotos(jsx, signal).catch(() => {})
  return jsx
}

export const PlanController = {
  async stream(request: Request, opts: { onFinish?: () => void } = {}): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const project = await Project.find(String(body.projectId ?? ''))
    if (!project) return new Response('Project not found', { status: 404 })
    const brief = typeof body.brief === 'string' ? body.brief.trim() : ''
    if (!brief || brief.length > 4000) return new Response('Brief must be 1-4000 characters', { status: 400 })

    const enc = new TextEncoder()
    const abort = PlanRuns.start(project.id)
    let detached = false
    const stream = new ReadableStream({
      cancel() {
        detached = true // the page left: keep drawing, stop sending
      },
      async start(controller) {
        const send = (obj: unknown) => {
          if (detached) return
          try { controller.enqueue(enc.encode(JSON.stringify(obj) + '\n')) } catch {}
        }
        const startedAt = Date.now()
        await Message.add({ projectId: project.id, role: 'user', kind: 'plan', text: brief })
        const usage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0 }
        const tally = (u: typeof usage) => {
          usage.promptTokens += u.promptTokens
          usage.cachedTokens += u.cachedTokens
          usage.completionTokens += u.completionTokens
        }
        const log: string[] = []
        const drawn: MessageScreen[] = []
        const order = new Map<string, number>()
        const failed: string[] = []
        try {
          const plan: AppPlan = await planApp(brief, project.name, tally, abort.signal)
          const screenIds = plan.screens.map(() => crypto.randomUUID())
          log.push(`Planned ${plan.screens.length} screens, ${plan.tabs.length} tabs — ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
          await Project.rename(project.id, plan.appName)
          await Project.saveNavigation(project.id, { tabs: plan.tabs })
          await Project.saveTheme(project.id, { accent: plan.accent })
          await Project.savePlan(project.id, plan)
          send({ type: 'plan', appName: plan.appName, screenIds, screens: plan.screens.map((s) => ({ name: s.name, kind: s.kind })) })

          const fw = frameSize(project.device).width
          const place = (s: PlannedScreen, i: number) => ({
            id: screenIds[i]!, projectId: project.id, name: s.name, slug: s.id, prompt: s.spec, x: i * (fw + FRAME_GAP), y: 0,
            screenType: s.kind === 'tab' ? 'root-tab' : s.kind === 'first-run' ? 'modal-flow' : s.kind === 'modal' ? 'modal-flow' : 'detail-view',
            activeTabId: s.tab ?? null, parentScreenName: plan.screens.find((p) => p.id === s.parent)?.name ?? null, spec: s.spec,
          })
          await mapLimit(plan.screens.map((s, i) => ({ s, i })), 4, async ({ s, i }) => {
            if (abort.signal.aborted) return
            send({ type: 'screen_start', index: i, name: s.name })
            const t0 = Date.now()
            try {
              const jsx = await drawScreen(screenBrief(plan, s), tally, abort.signal)
              const screen = await Screen.create({ ...place(s, i), html: jsx })
              drawn.push({ id: screen.id, name: screen.name, created: true })
              order.set(screen.id, i)
              log.push(`${s.name} — ${((Date.now() - t0) / 1000).toFixed(1)}s, ${jsx.length} chars`)
              send({ type: 'screen_done', index: i, screenId: screen.id, name: screen.name })
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e)
              if (!abort.signal.aborted) {
                await Screen.create({ ...place(s, i), html: '', error: message })
                failed.push(s.name)
                log.push(`${s.name} — failed: ${message.slice(0, 200)}`)
              }
              send({ type: 'screen_error', index: i, message })
            }
          })

          const stopped = abort.signal.aborted
          // BIL-06: a screen that failed or was stopped before it was drawn is not paid for.
          await CreditService.refundScreens(plan.screens.length - drawn.length)
          drawn.sort((a, z) => (order.get(a.id) ?? 0) - (order.get(z.id) ?? 0))
          if (usage.promptTokens) log.push(formatTokens(usage))
          await Message.add({
            projectId: project.id, role: 'agent', kind: 'plan',
            text: planReply({ appName: plan.appName, summary: plan.summary, drawn: drawn.map((d) => d.name), failed, tabs: plan.tabs.map((t) => t.label), entities: [], stopped }),
            meta: { screens: drawn, log, durationMs: Date.now() - startedAt, stopped },
          })
          send({ type: 'done' })
        } catch (e) {
          const raw = e instanceof Error ? e.message : String(e)
          await Message.add({ projectId: project.id, role: 'agent', kind: 'error', text: friendlyError(raw), meta: { log: [...log, raw.slice(0, 500)], durationMs: Date.now() - startedAt } })
          send({ type: 'error', message: friendlyError(raw) })
        }
        PlanRuns.finish(project.id, abort)
        opts.onFinish?.()
        try { if (!detached) controller.close() } catch {}
      },
    })
    // The header tells guardGeneration not to treat a closed page as the end of the run.
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-OD-Detached': '1' } })
  },
}
