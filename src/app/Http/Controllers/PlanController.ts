import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { DesignSystemService } from '@/app/Services/DesignSystemService'
import { streamCompletion } from '@/app/Services/LlmService'
import { composeSystemPrompt } from '@/app/Services/PromptComposer'
import { planScreensWithRetry, type PlannedScreen } from '@/app/Services/PlannerService'
import { mapLimit } from '@/app/Services/Pool'
import { buildBottomNav, buildDetailHeader, NAV_CLEARANCE, NAV_HEIGHT, HEADER_HEIGHT } from '@/app/Services/ShellService'
import { extractArtifact } from '@/artifact'
import { frameSize, FRAME_GAP } from '@/canvas'
import { annotateHtml } from '@/lib/element-annotator'
import { normalizeScreen, extractStyleDigest, type ShellParts } from '@/lib/screen-normalizer'
import { autofixScreen, lintScreen } from '@/lib/design-lint'

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
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          try {
            controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'))
          } catch {}
        }
        try {
          const plan = await planScreensWithRetry(brief, project.device)
          Project.rename(project.id, plan.appName)
          Project.saveNavigation(project.id, plan.navigation)
          send({ type: 'plan', ...plan })

          const system = composeSystemPrompt(project.designSystem, project.device)
          const tokensCss = DesignSystemService.readTokensRoot(project.designSystem)
          const fontUrls = DesignSystemService.readFontUrls(project.designSystem)
          const iconStroke = DesignSystemService.readIconStroke(project.designSystem)
          const fw = frameSize(project.device).width
          const isMobile = project.device === 'mobile'
          const screenNames = plan.screens.map((s) => s.name).join(', ')
          const tabList = plan.navigation.tabs.map((t) => t.label).join(', ')
          const labelFor = (s: PlannedScreen) =>
            plan.navigation.tabs.find((t) => t.id === s.activeTabId)?.label ?? s.name

          // Mobile shells are assembled in code so every screen gets byte-identical markup.
          // Desktop has no sidebar builder yet, so it stays on the prose contract.
          const shellFor = (s: PlannedScreen): ShellParts => {
            if (!isMobile) return {}
            return s.screenType === 'root-tab'
              ? { nav: buildBottomNav(plan.navigation, s.activeTabId) }
              : { header: buildDetailHeader(s.name, s.parentScreen ?? 'Home') }
          }

          const shellContract = (s: PlannedScreen) => {
            if (!isMobile) {
              return `SIDEBAR CONTRACT
1. Render the shared sidebar with EXACTLY these items in this order: [${tabList}].
2. The active item is "${labelFor(s)}"; every other item is muted.
3. Never invent, rename, drop, or reorder items.`
            }
            if (s.screenType === 'root-tab') {
              return `SHELL CONTRACT — the shared chrome is injected for you
1. A shared ${NAV_HEIGHT}px bottom tab bar ([${tabList}]) is added to your page automatically AFTER you finish.
2. Do NOT render a bottom nav, tab bar, or floating action button yourself — a second one will collide with it.
3. This screen is the "${labelFor(s)}" tab; the injected bar highlights it.
4. End your page content with ${NAV_CLEARANCE}px of bottom padding so nothing hides behind the bar.`
            }
            return `SHELL CONTRACT — the shared chrome is injected for you
1. A shared ${HEADER_HEIGHT}px top header (back button + the title "${s.name}") is added to your page automatically AFTER you finish.
2. Do NOT render your own top header, back button, or page-title bar.
3. Do NOT render a bottom tab bar — this is a pushed detail screen.
4. Start your content directly below where that header sits.`
          }

          const buildUser = (s: PlannedScreen, digest: string) =>
            [
              `App: ${plan.appName} — ${plan.summary}`,
              `Other screens in this app: ${screenNames}`,
              '',
              `# ${shellContract(s)}`,
              digest
                ? `\n# HOUSE STYLE\nThe anchor screen of this app was already designed. Reuse these exact component styles — same radii, same spacing rhythm, same card treatment:\n\`\`\`css\n${digest}\n\`\`\``
                : '',
              `\n## Screen to design: ${s.name}`,
              s.description,
            ]
              .filter(Boolean)
              .join('\n')

          const renderScreen = async (s: PlannedScreen, i: number, digest: string): Promise<string | null> => {
            send({ type: 'screen_start', index: i, name: s.name })
            try {
              let text = ''
              for await (const d of streamCompletion(system, buildUser(s, digest))) {
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
                  shell: shellFor(s),
                  navClearance: NAV_CLEARANCE,
                }),
              )
              const findings = lintScreen(normalized)
              if (findings.length > 0) {
                console.warn(`[lint] ${s.name}:`, findings.map((f) => `${f.rule}(${f.samples.length})`).join(' '))
              }
              const screen = Screen.create({
                id: crypto.randomUUID(),
                projectId: project.id,
                name: title || s.name,
                prompt: s.description,
                html: annotateHtml(normalized),
                x: i * (fw + FRAME_GAP),
                y: 0,
                screenType: s.screenType,
                activeTabId: s.activeTabId ?? null,
                parentScreenName: s.parentScreen ?? null,
              })
              send({ type: 'screen_done', index: i, screenId: screen.id, name: screen.name })
              return normalized
            } catch (e) {
              send({ type: 'screen_error', index: i, message: e instanceof Error ? e.message : String(e) })
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

          send({ type: 'done' })
        } catch (e) {
          send({ type: 'error', message: e instanceof Error ? e.message : String(e) })
        }
        try {
          controller.close()
        } catch {}
      },
    })

    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } })
  },
}
