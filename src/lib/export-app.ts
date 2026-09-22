// "Export › Whole app (.zip)": every drawn screen as its own HTML file with the project's theme
// baked in, plus an index. The files link to each other the way the preview does — tabs, Back and
// data-od-link taps open the right file — so the zip is a clickable prototype that works offline.
// Links are resolved here, at export time, with the preview's own resolvers; the script in each
// file only looks its taps up in a table.

import { applyThemeOverride, type Theme } from './theme-override.ts'
import { orderScreens, screenByName, screenForBack, screenForTab, type PreviewScreen } from './preview-bridge.ts'

export type ExportScreen = PreviewScreen & { html: string }

// ASCII file names: old unzip tools (macOS's own) mangle UTF-8 names. Accents are dropped ("Café" →
// "cafe"); a name with no Latin letters at all ("Главная") becomes "screen", "screen-2", …
// ponytail: no transliteration; add it if Cyrillic-named exports turn out to matter.
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'screen'

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
// Keys are what getAttribute returns in the page, so the entities in the source are decoded.
const decode = (s: string) => s.replace(/&(amp|quot|#39|lt|gt);/g, (_, e) => ({ amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' })[e as string]!)
const attrValues = (html: string, attr: string) => [...new Set([...html.matchAll(new RegExp(`${attr}="([^"]{1,80})"`, 'g'))].map((m) => decode(m[1])))]

export function exportApp(rows: ExportScreen[], theme: Theme | null | undefined, appName: string): { name: string; data: string }[] {
  const screens = orderScreens(rows.filter((s) => s.html))
  const files = new Map<string, string>() // screen id → file name
  const used = new Set<string>()
  for (const s of screens) {
    let name = `${slug(s.name)}.html`
    for (let i = 2; used.has(name) || name === 'index.html'; i++) name = `${slug(s.name)}-${i}.html`
    used.add(name)
    files.set(s.id, name)
  }

  const out = screens.map((s) => {
    const fileOf = (target: ExportScreen | undefined) => (target ? files.get(target.id) : undefined)
    const table = {
      tab: Object.fromEntries(attrValues(s.html, 'data-od-tab').map((id) => [id, fileOf(screenForTab(screens, id))]).filter(([, f]) => f)),
      back: Object.fromEntries(attrValues(s.html, 'data-od-back').map((n) => [n, fileOf(screenForBack(screens, n))]).filter(([, f]) => f)),
      link: Object.fromEntries(attrValues(s.html, 'data-od-link').map((n) => [n, fileOf(screenByName(screens, n))]).filter(([, f]) => f)),
    }
    return { name: `screens/${files.get(s.id)}`, data: withLinks(applyThemeOverride(s.html, theme), table) }
  })

  const list = screens.map((s) => `      <li><a href="screens/${files.get(s.id)}">${escapeHtml(s.name)}</a></li>`).join('\n')
  const index = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(appName)}</title>
  <style>
    body { font: 16px/1.5 -apple-system, "Segoe UI", Arial, sans-serif; margin: 0; padding: 48px 24px; background: #f6f5f3; color: #1a1716; }
    main { max-width: 480px; margin: 0 auto; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    p { color: #6b6560; margin: 0 0 24px; }
    ol { padding: 0; list-style: none; display: grid; gap: 8px; }
    a { display: block; padding: 12px 16px; background: #fff; border: 1px solid #e6e2dc; border-radius: 12px; color: inherit; text-decoration: none; }
    a:hover { border-color: #1a1716; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(appName)}</h1>
    <p>${screens.length} screens. Tabs, Back and links inside each screen open the others.</p>
    <ol>
${list}
    </ol>
  </main>
</body>
</html>
`
  return [{ name: 'index.html', data: index }, ...out]
}

function withLinks(html: string, table: { tab: object; back: object; link: object }): string {
  // JSON inside a <script>: "</" must not end the element early.
  const json = JSON.stringify(table).replace(/</g, '\\u003c')
  const script = `
<script id="__od_export_links">
(function () {
  var map = ${json};
  var kinds = [['data-od-back', 'back'], ['data-od-tab', 'tab'], ['data-od-link', 'link']];
  document.addEventListener('click', function (e) {
    for (var i = 0; i < kinds.length; i++) {
      var el = e.target.closest && e.target.closest('[' + kinds[i][0] + ']');
      if (!el) continue;
      var file = map[kinds[i][1]][el.getAttribute(kinds[i][0])];
      if (file) { e.preventDefault(); location.href = file; }
      return;
    }
  }, true);
})();
</script>
<style>[data-od-tab], [data-od-back], [data-od-link] { cursor: pointer; }</style>
`
  return html.includes('</body>') ? html.replace('</body>', `${script}</body>`) : html + script
}
