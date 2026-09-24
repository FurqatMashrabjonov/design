import { artBlock, artDirection } from '@/lib/art-direction'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { KitService } from '@/app/Services/KitService'
import { DesignSystemService, matchSystem, themeFromReference } from '@/app/Services/DesignSystemService'
import { streamCompletion } from '@/app/Services/LlmService'
import { composeSystemPrompt } from '@/app/Services/PromptComposer'
import { editPlan, planScreensWithRetry, screenTitle, type Plan, type PlannedScreen } from '@/app/Services/PlannerService'
import { PendingPlans } from '@/app/Services/PendingPlans'
import { CreditService } from '@/app/Services/CreditService'
import { readReference, referenceBlock, type ReferenceStyle } from '@/app/Services/ReferenceService'
import { parseRefImages } from '@/lib/ref-images'
import { mapLimit } from '@/app/Services/Pool'
import { prefetchImage, resolveImages } from '@/app/Services/ImageService'
import { imageQueries } from '@/lib/image-slots'
import { navClearance } from '@/app/Services/ShellService'
import { dataBlock, navStyleFor, screenBrief, screenSpec, shellContract, shellPartsFor } from '@/app/Services/ScreenContext'
import { extractArtifact } from '@/artifact'
import { frameSize, FRAME_GAP } from '@/canvas'
import { annotateHtml } from '@/lib/element-annotator'
import { normalizeScreen } from '@/lib/screen-normalizer'
import { componentSheet } from '@/app/Services/ComponentSheetService'
import { autofixScreen, lintScreen } from '@/lib/design-lint'
import { contentBlock, contentSeed, localeOf } from '@/lib/content-seed'
import { Message } from '@/app/Models/Message'
import { PlanRuns } from '@/app/Services/PlanRuns'
import { briefStyle } from '@/lib/intent'
import { isEmptyTheme, parseTheme, sanitizeTheme } from '@/lib/theme-override'
import { formatTokens, friendlyError, planReply, type MessageScreen } from '@/lib/agent-messages'


