// The screen runtime (KON-02): ESM entries an import map points at, sharing chunks (one React).
//   npm run build:runtime   (vite build -c runtime/vite.config.js)
//   → runtime/dist/{react,jsx-runtime,react-dom-client,konsta,kit}.js + icons/<name>.js (one per lucide icon) + chunks/
//     + runtime.css + exports.json (entry → export names) + lucide-map.json (icon export name → icons/<file>)
// `react`, `react/jsx-runtime` and `react-dom/client` are CommonJS, and `export *` from CommonJS gives an entry with no
// static exports (import maps need them) — so those three entry files are (re)written here with every name spelled out.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { phosphorFor } from './phosphor-map.js'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const require = createRequire(import.meta.url)
const named = (pkg) => {
  const names = Object.keys(require(pkg)).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== 'default' && !k.startsWith('__'))
  return `export { ${names.join(', ')} } from '${pkg}'\n`
}
writeFileSync('runtime/react.js', named('react') + "export { default } from 'react'\n")
// EMJ-01: the jsx runtime screens import draws emoji as Fluent 3D images (runtime/emoji-jsx.js).
writeFileSync('runtime/jsx-runtime.js', "export { Fragment, jsx, jsxs } from './emoji-jsx.js'\n")
writeFileSync('runtime/react-dom-client.js', named('react-dom/client'))

// lucide-react's index: `export { default as Bell, default as BellIcon, default as LucideBell } from './icons/bell.mjs'`
const lucideIndex = readFileSync(require.resolve('lucide-react/dist/esm/lucide-react.mjs'), 'utf8')
const lucideMap = {} // export name → icon file (without extension)
const iconEntries = {}
// ICN-01: each lucide icon a screen imports is an adapter onto its Phosphor counterpart (runtime/.icons, generated):
// lucide's props become Phosphor's (a `fill` → the fill weight, a heavy strokeWidth → bold); no counterpart → lucide.
const PH = 'node_modules/@phosphor-icons/react/dist/csr'
// Exact names (a case-insensitive disk would say Paintbrush exists when the file is PaintBrush).
const PH_NAMES = new Set(readdirSync(PH).filter((f) => f.endsWith('.es.js')).map((f) => f.slice(0, -6)))
const hasPh = (n) => PH_NAMES.has(n)
rmSync('runtime/.icons', { recursive: true, force: true })
mkdirSync('runtime/.icons', { recursive: true })
const adapter = (ph) => `import { forwardRef, createElement } from 'react'
import { ${ph} as P } from '../../${PH}/${ph}.es.js'
// ICN-01: lucide's props on Phosphor's ${ph}.
const Icon = forwardRef(function Icon({ size = 24, strokeWidth, absoluteStrokeWidth, fill, color, weight, ...rest }, ref) {
  const w = weight ?? (fill && fill !== 'none' ? 'fill' : Number(strokeWidth) >= 2.4 ? 'bold' : undefined)
  return createElement(P, { ref, size, color: color ?? (fill && fill !== 'none' && fill !== 'currentColor' ? fill : undefined), ...(w ? { weight: w } : {}), ...rest })
})
export default Icon
`
const kitIcons = [] // every lucide name, re-exported for the kit (which imports from 'lucide-react')
for (const [, names, file] of lucideIndex.matchAll(/export \{([^}]+)\} from '\.\/icons\/([\w-]+)\.mjs'/g)) {
  const list = names.split(',').map((n) => n.replace('default as', '').trim())
  for (const n of list) lucideMap[n] = file
  const canonical = list.filter((n) => !/^Lucide|Icon$/.test(n)).sort((a, b) => a.length - b.length)[0] ?? list[0]
  const ph = phosphorFor(canonical, hasPh)
  if (ph) writeFileSync(`runtime/.icons/${file}.js`, adapter(ph))
  iconEntries[`icons/${file}`] = ph ? `runtime/.icons/${file}.js` : require.resolve(`lucide-react/dist/esm/icons/${file}.mjs`)
  for (const n of list) kitIcons.push(ph ? `export { default as ${n} } from './${file}.js'` : `export { default as ${n} } from '../../node_modules/lucide-react/dist/esm/icons/${file}.mjs'`)
}
writeFileSync('runtime/.icons/index.js', kitIcons.join('\n') + '\n')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'od-runtime',
      generateBundle(_, bundle) {
        const exports = { lucide: Object.keys(lucideMap) }
        for (const c of Object.values(bundle)) if (c.type === 'chunk' && c.isEntry && !c.name.startsWith('icons/')) exports[c.name] = c.exports
        this.emitFile({ type: 'asset', fileName: 'exports.json', source: JSON.stringify(exports) })
        this.emitFile({ type: 'asset', fileName: 'lucide-map.json', source: JSON.stringify(lucideMap) })
      },
      // EMJ-01: the Fluent emoji images sit beside the modules (/api/rt/v…/emoji/<key>.webp).
      closeBundle() {
        cpSync('runtime/emoji', 'runtime/dist/emoji', { recursive: true })
      },
    },
  ],
  // EMJ-01: Konsta and the kit render through the same emoji-drawing jsx runtime as the screens.
  resolve: { alias: [
    { find: /^react\/jsx-runtime$/, replacement: fileURLToPath(new URL('./emoji-jsx.js', import.meta.url)) },
    // ICN-01: the kit's own icons (tab bar, blocks) are the Phosphor adapters too.
    { find: /^lucide-react$/, replacement: fileURLToPath(new URL('./.icons/index.js', import.meta.url)) },
  ] },
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: 'runtime/dist',
    emptyOutDir: true,
    lib: {
      entry: {
        react: 'runtime/react.js',
        'jsx-runtime': 'runtime/jsx-runtime.js',
        'react-dom-client': 'runtime/react-dom-client.js',
        konsta: 'runtime/konsta.js',
        kit: 'runtime/kit.jsx',
        ...iconEntries,
      },
      formats: ['es'],
      fileName: (_, name) => `${name}.js`,
      cssFileName: 'runtime',
    },
    rollupOptions: { preserveEntrySignatures: 'strict', output: { chunkFileNames: 'chunks/[name]-[hash].js' } },
  },
})
