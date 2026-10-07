import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { completeImports } from './ScreenCompiler'
import { cachedPhotos, type Photo } from './PhotoService'
import { parseAppPlan } from './JsxGenerator'
import { parseAppTheme } from '@/lib/app-theme'

// CODE-01: the app as a React + Vite project. The screens are the code the studio runs, unchanged except for
// the imports they forgot (completeImports — the same fix the compiler applies); the kit and the navigator
// are the studio's own files (runtime/kit, runtime/export). `npm install && npm run dev` opens the app with
// its tabs, its push/pop moves, its theme (accent, light/dark, iOS/Android) and its photos.

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const version = (pkg: string) => `^${JSON.parse(read(`node_modules/${pkg}/package.json`)).version}`

export type ExportFile = { name: string; data: string }
type Kind = 'tab' | 'push' | 'modal' | 'first-run'
type ScreenIn = { id: string; slug: string | null; name: string; html: string; x: number; y: number; screenType: string | null; activeTabId: string | null }
type ProjectIn = { name: string; theme: string | null; navigation: string | null; plan: string | null }

/** The studio runs Konsta through runtime/konsta.js, whose ListItem drops a second chevron (a link row draws its
 *  own); an exported screen gets the same ListItem from the kit, so it looks as it did in the studio. */
export function withKitListItem(source: string): string {
  const m = source.match(/import\s*\{([^}]*)\}\s*from\s*'konsta\/react'/)
  if (!m || !/\bListItem\b/.test(m[1]!)) return source
  const rest = m[1]!.split(',').map((x) => x.trim()).filter((x) => x && x !== 'ListItem')
  const konsta = rest.length ? `import { ${rest.join(', ')} } from 'konsta/react'` : ''
  return source.replace(m[0], `${konsta}${konsta ? '\n' : ''}import { ListItem } from '@od/kit'`)
}

/** A name a file, an npm package and an import can all carry. */
export const fileSlug = (s: string, fallback = 'app') =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || fallback

/** Konsta's stylesheet for a project: Tailwind, Konsta's theme with the app's accent as its brand colour, and the
 *  runtime's own rules (navigator motion, kit animations) — everything after the runtime's header. */
function styles(accent: string): string {
  const runtime = read('runtime/runtime.css')
  const rules = runtime.slice(runtime.indexOf('html, body, #root'))
  return `@import 'tailwindcss';
@import 'konsta/react/theme.css';
@import './type-scale.css';
@source './';
@custom-variant dark (&:where(.dark, .dark *));

/* The app's accent: Konsta derives every tint, shade and the Material You palette from it. */
@theme {
  --color-brand-primary: ${accent};
}

${rules}
/* On a wide screen the app sits in a phone-sized frame; on a phone it fills the screen. The transform
   keeps the tab bar (position: fixed) inside the frame. */
@media (min-width: 640px) {
  body { background: #ebe8e3; }
  html.dark body { background: #121110; }
  #root {
    position: relative; width: 402px; height: min(874px, calc(100vh - 48px)); margin: 24px auto;
    border-radius: 48px; overflow: hidden; transform: translateZ(0);
    box-shadow: 0 0 0 10px #1c1b1a, 0 0 0 11px #3a3836, 0 30px 60px -20px rgb(0 0 0 / 45%);
  }
  /* Konsta's App is as tall as the window; inside the frame it is as tall as the frame. */
  #root > .k-app { height: 100%; min-height: 0; }
}
`
}

