// The screen runtime (KON-02): ESM entries an import map points at, sharing chunks (one React).
//   npm run build:runtime   (vite build -c runtime/vite.config.js)
//   → runtime/dist/{react,jsx-runtime,react-dom-client,konsta,kit}.js + icons/<name>.js (one per lucide icon) + chunks/
//     + runtime.css + exports.json (entry → export names) + lucide-map.json (icon export name → icons/<file>)
// `react`, `react/jsx-runtime` and `react-dom/client` are CommonJS, and `export *` from CommonJS gives an entry with no
// static exports (import maps need them) — so those three entry files are (re)written here with every name spelled out.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const require = createRequire(import.meta.url)
const named = (pkg) => {
  const names = Object.keys(require(pkg)).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== 'default' && !k.startsWith('__'))
  return `export { ${names.join(', ')} } from '${pkg}'\n`
}
writeFileSync('runtime/react.js', named('react') + "export { default } from 'react'\n")
writeFileSync('runtime/jsx-runtime.js', named('react/jsx-runtime'))
writeFileSync('runtime/react-dom-client.js', named('react-dom/client'))

// lucide-react's index: `export { default as Bell, default as BellIcon, default as LucideBell } from './icons/bell.mjs'`
const lucideIndex = readFileSync(require.resolve('lucide-react/dist/esm/lucide-react.mjs'), 'utf8')
const lucideMap = {} // export name → icon file (without extension)
const iconEntries = {}
for (const [, names, file] of lucideIndex.matchAll(/export \{([^}]+)\} from '\.\/icons\/([\w-]+)\.mjs'/g)) {
  for (const n of names.split(',')) lucideMap[n.replace('default as', '').trim()] = file
  iconEntries[`icons/${file}`] = require.resolve(`lucide-react/dist/esm/icons/${file}.mjs`)
}

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
    },
  ],
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
