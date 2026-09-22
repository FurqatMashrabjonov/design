// Deterministic measurements over an eval run. Absolute values mean little; the point is the
// delta between two runs of the same brief set.
import { DesignSystemService } from '../src/app/Services/DesignSystemService.ts'
import { lintScreen } from '../src/lib/design-lint.ts'
import { BlueprintService } from '../src/app/Services/BlueprintService.ts'

export type ScreenInput = { briefId: string; designSystem: string; name: string; screenType: string; ms: number; html: string; added?: boolean }
export type PlanInput = { briefId: string; expect: string[]; archetypes: string[]; requested: string[]; uncovered: string[]; tabs: number; entityItems: string[] }
export type Usage = { calls: number; promptTokens: number; cachedTokens: number; completionTokens: number }

// ponytail: fixed list of the names the model reaches for by default; replace with a per-run frequency count if it drifts.
const DEFAULT_PERSONAS = /\b(Maya Chen|Sarah Chen|Alex Johnson|Alex Morgan|Alex Chen|John Doe|Jane Doe|Emma Wilson|Sarah Johnson)\b/
const SCREEN_KINDS = [/profile|account/i, /setting/i, /stat|analytic|progress/i, /\bhome\b|dashboard|today/i, /search|explore|discover/i]
const FALLBACK_ICON = /<svg data-od-icon[^>]*><circle cx="12" cy="12" r="10"\/><\/svg>/g

export function visibleText(html: string): string {
  return html
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

// Structural fingerprint: 4-grams over the body's opening tags. Two screens built from the same
// skeleton share most of them whatever their copy and colours are. Tag-only 4-grams were picked on
// the baseline run: they separated "profile vs profile across apps" from random pairs best (1.55x);
// adding nesting depth made every pair look unrelated.
export function structureShingles(html: string): Set<string> {
  const body = html.replace(/^[\s\S]*?<body\b[^>]*>/i, '').replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, '')
  const seq = [...body.matchAll(/<([a-zA-Z][\w-]*)\b/g)].map((m) => m[1].toLowerCase())
  const out = new Set<string>()
  for (let i = 0; i + 4 <= seq.length; i++) out.add(seq.slice(i, i + 4).join(' '))
  return out
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let shared = 0
  for (const x of a) if (b.has(x)) shared++
  return shared / (a.size + b.size - shared)
}

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0)
const round = (n: number, d = 3) => Number(n.toFixed(d))

// USD per million tokens. ponytail: constants, overridable by env; move to config when OBS-01 logs real cost.
const PRICE = {
  cached: Number(process.env.EVAL_PRICE_IN_CACHED ?? 0.07),
  input: Number(process.env.EVAL_PRICE_IN ?? 0.27),
  output: Number(process.env.EVAL_PRICE_OUT ?? 1.1),
}

export function computeMetrics(screens: ScreenInput[], briefMs: number[], errors: number, usage?: Usage, plans: PlanInput[] = []) {
  const byRule: Record<string, number> = {}
  let lintClean = 0
  let brandLeakScreens = 0
  for (const s of screens) {
    const findings = lintScreen(s.html, { leakTerms: DesignSystemService.readLeakTerms(s.designSystem), colorEnergy: DesignSystemService.readColorEnergy(s.designSystem) })
    if (findings.some((f) => f.rule === 'design-system-brand-leak')) brandLeakScreens++
    if (findings.length === 0) lintClean++
    for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1
  }

  // Sameness only counts pairs from different briefs — screens of one app are supposed to match.
  const shingles = screens.map((s) => structureShingles(s.html))
  let sum = 0
  let pairs = 0
  for (let i = 0; i < screens.length; i++)
    for (let j = i + 1; j < screens.length; j++)
      if (screens[i].briefId !== screens[j].briefId) {
        sum += jaccard(shingles[i], shingles[j])
        pairs++
      }

  // The user-visible complaint is "every profile screen looks the same": same kind, different apps.
  const kindOf = (name: string) => SCREEN_KINDS.find((k) => k.test(name))
  let kindSum = 0
  let kindPairs = 0
  for (let i = 0; i < screens.length; i++)
    for (let j = i + 1; j < screens.length; j++) {
      const kind = kindOf(screens[i].name)
      if (kind && kind === kindOf(screens[j].name) && screens[i].briefId !== screens[j].briefId) {
        kindSum += jaccard(shingles[i], shingles[j])
        kindPairs++
      }
    }

  const briefIds = [...new Set(screens.map((s) => s.briefId))]
  const share = (n: number) => (screens.length ? round(n / screens.length) : 0)
  return {
    briefs: briefIds.length,
    screens: screens.length,
    errors,
    lint: { cleanShare: share(lintClean), byRule },
    sameness: { crossBriefMean: pairs ? round(sum / pairs) : 0, pairs, sameKindMean: kindPairs ? round(kindSum / kindPairs) : 0, sameKindPairs: kindPairs },
    bugs: {
      brandLeakScreens,
      fallbackIcons: screens.reduce((n, s) => n + (s.html.match(FALLBACK_ICON)?.length ?? 0), 0),
      defaultPersonaBriefs: briefIds.filter((id) => screens.some((s) => s.briefId === id && DEFAULT_PERSONAS.test(visibleText(s.html)))).length,
      // An added screen that carries no injected shell was designed as if it belonged to no app.
      addedScreens: screens.filter((s) => s.added).length,
      addedWithoutShell: screens.filter((s) => s.added && !/data-od-shell=/.test(s.html)).length,
      rootTabShare: share(screens.filter((s) => s.screenType === 'root-tab').length),
      briefsWithoutDetail: briefIds.filter((id) => screens.filter((s) => s.briefId === id).every((s) => s.screenType === 'root-tab')).length,
    },
    plan: plans.length ? planMetrics(plans, screens) : undefined,
    images: {
      filled: screens.reduce((n, s) => n + (s.html.match(/data-od-img-resolved/g)?.length ?? 0), 0),
      fallbackBlocks: screens.reduce((n, s) => n + (s.html.match(/data-od-img-fallback/g)?.length ?? 0), 0),
      placeholderUrls: screens.reduce((n, s) => n + (s.html.match(/placehold\.co|picsum\.photos|via\.placeholder|source\.unsplash/g)?.length ?? 0), 0),
      avatarFaces: screens.reduce((n, s) => n + (s.html.match(/<img\b[^>]*data-od-avatar-resolved/g)?.length ?? 0), 0),
      avatarInitials: screens.reduce((n, s) => n + (s.html.match(/<span\b[^>]*data-od-avatar-resolved/g)?.length ?? 0), 0),
      screensWithPhoto: share(screens.filter((s) => /data-od-img-resolved/.test(s.html)).length),
    },
    time: { screenP50Ms: median(screens.map((s) => s.ms)), briefP50Ms: median(briefMs) },
    usage: usage && {
      ...usage,
      estCostUsd: round(
        ((usage.promptTokens - usage.cachedTokens) * PRICE.input + usage.cachedTokens * PRICE.cached + usage.completionTokens * PRICE.output) / 1e6,
        4,
      ),
    },
  }
}

