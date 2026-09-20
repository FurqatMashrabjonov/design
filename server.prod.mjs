// Production entry. `vite build` emits only a fetch handler (dist/server/server.js), not a
// listening server, so this binds it to a port and serves the built client assets.
import { serve } from 'srvx/node'
import { serveStatic } from 'srvx/static'
import app from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)

serve({
  port,
  hostname: process.env.HOST ?? '0.0.0.0',
  middleware: [serveStatic({ dir: './dist/client' })],
  fetch: (request) => app.fetch(request),
})
