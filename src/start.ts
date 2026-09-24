import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { RequestContext } from '@/app/Services/RequestContext'
import { installOutgoing, installServerLogs, maskQuery, skipPath, TelescopeService } from '@/app/Services/TelescopeService'

// OBS-10: every request (pages, server functions, API routes) runs inside a RequestContext and is
// recorded in http_requests after it answers. The recording is fire-and-forget: it never delays
// or breaks a response.
const telescope = createMiddleware().server(async ({ request, pathname, handlerType, next }) => {
  // ponytail: installed on the first request rather than at boot — this file is also bundled for the
  // browser, so nothing server-only may run at its top level.
  installServerLogs()
  installOutgoing()
  if (skipPath(pathname)) return next()
  const store = { requestId: crypto.randomUUID() } as { requestId: string; userId?: string }
  const t0 = performance.now()
  const kind = handlerType === 'serverFn' ? 'server-fn' : pathname.startsWith('/api/') ? 'api' : 'page'
  let ip: string | undefined
  try {
    ip = getRequestIP({ xForwardedFor: true })
  } catch {}
  const record = (status: number, size: number | null) =>
    TelescopeService.record({
      id: store.requestId, method: request.method, path: pathname, query: maskQuery(new URL(request.url).search), kind, status,
      ms: performance.now() - t0, userId: store.userId, ip, userAgent: request.headers.get('user-agent'), size,
    })
  return RequestContext.run(store, async () => {
    try {
      const result = await next()
      const len = result.response.headers.get('content-length')
      record(result.response.status, len ? Number(len) : null)
      return result
    } catch (e) {
      record(500, null)
      console.error(`${request.method} ${pathname} failed:`, e)
      throw e
    }
  })
})

// A start instance replaces Start's default request middleware, so the CSRF check it gave server
// functions is added back here, after the recorder (a refused request is recorded too).
export const startInstance = createStart(() => ({
  requestMiddleware: [telescope, createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })],
}))