// How well the plans match what the briefs asked for, and whether the data model reaches the screens.
function planMetrics(plans: PlanInput[], screens: ScreenInput[]) {
  // Multiset recall: a brief expecting two "list" screens is only satisfied by two.
  let expected = 0
  let matched = 0
  for (const p of plans) {
    const have = [...p.archetypes]
    for (const want of p.expect) {
      expected++
      const i = have.indexOf(want)
      if (i !== -1) {
        matched++
        have.splice(i, 1)
      }
    }
  }
  let items = 0
  let used = 0
  let shared = 0
  for (const p of plans) {
    const texts = screens.filter((s) => s.briefId === p.briefId && !s.added).map((s) => visibleText(s.html).toLowerCase())
    for (const name of p.entityItems) {
      items++
      const on = texts.filter((t) => t.includes(name.toLowerCase())).length
      if (on >= 1) used++
      if (on >= 2) shared++
    }
  }
  // Blueprint adherence (UX-01): screens whose pattern puts the primary action in a bottom bar —
  // detail, checkout, form, result… — should pin something to the bottom of the screen.
  let wantBar = 0
  let hasBar = 0
  for (const p of plans) {
    const planned = screens.filter((s) => s.briefId === p.briefId && !s.added)
    p.archetypes.forEach((a, i) => {
      if (!planned[i] || BlueprintService.find(a)?.primaryAction.placement !== 'bottom-bar') return
      wantBar++
      if (pinnedBottom(planned[i].html)) hasBar++
    })
  }
  const r = (a: number, b: number) => (b ? Number((a / b).toFixed(3)) : 0)
  return {
    archetypeRecall: r(matched, expected),
    bottomBarScreens: wantBar,
    bottomBarShare: r(hasBar, wantBar),
    requestedScreens: plans.reduce((n, p) => n + p.requested.length, 0),
    uncoveredScreens: plans.reduce((n, p) => n + p.uncovered.length, 0),
    tabsMean: r(plans.reduce((n, p) => n + p.tabs, 0), plans.length),
    dataItems: items,
    dataItemsUsedShare: r(used, items),
    dataItemsOnTwoScreensShare: r(shared, items),
  }
}

export type Metrics = ReturnType<typeof computeMetrics>

// Flat "path: before → after" lines for every number that moved.
export function diffMetrics(before: unknown, after: unknown, path = ''): string[] {
  if (typeof after === 'number') return before === after ? [] : [`${path}: ${typeof before === 'number' ? before : '—'} → ${after}`]
  if (after && typeof after === 'object')
    return Object.keys(after).flatMap((k) =>
      diffMetrics((before as Record<string, unknown> | undefined)?.[k], (after as Record<string, unknown>)[k], path ? `${path}.${k}` : k),
    )
  return []
}

/** Something other than the injected shell is pinned to the bottom (fixed or sticky, with bottom set). */
export function pinnedBottom(html: string): boolean {
  const own = html.replace(/<[a-z]+\b[^>]*data-od-shell[^>]*>/gi, '')
  const pinned = (css: string) => /position\s*:\s*(fixed|sticky)/i.test(css) && /(^|[;\s{])bottom\s*:/i.test(css)
  for (const block of own.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) for (const rule of block[1].matchAll(/\{([^{}]*)\}/g)) if (pinned(rule[1])) return true
  for (const m of own.matchAll(/\sstyle="([^"]*)"/gi)) if (pinned(m[1])) return true
  return /class="[^"]*\b(fixed|sticky)\b[^"]*\bbottom-\d/.test(own) || /class="[^"]*\bbottom-\d[^"]*\b(fixed|sticky)\b/.test(own)
}

