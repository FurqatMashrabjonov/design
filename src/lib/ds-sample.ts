// The design-system frame on the canvas (THM-08): the project's palette, type, radii and a few
// components, built in code from the system's own tokens — nothing generated. Every swatch and
// sample is styled with var(--token), so the Theme panel's live override (lib/theme-override.ts)
// restyles it exactly as it restyles the screens; the printed values are read back from the
// computed style for the same reason.

const COLORS: [string, string][] = [
  ['--accent', 'Accent'],
  ['--accent-on', 'On accent'],
  ['--bg', 'Background'],
  ['--surface', 'Surface'],
  ['--surface-warm', 'Surface 2'],
  ['--fg', 'Text'],
  ['--fg-2', 'Text 2'],
  ['--muted', 'Muted'],
  ['--border', 'Border'],
  ['--success', 'Success'],
  ['--warn', 'Warning'],
  ['--danger', 'Danger'],
]
const RADII = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-pill']

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/**
 * @param root the system's `:root { … }` block (DesignSystemService.readTokensRoot)
 * @param fontUrls its webfont stylesheets (readFontUrls) — only Google Fonts URLs are kept
 */
export function designSystemSample(root: string, fontUrls: string[], name: string): string {
  const present = (t: string) => root.includes(`${t}:`)
  const colors = COLORS.filter(([t]) => present(t))
  const radii = RADII.filter(present)
  const fonts = fontUrls
    .filter((u) => u.startsWith('https://fonts.googleapis.com/'))
    .map((u) => `<link data-od-font rel="stylesheet" href="${escapeHtml(u)}">`)
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design system</title>
${fonts}
<style>
${root.replace(/<\//g, '<\\/')}
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 20px 32px; background: var(--bg); color: var(--fg); font-family: var(--font-body, system-ui, sans-serif); font-size: 14px; line-height: 1.45; }
h2 { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 24px 0 10px; }
.name { font-family: var(--font-display, var(--font-body)); font-size: 22px; font-weight: 700; letter-spacing: var(--tracking-display, -0.01em); margin: 0; }
.sub { color: var(--muted); margin: 2px 0 0; font-size: 13px; }
.swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.sw { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.chip { height: 44px; border-radius: var(--radius-md, 10px); border: 1px solid var(--border); }
.sw b { font-size: 11px; font-weight: 600; }
.sw code, .val { font: 10px/1.2 var(--font-mono, ui-monospace, monospace); color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.type > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border-soft, var(--border)); }
.display { font-family: var(--font-display, var(--font-body)); font-weight: 700; letter-spacing: var(--tracking-display, -0.01em); }
.radii { display: flex; gap: 12px; }
.radii div { flex: 1; text-align: center; }
.radii span { display: block; height: 48px; background: var(--surface-warm, var(--surface)); border: 1px solid var(--border); margin-bottom: 4px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.btn { font: 600 14px/1 var(--font-body, system-ui); padding: 12px 18px; border-radius: var(--radius-md, 10px); border: 1px solid transparent; }
.btn.primary { background: var(--accent); color: var(--accent-on, #fff); }
.btn.secondary { background: var(--surface); color: var(--fg); border-color: var(--border); }
.btn.ghost { background: transparent; color: var(--accent); }
.input { width: 100%; font: 14px var(--font-body, system-ui); padding: 12px 14px; border-radius: var(--radius-md, 10px); border: 1px solid var(--border); background: var(--surface); color: var(--fg); }
.card { margin-top: 12px; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg, 16px); box-shadow: var(--elev-raised, none); }
.card p { margin: 4px 0 12px; color: var(--muted); }
.tag { display: inline-block; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: var(--radius-pill, 999px); background: color-mix(in oklab, var(--accent), transparent 86%); color: var(--accent); }
.tag.soft { background: var(--surface-warm, var(--surface)); color: var(--fg-2, var(--fg)); border: 1px solid var(--border); }
</style>
</head>
<body>
<p class="name">${escapeHtml(name)}</p>
<p class="sub">Design system · every screen uses these tokens</p>

<h2>Colour</h2>
<div class="swatches">
${colors.map(([t, label]) => `  <div class="sw"><div class="chip" style="background:var(${t})"></div><b>${label}</b><code data-token="${t}"></code></div>`).join('\n')}
</div>

<h2>Type</h2>
<div class="type">
  <div><span class="display" style="font-size:var(--text-2xl, 32px);line-height:1.1">Aa Heading</span><span class="val" data-font="--font-display"></span></div>
  <div><span class="display" style="font-size:var(--text-lg, 20px)">Section title</span><span class="val">text-lg</span></div>
  <div><span style="font-size:var(--text-base, 16px)">Body text reads like this.</span><span class="val" data-font="--font-body"></span></div>
  <div><span style="font-size:var(--text-sm, 14px);color:var(--muted)">Secondary · caption</span><span class="val">text-sm</span></div>
</div>

${radii.length ? `<h2>Radius</h2>
<div class="radii">
${radii.map((t) => `  <div><span style="border-radius:var(${t})"></span><code class="val" data-token="${t}"></code></div>`).join('\n')}
</div>` : ''}

<h2>Components</h2>
<div class="row">
  <button class="btn primary">Primary</button>
  <button class="btn secondary">Secondary</button>
  <button class="btn ghost">Text</button>
</div>
<div style="margin-top:12px"><input class="input" placeholder="Input field"></div>
<div class="card">
  <b>Card title</b>
  <p>Cards sit on the surface with the system's border, radius and shadow.</p>
  <div class="row"><span class="tag">Accent tag</span><span class="tag soft">Neutral</span></div>
</div>

<script>
(function () {
  function fill() {
    var cs = getComputedStyle(document.documentElement);
    document.querySelectorAll('[data-token]').forEach(function (el) { el.textContent = cs.getPropertyValue(el.getAttribute('data-token')).trim(); });
    document.querySelectorAll('[data-font]').forEach(function (el) {
      el.textContent = cs.getPropertyValue(el.getAttribute('data-font')).split(',')[0].replace(/["']/g, '').trim();
    });
  }
  fill();
  // The Theme panel pushes overrides by message (lib/theme-override.ts), handled by a listener added
  // after this one: read the values again on the next task, once it has applied.
  window.addEventListener('message', function () { setTimeout(fill, 0); });
})();
</script>
</body>
</html>`
}
