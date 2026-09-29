import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { Message } from '@/app/Models/Message'
import { CreditService } from '@/app/Services/CreditService'
import { PlanRuns } from '@/app/Services/PlanRuns'
import { mapLimit } from '@/app/Services/Pool'
import { compileScreen } from '@/app/Services/ScreenCompiler'
import { lintJsx } from '@/lib/jsx-lint'
import { resolvePhotos } from '@/app/Services/PhotoService'
import { auditScreen, repairOn } from '@/app/Services/RenderAudit'
import type { AppLook } from '@/app/Services/ScreenDocument'
import { auditBrief } from '@/lib/render-audit'
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

/** What the render audit found on a screen and what was left after its one repair (KON-13). */
export type AuditOutcome = { found: number; left: number; repaired: boolean }

/** One screen: written, linted, compiled, and if the compiler refused it, rewritten once with its errors. Then
 *  (KON-13) drawn in headless Chrome and measured; if a person would see something broken — text cut off, a card
 *  on a heading, a row off the screen, half a phone empty — it is rewritten once with exactly those findings, and
 *  the rewrite is kept only if it builds and fewer problems are left. */
export async function drawScreen(user: string, tally: (u: import('@/app/Services/LlmService').LlmUsage) => void, signal: AbortSignal, site: 'screen' | 'edit' = 'screen', audit?: { look: AppLook; slug: string; report?: (o: AuditOutcome) => void }): Promise<string> {
  let jsx = linted(await writeScreen(user, tally, signal, site))
  let built = await compileScreen(jsx)
  if (!built.ok) {
    jsx = linted(await writeScreen(`${user}\n\n# YOUR LAST ATTEMPT DID NOT BUILD\n\`\`\`jsx\n${jsx}\`\`\`\nThe compiler said: ${built.errors.join('; ')}\nWrite the whole file again with those fixed.`, tally, signal, site))
    built = await compileScreen(jsx)
    if (!built.ok) throw new Error(`The screen did not build: ${built.errors.join('; ').slice(0, 300)}`)
  }
  // KON-12: its photos are looked up now, so the page that shows it only reads the cache.
  await resolvePhotos(jsx, signal).catch(() => {})
  // KON-13 + HIG-15: one check of what a person would see (the drawn page, measured) and what the lint could only
  // report (a List inside a Block, three big buttons…); if either found something, one rewrite with all of it.
  if (audit && repairOn() && !signal.aborted) {
    const check = async (src: string) => {
      const render = (await auditScreen(src, audit.look, audit.slug, signal)) ?? []
      const lint = lintJsx(src).findings
      return { render, lint, count: render.length + lint.length }
    }
    const found = await check(jsx)
    let left = found.count
    let repaired = false
    if (found.count && !signal.aborted) {
      const problems = [auditBrief(found.render), ...found.lint.map((f) => `- ${f.message}`)].filter(Boolean).join('\n')
      const fix = await writeScreen(`${user}\n\n# YOUR SCREEN, AS IT RENDERED\n\`\`\`jsx\n${jsx}\`\`\`\nWe drew it 390px wide and checked it. A person would see these problems:\n${problems}\nFix exactly these. Keep everything else as it is — the same content, data, sections, colours and style. Write the whole file again.`, tally, signal, site).then(linted).catch(() => null)
      if (fix && (await compileScreen(fix)).ok) {
        await resolvePhotos(fix, signal).catch(() => {})
        const after = await check(fix)
        if (after.count < found.count) {
          jsx = fix
          left = after.count
          repaired = true
        }
      }
    }
    audit.report?.({ found: found.count, left, repaired })
  }
  return jsx
}

/** The audit's line in the run's log: what the person's screen went through before they saw it. */
export const checkNote = (c?: AuditOutcome) => (!c ? '' : c.found ? `, checked: ${c.found} problem${c.found === 1 ? '' : 's'} found, ${c.left} left` : ', checked: clean')

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
          // THM-01: the project id seeds the style's colours, so two apps from one brief are not one app twice.
          const plan: AppPlan = await planApp(brief, project.name, tally, abort.signal, project.id)
          const screenIds = plan.screens.map(() => crypto.randomUUID())
          log.push(`Planned ${plan.screens.length} screens, ${plan.tabs.length} tabs — ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
          await Project.rename(project.id, plan.appName)
          await Project.saveNavigation(project.id, { tabs: plan.tabs })
          // A midnight app is dark from the start (the switch still turns it light).
          await Project.saveTheme(project.id, { accent: plan.accent, style: plan.style, dark: plan.style === 'midnight' })
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
              let checked: AuditOutcome | undefined
              const look = { accent: plan.accent, dark: plan.style === 'midnight', platform: 'ios' as const, style: plan.style, tabs: plan.tabs }
              const jsx = await drawScreen(screenBrief(plan, s), tally, abort.signal, 'screen', { look, slug: s.id, report: (o) => (checked = o) })
              const screen = await Screen.create({ ...place(s, i), html: jsx })
              drawn.push({ id: screen.id, name: screen.name, created: true })
              order.set(screen.id, i)
              log.push(`${s.name} — ${((Date.now() - t0) / 1000).toFixed(1)}s, ${jsx.length} chars${checkNote(checked)}`)
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
            text: planReply({ appName: plan.appName, summary: plan.summary, drawn: drawn.map((d) => d.name), failed, tabs: plan.tabs.map((t) => t.label), stopped }),
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
