import { createFileRoute } from '@tanstack/react-router'
import { readFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { RUNTIME_DIR } from '@/app/Services/ScreenCompiler'

// The screen runtime (React, Konsta, @od/kit, one module per lucide icon), built by `npm run build:runtime`.
// A screen page runs in an opaque origin (CSP sandbox), so every file answers with CORS *; nothing here is
// private. Only files under runtime/dist, by a normalised path, are served.
const TYPES: Record<string, string> = { js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', webp: 'image/webp' }

export const Route = createFileRoute('/api/rt/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rel = normalize(params._splat ?? '').replace(/^(\.\.[/\\])+/, '').replace(/^v\d+\//, '') // the build segment only busts the cache
        const ext = rel.split('.').pop() ?? ''
        const withExt = TYPES[ext] ? rel : `${rel}.js` // `lucide-react/icons/bell` → icons/bell.js
        try {
          const body = await readFile(join(RUNTIME_DIR, withExt))
          return new Response(body, { headers: { 'content-type': TYPES[withExt.split('.').pop()!] ?? 'application/octet-stream', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' } })
        } catch {
          return new Response('Not found', { status: 404, headers: { 'access-control-allow-origin': '*' } })
        }
      },
    },
  },
})