// POST { projectId, brief } -> newline-delimited JSON events (see PlanEvent in src/generatePlan.ts).
// Only used to seed a brand-new, empty project — positions are assigned by plan order (0, 1, 2, ...).
// GQ-07: the run is not tied to the response. If the page goes away the events stop, the drawing
// does not; only Stop (PlanRuns.stop) ends it. `onFinish` is called when the run is really over.
export const PlanController = {
  async stream(request: Request, opts: { onFinish?: () => void } = {}): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const project = await Project.find(String(body.projectId ?? ''))
    if (!project) return new Response('Project not found', { status: 404 })
    // CHAT-08: either a brief to plan (and, with `gate`, wait for approval), or an approval of the
    // plan waiting for this project, with the person's edits.
    const approving = body.approve && typeof body.approve === 'object' ? (body.approve as { keep?: unknown; names?: unknown }) : null
    const pendingPlan = approving ? PendingPlans.take(project.id) : undefined
    if (approving && !pendingPlan) return new Response('That plan has expired — plan the app again', { status: 409 })
    const brief = pendingPlan ? pendingPlan.brief : typeof body.brief === 'string' ? body.brief.trim() : ''
    if (!brief || brief.length > 4000) return new Response('Brief must be 1-4000 characters', { status: 400 })
    const gate = body.gate === true && !pendingPlan
    // IMG-01: pictures the person attached when starting the app. Read once, below, and then dropped.
    const refImages = parseRefImages(body.images)
    const edits = approving
      ? {
          keep: Array.isArray(approving.keep) ? approving.keep.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 64) : undefined,
          names: approving.names && typeof approving.names === 'object' ? (approving.names as Record<number, string>) : undefined,
        }
      : null

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
          try {
            controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'))
          } catch {}
        }
        // The conversation is written as the work happens: the ask first, then what was done about it.
        const startedAt = Date.now()
        // The ask is written once, when the plan is first asked for — not again on approval.
        if (!pendingPlan) await Message.add({ projectId: project.id, role: 'user', kind: 'plan', text: brief })
        const usage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0 }
        const tally = (u: typeof usage) => {
          usage.promptTokens += u.promptTokens
          usage.cachedTokens += u.cachedTokens
          usage.completionTokens += u.completionTokens
        }
        const log: string[] = []
        const drawnScreens: MessageScreen[] = []
        const planIndex = new Map<string, number>() // screens finish out of order; the reply lists them in plan order
        const failedNames: string[] = []
        // GQ-02: the look the brief asks for ("yellow accents", "#FFC107", "rounded corners") becomes the
        // project's theme, which every screen renders with. A theme set by hand is never replaced.
        const style = briefStyle(brief)
        if (Object.keys(style.theme).length && isEmptyTheme(parseTheme(project.theme))) {
          await Project.saveTheme(project.id, sanitizeTheme(style.theme))
          log.push(`From the brief: ${style.said.join(', ')}`)
        }
        // IMG-02: read the picture before anything else, because it decides the look. The design
        // system was chosen from the brief's words alone, which had nothing to go on when the brief
        // was "same as in the image" — so the picture replaces that choice, and sets the accent and
        // the corners, before a single screen is drawn.
        let reference: ReferenceStyle = pendingPlan?.reference ?? { composition: '', mood: [] }
        try {
          if (!reference.composition && refImages.length) {
            reference = await readReference(refImages, abort.signal)
            const match = reference.accent || reference.background ? matchSystem(reference) : null
            if (match && match.id !== project.designSystem) {
              await Project.saveDesignSystem(project.id, match.id)
              project.designSystem = match.id
              log.push(`The reference image looks like the ${match.id} system — using it instead of ${project.designSystem}`)
            }
            const refTheme = themeFromReference(reference)
            if (Object.keys(refTheme).length && isEmptyTheme(parseTheme((await Project.find(project.id))?.theme))) {
              await Project.saveTheme(project.id, sanitizeTheme(refTheme))
              log.push(`From the reference image: accent ${refTheme.accent ?? '—'}, ${refTheme.radius ?? 'default'} corners`)
            }
          }
        } catch {
          // A picture we cannot read must not stop the app being built.
        }
        try {
          let plan: Plan
          let screenIds: string[]
          if (pendingPlan && edits) {
            // Approved: the planner's plan with the person's edits, and the ids the canvas already holds.
            plan = editPlan(pendingPlan.plan, edits)
            // The kept screens keep the ids the canvas already holds their frames under.
            screenIds = (edits.keep ?? pendingPlan.plan.screens.map((_, k) => k)).filter((i) => i < pendingPlan.screenIds.length).map((i) => pendingPlan.screenIds[i]!)
            log.push(`Approved ${plan.screens.length} of ${pendingPlan.plan.screens.length} planned screens`)
          } else {
            plan = await planScreensWithRetry(brief, tally)
            // Screen ids are decided now (LP-04): the canvas keys each plan frame by the id its screen
            // will be saved under, so the frame that streamed is the frame that stays.
            screenIds = plan.screens.map(() => crypto.randomUUID())
          }
          log.push(
            `Planned ${plan.screens.length} screens (${plan.screens.map((s) => s.archetype).join(', ')}), ${plan.navigation.tabs.length} tabs, ${plan.entities.reduce((n, e) => n + e.items.length, 0)} data items — ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
          )
          if (plan.requested.length) log.push(`The brief asked for ${plan.requested.length} screens; ${plan.uncovered.length === 0 ? 'all are covered' : `not covered: ${plan.uncovered.join('; ')}`}${plan.repaired ? ' (after one repair round)' : ''}`)
          await Project.rename(project.id, plan.appName)
          await Project.saveNavigation(project.id, plan.navigation)
          await Project.savePlan(project.id, { summary: plan.summary, appType: plan.appType, entities: plan.entities, reference })
          send({ type: 'plan', ...plan, screenIds })
          if (gate) {
            // CHAT-08: stop here. The plan waits for the person; the ask is answered when they approve.
            PendingPlans.set(project.id, { plan, brief, screenIds, reference })
            send({ type: 'awaiting' })
            PlanRuns.finish(project.id, abort)
            opts.onFinish?.()
            try {
              if (!detached) controller.close()
            } catch {}
            return
          }

          // GQ-10: a system chosen for the person (not by them) may have its colours replaced by
          // the palette the planner invented for this app. Built and repaired to AA once, saved,
          // then every screen — drawn now or added weeks later — gets the same :root.
          const tokensCss = DesignSystemService.readTokensRoot(project.designSystem)
          const system = composeSystemPrompt(project.designSystem)
          const fontUrls = DesignSystemService.readFontUrls(project.designSystem)
          const iconStroke = DesignSystemService.readIconStroke(project.designSystem)
          const leakTerms = DesignSystemService.readLeakTerms(project.designSystem)
          const colorEnergy = DesignSystemService.readColorEnergy(project.designSystem)
          const fw = frameSize(project.device).width
          const screenNames = plan.screens.map((s) => s.name)
          // NAV-01: one bar shape for the whole app, decided from its name before anything is drawn.
          const bar = navStyleFor(project.id, plan.navigation, { appType: plan.appType, designSystem: project.designSystem })
          const content = contentBlock(contentSeed(project.id, localeOf(brief)))
          const data = dataBlock(plan.entities)

          // GQ-16: one component sheet, built in code from the kit and the plan's data, for every screen.
          const sheet = componentSheet(plan.entities)
          const buildUser = (s: PlannedScreen) =>
            screenBrief({
              app: `${plan.appName} — ${plan.summary}`,
              screenNames,
              contract: shellContract(s, plan.navigation, bar),
              sheet,
              content,
              data,
              art: [artBlock(artDirection(project.id, plan.appType)), referenceBlock(reference)].filter(Boolean).join('\n\n'),
              heading: `Screen to design: ${s.name}`,
              description: screenSpec(s, plan.appName),
            })

          const renderScreen = async (s: PlannedScreen, i: number): Promise<string | null> => {
            if (abort.signal.aborted) return null // client left: don't start more paid work
            send({ type: 'screen_start', index: i, name: s.name })
            try {
              let text = ''
              const t0 = Date.now()
              // LP-06: a photo slot is looked up the moment its tag is complete, and the URL goes to
              // the preview, so photos appear while the screen is still being written. The lookup is
              // cached, so resolveImages below puts the same photo in the saved screen.
              const asked = new Set<string>()
              for await (const d of streamCompletion(system, buildUser(s), abort.signal, tally)) {
                text += d
                send({ type: 'screen_delta', index: i, text })
                if (d.includes('>')) {
                  for (const q of imageQueries(text)) {
                    if (asked.has(q) || asked.size >= 12) continue
                    asked.add(q)
                    prefetchImage(q, abort.signal)
                      .then((img) => img && send({ type: 'screen_image', index: i, query: q, url: img.url }))
                      .catch(() => {})
                  }
                }
              }
              const { title, html } = extractArtifact(text)
              if (!/<\/html>/i.test(html)) throw new Error('Model returned incomplete HTML')

              const normalized = autofixScreen(
                normalizeScreen(html, {
                  tokensCss,
                  fontUrls,
                  iconStroke,
                  shell: shellPartsFor(s, plan.navigation, s.name, bar),
                  navClearance: navClearance(bar),
                  kitCss: KitService.css(),
                }),
              )
              const withImages = await resolveImages(normalized, abort.signal, { name: plan.appName })
              const findings = lintScreen(withImages, { leakTerms, colorEnergy })
              if (findings.length > 0) {
                console.warn(`[lint] ${s.name}:`, findings.map((f) => `${f.rule}(${f.samples.length})`).join(' '))
              }
              const screen = await Screen.create({
                id: screenIds[i]!,
                projectId: project.id,
                // The model titles its page "Streakly — Today"; the app's name stays off the screen's.
                name: screenTitle(title, plan.appName) || s.name,
                prompt: s.description,
                html: annotateHtml(withImages),
                x: i * (fw + FRAME_GAP),
                y: 0,
                screenType: s.screenType,
                activeTabId: s.activeTabId ?? null,
                parentScreenName: s.parentScreen ?? null,
                spec: screenSpec(s, plan.appName),
              })
              drawnScreens.push({ id: screen.id, name: screen.name, created: true })
              planIndex.set(screen.id, i)
              const photos = (withImages.match(/data-od-(img|avatar)-resolved/g) ?? []).length
              log.push(
                `${screen.name} — ${((Date.now() - t0) / 1000).toFixed(1)}s, ${Math.round(withImages.length / 1024)} KB, ${findings.length === 0 ? 'lint clean' : `lint: ${findings.map((f) => f.rule).join(', ')}`}${photos ? `, ${photos} photo${photos === 1 ? '' : 's'}` : ''}`,
              )
              send({ type: 'screen_done', index: i, screenId: screen.id, name: screen.name })
              return normalized
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e)
              // The screen keeps its slot: it shows up on the canvas as a failed frame that can be
              // retried in place, instead of a six-screen plan quietly becoming five.
              if (!abort.signal.aborted) {
                await Screen.create({
                  id: screenIds[i]!,
                  projectId: project.id,
                  name: s.name,
                  prompt: s.description,
                  html: '',
                  x: i * (fw + FRAME_GAP),
                  y: 0,
                  screenType: s.screenType,
                  activeTabId: s.activeTabId ?? null,
                  parentScreenName: s.parentScreen ?? null,
                  spec: screenSpec(s, plan.appName),
                  error: message,
                })
              }
              if (!abort.signal.aborted) {
                failedNames.push(s.name)
                log.push(`${s.name} — failed: ${message.slice(0, 200)}`)
              }
              send({ type: 'screen_error', index: i, message })
              return null
            }
          }

          // Every screen copies the same sheet, so none has to wait for an anchor to be drawn first
          // (the anchor-first round trip used to hand siblings 1200 chars of its CSS — boilerplate).
          await mapLimit(plan.screens.map((s, i) => ({ s, i })), 3, ({ s, i }) => renderScreen(s, i))

          const stopped = abort.signal.aborted
          // BIL-06: a screen that failed or was stopped before it was drawn is not paid for.
          await CreditService.refundScreens(plan.screens.length - drawnScreens.length)
          drawnScreens.sort((a, z) => (planIndex.get(a.id) ?? 0) - (planIndex.get(z.id) ?? 0))
          if (usage.promptTokens) log.push(formatTokens(usage))
          await Message.add({
            projectId: project.id,
            role: 'agent',
            kind: 'plan',
            text: planReply({
              appName: plan.appName,
              summary: plan.summary,
              drawn: drawnScreens.map((d) => d.name),
              failed: failedNames,
              tabs: plan.navigation.tabs.map((t) => t.label),
              entities: plan.entities.map((e) => ({ kind: e.kind, count: e.items.length })),
              stopped,
            }),
            meta: { screens: drawnScreens, log, durationMs: Date.now() - startedAt, stopped },
          })
          send({ type: 'done' })
        } catch (e) {
          const raw = e instanceof Error ? e.message : String(e)
          await Message.add({ projectId: project.id, role: 'agent', kind: 'error', text: friendlyError(raw), meta: { log: [...log, raw.slice(0, 500)], durationMs: Date.now() - startedAt } })
          send({ type: 'error', message: friendlyError(raw) })
        }
        PlanRuns.finish(project.id, abort)
        opts.onFinish?.()
        try {
          if (!detached) controller.close()
        } catch {}
      },
    })

    // The header tells guardGeneration not to treat a closed page as the end of the run.
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-OD-Detached': '1' } })
  },
}
