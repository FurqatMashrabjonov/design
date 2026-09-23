import assert from 'node:assert'
import { contrast, ensureContrast, toHsl, toRgb } from './color.ts'
import { buildPalette, contrastReport, paletteDeclarations, readProposal, RADIUS_FEELS, type ProposedPalette } from './palette.ts'

console.log('Testing Colour Maths...')
{
  assert.deepStrictEqual(toRgb('#fff'), [255, 255, 255], 'short hex expands')
  assert.deepStrictEqual(toRgb('  #1E3A8A '), [30, 58, 138], 'hex is trimmed and case-insensitive')
  for (const bad of ['fff', '#ggg', '#12345', 'red', '', null, 42]) {
    assert.strictEqual(toRgb(bad), null, `${JSON.stringify(bad)} is not a colour`)
  }
  assert.ok(Math.abs(contrast([255, 255, 255], [0, 0, 0]) - 21) < 0.01, 'black on white is 21:1')
  assert.ok(Math.abs(contrast([255, 255, 255], [255, 255, 255]) - 1) < 0.01, 'white on white is 1:1')

  // The point of ensureContrast: it buys readability with lightness, never with hue.
  const teal = toRgb('#2dd4bf')!
  const fixed = ensureContrast(teal, [toRgb('#ffffff')!], 4.5)
  assert.ok(contrast(fixed, toRgb('#ffffff')!) >= 4.5, 'a pale teal is darkened until it is readable')
  assert.ok(Math.abs(toHsl(fixed).h - toHsl(teal).h) < 2, 'and it is still teal')
  const already = toRgb('#111111')!
  assert.deepStrictEqual(ensureContrast(already, [toRgb('#ffffff')!], 4.5), already, 'a colour that passes is left alone')
}

console.log('Testing Palette Proposal...')
{
  const ok = readProposal({ accent: '#C37351', bg: '#F7F5F3', surface: '#FFFFFF', fg: '#2B2625', radius: 'round', character: ' warm ' })
  assert.ok(ok, 'a complete proposal is read')
  assert.strictEqual(ok!.accent, '#c37351', 'hex is normalised to lower case')
  assert.strictEqual(ok!.character, 'warm', 'character is trimmed')
  assert.strictEqual(ok!.radius, 'round')

  // A half-read palette would quietly fall back to greys — the exact failure this row removes.
  for (const bad of [
    { accent: '#c37351', bg: '#fff', surface: '#fff' }, // no fg
    { accent: 'terracotta', bg: '#fff', surface: '#fff', fg: '#111' },
    { accent: '#c37351', bg: '', surface: '#fff', fg: '#111' },
    null,
    'warm and earthy',
  ]) {
    assert.strictEqual(readProposal(bad), null, `must reject ${JSON.stringify(bad)}`)
  }
  assert.strictEqual(readProposal({ accent: '#c37351', bg: '#fff', surface: '#fff', fg: '#111', radius: 'squishy' })!.radius, undefined, 'an unknown radius feel is dropped, not passed through')
}