export async function exportReact(project: ProjectIn, rows: ScreenIn[]): Promise<ExportFile[]> {
  const theme = parseAppTheme(project.theme)
  const plan = parseAppPlan(project.plan)
  const drawn = rows.filter((s) => s.html).sort((a, z) => a.x - z.x || a.y - z.y)
  const pkg = fileSlug(project.name)

  // One id per screen: the plan's slug (what nav.push names), made unique and file-safe.
  const used = new Set<string>()
  const screens = drawn.map((s) => {
    let id = fileSlug(s.slug ?? s.name, 'screen')
    while (used.has(id)) id += '-2'
    used.add(id)
    const planned = plan?.screens.find((p) => p.id === s.slug)
    const kind: Kind = planned?.kind ?? (s.screenType === 'root-tab' ? 'tab' : s.screenType === 'modal-flow' ? 'modal' : 'push')
    return { id, name: s.name, kind, tab: planned?.tab ?? s.activeTabId ?? undefined, source: withKitListItem(completeImports(s.html)) }
  })

  const photos: Record<string, Photo> = {}
  for (const s of drawn) Object.assign(photos, await cachedPhotos(s.html).catch(() => ({})))
  if (plan?.store) Object.assign(photos, await cachedPhotos(plan.store).catch(() => ({})))
  let tabs: { id: string; label: string; icon: string }[] = []
  try {
    tabs = JSON.parse(project.navigation ?? 'null')?.tabs ?? []
  } catch {}

  const importName = (id: string) => `S_${id.replace(/-/g, '_')}`
  const files: ExportFile[] = [
    {
      name: 'package.json',
      data: JSON.stringify(
        {
          name: pkg,
          private: true,
          version: '0.1.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: version('react'), 'react-dom': version('react-dom'), konsta: version('konsta'), 'lucide-react': version('lucide-react') },
          devDependencies: { vite: version('vite'), '@vitejs/plugin-react': version('@vitejs/plugin-react'), tailwindcss: version('tailwindcss'), '@tailwindcss/vite': version('@tailwindcss/vite') },
        },
        null,
        2,
      ) + '\n',
    },
    {
      name: 'vite.config.js',
      data: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The screens import their building blocks from '@od/kit' — the kit in src/kit.
  resolve: { alias: { '@od/kit': fileURLToPath(new URL('./src/kit/index.js', import.meta.url)) } },
})
`,
    },
    {
      name: 'index.html',
      data: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${project.name.replace(/[<>&"]/g, '')}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    },
    {
      name: 'README.md',
      data: `# ${project.name}

A phone app made of ${screens.length} screens, built with React, [Konsta UI](https://konstaui.com) and Tailwind CSS.

\`\`\`
npm install
npm run dev
\`\`\`

Open the address it prints; the app is laid out for a phone — use your browser's device mode, or open it on a phone.

- \`src/screens/\` — one file per screen. Screens move between each other with \`useNav()\` (\`push\`, \`pop\`, \`reset\` a tab).
- \`src/store.js\` — the app's data and every change a person can make; every screen reads it with \`useStore()\`, and the app keeps its state between visits (localStorage).
- \`src/kit/\` — the building blocks the screens use (rings, charts, photos, the tab bar).
- \`src/app.json\` — the screens, the tabs and the theme: \`platform\` \`ios\` or \`material\` (Android), \`dark\`, \`accent\`, \`style\` (clean, midnight, vivid, soft or editorial).
- \`src/styles.css\` — the accent colour (\`--color-brand-primary\`).
- Photos are from [Pexels](https://www.pexels.com) (\`src/photos.json\`).

The code is yours.
`,
    },
    { name: 'src/main.jsx', data: read('runtime/export/main.jsx') },
    // FUN-01: the app's data and every change a person can make, shared by all the screens (an older app has none).
    { name: 'src/store.js', data: plan?.store ?? 'export const initial = {}\nexport const actions = {}\n' },
    { name: 'src/kit/store.js', data: read('runtime/kit/store.js') },
    { name: 'src/styles.css', data: styles(theme.accent) },
    { name: 'src/app.json', data: JSON.stringify({ name: project.name, theme, tabs, screens: screens.map(({ source: _source, ...s }) => s) }, null, 2) + '\n' },
    { name: 'src/photos.json', data: JSON.stringify(photos, null, 2) + '\n' },
    { name: 'src/kit/ui.jsx', data: read('runtime/kit/ui.jsx') },
    { name: 'src/kit/nav.jsx', data: read('runtime/kit/nav.jsx') },
    { name: 'src/kit/blocks.jsx', data: read('runtime/kit/blocks.jsx') },
    { name: 'src/kit/on-color.js', data: read('runtime/kit/on-color.js') },
    { name: 'src/kit/styles.js', data: read('runtime/kit/styles.js') },
    { name: 'src/type-scale.css', data: read('runtime/type-scale.css') },
    { name: 'src/kit/index.js', data: `export * from './ui.jsx'\nexport * from './blocks.jsx'\nexport { useNav, AppTabbar, usePhotos } from './nav.jsx'\nexport { useStore, setupStore, resetStore } from './store.js'\nexport { ListItem } from './konsta.js'\n` },
    { name: 'src/kit/konsta.js', data: read('runtime/konsta.js').replace("export * from 'konsta/react'\n", '') },
    { name: 'src/screens/index.js', data: screens.map((s) => `import ${importName(s.id)} from './${s.id}.jsx'`).join('\n') + `\n\nexport const screens = {\n${screens.map((s) => `  '${s.id}': ${importName(s.id)},`).join('\n')}\n}\n` },
    ...screens.map((s) => ({ name: `src/screens/${s.id}.jsx`, data: s.source })),
  ]
  // Every entry sits in one folder named after the app, as a downloaded project does.
  return files.map((f) => ({ ...f, name: `${pkg}/${f.name}` }))
}

/**
 * CODE-02: the same project, built by Vite on the server into one index.html — the script and the stylesheet
 * inlined, so it opens from a file, a mail or a chat with nothing beside it. Photos stay links to Pexels.
 */
export async function exportHtml(project: ProjectIn, rows: ScreenIn[]): Promise<string> {
  const files = await exportReact(project, rows)
  const dir = mkdtempSync(join(tmpdir(), 'od-html-'))
  try {
    for (const f of files) {
      mkdirSync(dirname(join(dir, f.name)), { recursive: true })
      writeFileSync(join(dir, f.name), f.data)
    }
    const root = join(dir, files[0]!.name.split('/')[0]!)
    symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'))
    const { build } = await import('vite')
    await build({ root, configFile: join(root, 'vite.config.js'), logLevel: 'silent', build: { assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false } })
    const dist = join(root, 'dist')
    const assets = readdirSync(join(dist, 'assets'))
    let html = readFileSync(join(dist, 'index.html'), 'utf8')
    const js = assets.find((a) => a.endsWith('.js'))
    const css = assets.find((a) => a.endsWith('.css'))
    // A </script> inside the bundle would end the inline script early.
    if (js) html = html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, () => `<script type="module">${readFileSync(join(dist, 'assets', js), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`)
    if (css) html = html.replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, () => `<style>${readFileSync(join(dist, 'assets', css), 'utf8')}</style>`)
    return html
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
