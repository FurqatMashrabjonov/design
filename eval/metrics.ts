// Deterministic counts over a screen's source, shared by eval/run.ts and anything that rebuilds a run's numbers.
import { lintJsx } from '../src/lib/jsx-lint.ts'

/** What can be counted in a screen's source without a model: the signals of a rich, working screen. */
export function sourceMetrics(src: string) {
  const imports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'konsta\/react'/g)].flatMap((m) => m[1]!.split(',').map((s) => s.trim()).filter(Boolean))
  return {
    chars: src.length,
    konsta: new Set(imports).size,
    photos: (src.match(/<Photo\b/g) ?? []).length,
    kitFigures: (src.match(/<(Ring|Bars|Area|WaterGlass|Heatmap|Meter|Rings|Sparkline|Donut)\b/g) ?? []).length,
    emoji: (src.match(/\p{Extended_Pictographic}/gu) ?? []).length,
    colors: new Set((src.match(/#[0-9a-f]{6}\b/gi) ?? []).map((c) => c.toLowerCase())).size,
    gradients: (src.match(/gradient\(/g) ?? []).length,
    nav: (src.match(/nav\.(push|pop|reset)\(/g) ?? []).length,
    // OVL-01: Konsta's overlays and floating actions in use (a sheet, action sheet, dialog, popover, toast, drawer, FAB).
    overlays: (src.match(/<(Sheet|Actions|Dialog|Popover|Popup|Toast|Notification|Panel|Fab)\b/g) ?? []).length,
    // KIT-20: the kit's ready-made blocks in use.
    blocks: (src.match(/<(WeekStrip|MonthCalendar|StepTimeline|Carousel|PhotoCard|EmptyState|Skeleton\w+|PullToRefresh|Accordion|SwipeRow|Rating|RatingSummary|AvatarStack|Stories|CodeInput)\b/g) ?? []).length,
    // PRM-03: sections on a screen (titled groups and their surfaces) — top apps' tab screens run four to six.
    sections: (src.match(/<BlockTitle\b/g) ?? []).length,
    motion: (src.match(/\bvs-(rise|float|bounce|wave|pop)\b/g) ?? []).length,
    hardWhite: (src.match(/\bbg-white\b(?![^"'`]*dark:)/g) ?? []).length,
    // HIG-10: what the lint still finds on the stored (already fixed) source — the decisions it could not make.
    hig: lintJsx(src, { apply: false }).findings.length,
    higRules: lintJsx(src, { apply: false }).findings.map((f) => f.rule),
    // HIG-12: text sized by hand (text-[17px]) instead of a named style (text-body); the type scale should drive this to ~0.
    adHocText: (src.match(/\btext-\[\d+(?:\.\d+)?px\]/g) ?? []).length,
    namedText: (src.match(/\btext-(?:large-title|title[123]|headline|body|callout|subhead|footnote|caption[12]|figure)\b/g) ?? []).length,
  }
}
