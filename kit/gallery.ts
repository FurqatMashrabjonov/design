// Renders every od-kit component in every design system: eval/out/kit-gallery/<system>.html.
// Run: node --import ./eval/alias-hook.mjs kit/gallery.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DesignSystemService } from '../src/app/Services/DesignSystemService.ts'
import { KitService } from '../src/app/Services/KitService.ts'
import { LUCIDE_CDN } from '../src/lib/screen-normalizer.ts'
import { KIT_SAMPLES } from './samples.ts'

const out = join('eval', 'out', 'kit-gallery')
mkdirSync(out, { recursive: true })
const systems = DesignSystemService.list().map((d) => d.id)
for (const id of systems) {
  const fonts = DesignSystemService.readFontUrls(id).map((u) => `<link rel="stylesheet" href="${u}">`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${id} — od-kit</title>${fonts}
<style>${DesignSystemService.readTokensRoot(id)}</style><style>${KitService.css()}</style>
<style>body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body)}main{max-width:390px;margin:0 auto}h6{margin:24px 0 8px;font:600 11px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}</style>
</head><body><main class="od-page"><h1 class="od-hero__title">${id}</h1>${KIT_SAMPLES.map((s) => `<section><h6>${s.name}</h6>${s.html}</section>`).join('')}</main>
<script src="${LUCIDE_CDN}"></script><script>lucide.createIcons()</script></body></html>`
  writeFileSync(join(out, `${id}.html`), html)
}
writeFileSync(join(out, 'index.html'), `<!doctype html><title>od-kit gallery</title><body style="font:14px system-ui;padding:24px"><h1>od-kit × ${systems.length} systems</h1><div style="display:flex;flex-wrap:wrap;gap:16px">${systems.map((id) => `<iframe src="${id}.html" style="width:390px;height:1400px;border:1px solid #ddd;border-radius:12px"></iframe>`).join('')}</div>`)
console.log(`${out}/index.html — ${systems.length} systems`)
