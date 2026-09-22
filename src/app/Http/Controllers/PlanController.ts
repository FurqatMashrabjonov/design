import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { DesignSystemService } from '@/app/Services/DesignSystemService'
import { streamCompletion } from '@/app/Services/LlmService'
import { composeSystemPrompt } from '@/app/Services/PromptComposer'
import { planScreensWithRetry, type PlannedScreen } from '@/app/Services/PlannerService'
import { mapLimit } from '@/app/Services/Pool'
import { resolveImages } from '@/app/Services/ImageService'
import { NAV_CLEARANCE } from '@/app/Services/ShellService'
import { dataBlock, screenBrief, screenSpec, shellContract, shellPartsFor } from '@/app/Services/ScreenContext'
import { extractArtifact } from '@/artifact'
import { frameSize, FRAME_GAP } from '@/canvas'
import { annotateHtml } from '@/lib/element-annotator'
import { normalizeScreen, extractStyleDigest } from '@/lib/screen-normalizer'
import { autofixScreen, lintScreen } from '@/lib/design-lint'
import { contentBlock, contentSeed, localeOf } from '@/lib/content-seed'
import { Message } from '@/app/Models/Message'
import { formatTokens, friendlyError, planReply, type MessageScreen } from '@/lib/agent-messages'

// POST { projectId, brief } -> newline-delimited JSON events (see PlanEvent in src/generatePlan.ts).
// Only used to seed a brand-new, empty project — positions are assigned by plan order (0, 1, 2, ...).
export const PlanController = {
  async stream(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({}))
    const brief = typeof body.brief === 'string' ? body.brief.trim() : ''
    if (!brief || brief.length > 4000) return new Response('Brief must be 1-4000 characters', { status: 400 })
    const project = Project.find(String(body.projectId ?? ''))
    if (!project) return new Response('Project not found', { status: 404 })

    const enc = new TextEncoder()
    const abort = new AbortController()
    const stream = new ReadableStream({
      cancel() {
        abort.abort()
      },
      async start(controller) {
        const send = (obj: unknown) => {
          try {
            controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'))
          } catch {}
        }
        // The conversation is written as the work happens: the ask first, then what was done about it.
        const startedAt = Date.now()
        Message.add({ projectId: project.id, role: 'user', kind: 'plan', text: brief })
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
        try {
          const plan = await planScreensWithRetry(brief, project.device, tally)
          log.push(
            `Planned ${plan.screens.length} screens (${plan.screens.map((s) => s.archetype).join(', ')}), ${plan.navigation.tabs.length} tabs, ${plan.entities.reduce((n, e) => n + e.items.length, 0)} data items — ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
          )
          if (plan.requested.length) log.push(`The brief asked for ${plan.requested.length} screens; ${plan.uncovered.length === 0 ? 'all are covered' : `not covered: ${plan.uncovered.join('; ')}`}${plan.repaired ? ' (after one repair round)' : ''}`)
          Project.rename(project.id, plan.appName)
          Project.saveNavigation(project.id, plan.navigation)
          Project.savePlan(project.id, { summary: plan.summary, appType: plan.appType, entities: plan.entities })
          send({ type: 'plan', ...plan })

          const system = composeSystemPrompt(project.designSystem, project.device)
          const tokensCss = DesignSystemService.readTokensRoot(project.designSystem)
          const fontUrls = DesignSystemService.readFontUrls(project.designSystem)
          const iconStroke = DesignSystemService.readIconStroke(project.designSystem)
          const leakTerms = DesignSystemService.readLeakTerms(project.designSystem)
          const colorEnergy = DesignSystemService.readColorEnergy(project.designSystem)
          const fw = frameSize(project.device).width
          const isMobile = project.device === 'mobile'
          const screenNames = plan.screens.map((s) => s.name)
          const content = contentBlock(contentSeed(project.id, localeOf(brief)))
          const data = dataBlock(plan.entities)

          const buildUser = (s: PlannedScreen, digest: string) =>
            screenBrief({
              app: `${plan.appName} — ${plan.summary}`,
              screenNames,
              contract: shellContract(s, plan.navigation, isMobile),
              digest,
              content,
              data,
              heading: `Screen to design: ${s.name}`,
              description: screenSpec(s, plan.appName),
            })

          const renderScreen = async (s: PlannedScreen, i: number, digest: string): Promise<string | null> => {
            if (abort.signal.aborted) return null // client left: don't start more paid work
            send({ type: 'screen_start', index: i, name: s.name })
            try {
              let text = ''
              const t0 = Date.now()
              for await (const d of streamCompletion(system, buildUser(s, digest), abort.signal, tally)) {
                text += d
                send({ type: 'screen_delta', index: i, text })
              }
              const { title, html } = extractArtifact(text)
              if (!/<\/html>/i.test(html)) throw new Error('Model returned incomplete HTML')

              const normalized = autofixScreen(
                normalizeScreen(html, {
                  tokensCss,
                  fontUrls,
                  iconStroke,
                  shell: shellPartsFor(s, plan.navigation, isMobile, s.name),
                  navClearance: NAV_CLEARANCE,
                }),
              )
              const withImages = await resolveImages(normalized, abort.signal, { name: plan.appName })
              const findings = lintScreen(withImages, { leakTerms, colorEnergy })
              if (findings.length > 0) {
                console.warn(`[lint] ${s.name}:`, findings.map((f) => `${f.rule}(${f.samples.length})`).join(' '))
              }
              const screen = Screen.create({
                id: crypto.randomUUID(),
                projectId: project.id,
                name: title || s.name,
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
                Screen.create({
                  id: crypto.randomUUID(),
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

          // Anchor first, siblings after: one extra round-trip buys every later screen a
          // concrete house style to copy instead of re-deriving one from the brief.
          const anchorIndex = Math.max(0, plan.screens.findIndex((s) => s.screenType === 'root-tab'))
          const anchorHtml = await renderScreen(plan.screens[anchorIndex], anchorIndex, '')
          const digest = anchorHtml ? extractStyleDigest(anchorHtml) : ''

          const rest = plan.screens.map((s, i) => ({ s, i })).filter(({ i }) => i !== anchorIndex)
          await mapLimit(rest, 3, ({ s, i }) => renderScreen(s, i, digest))

          const stopped = abort.signal.aborted
          drawnScreens.sort((a, z) => (planIndex.get(a.id) ?? 0) - (planIndex.get(z.id) ?? 0))
          if (usage.promptTokens) log.push(formatTokens(usage))
          Message.add({
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
          Message.add({ projectId: project.id, role: 'agent', kind: 'error', text: friendlyError(raw), meta: { log: [...log, raw.slice(0, 500)], durationMs: Date.now() - startedAt } })
          send({ type: 'error', message: friendlyError(raw) })
        }
        try {
          controller.close()
        } catch {}
      },
    })

    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } })
  },
}
