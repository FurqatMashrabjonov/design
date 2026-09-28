// Deterministic counts over a screen's source, shared by eval/run.ts and anything that rebuilds a run's numbers.

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
    motion: (src.match(/\bvs-(rise|float|bounce|wave|pop)\b/g) ?? []).length,
    hardWhite: (src.match(/\bbg-white\b(?![^"'`]*dark:)/g) ?? []).length,
  }
}