console.log('Testing Palette Contrast...')
{
  // Palettes a model plausibly returns, including the ones that are wrong on purpose:
  // a mid-grey page, a pastel with no contrast anywhere, and a dark theme.
  const proposals: [string, ProposedPalette][] = [
    ['warm light', { accent: '#c37351', bg: '#f7f5f3', surface: '#ffffff', fg: '#2b2625' }],
    ['cool light', { accent: '#2563eb', bg: '#ffffff', surface: '#f8fafc', fg: '#0f172a' }],
    ['dark premium', { accent: '#a3e635', bg: '#0b0b0d', surface: '#16161a', fg: '#f4f4f5' }],
    ['pastel, all low contrast', { accent: '#f9a8d4', bg: '#fdf2f8', surface: '#fce7f3', fg: '#d8b4c8' }],
    ['mid-grey page (unusable as proposed)', { accent: '#64748b', bg: '#737373', surface: '#8a8a8a', fg: '#9ca3af' }],
    ['neon on near-black', { accent: '#22d3ee', bg: '#050505', surface: '#0f0f12', fg: '#e5e5e5' }],
    ['yellow accent (worst case for white text)', { accent: '#facc15', bg: '#fffbeb', surface: '#ffffff', fg: '#1c1917' }],
  ]

  for (const [name, proposal] of proposals) {
    const p = buildPalette(proposal)
    for (const { pair, ratio, target } of contrastReport(p)) {
      assert.ok(ratio >= target, `${name}: ${pair} is ${ratio.toFixed(2)}:1, needs ${target}:1`)
    }
    // The judgement the model made has to survive the repair, or we may as well not ask.
    assert.ok(Math.abs(toHsl(toRgb(p.accent)!).h - toHsl(toRgb(proposal.accent)!).h) < 2, `${name}: the accent hue is untouched`)

    // Clamping every quiet tone to the AA minimum makes them one colour and flattens the page.
    const surface = toRgb(p.surface)!
    const steps = [p.fg, p.fg2, p.muted, p.meta].map((c) => contrast(toRgb(c)!, surface))
    for (let i = 1; i < steps.length; i++) {
      assert.ok(steps[i - 1]! > steps[i]! + 0.2, `${name}: the ink ramp keeps a visible step (${steps.map((s) => s.toFixed(1)).join(' > ')})`)
    }
  }

  // The same guarantee under colours nobody chose deliberately.
  let worst = { pair: '', ratio: 99, target: 0, seed: 0 }
  for (let seed = 0; seed < 400; seed++) {
    const rnd = (n: number) => Math.floor((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453 % 1 + 1) % 1 * 256)
    const hex = (n: number) => '#' + [rnd(n), rnd(n + 1), rnd(n + 2)].map((v) => v.toString(16).padStart(2, '0')).join('')
    const p = buildPalette({ accent: hex(0), bg: hex(3), surface: hex(6), fg: hex(9) })
    for (const r of contrastReport(p)) {
      if (r.ratio - r.target < worst.ratio - worst.target) worst = { ...r, seed }
    }
  }
  assert.ok(worst.ratio >= worst.target, `400 random palettes all pass; worst was seed ${worst.seed}: ${worst.pair} at ${worst.ratio.toFixed(2)}:1 (needs ${worst.target})`)
  console.log(`  400 random palettes: tightest pair was ${worst.pair} at ${worst.ratio.toFixed(2)}:1`)
}

