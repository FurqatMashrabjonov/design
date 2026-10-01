import { statSync } from 'node:fs'
import { join } from 'node:path'
import { compileCached, RUNTIME_DIR } from './ScreenCompiler'
import { cachedPhotos } from './PhotoService'

// The page a screen runs in: an import map onto the runtime (React, Konsta, @od/kit), the runtime's
// stylesheet, this screen's CSS and its compiled code, mounted with the app's tabs, accent and
// light/dark. It is always served with `Content-Security-Policy: sandbox allow-scripts`, so it runs in an
// opaque origin and never gets ours; the runtime answers it with CORS *.
// `insets`: a device's status bar and home area (the landing's showcase pictures); none on the canvas.
export type AppLook = { accent: string; dark: boolean; platform: 'ios' | 'material'; style?: string; tabs: { id: string; label: string; icon: string }[]; insets?: { top: number; bottom: number } }

// The runtime's URL carries its build (the mtime of exports.json), so a rebuilt kit is a new URL and the
// hour-long cache on /api/rt never serves a page the old one.
let lastBuild = 0
const runtimeUrl = () => {
  try {
    lastBuild = Math.floor(statSync(join(RUNTIME_DIR, 'exports.json')).mtimeMs)
  } catch {} // mid-rebuild: keep the last build's URL
  return `/api/rt/v${lastBuild}`
}
const importMap = (RT: string) => JSON.stringify({ imports: { react: `${RT}/react.js`, 'react/jsx-runtime': `${RT}/jsx-runtime.js`, 'react-dom/client': `${RT}/react-dom-client.js`, 'konsta/react': `${RT}/konsta.js`, '@od/kit': `${RT}/kit.js`, 'lucide-react/icons/': `${RT}/icons/` } })
const esc = (s: string) => s.replace(/</g, '\\u003c')

export async function screenDocument(source: string, look: AppLook, opts: { slug: string }): Promise<string> {
  const c = await compileCached(source)
  const failure = c.ok ? '' : `<div style="padding:24px;font:15px -apple-system,system-ui;color:#b00020">This screen could not be built: ${c.errors.join('; ').replace(/</g, '&lt;').slice(0, 400)}</div>`
  const RT = runtimeUrl()
  // Only images.pexels.com URLs reach the page (PhotoService checks the host before caching).
  const photos = c.ok ? await cachedPhotos(source).catch(() => ({})) : {}
  const mount = JSON.stringify({ dark: look.dark, accent: look.accent, platform: look.platform, style: look.style ?? 'clean', tabs: look.tabs, screen: opts.slug, photos, ...(look.insets ? { insets: look.insets } : {}) })
  return `<!doctype html><html lang="en"${look.dark ? ' class="dark"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script type="importmap">${importMap(RT)}</script>
<link rel="stylesheet" href="${RT}/runtime.css">${c.ok ? `<style>${c.css}</style>` : ''}
</head><body><div id="root">${failure}</div>
${c.ok ? `<script type="module">
// The screen's code travels inside the page: a module the sandboxed page fetched from us would go without
// cookies and be refused. As a blob it is still resolved through the import map above.
const code = ${esc(JSON.stringify(c.js))}
try {
  const { default: Screen } = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })))
  const { mount } = await import('@od/kit')
  mount(Screen, ${esc(mount)})
} catch (e) {
  // A module that fails to load (an icon that does not exist, a top-level throw) says so instead of a blank frame.
  const d = document.createElement('div'); d.dataset.odCrash = ''; d.style.cssText = 'padding:80px 24px 24px;font:15px -apple-system,system-ui;color:#ff453a'
  d.textContent = 'This screen crashed: ' + String(e && e.message || e).slice(0, 300); document.getElementById('root').replaceChildren(d)
}
</script>` : ''}
</body></html>`
}