console.log('Testing Palette Output...')
{
  const p = buildPalette({ accent: '#c37351', bg: '#f7f5f3', surface: '#ffffff', fg: '#2b2625', radius: 'sharp' })
  const decls = paletteDeclarations(p)
  const names = decls.map((d) => d.split(':')[0]!.trim())

  // The kit, the prompt and the linter all read these names; a generated palette is only a
  // drop-in for a catalogue one if it defines the same vocabulary.
  for (const token of ['--bg', '--surface', '--surface-warm', '--fg', '--fg-2', '--muted', '--meta', '--border', '--accent', '--accent-on', '--od-accent-text', '--od-success-text', '--od-warn-text', '--od-danger-text', '--radius-sm', '--radius-md', '--radius-lg']) {
    assert.ok(names.includes(token), `${token} must be defined by a generated palette`)
  }
  assert.ok(decls.every((d) => !/var\(|calc\(|color-mix/.test(d)), 'every value is a literal, so the audit can read it without a browser')
  assert.ok(decls.some((d) => d.startsWith('--radius-sm: 2px')), 'the sharp feel reaches the radius tokens')
  for (const feel of RADIUS_FEELS) {
    const r = buildPalette({ accent: '#c37351', bg: '#f7f5f3', surface: '#ffffff', fg: '#2b2625', radius: feel }).radius
    assert.ok(r[0] < r[1] && r[1] < r[2], `${feel} radii increase`)
  }
  assert.strictEqual(buildPalette({ accent: '#c37351', bg: '#0b0b0d', surface: '#16161a', fg: '#eeeeee' }).dark, true, 'a dark page is recognised')
}

console.log('Testing Palette on a Catalogue Root...')
{
  const { applyPaletteToRoot, parsePalette } = await import('./palette.ts')
  const { DesignSystemService } = await import('../app/Services/DesignSystemService.ts')
  const root = DesignSystemService.readTokensRoot('minimal')
  const p = buildPalette({ accent: '#c05e3c', bg: '#faf6f2', surface: '#ffffff', fg: '#2b2422', radius: 'round' })
  const merged = applyPaletteToRoot(root, p)

  // Colour comes from the palette; craft (type scale, spacing, motion, fonts) stays the system's.
  assert.ok(merged.includes(`--accent: ${p.accent};`), 'the palette accent replaces the catalogue accent')
  assert.ok(merged.includes(`--od-accent-text: ${p.accentText};`), 'derived text colours land too')
  assert.ok(merged.includes('--radius-sm: 12px;'), 'the radius feel reaches the tokens')
  for (const kept of ['--text-base', '--space-4', '--motion-base', '--font-body', '--elev-raised']) {
    const before = root.match(new RegExp(`${kept}: ([^;]+);`))![1]
    assert.ok(merged.includes(`${kept}: ${before};`), `${kept} is untouched (${before})`)
  }
  assert.ok(merged.startsWith(':root {') && merged.trimEnd().endsWith('}'), 'the block keeps the shape the prompt and kit expect')
  assert.strictEqual(applyPaletteToRoot('', p), '', 'no root, nothing to merge into')

  // Round trip through the database column.
  // (JSON drops undefined keys such as an absent `character`; that is not data, so compare after the same trip.)
  const back = parsePalette(JSON.stringify(p))
  assert.deepStrictEqual(back, JSON.parse(JSON.stringify(p)), 'a stored palette reads back whole')
  for (const bad of ['null', '{}', '{"accent":"#fff"}', 'not json', undefined]) {
    assert.strictEqual(parsePalette(bad), null, `${bad} is not a palette`)
  }
}

console.log('Testing Dark Palette Depth (GQ-25)...')
{
  const { readFileSync } = await import('node:fs')
  const dark = buildPalette({ accent: '#a3e635', bg: '#0c0d0b', surface: '#171915', fg: '#f2f4ef' })
  const light = buildPalette({ accent: '#c05e3c', bg: '#faf6f2', surface: '#ffffff', fg: '#2b2422' })
  const darkDecls = paletteDeclarations(dark).join('\n')
  const lightDecls = paletteDeclarations(light).join('\n')
  // A dark shadow on a dark page is invisible: depth becomes a light edge plus a deeper drop.
  assert.ok(darkDecls.includes('--elev-raised: 0 0 0 1px rgba(255, 255, 255, 0.07)'), 'dark: cards get a faint light edge')
  assert.ok(darkDecls.includes('--od-card-shadow:') && darkDecls.includes('--od-btn-shadow:'), 'dark: kit depth tokens are overridden')
  assert.ok(!lightDecls.includes('--elev-raised') && !lightDecls.includes('--od-card-shadow'), "light: the system's own depth tokens are left alone")
  // Through the catalogue root: Nova's light shadow is replaced only for a dark palette.
  const { applyPaletteToRoot } = await import('./palette.ts')
  const { DesignSystemService } = await import('../app/Services/DesignSystemService.ts')
  const novaRoot = DesignSystemService.readTokensRoot('nova')
  assert.ok(applyPaletteToRoot(novaRoot, dark).includes('rgba(255, 255, 255, 0.07)'), 'nova + dark palette: light-edge depth')
  assert.ok(applyPaletteToRoot(novaRoot, light).includes('--elev-raised: 0 1px 2px rgba(23, 22, 26, 0.04)'), 'nova + light palette: its own shadow stays')
  assert.ok(readFileSync('design-systems/nova/STYLE.md', 'utf8').includes('Dark palette (a dark var(--bg))'), 'the style card tells the model how dark works')
  assert.ok(readFileSync('src/app/Services/PlannerService.ts', 'utf8').includes('dark, night, sleep, focus or cinema'), 'the planner is told when to choose a dark page')
}

console.log('Palette verified ✅')
